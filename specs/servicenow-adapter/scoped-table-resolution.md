# Scoped Table Name Resolution

**Status**: Not Started
**Priority**: High (blocks export, validate-import, and data import for Feature/Deployment Site/Baseline on scoped instances)
**Created**: 2026-03-28

## The Problem

ServiceNow adds a scope prefix to custom table names on scoped app instances. When a table is created with name `u_cmdbk_feature`, ServiceNow may store it as `x_cmdbk_u_cmdbk_feature` (or `x_<scope_sys_id>_cmdbk_feature` depending on the app scope). The configured table prefix (`SN_TABLE_PREFIX=u_cmdbk`) produces names that don't match the actual table names on the instance.

This affects:
- **Import data mode**: CMDB Instance API calls fail with "Invalid CMDB class" for scoped table names
- **Export**: API calls fail with "Invalid table" for scoped table names
- **Validate-import**: Same failure
- **Check-schema**: Partial (fixed to check x_ columns in PR #10, but table lookup still uses configured name)

Currently affected types on the PDI (dev210250):
- Feature: configured `u_cmdbk_feature`, actual `x_cmdbk_u_cmdbk_feature`
- Deployment Site: configured `u_cmdbk_deployment_site`, actual `x_cmdbk_u_cmdbk_deployment_site`
- Baseline: configured `u_cmdbk_baseline`, actual `x_cmdbk_u_cmdbk_baseline`

Types that work fine (created before the scoped app):
- Product: `u_cmdbk_product` (global scope, name matches)
- Database: `u_cmdbk_database` (global scope)
- All other existing types

## Root Cause

The overlay-loader and class-map resolve `{prefix}` with the configured `SN_TABLE_PREFIX` value. This produces the "intended" table name. But on scoped instances, ServiceNow prepends the application scope prefix when creating the table. The actual table name in `sys_db_object` differs from the intended name.

The import schema mode works because it calls `createTable()` with the intended name and ServiceNow returns whatever name it actually created. But that actual name is never captured or cached for subsequent operations.

## Analysis

### What needs to change

Every adapter operation that uses a table name needs to resolve it through `sys_db_object` first. The pattern:
1. At startup, query `sys_db_object` for all tables matching the configured prefix pattern
2. Build a mapping: intended name -> actual name
3. Use the actual name for all API calls

### Where table names are used

| File | Function | How table name is used |
|------|----------|----------------------|
| import.js | importDataRows | `api.cmdbInstance(table, ...)` and `api.post/put(/api/now/table/${table})` |
| import.js | cacheSysIds | `api.get(/api/now/table/${table})` |
| import.js | syncSchema | `createTable(table, ...)` (this works - it creates the table) |
| import.js | ensureIdentificationRule | Fixed in PR #5 to use sys_id lookup |
| export.js | main loop | `api.getAll(/api/now/table/${table})` |
| validate-import.js | main loop | `api.get(/api/now/table/${table})` |
| check-schema.js | tableExists | `api.get(/api/now/table/sys_db_object, name=${table})` |
| lib/relationship-handler.js | resolveSysId | `api.get(/api/now/table/${table})` |

### How to implement

Add a `resolveTableNames()` function to the shared lib that:
1. Takes the class map (all intended table names)
2. Queries `sys_db_object` for each intended name
3. If not found, queries with wildcard pattern (`%${intendedName}`) to catch scoped prefixes
4. Returns a mapping of intended -> actual table names
5. Falls back to intended name if no match found (table doesn't exist yet)

Call this once at adapter startup. Pass the resolved names through to all operations.

### Files to modify

1. `adapters/servicenow/lib/index.js` - export the new function
2. New file or addition to overlay-loader: `resolveTableNames(classMap, api)`
3. `adapters/servicenow/import.js` - call at startup, use resolved names in data import
4. `adapters/servicenow/export.js` - call at startup, use resolved names
5. `adapters/servicenow/validate-import.js` - call at startup, use resolved names
6. `adapters/servicenow/check-schema.js` - already does individual lookups, could use cached map

### Edge cases

- Table doesn't exist yet (first run): fall back to intended name, schema mode will create it
- Multiple tables match the wildcard: pick the one in the current app scope
- Global and scoped versions of same table exist: prefer the one that matches the configured prefix pattern
- Table was renamed: the sys_db_object lookup handles this naturally

## Plan

### Phase 1: Build resolveTableNames

Create the function in the shared lib. It queries sys_db_object once with a batch query for all custom table names, builds the mapping, and returns it.

### Phase 2: Wire into import.js

Call resolveTableNames after loading the class map. Replace table names in the class map with resolved names before any data operations.

### Phase 3: Wire into export.js

Same pattern: resolve at startup, use actual names.

### Phase 4: Wire into validate-import.js

Same pattern.

### Phase 5: Test on PDI

Verify that Feature, Deployment Site, and Baseline:
- Import data correctly via CMDB Instance API
- Export correctly
- Validate-import correctly

## Dependencies

- PDI access (dev210250)
- Class map with new Core types (done)
- Overlay with correct type definitions (done)

## Success Criteria

- `import.js sync` populates all Core types including Feature, Deployment Site, Baseline on scoped PDI
- `export.js` exports all Core types correctly on scoped PDI
- `validate-import.js` validates all Core types on scoped PDI
- No changes needed to overlay.json or class-map.js table name patterns
- Works on both global-scope and scoped-app instances
