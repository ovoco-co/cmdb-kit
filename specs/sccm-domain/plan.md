# SCCM Domain Plan

## Architecture Decisions

### Domain scope

The SCCM domain models Microsoft SCCM (System Center Configuration Manager, now Microsoft Endpoint Configuration Manager) infrastructure as CMDB configuration items. It covers the management plane, not the managed devices. This means tracking SCCM site hierarchies, distribution points, service accounts, security roles, boundary groups, and security assessment findings.

No commercial CMDB plugin models SCCM infrastructure itself. ServiceNow's SCCM integration (ITOM Discovery) discovers SCCM-managed devices, not the SCCM management plane. JSM Assets Data Manager's SCCM adapter pulls computer inventory, not SCCM site structure. This domain fills that gap.

### Type hierarchy

Seven CI types and three lookup types:

- SCCM Site: top of the hierarchy, represents a CAS, primary, or secondary site
- SCCM Site Role: distribution points, management points, SUPs, and other roles running on a site
- SCCM Collection: device and user collections with membership rules
- SCCM Security Role: RBAC roles controlling access
- SCCM Service Account: service accounts used by SCCM components
- SCCM Boundary Group: network boundaries for content distribution
- SCCM Finding: security assessment findings linked to specific SCCM components
- SCCM Site Type (lookup): CAS, Primary, Secondary
- SCCM Role Type (lookup): Distribution Point, Management Point, SUP, Reporting Point, etc.
- SCCM Finding Category (lookup): categorizes findings by security concern area

### Cross-schema references

The SCCM domain connects to Core through:

- SCCM Site references Server (the server hosting the site)
- SCCM Service Account references Organization
- SCCM Finding references Assessment and Priority (from Compliance domain and Core respectively)

This creates the dependency: SCCM requires Core and Compliance.

### UAF alignment

Security domain, specifically the resource security sub-domain. SCCM is the endpoint management plane. Modeling it as infrastructure CIs with security findings attached is the security viewpoint applied to endpoint management.

## Implementation Approach

The SCCM domain is the first domain built and serves as the pattern for all subsequent domains. It is already implemented at `schema/domains/sccm/` with the following structure:

```
schema/domains/sccm/
+-- schema-structure.json
+-- schema-attributes.json
+-- data/
|   +-- sccm-site.json
|   +-- sccm-site-type.json
|   +-- sccm-site-role.json
|   +-- sccm-role-type.json
|   +-- sccm-collection.json
|   +-- sccm-boundary-group.json
|   +-- sccm-security-role.json
|   +-- sccm-service-account.json
|   +-- sccm-finding.json
|   +-- sccm-finding-category.json
+-- README.md
```

### What needs updating

The current implementation references types from the extended schema tier (Server, Network Segment, Assessment). After the Core + Domains restructure, these references need to point to Core types (Server, Network Segment) and Compliance domain types (Assessment, Assessment Status). The validation tool needs to confirm that the SCCM domain loads cleanly when both Core and Compliance are present.

### Adapter support

Both adapters need to handle domain imports:

- JSM adapter: create SCCM object types in the Assets workspace alongside Core types, with cross-schema references resolved
- ServiceNow adapter: create SCCM custom CI classes (extending cmdb_ci) with identification rules, map to x_cmdbk_sccm_* tables

### Platform plugin mapping

| Platform | What it replaces |
|----------|-----------------|
| ServiceNow | ITOM Discovery SCCM integration (discovers managed devices, not SCCM infrastructure) |
| JSM | Assets Data Manager SCCM adapter (pulls computer inventory, not SCCM site structure) |

## Phases

### Phase 1: Foundation (done)

Schema files, example data, and documentation for standalone use.

### Phase 2: Core integration

Update type references to use Core naming conventions. Validate that SCCM loads alongside Core and Compliance without reference errors.

### Phase 3: Adapter testing

Import SCCM domain types into both JSM Assets and ServiceNow alongside Core. Verify cross-schema references resolve correctly. Test that SCCM types appear in the correct hierarchy.

### Phase 4: Automation patterns

Document SCCM-specific automations for each platform:

- Finding import from external security assessment tools
- Scheduled finding review alerts
- Service account expiration tracking

## Dependencies

- Blocked by: Core + Domains restructure (for final integration path)
- Depends on: Compliance domain (SCCM Finding references Assessment)
- Blocks: Nothing (proof of concept is self-contained)

## File Paths

| File | Purpose |
|------|---------|
| `schema/domains/sccm/schema-structure.json` | SCCM type hierarchy |
| `schema/domains/sccm/schema-attributes.json` | SCCM field definitions |
| `schema/domains/sccm/data/*.json` | Example data (10 files) |
| `schema/domains/sccm/README.md` | Domain documentation |
| `docs/Extending/sccm-security-assessment.md` | SCCM usage guide |
