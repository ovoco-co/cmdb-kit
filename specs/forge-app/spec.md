# Atlassian Forge App

**Status**: Not Started
**Updated**: 2026-03-26
**Priority**: High

### What's pending
- Forge app scaffold and project setup
- Schema import UI (select tier/domain, preview types, import to JSM Assets)
- Data sync UI (select types, preview records, import with progress)
- Validation dashboard (run checks, display results)
- Relationship visualization (dependency graph)
- Atlassian Marketplace listing with documentation

## Overview

Browser-based Atlassian Forge app that wraps the existing JSM Assets adapter. Provides a UI within Jira for importing cmdb-kit schemas, syncing data, running validation, and visualizing relationships. Enables Atlassian Marketplace distribution to JSM Cloud customers.

## Why

The JSM Assets adapter currently works via CLI scripts. That's fine for technical users but blocks adoption by teams that want a point-and-click experience. The Atlassian Marketplace is the distribution channel for JSM Cloud. As of September 2025, only Forge apps are eligible for Marketplace listing.

## Architecture

- **Platform**: Atlassian Forge (JavaScript/TypeScript)
- **UI**: Atlassian UI Kit components
- **Backend**: Forge functions calling JSM Assets REST APIs (same patterns as existing CLI adapter)
- **Storage**: Forge Storage for configuration, schema selections, sync history

## Feature Set

1. **Schema Import**: Select Core + optional domains, preview type definitions, import object types and attributes into JSM Assets workspace
2. **Data Sync**: Select types to populate, preview sample records from data files, import with progress indicator and error reporting
3. **Validation**: Run the same checks as `tools/validate/` (count compare, field spot check, reference integrity) with results displayed in-app
4. **Relationship Graph**: Visual dependency map showing CI relationships (uses JSM Assets AQL for live queries)

## Dependencies

- Blocked by: Core + Domains restructure (schema structure must be final before building import UI)
- Blocks: Atlassian Marketplace distribution, Cloud customer adoption

## Success Criteria

- Marketplace-listed app installable on any JSM Cloud Premium/Enterprise instance
- Schema import completes without CLI access
- Validation results match CLI tool output
- Documentation sufficient for self-service installation
