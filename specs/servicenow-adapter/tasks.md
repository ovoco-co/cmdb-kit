# ServiceNow Adapter Tasks

## Completed Work

### Phase 1: CMDB Instance API (commit 243e7fe)
- [x] Add CMDB Instance API method to `adapters/servicenow/lib/api-client.js`
- [x] Create custom CI classes extending cmdb_ci via `sys_db_object`
- [x] Create independent identification rules (`cmdb_identifier` + `cmdb_identifier_entry`) for each Tier 2 type
- [x] Add rule propagation wait (5+ seconds after creation)
- [x] Update import.js to route Tier 1 and 2 CI types to CMDB Instance API
- [x] Update class-map.js: move Product from cmdb_ci_appl to u_cmdbk_product
- [x] Add cmdbApi flag and identificationAttributes to class-map.js entries
- [x] Add discovery_source configuration (SN_DISCOVERY_SOURCE env var)
- [x] Test end-to-end on Zurich PDI: schema sync, data import, IRE dedup

### Phase 2: OOTB Field Mappings (commit 6222302)
- [x] Map cmdb_ci inherited fields: environment, company, location, assigned_to, assignment_group
- [x] Map cmdb_ci_server fields: os_version, cpu_count, classification, manufacturer, serial_number, asset_tag
- [x] Fix owned_by mapping (was mapped to group, should be user)
- [x] Map cmdb_ci_database fields: port, instance_name, db_server (OOTB reference)
- [x] Stop creating u_environment custom column (use inherited environment)
- [x] Stop creating u_server custom column (use db_server OOTB field)

### Phase 3: Data Transforms (commit 6222302)
- [x] Implement parseRam: "32 GB" to 32768 MB integer
- [x] Implement parseDiskSpace: "500 GB SSD" to 500 GB decimal
- [x] Implement splitOs: "Ubuntu 22.04 LTS" to os + os_version
- [x] Implement splitCpu: "8 vCPU" to cpu_count + cpu_name

### Phase 4: Relationships (commit 0debe3c)
- [x] Create relationships.json data format in schema/base/data/
- [x] Implement relationship import via cmdb_rel_ci Table API
- [x] Add dedup check before relationship creation
- [x] Map 20 CI-to-CI relationships (Runs on, Depends on, Contains)
- [x] Handle class name to table prefix translation

### Zurich Compatibility (commit 66a19e3)
- [x] Fix: super_class requires sys_id, not table name
- [x] Fix: reference columns require target table in payload
- [x] Fix: CI class extension columns must use table prefix
- [x] Fix: race condition after CI class table creation
- [x] Fix: standalone custom tables need explicit u_name column
- [x] Fix: check-schema.js unwrap internal_type reference objects
- [x] Fix: check-schema.js check inherited columns across CI hierarchy
- [x] Fix: validate-import.js unwrap reference field objects, handle u_name for Tier 3
- [x] Fix: relationship-handler.js try name before u_name for reference resolution

### Platform Overlay Architecture
- [x] Create overlay.json for ServiceNow adapter
- [x] Create overlay-loader.js with fallback to class-map.js
- [x] Support both x_cmdbk (scoped) and u_cmdbk (global) table prefixes
- [x] Extract INSTALL_STATUS to constants.js

### Migration and Install Tools
- [x] Build migrate.js for moving records between tables (commit 1fcd517)
- [x] Build install-scoped-app.js background script installer
- [x] Support migrate mode (move, update relationships, optionally delete old)
- [x] Support cleanup mode (delete records matching local data files)
- [x] Create ServiceNow-native example data in adapters/servicenow/examples/

### Adapter Audit
- [x] Fix stale cmdb_ci_appl references in class-map.js
- [x] Fix column prefix issues in Feature and Assessment mappings
- [x] Clean up help text in export and validate tools
- [x] Person moved from sys_user to custom standalone table
- [x] Export tool fixed for u_name and glide_list handling
- [x] Add hibernation detection in API client

## Remaining Work

### Phase 5: Scoped App Packaging
- [ ] Export scoped app (x_cmdbk) as update set from PDI
- [ ] Document update set installation on clean Zurich instance
- [ ] Add form layouts with CI Relationships related lists through Studio
- [ ] Test full import cycle on fresh Zurich PDI after update set install
- [ ] Validate relationship dedup on clean instance (re-run import, verify no duplicates)
- [ ] Test export tool with custom CI classes and u_name handling

### Phase 6: Domain-Aware Imports (Core restructure DONE - PR #2 merged 2026-03-28, blocker resolved)
- [ ] Update overlay.json for Core + domain type organization
- [ ] Update class-map.js for domain-specific type-to-table mappings
- [ ] Add --domains flag to import.js for specifying domain paths
- [ ] Create custom CI classes for each domain's types (compliance, licensing, etc.)
- [ ] Create identification rules for domain CI types
- [ ] Test Core-only import on Zurich PDI
- [ ] Test Core + Compliance domain import
- [ ] Test Core + SCCM domain import (requires Compliance)
- [ ] Re-validate full import cycle after domain restructure

### Phase 7: Store Certification
- [ ] Write design documentation with model mapping (certification requirement)
- [ ] Create automated tests for certification review
- [ ] Verify all CMDB writes use CMDB Instance API (IRE requirement)
- [ ] Build import wizard UI component (ServiceNow UI Builder or Workspace)
- [ ] Build schema browser UI component
- [ ] Build validation dashboard UI component
- [ ] Submit to ServiceNow Store for review
- [ ] Address certification feedback

## Code Review Items (from code-review-260324.md)

- [ ] Fix: ServiceNow adapter config does not load .env file (Medium, item 2). Add dotenv loading to `adapters/servicenow/config.js`.
- [ ] Fix: class-map has stale Change Request/Incident type mappings (Medium, item 3). Remove mappings for removed process record types.
- [ ] Fix: duplicate INSTALL_STATUS constant (Medium, item 4). Verify extraction to shared constants.js is complete.
- [ ] Fix: repository URL in package.json (Medium, item 6). Update from ovoco/cmdb-kit to ovoco-co/cmdb-kit.
- [ ] Fix: Playwright listed as production dependency (Medium, item 7). Move to devDependencies.
- [ ] Fix: silent error swallowing in adapter catch blocks (Low, item 2). Add summary error counts at end of import runs.

## CISDF Data Foundations (from specs/004-cisdf-data-foundations/research.md)

These capabilities are missing from the adapter and required for production-grade CMDB health:

- [ ] Register "CMDB-Kit" as a named data source in ServiceNow (sys_data_source) during schema sync
- [ ] Set discovery_source on every imported CI record consistently
- [ ] Support compound identification keys beyond single-attribute name matching
- [ ] Create reconciliation rule recommendations (which attributes cmdb-kit is authoritative for vs Discovery)
- [ ] Normalize manufacturer and OS values before import (NDS doesn't apply to REST API imports)
- [ ] Detect retirement candidates (CIs in ServiceNow with discovery_source="CMDB-Kit" not in local data files)
- [ ] Map health-tracked attributes for custom CI classes in CI Class Manager
- [ ] Support dependent CI identification for types that require a hosting parent
- [ ] Support domain separation: set sys_domain on imported CIs when instance uses domain separation (training-07)

## Bugs Found During Documentation Review (2026-04-04)

- [ ] Fix: validate-import.js assumes u_name for ALL Tier 3 tables but scoped apps (x_ prefix) retain `name`. Export.js handles this correctly with `isScoped` check. Validate should use the same logic.
- [ ] Fix: servicenow.md Tier 1 table previously listed Database and Virtual Machine as OOTB (corrected 2026-04-04 to Tier 2)

## Housekeeping (from backlog 2026-03-29)

- [ ] Fix .env.example stale comment
(package.json and adapter README schema/base fixes moved to 003-documentation-rewrite/tasks.md)
- [ ] Rotate .env Atlassian API token if still active
- [ ] Respond to GitHub Issue #15 (Software Product Model RFC)
