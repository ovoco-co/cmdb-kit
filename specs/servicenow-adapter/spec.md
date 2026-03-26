# ServiceNow Adapter and Scoped App

**Status**: In Progress
**Updated**: 2026-03-26
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

### What's pending
- Validate relationship deduplication on clean Zurich instance
- Test export tool with custom CI classes and u_name handling
- Export scoped app as update set from PDI (x_cmdbk namespace)
- UI components: import wizard, schema browser, validation dashboard
- ServiceNow Store certification submission
- Propagate to extended and enterprise schemas (blocked by Core restructure)

## Overview

Full-featured ServiceNow CMDB adapter that imports cmdb-kit schemas as custom CI classes using the CMDB Instance API and Identification Reconciliation Engine (IRE). Packaged as a certified scoped app for ServiceNow Store distribution.

## Why

The original adapter used the Table API, which bypasses ServiceNow's deduplication, reconciliation, and relationship management. The CMDB Instance API and IRE are ServiceNow's supported path for programmatic CMDB population. Using them means cmdb-kit records participate in ServiceNow's native CMDB features (impact analysis, service mapping, discovery reconciliation) instead of being isolated custom tables.

## Architecture

- **Adapter** (`src/servicenow/`): Node.js scripts that read cmdb-kit JSON schema files and import into ServiceNow via REST API
- **Platform overlay** (`overlay.json`): Maps cmdb-kit types and attributes to ServiceNow OOTB classes and fields where equivalents exist
- **Scoped app** (`x_cmdbk`): ServiceNow application containing custom CI classes, relationships, and UI components
- **Background scripts**: Install scripts that run in ServiceNow to create CI classes, attributes, and relationships from cmdb-kit definitions

## Dependencies

- Blocked by: Core + Domains restructure (for schema propagation)
- Blocks: ServiceNow Store submission, enterprise customer adoption

## Success Criteria

- Clean import on fresh Zurich PDI with zero duplicate records
- All 20 relationship types created without manual intervention
- Scoped app exportable as update set for customer installation
- Store certification requirements met (IRE usage, design docs, automated tests)
