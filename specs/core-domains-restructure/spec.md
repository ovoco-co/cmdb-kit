# Core + Domains Schema Restructure

**Feature Branch**: core-domains-restructure
**Created**: 2026-03-24
**Status**: Done (PR #2 merged 2026-03-28)
**Input**: Schema restructure plan, Constitution (13 principles), UAF viewpoint alignment

## User Scenarios and Testing

### P1: User installs only the types they need

**Why this priority**: The tier model forces users to pick a size. A small team needing compliance tracking must jump from base (20 types) to extended (55 types) just to get 3 compliance types. This is the core problem the restructure solves.

**Independent Test**: Install Core, then add a single domain. Verify the domain adds only its types without pulling in unrelated types.

**Acceptance Scenarios**:

- Given a user has imported Core schema into JSM Assets
  When they add the SCCM domain
  Then only SCCM-specific types (7 CI types, 3 lookups) are added to their schema
  And no unrelated types from other domains are included

- Given a user has imported Core schema into ServiceNow
  When they add the Compliance domain
  Then only Compliance types (Assessment, Finding, Control, Evidence) are added
  And existing Core types and data are unaffected

### P2: Existing tier-based user migrates to Core + Domains

**Why this priority**: Existing users on base/extended need a documented path forward without data loss.

**Independent Test**: Take existing base schema import, apply migration steps, verify all data survives.

**Acceptance Scenarios**:

- Given a user has cmdb-kit base (20 types) imported in JSM Assets
  When they follow the documented migration path to Core
  Then all existing types and data are preserved
  And new Core types are available

### P3: Domain author creates a new domain package

**Why this priority**: The architecture must support community contributions of new domains.

**Independent Test**: Create a new domain directory with schema files and verify it imports alongside Core.

**Acceptance Scenarios**:

- Given a contributor creates a new domain directory with schema-structure.json and schema-attributes.json
  When they run validation with --domain flag
  Then the domain validates independently
  And the domain can be imported alongside Core without conflicts

## Edge Cases

- Two domains define a type with the same name (collision detection needed)
- A domain references a Core type that was removed or renamed
- A domain is installed without Core (should fail with clear error)
- Migration from extended tier where some types now live in domains

## Requirements

### Functional Requirements

- FR-001: Replace three-tier schema model (base/extended/enterprise) with Core + Domains architecture
- FR-002: Core contains product-delivery CMDB essentials that every deployment needs
- FR-003: Domains are opt-in packages for specialized concerns, each aligned to a UAF viewpoint
- FR-004: Any domain can be added independently without breaking Core
- FR-005: Each domain has its own directory with schema files, example data, and README
- FR-006: Existing base/extended users have a documented migration path
- FR-007: Adapters (JSM and ServiceNow) handle domain-aware imports

### Key Entities

- Core types: Products, Product Versions, Product Components, Features, Deployments, Deployment Sites, Baselines, Servers, Databases, Documents, VMs, Hardware Models, Network Segments, Organizations, Teams, Persons, Locations, Facilities, Vendors, plus standard lookup types
- Domains: Compliance, Licensing, EA (Services/Capability), Distribution, Requirements, Financial, SCCM

### Domains Identified

| Domain | Concern | UAF Viewpoint | Types |
|--------|---------|---------------|-------|
| Compliance | Audit, assessment, findings | Security | Assessment, Finding, Control, Evidence |
| Licensing | Software licensing, entitlements | Resource | License, Entitlement, License Pool |
| EA (Services/Capability) | Service modeling, capability mapping | Services | Business Service, Application Service, Capability |
| Distribution | Media prep, shipment, chain of custody | Operational | Distribution Request, Media, Shipment |
| Requirements | Requirement traceability | Requirements | Requirement, Allocation, Trace Link |
| Financial | Cost tracking, TBM tower mapping | Resource | Cost Center, Budget Line, Tower |
| SCCM | Microsoft SCCM site management, security | Security | SCCM Site, Finding, Collection, Boundary Group, Security Role, Service Account |

## Dependencies

- Nothing blocks this work
- This blocks: ServiceNow adapter propagation, documentation rewrite, Forge app, drift detection, all future domains

## Success Criteria

- SC-001: Core schema imports cleanly into both JSM Assets and ServiceNow CMDB
- SC-002: Any domain can be added independently without breaking Core
- SC-003: Existing base/extended users have a documented migration path
- SC-004: Each domain has its own directory with schema files, example data, and README

## Assumptions

- UAF viewpoint alignment is sufficient for domain categorization
- The SCCM domain serves as a valid proof of concept for the domain architecture
- Core type list is stable and covers the essential product-delivery CMDB needs
- Community contributors will follow the domain directory convention
