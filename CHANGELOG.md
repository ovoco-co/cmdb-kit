Changelog

All notable changes to CMDB-Kit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## 2.0.0 - 2026-03-28

Major restructure from a tiered schema model (base/extended/enterprise) to Core + Domains.

### Breaking Changes

- `schema/base` renamed to `schema/core`. The `SCHEMA_DIR` default changed from `schema/base` to `schema/core`.
- Several types promoted from extended to Core have new and changed attributes. Feature, Deployment Site, Baseline, Person, Product Version, and Document all carry additional fields that did not exist in the base schema.

### Core Schema

Promoted from extended to Core:

- **Feature** with new `product` reference for product-level traceability
- **Deployment Site** enriched with `product`, `version`, `organization`, `sitePOC`, `supportTeam`, `lastDeploymentDate`, and `deployedBy`
- **Baseline** enriched with `product`, `approvedBy`, `establishedDate`, `components` (multi-ref), and `documents` (multi-ref)

New lookup types in Core:

- Site Status
- Baseline Type
- Baseline Status

Enriched existing Core types:

- Product Version: added `approvedBy`, `approvalDate`, `releaseNotes`
- Person: added `phone`, `jobTitle`, `manager`
- Document: added `product`, `version`

### Domains

Four new domain directories under `schema/domains/`, each with its own `schema-structure.json`, `schema-attributes.json`, and data files:

- `infrastructure` - network, server, and infrastructure CI types
- `compliance` - change management, incident tracking, audit types
- `distribution` - definitive media library, release distribution types
- `licensing` - license, contract, and entitlement types

### Tooling

- `validate.js` supports a new `--domain` flag for composable validation (validate core alone or core plus any combination of domains)
- `LOAD_PRIORITY` in `tools/lib/constants.js` updated with promoted types reordered in Core and extended types added for backward compatibility

### Adapter Fixes

JSM Cloud:

- Fixed attribute name resolution for Cloud AQL queries
- Fixed 2-digit year date normalization
- Fixed semicolon-delimited multi-ref comparison

ServiceNow:

- Fixed scoped prefix table names for new types in the ServiceNow overlay

### Validation Results

- JSM Cloud: 26/26 types synced, 133/133 records validated
- ServiceNow PDI: tables created and data imported successfully

## 0.1.0 - 2026-03-02

Initial public release.

### Schema

- Base schema layer with 20 types (10 CI types, 10 lookups)
- Extended schema layer with 55 types covering change management, incident tracking, licensing, certifications, baselines, and network management
- ITIL 4 aligned type hierarchy with four root branches: Product CMDB, Product Library, Directory, Lookup Types
- OvocoCRM example data for both schema layers

### Tools

- Offline schema and data validation (`tools/validate.js`) with 9 check categories
- CSV template generator (`tools/generate-templates.js`) with role-based filtering and XLSX support
- CSV to JSON converter (`tools/csv-to-json.js`) with format auto-detection
- Deployment readiness checker (`tools/deployment-readiness.js`)
- Data backup script (`tools/backup-data.sh`)

### Adapters

- JSM Assets reference adapter with import, export, and post-import validation
- Schema sync, data sync (create/update/upsert), and dry-run modes
- Export with diff comparison capability
- Field audit and configuration tools

### Documentation

- Getting started guide
- Schema reference with full type and attribute listing
- ITIL 4 practice mapping
- CSV workflow guide for Excel-based data entry
- Adapter development guide
