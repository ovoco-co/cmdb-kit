# SCCM Domain

**Feature Branch**: sccm-domain
**Created**: 2026-03-26
**Status**: Done (foundation complete)
**Input**: SCCM infrastructure patterns, Core + Domains architecture, UAF Security viewpoint

## User Scenarios and Testing

### P1: Security team tracks SCCM infrastructure alongside product-delivery CMDB

**Why this priority**: SCCM is a common attack surface in enterprise environments. Site hierarchies, distribution points, and service accounts are rarely tracked in the CMDB, which means security teams can't trace findings back to specific infrastructure components.

**Independent Test**: Import Core and the SCCM domain, verify SCCM types reference Core types correctly.

**Acceptance Scenarios**:

- Given a user has Core schema imported
  When they add the SCCM domain
  Then 7 CI types and 3 lookup types are added to their schema
  And SCCM Sites reference Core Server types
  And SCCM Service Accounts reference Core Organization types

- Given realistic SCCM data is loaded
  When the user queries by SCCM Site hierarchy
  Then parent-child site relationships are navigable
  And distribution points, service accounts, and security findings are linked to their sites

### P2: Security assessor maps findings to SCCM infrastructure

**Why this priority**: Findings need to trace back to specific SCCM components for remediation.

**Independent Test**: Create an SCCM Finding linked to a specific Site and verify the relationship.

**Acceptance Scenarios**:

- Given an SCCM Finding record exists
  When it references an SCCM Site and Finding Category
  Then the assessor can trace from finding to site to server to organization

### P3: Domain is imported into both target platforms

**Why this priority**: The domain must work on JSM Assets and ServiceNow, not just in local files.

**Independent Test**: Import SCCM domain alongside Core into JSM and ServiceNow.

**Acceptance Scenarios**:

- Given Core is imported into JSM Assets
  When the SCCM domain is imported using the --domain flag
  Then all SCCM types and attributes appear in JSM Assets

- Given Core is imported into ServiceNow
  When the SCCM domain is imported
  Then all SCCM types and attributes appear as custom CI classes

## Edge Cases

- SCCM type names conflict with types in another domain
- SCCM domain is imported without Core (should fail with clear error referencing missing Server/Organization types)
- Site hierarchy has circular parent references
- Service account belongs to an Organization not yet imported

## Requirements

### Functional Requirements

- FR-001: Define 7 CI types: SCCM Site, SCCM Finding, SCCM Collection, SCCM Boundary Group, SCCM Security Role, SCCM Service Account, SCCM Role Type
- FR-002: Define 3 lookup types: SCCM Site Type, SCCM Site Role, SCCM Finding Category
- FR-003: Provide example data files with realistic SCCM hierarchy
- FR-004: Connect to Core through Server and Organization types
- FR-005: Domain README with usage guide
- FR-006: Import works alongside Core on both JSM Assets and ServiceNow

### Key Entities

- SCCM Site (primary CI, references Server)
- SCCM Finding (security assessment result, references Site and Finding Category)
- SCCM Collection (device/user grouping)
- SCCM Boundary Group (network boundary definition)
- SCCM Security Role (RBAC role)
- SCCM Service Account (service identity, references Organization)
- SCCM Role Type (lookup)
- SCCM Site Type, SCCM Site Role, SCCM Finding Category (lookups)

## Schema

Located in `schema/domains/sccm/`. Each type has a JSON schema file defining attributes, and example data files demonstrating realistic SCCM configurations.

The domain connects to Core through the Server and Organization types: SCCM Sites run on Servers, and Service Accounts belong to Organizations.

## Dependencies

- Blocked by: Core + Domains restructure (for final integration path)
- Blocks: Nothing (proof of concept is self-contained)

## Success Criteria

- SC-001: All 7 CI types and 3 lookup types validate with tools/validate.js using the --domain flag
- SC-002: Example data demonstrates realistic SCCM site hierarchy with parent-child relationships
- SC-003: Domain imports alongside Core into JSM Assets without breaking existing Core types
- SC-004: Domain imports alongside Core into ServiceNow without breaking existing Core types

## Assumptions

- SCCM infrastructure patterns are sufficiently common to justify a dedicated domain
- The Security UAF viewpoint is the correct alignment for SCCM-related types
- Server and Organization are stable Core types that won't change names or structure
- Blog Post 21 (SCCM domain) serves as both documentation and marketing content
