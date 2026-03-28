# ServiceNow Adapter and Scoped App

**Status**: In Progress
**Updated**: 2026-03-28
**Priority**: High

### What's done
- Phase 1: CMDB Instance API with custom CI classes (commit 243e7fe)
- Phase 2: OOTB field mappings for 756 ServiceNow fields (commit 6222302)
- Phase 3: Data transforms for RAM, disk, OS, CPU normalization (commit 6222302)
- Phase 4: 20 CI-to-CI relationships (commit 0debe3c)
- Platform overlay architecture (overlay.json, overlay-loader.js)
- Migration tool (migrate.js) for upgrading from Table API to CMDB Instance API
- Background script installer for ServiceNow instance setup
- Zurich compatibility fixes (9 bugs, commit 66a19e3)
- Testing: 105/105 records imported on Zurich PDI, 12/20 types fully pass validation
- Core + Domains restructure complete (PR #2 merged 2026-03-28)
- Overlay updated for new Core types (Feature, Deployment Site, Baseline)
- Scoped prefix fix for new tables (x_cmdbk_ prefix on PDI)

### What was found during Core testing (2026-03-28)
- Schema mode creates 3 new tables (Feature, Deployment Site, Baseline) and 31 columns
- Feature table created as x_cmdbk_u_cmdbk_feature (scoped prefix added by PDI)
- Identification rule created with wrong table name (u_cmdbk_feature instead of x_cmdbk_u_cmdbk_feature)
- Fixed manually by updating cmdb_identifier and cmdb_identifier_entry records
- Deployment Site and Baseline import as tier 3 (Table API) without issues
- Feature imports as tier 2 (CMDB Instance API) after identification rule fix
- Reference field population on CI types has a pre-existing issue: CMDB API creates records with names and descriptions but reference fields are empty

### What's pending

Full audit completed 2026-03-28. 45 issues found (15 high, 17 medium, 13 low). See audit-findings.md for details.

#### Phase 1: Critical fixes - DONE (PRs #4, #5 merged 2026-03-28)

All 15 high-severity items fixed:
- SN-H1: Identification rules use sys_id lookup from sys_db_object (PR #5)
- SN-H2: Two-pass import, IRE + Table API for custom fields (PR #5)
- SN-H3: Double-prefixed table names in overlay.json (PR #4)
- SN-H4: Default data path to schema/core (PR #4)
- JSM-H1: refMismatch comparison checks referenceObjectTypeId (PR #4)
- JSM-H2: validate-import strips key prefix from reference values (PR #4)
- JSM-H3: 30+ attribute name mappings added (PR #4)
- JSM-M1: Boolean handling fixed (type 0, defaultTypeId 2) (PR #4)
- JSM-M3: Overlay integer type code fixed (PR #4)
- TOOLS-H1: Default schema paths in 4 tools (PR #4)
- TOOLS-H2: Boolean coercion in csv-to-json (PR #4)
- TOOLS-H3: Duplicate SLA removed from LOAD_PRIORITY (PR #4)
- SN overlay: VM scoped column, Deployment Site person refs (PR #4)
- JSM overlay: Stale Product attributes removed (PR #4)
- JSM export: 2-digit year date normalization (PR #4)

#### Phase 2: Medium fixes - MOSTLY DONE (PRs #6, #7, #8, #9 merged 2026-03-28)

Done:
- SN-M1: class-map.js Feature product reference added (PR #7)
- SN-M2: install-scoped-app.js uses configurable PREFIX, added new tables (PR #8)
- SN-M4: cmdbInstance uses retry logic (PR #6)
- SN-M7: Query injection prevention in resolveSysId (PR #6)
- JSM-M2: AQL injection prevention in resolveReference (PR #6)
- TOOLS-M1: --domain flag on csv-to-json (PR #6)
- TOOLS-M4: Domain attribute merge warns on collision (PR #8)
- TOOLS-M5: Dead extraInPriority loop removed (PR #7)
- JSM config default path fixed (PR #9)
- All stale schema/base refs removed from JS files (PR #9)
- CPU/RAM/URL/CIDR/VLAN attr name mappings added (PR #9)

Also done (PR #10):
- SN-M3: check-schema.js validates x_ columns for scoped apps (PR #10)
- SN-M6: validate-import skips transform fields (PR #10)
- TOOLS-M1: --domain flag on generate-templates (PR #10)
- TOOLS-M2: generate-site-content countRecords fixed (PR #10)

All medium items complete.

#### Phase 3: Low priority - PARTIAL (PR #11 merged 2026-03-28)

Done:
- SN-L1: VM scoped column (PR #4)
- SN-L2: Relationship import prefix handling (PR #11)
- JSM-L1: bulk-update-icons-mapped.js rewritten (PR #11)
- TOOLS-L1: SCCM types added to LOAD_PRIORITY (PR #11)
- TOOLS-L3: Domain collision warnings (PR #8)

Remaining:
- SN-L3: Export name field skip logic
- SN-L4: Discovery source validation
- JSM-L2: Export domain type handling
- JSM-L3: Icon map domain entries
- TOOLS-L2: LOAD_PRIORITY enterprise bloat
- TOOLS-L5: Hardcoded status strings in deployment-readiness

#### Phase 4: Remaining roadmap

- Validate relationship deduplication: DONE (20 relationships skipped correctly, no duplicates created)
- Test export tool: DONE (PR #16 - resolveTableNames fixes scoped table names, Feature exported 6 records)
- Export scoped app as update set from PDI - NEXT
- UI components - deferred
- ServiceNow Store certification - deferred

## Overview

Full-featured ServiceNow CMDB adapter that imports cmdb-kit schemas as custom CI classes using the CMDB Instance API and Identification Reconciliation Engine (IRE). Packaged as a certified scoped app for ServiceNow Store distribution.

## Why

The original adapter used the Table API, which bypasses ServiceNow's deduplication, reconciliation, and relationship management. The CMDB Instance API and IRE are ServiceNow's supported path for programmatic CMDB population. Using them means cmdb-kit records participate in ServiceNow's native CMDB features (impact analysis, service mapping, discovery reconciliation) instead of being isolated custom tables.

## Architecture

- **Adapter** (`adapters/servicenow/`): Node.js scripts that read cmdb-kit JSON schema files and import into ServiceNow via REST API
- **Platform overlay** (`adapters/servicenow/overlay.json`): Maps cmdb-kit types and attributes to ServiceNow tables and columns
- **Scoped app** (`x_cmdbk`): ServiceNow application containing custom CI classes, relationships, and UI components
- **Background scripts**: Install scripts that run in ServiceNow to create CI classes, attributes, and relationships

## Dependencies

- Core + Domains restructure: DONE (PR #2 merged)
- Blocks: ServiceNow Store submission, enterprise customer adoption

## Success Criteria

- Clean import on fresh Zurich PDI with zero duplicate records
- All 20 relationship types created without manual intervention
- Identification rules correctly reference scoped table names
- Reference fields populated on all CI types
- Scoped app exportable as update set for customer installation
- Store certification requirements met (IRE usage, design docs, automated tests)
