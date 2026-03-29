# ServiceNow Adapter and Scoped App

**Feature Branch**: servicenow-adapter
**Created**: 2026-03-26
**Status**: Done (all phases complete, remaining low bugs documented in audit-findings.md)
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

- Core + Domains restructure: DONE (PR #2 merged)
- Blocks: nothing (adapter is functional)

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
