# Atlassian Forge App

**Feature Branch**: forge-app
**Created**: 2026-03-26
**Status**: Deferred (per user direction)
**Input**: JSM Assets adapter, Atlassian Forge platform requirements

## User Scenarios and Testing

### P1: JSM admin installs cmdb-kit without CLI tools

**Why this priority**: The JSM Assets adapter currently works via CLI scripts. That blocks adoption by teams that want a point-and-click experience. The Atlassian Marketplace is the distribution channel for JSM Cloud.

**Independent Test**: Install the Forge app on a JSM Cloud instance, import Core schema, and verify types are created.

**Acceptance Scenarios**:

- Given a JSM Cloud Premium or Enterprise instance
  When the admin installs the Forge app from the Atlassian Marketplace
  Then the app installs without CLI access or developer tools

- Given the Forge app is installed
  When the admin selects Core and optional domains and clicks Import
  Then object types and attributes are created in JSM Assets matching the schema definitions

- Given schema import is complete
  When the admin selects types to populate and clicks Sync
  Then records are imported with progress indicator and error reporting

### P2: Admin validates imported data through the app

**Why this priority**: Validation results should match CLI tool output, ensuring the Forge app is a full replacement for the CLI workflow.

**Independent Test**: Run validation through the app and compare results with CLI validate-import output.

**Acceptance Scenarios**:

- Given data has been imported through the Forge app
  When the admin runs validation
  Then results match what the CLI validate-import tool would produce

### P3: Admin visualizes CI relationships

**Why this priority**: Relationship visualization helps users understand the schema and their data.

**Independent Test**: Open the relationship graph and verify it shows correct CI dependencies.

**Acceptance Scenarios**:

- Given Core schema and data are imported
  When the admin opens the relationship graph
  Then a visual dependency map shows CI relationships using live AQL queries

## Edge Cases

- Instance has existing object types with names that conflict with cmdb-kit types
- Import interrupted mid-way (partial schema state)
- Forge Storage limits exceeded for large schema configurations
- App installed on JSM Cloud Free/Standard (requires Premium/Enterprise for Assets)

## Requirements

### Functional Requirements

- FR-001: Schema Import - select Core and optional domains, preview type definitions, import object types and attributes into JSM Assets workspace
- FR-002: Data Sync - select types to populate, preview sample records from data files, import with progress indicator and error reporting
- FR-003: Validation - run the same checks as tools/validate/ (count compare, field spot check, reference integrity) with results displayed in-app
- FR-004: Relationship Graph - visual dependency map showing CI relationships using JSM Assets AQL for live queries
- FR-005: Marketplace listing with documentation sufficient for self-service installation

### Key Entities

- Forge app (JavaScript/TypeScript on Atlassian Forge platform)
- JSM Assets workspace (target for schema and data import)
- Forge Storage (configuration, schema selections, sync history)

## Architecture

- **Platform**: Atlassian Forge (JavaScript/TypeScript)
- **UI**: Atlassian UI Kit components
- **Backend**: Forge functions calling JSM Assets REST APIs (same patterns as existing CLI adapter)
- **Storage**: Forge Storage for configuration, schema selections, sync history

## Dependencies

- Blocked by: Core + Domains restructure (schema structure must be final before building import UI)
- Blocks: Atlassian Marketplace distribution, Cloud customer adoption

## Success Criteria

- SC-001: Marketplace-listed app installable on any JSM Cloud Premium/Enterprise instance
- SC-002: Schema import completes without CLI access
- SC-003: Validation results match CLI tool output
- SC-004: Documentation sufficient for self-service installation

## Assumptions

- As of September 2025, only Forge apps are eligible for Atlassian Marketplace listing
- JSM Assets REST APIs are accessible from Forge functions
- Forge Storage capacity is sufficient for schema configuration and sync history
- The existing CLI adapter patterns can be adapted to run within Forge functions
