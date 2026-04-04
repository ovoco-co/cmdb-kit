# ServiceNow Adapter and Scoped App

**Feature Branch**: servicenow-adapter
**Created**: 2026-03-26
**Status**: In Progress (Phases 1-4 complete, adapter audit done. Phase 5 scoped app packaging, Phase 6 domain-aware imports, Phase 7 Store certification remain. Scoped table name resolution is a high-priority blocker for Phase 5. 8 low-priority audit items and 6 code review items also pending.)
**Input**: ServiceNow CMDB Instance API, Identification Reconciliation Engine (IRE), Zurich PDI testing

## User Scenarios and Testing

### P1: Admin imports cmdb-kit schema into ServiceNow using the CMDB Instance API

**Why this priority**: The original adapter used the Table API, which bypasses ServiceNow's deduplication, reconciliation, and relationship management. Using the CMDB Instance API means cmdb-kit records participate in native CMDB features.

**Independent Test**: Run schema and data import on a fresh Zurich PDI. Verify all types, attributes, and records are created.

**Acceptance Scenarios**:

- Given a fresh Zurich PDI with the scoped app installed
  When the admin runs `node adapters/servicenow/import.js schema && sync`
  Then all Core custom CI classes are created with correct columns
  And identification rules correctly reference scoped table names (x_cmdbk_ prefix)
  And 105/105 records are imported with zero duplicates

- Given the adapter uses the CMDB Instance API and IRE
  When records are imported
  Then they participate in ServiceNow's native impact analysis, service mapping, and discovery reconciliation

### P2: Admin imports data with correct reference field population

**Why this priority**: Reference fields on CI types must be populated for the CMDB to be useful. The two-pass import (IRE + Table API) solves this.

**Independent Test**: Import Core data, verify reference fields are populated on all CI types.

**Acceptance Scenarios**:

- Given a CI type has reference fields (e.g., Product Version references Product)
  When the two-pass import runs (IRE creates records, Table API populates custom fields)
  Then reference fields contain the correct values

- Given 20 relationship types are defined
  When relationship import runs
  Then all 20 relationships are created without duplicates

### P3: Admin migrates from Table API adapter to CMDB Instance API adapter

**Why this priority**: Existing users on the old Table API adapter need a migration path.

**Independent Test**: Run migrate.js on an instance with Table API data, verify records are preserved.

**Acceptance Scenarios**:

- Given an instance has cmdb-kit data imported via the old Table API
  When the admin runs the migration tool (migrate.js)
  Then all records are preserved and now use CMDB Instance API patterns

## Edge Cases

- Scoped prefix (x_cmdbk_) causes double-prefixed table names in overlay.json
- Identification rules created with wrong table name (u_cmdbk_feature vs x_cmdbk_u_cmdbk_feature)
- CMDB API creates records with names and descriptions but reference fields are empty (requires two-pass)
- ServiceNow script size limits for background script installer
- Zurich-specific bugs (9 found and fixed)
- Feature table as tier 2 (CMDB Instance API) vs Deployment Site and Baseline as tier 3 (Table API)

## Requirements

### Functional Requirements

- FR-001: Import cmdb-kit schemas as custom CI classes using the CMDB Instance API
- FR-002: Use Identification Reconciliation Engine (IRE) for deduplication
- FR-003: Two-pass import: IRE creates records, Table API populates custom fields
- FR-004: Create 20 CI-to-CI relationships without duplicates
- FR-005: Platform overlay (overlay.json) maps cmdb-kit types and attributes to ServiceNow tables and columns
- FR-006: Background script installer for ServiceNow instance setup
- FR-007: Migration tool (migrate.js) for upgrading from Table API to CMDB Instance API
- FR-008: OOTB field mappings for 756 ServiceNow fields
- FR-009: Data transforms for RAM, disk, OS, CPU normalization
- FR-010: Retry logic and query injection prevention

### Key Entities

- Adapter (`adapters/servicenow/`): Node.js scripts for REST API import
- Platform overlay (`adapters/servicenow/overlay.json`): Type and attribute mapping
- Scoped app (`x_cmdbk`): ServiceNow application scope
- class-map.js: Maps cmdb-kit types to ServiceNow CI classes
- install-scoped-app.js: Background script for instance setup

## Architecture

- **Adapter** (`adapters/servicenow/`): Node.js scripts that read cmdb-kit JSON schema files and import into ServiceNow via REST API
- **Platform overlay** (`adapters/servicenow/overlay.json`): Maps cmdb-kit types and attributes to ServiceNow tables and columns
- **Scoped app** (`x_cmdbk`): ServiceNow application scope containing custom CI classes and relationships

## ServiceNow Integration Rules (learned from Zurich PDI testing)

These rules were established through hands-on testing on the Zurich PDI (dev210250) and must be followed for all ServiceNow adapter work:

1. **Always use CMDB Instance API for CI types.** Routes through the Identification and Reconciliation Engine (IRE) for deduplication and reconciliation. This is the only path to Store certification. Never use Table API for custom CI types.

2. **Use Table API for non-CI types.** Person, Product Version, Document, Deployment, Baseline, and all lookup types are standalone tables. Table API with name-based deduplication.

3. **Two-pass import for reference fields.** CMDB Instance API creates records via IRE but cannot populate custom reference fields. First pass creates the record, second pass uses Table API PUT to populate references.

4. **Every custom CI class needs independent identification rules.** Create `cmdb_identifier` with `independent=true` and `cmdb_identifier_entry` matching on `name`. The `applies_to` field on `cmdb_identifier` is a reference to `sys_db_object` and requires the **sys_id** of the table record, not the table name string. Look up the table in `sys_db_object` first, get the sys_id, then create the rule. After creating a rule, wait at least 5 seconds for the IRE to pick it up before importing data. Without identification rules, every import creates duplicates.

5. **Resolve scoped table names at startup.** On scoped app instances, ServiceNow prepends the app scope prefix to table names (e.g., configured `u_cmdbk_feature` becomes actual `x_cmdbk_u_cmdbk_feature`). Query `sys_db_object` to map configured names to actual names before any data operations. This is currently NOT IMPLEMENTED as a startup resolver (see scoped-table-resolution.md). The schema sync handles it per-table during creation, but export and validate-import do not.

6. **Tier 3 standalone tables need explicit u_name column.** Standalone custom tables (Tier 3) don't inherit a `name` column from `cmdb_ci`. ServiceNow auto-prefixes columns with `u_` on global-scope tables. The adapter creates `u_name` explicitly during schema sync. Reference lookups try `name` first, then fall back to `u_name` (see relationship-handler.js).

7. **References must be resolved to sys_id.** Never pass a name string to a reference field. Query the referenced table first, get the sys_id, then pass that.

8. **Data transforms are required.** RAM in MB (integer), disk in GB (decimal), OS split into os + os_version, CPU count as integer. Required for CMDB health scoring and discovery matching.

9. **Dedup check before every relationship creation.** The `cmdb_rel_ci` table has no unique constraint on (parent, child, type). Always check for existing relationships before creating new ones.

10. **Use overlay.json for all type and attribute mappings.** Don't hardcode table names or field mappings in adapter code. The overlay provides the portability layer.

11. **Test on both global-scope (u_cmdbk_) and scoped-app (x_cmdbk_) instances.** Use environment variables for prefix configuration.

12. **Wait after table creation.** ServiceNow needs ~2 seconds to commit new tables before accepting column creation calls. Without this wait, column creation returns 403.

13. **Tier 3 u_name behaves differently on scoped apps.** Global-scope Tier 3 tables use `u_name` as the name field. Scoped-app Tier 3 tables retain `name` (no prefix). The export tool handles this correctly (`export.js` checks `isScoped`), but `validate-import.js` does not - it always assumes `u_name` for Tier 3. This is a known bug.

14. **Normalization is NOT applied to REST API imports.** ServiceNow's NDS (Normalization Data Services) only runs on Discovery and Service Graph Connector imports. When cmdb-kit imports via REST, it must normalize manufacturer and OS values itself. "Dell" and "Dell Inc." will create two separate CIs if the identification rule uses manufacturer as part of the key.

15. **Transform fields are skipped in validation.** Fields with transforms (e.g., `installStatus` mapping "Active" to integer "1") are intentionally excluded from comparison in `validate-import.js`. The remote value is the transformed version, not the original. This is by design, not a bug.

16. **Personnel types bundle into person.json.** All PERSONNEL_TYPES are exported as a single nested-format `person.json` file, not individual files per type. This is different from all other types which get their own file.

17. **install-scoped-app.js is a ServiceNow server-side script, not Node.js.** It runs in ServiceNow's Scripts - Background console using GlideRecord. It requires manual PREFIX edit for scoped apps. Schema must be imported first.

18. **sys_class_name registration is required for custom CI classes.** Custom CI classes must be added to the `sys_choice` table (name='cmdb_ci', element='sys_class_name') before they appear in the CI Type dropdown. The install script handles this, but manual installs must include this step.

19. **Retired CIs must be managed, not deleted.** Setting install_status=7 is a business process. Retired CIs serve as audit records for incident investigations and compliance. Never auto-delete CIs.

### Adding a New Type (step-by-step)

1. Add the type definition to `schema-structure.json` and `schema-attributes.json` in the appropriate schema directory
2. Add the type to `LOAD_PRIORITY` in `tools/lib/constants.js` (respect dependency order - referenced types before referencing types)
3. Add a data file in `data/` (kebab-case filename)
4. Decide the tier:
   - **Tier 1**: Maps to an existing OOTB ServiceNow table. Add to class-map.js with `tier: 1`, the OOTB `table` name, and `nameField: 'name'`
   - **Tier 2**: Custom CI class extending cmdb_ci. Add to class-map.js with `tier: 2`, `table: customTable('typename')`, `isCi: true`, `cmdbApi: true`, `identificationAttributes: ['name']`, `superClass: 'cmdb_ci'`
   - **Tier 3**: Standalone custom table (not a CI). Add to class-map.js with `tier: 3`, `table: customTable('typename')`, `nameField: 'name'` (adapter creates u_name automatically)
5. Add corresponding entry in `overlay.json` with attribute mappings
6. Run `node tools/validate.js --schema <dir>` to verify schema integrity
7. Test: `node adapters/servicenow/import.js schema --dry-run` then `import.js sync --type TypeName`

## Audit Summary

Full audit completed 2026-03-28. 45 issues found (15 high, 17 medium, 13 low).

### Phase 1: Critical fixes - DONE (PRs #4, #5)
All 15 high-severity items fixed including: identification rules using sys_id lookup, two-pass import, double-prefixed table names, default data paths, reference comparison fixes, attribute name mappings, boolean handling.

### Phase 2: Medium fixes - DONE (PRs #6, #7, #8, #9, #10)
All 17 medium items fixed including: Feature product reference, configurable PREFIX, retry logic, injection prevention, --domain flag, domain attribute merge warnings, stale schema/base refs removed.

### Phase 3: Low priority - PARTIAL (PR #11)
5 of 13 low items fixed. Remaining: SN-L3, SN-L4, JSM-L2, JSM-L3, TOOLS-L2, TOOLS-L5.

### Phase 4: Remaining roadmap
- Validate relationship deduplication: DONE (20 relationships, no duplicates)
- Test export tool: DONE (PR #16, scoped table name resolution)

## Core + Domains Testing Results (2026-03-28)

- Schema mode creates 3 new tables (Feature, Deployment Site, Baseline) and 31 columns
- Feature table created as x_cmdbk_u_cmdbk_feature (scoped prefix added by PDI)
- Identification rule fix: updated cmdb_identifier and cmdb_identifier_entry records for correct scoped table name
- Deployment Site and Baseline import as tier 3 (Table API) without issues
- Feature imports as tier 2 (CMDB Instance API) after identification rule fix

## Dependencies

- Core + Domains restructure: DONE (PR #2 merged 2026-03-28)
- Scoped table name resolution: NOT STARTED (high priority, blocks Phase 5 export/validate on scoped instances, see scoped-table-resolution.md)
- Blocks: Phase 5 scoped app packaging blocked by scoped table resolution. Phase 7 Store certification blocked by Phase 5.

## Success Criteria

- SC-001: Clean import on fresh Zurich PDI with zero duplicate records
- SC-002: All 20 relationship types created without manual intervention
- SC-003: Identification rules correctly reference scoped table names
- SC-004: Reference fields populated on all CI types via two-pass import
- SC-005: 105/105 records imported successfully

## Assumptions

- ServiceNow Zurich is the target platform version
- PDI (dev210250) is available for testing
- The CMDB Instance API and IRE are the supported path for programmatic CMDB population
- Scoped app prefix (x_cmdbk_) is consistent across ServiceNow instances
- Two-pass import is necessary because the CMDB API does not populate custom reference fields
