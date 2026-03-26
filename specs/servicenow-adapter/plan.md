# ServiceNow Adapter and Scoped App Plan

## Architecture Decisions

### CMDB Instance API over Table API

The original adapter used the Table API (`/api/now/table/`) for all CI records. This bypasses ServiceNow's Identification and Reconciliation Engine (IRE), which means no deduplication, no reconciliation rules, no data source priority, and no path to Store certification.

The adapter now uses a tiered approach:

| Tier | Types | API | Identification |
|------|-------|-----|----------------|
| Tier 1 OOTB CI | Server, VM, Network Segment, Hardware Model | CMDB Instance API | Existing OOTB rules (serial_number, name) |
| Tier 1 OOTB non-CI | sys_user, sys_user_group, core_company, cmn_location | Table API | Name-based lookup (no IRE) |
| Tier 2 Custom CI | Product, Feature, Assessment, Product Component | CMDB Instance API | Custom independent rules (match by name) |
| Tier 3 Standalone | Product Version, Document, Deployment, all lookup types | Table API | Name-based lookup (no IRE, not CIs) |

### Custom CI classes instead of OOTB mappings

Product was originally mapped to `cmdb_ci_appl`, which has a hosting dependency (`independent=false` in the IRE). Creating a record required a "Runs on" relationship to hardware. Custom CI classes extending `cmdb_ci` directly, with independent identification rules, eliminate this constraint. Product becomes `u_cmdbk_product` (global scope) or `x_cmdbk_product` (scoped app).

### Scoped app packaging (x_cmdbk)

The scoped app namespace `x_cmdbk` is the target for Store certification. Custom tables use this prefix. The adapter supports both `x_cmdbk` (scoped) and `u_cmdbk` (global) prefixes, configurable via environment variable.

### Platform overlay architecture

`overlay.json` maps cmdb-kit types and attributes to ServiceNow OOTB classes and fields. The `overlay-loader.js` loads from the overlay file, falling back to the hardcoded `class-map.js`. This keeps the adapter flexible: organizations with custom ServiceNow configurations can modify the overlay without touching adapter code.

### Data transforms

The adapter converts human-readable data file values to ServiceNow-native formats:

| Transform | Input | Output |
|-----------|-------|--------|
| parseRam | "32 GB" | 32768 (integer MB) |
| parseDiskSpace | "500 GB SSD" | 500 (decimal GB) |
| splitOs | "Ubuntu 22.04 LTS" | os="Ubuntu", os_version="22.04 LTS" |
| splitCpu | "8 vCPU" | cpu_count=8, cpu_name="vCPU" |

Data files stay human-readable and platform-agnostic. The adapter translates at import time.

### Relationship handling

CI-to-CI relationships are defined in `relationships.json` and imported as `cmdb_rel_ci` records using OOTB relationship types (Runs on, Depends on, Contains, Hosted on). The import deduplicates before creating: it checks for existing relationships between the same parent and child with the same type.

## Implementation Approach

### Adapter structure

```
adapters/servicenow/
+-- import.js              # Import orchestrator (schema sync, data import, relationships)
+-- export.js              # Export from ServiceNow to JSON
+-- validate-import.js     # Post-import validation
+-- check-schema.js        # Compare repo schema to ServiceNow state
+-- migrate.js             # Move records between tables (upgrade path)
+-- install-scoped-app.js  # Background script installer for UI config
+-- overlay.json           # Type and field mappings
+-- lib/
|   +-- api-client.js      # REST client (Table API + CMDB Instance API)
|   +-- class-map.js       # Type-to-table mappings
|   +-- config.js           # Configuration loader
|   +-- constants.js        # INSTALL_STATUS and other constants
|   +-- overlay-loader.js   # Overlay file loader with fallback
|   +-- relationship-handler.js  # Relationship import with dedup
+-- examples/              # ServiceNow-native example data
```

### Schema sync flow

1. Create custom CI classes (Tier 2) by POSTing to `sys_db_object` with `super_class` set to cmdb_ci sys_id
2. Create identification rules (`cmdb_identifier` with `independent=true`, `cmdb_identifier_entry` with `attributes=name`)
3. Wait for rule propagation (5+ seconds)
4. Create custom columns on tables via `sys_dictionary`
5. For Tier 3 standalone tables: create via Table API with `u_name` as display field

### Import flow

1. Import lookup types first (Tier 3, Table API, name-based dedup)
2. Import directory types (Organizations, Teams, Persons via Table API or CMDB Instance API depending on tier)
3. Import CI types (Tier 1 and 2, CMDB Instance API with IRE dedup)
4. Import relationships (cmdb_rel_ci via Table API with dedup check)

### Key commits

| Commit | Change |
|--------|--------|
| 66a19e3 | Zurich compatibility fixes (9 bugs) |
| 6222302 | OOTB field mappings and data transforms |
| 243e7fe | CMDB Instance API with custom CI classes |
| 0debe3c | 20 CI-to-CI relationships |
| 1fcd517 | Migration tool for table moves |

## Phases

### Completed phases

**Phase 1: CMDB Instance API** - Custom CI classes with independent identification rules. Tested on Zurich PDI. 201 Created responses, IRE dedup confirmed on re-import.

**Phase 2: OOTB field mappings** - Mapped to native ServiceNow fields instead of custom columns where OOTB equivalents exist. Reduced custom column count.

**Phase 3: Data transforms** - RAM, disk, OS, CPU transforms for ServiceNow-native formats.

**Phase 4: Relationships** - 20 CI-to-CI relationships with dedup check before create.

### Remaining phases

**Phase 5: Scoped app packaging**

- Export as update set from PDI
- Document installation on clean instance
- Add form layouts with CI Relationships related lists through Studio
- Test on fresh Zurich PDI with full import cycle

**Phase 6: Domain-aware imports** (blocked by Core + Domains restructure)

- Update overlay.json for Core + domain type mappings
- Update class-map.js for domain-specific type-to-table mappings
- Support `--domains` flag on import.js
- Each domain creates its own custom CI classes with identification rules

**Phase 7: Store certification**

- Design documentation with model mapping
- Automated tests for certification review
- IRE usage verification (all CMDB writes through CMDB Instance API)
- UI components: import wizard, schema browser, validation dashboard
- Submission to ServiceNow Store

## Dependencies

- Blocked by: Core + Domains restructure (for schema propagation to domains)
- Blocks: ServiceNow Store submission, enterprise customer adoption

## File Paths

| File | Purpose |
|------|---------|
| `adapters/servicenow/import.js` | Import orchestrator |
| `adapters/servicenow/export.js` | Export tool |
| `adapters/servicenow/validate-import.js` | Post-import validation |
| `adapters/servicenow/check-schema.js` | Schema comparison |
| `adapters/servicenow/migrate.js` | Table migration tool |
| `adapters/servicenow/install-scoped-app.js` | Background script installer |
| `adapters/servicenow/overlay.json` | Platform overlay mappings |
| `adapters/servicenow/lib/api-client.js` | REST client with CMDB Instance API support |
| `adapters/servicenow/lib/class-map.js` | Type-to-table mappings |
| `adapters/servicenow/lib/config.js` | Configuration loader |
| `adapters/servicenow/lib/constants.js` | Shared constants (INSTALL_STATUS) |
| `adapters/servicenow/lib/overlay-loader.js` | Overlay loader |
| `adapters/servicenow/lib/relationship-handler.js` | Relationship import with dedup |
| `adapters/servicenow/examples/` | ServiceNow-native example data |
| `docs/Setup/servicenow.md` | ServiceNow setup guide |
| `docs/Setup/servicenow-scoped-app-guide.md` | Scoped app setup guide |
