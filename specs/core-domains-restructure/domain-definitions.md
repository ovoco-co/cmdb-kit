# Domain Definitions

**Purpose**: Group non-Core questions by the team that asks them, define the types each domain needs, and identify what commercial plugins each domain replaces.

**Method**: Start from the question categories in the source documents, identify who asks those questions, then define the types they need. A domain is a set of types that a specific team uses. Core types are available to all domains.

## How Domains Work

- Core answers: "What do we ship and where does it go?"
- Each domain answers a specialized set of questions for a specific team.
- A domain can reference Core types but Core never references domain types.
- Domains can reference other domains only when explicitly declared.
- Each domain ships as an opt-in package with its own schema files, data files, and documentation.

## Domain Summary

| Domain | Team | Core Question Category | Questions Answered |
|--------|------|----------------------|-------------------|
| Compliance | Security, Accreditation | Security and Compliance, Assessments | What certifications and assessments exist? What is the ATO status? |
| Distribution | CM Library, Media | Media and Distribution, DML Hygiene | What media was shipped where? What is on the DML? |
| Requirements | Systems Engineering | Requirements and Traceability | What requirements exist? What is the test coverage? |
| Licensing | Procurement, Finance | Licenses and Contracts | What licenses do we have? What contracts cover them? |
| Change Control | CCB, CM Analysts | Change Control | What changes are open? What was the CCB decision? |
| Asset Lifecycle | IT Asset Management | Asset Lifecycle and Disposal | What phase is this asset in? When does it retire? |
| Infrastructure | SRE, Platform Ops | Deployment (infrastructure detail) | What hardware models, VMs, network segments support deployments? |
| Personnel | HR, Security, Training | People (extended) | What clearances, training, certifications does this person have? |

## Domain: Compliance

**Who uses it**: Security team, accreditation staff, ISSM, NCDSMO reviewers

**What it answers**:
- What certifications exist for this product version? (NCDSMO, ATO)
- What security assessments have been conducted? (LBSA, SBSA, Fortify, SCAP)
- What is the assessment status and finding count?
- What ATO applies to this deployment site?
- What STIG compliance status applies to each component?
- What eMASS ID is associated with this system?
- What remediation is outstanding?

**Types**:
- Assessment (exists in extended)
- Assessment Type (exists in extended)
- Assessment Status (exists in extended)
- Certification (exists in extended)
- Certification Type (exists in extended)
- Certification Status (exists in extended)

**Depends on Core**: Product, Product Version, Deployment Site, Person

**Replaces**: ServiceNow GRC, Atlassian Marketplace compliance plugins

**Source questions**: 199-209 (set 1), 153-164 (set 2)

## Domain: Distribution

**Who uses it**: CM librarians, media custodians, shipping coordinators

**What it answers**:
- What media was delivered to this site, and when?
- What delivery method was used?
- What is the distribution status (Preparing, In Transit, Received, Verified)?
- Has the site confirmed receipt?
- What is on the DML, and is it clean?
- What files are misplaced, duplicated, or corrupted?
- What documentation suite ships with each version?

**Types**:
- Distribution Log (exists in extended)
- Product Media (exists in extended)
- Product Suite (exists in extended)
- Documentation Suite (exists in extended)

**Lookup types**:
- Distribution Status (enterprise)
- Delivery Method (enterprise)
- Media Urgency (enterprise)
- Transfer Status (enterprise)
- Media Type (enterprise)

**Depends on Core**: Product Version, Deployment Site, Person, Document

**Replaces**: No direct plugin equivalent. Custom SharePoint/spreadsheet solutions.

**Source questions**: 147-163 (set 1), 121-137 (set 2), 222-235 (set 1 DML Hygiene)

## Domain: Requirements

**Who uses it**: Systems engineers, requirements analysts, test engineers

**What it answers**:
- What requirements exist for this product?
- What is the verification status and method for each requirement?
- What is the forward traceability coverage?
- What orphan requirements or CRs exist?
- What changed between baseline snapshots?
- What test coverage percentage exists?

**Types**:
- Requirement (enterprise)
- Verification Method (enterprise)

**Lookup types**:
- Requirement Type (enterprise)
- Requirement Status (enterprise)
- Requirement Priority (enterprise)

**Depends on Core**: Product, Product Version, Baseline, Feature

**Replaces**: IBM DOORS, Jama Connect, RMSIS (when CMDB tracking is needed alongside the requirements tool)

**Source questions**: 182-198 (set 1), 165-179 (set 2)

## Domain: Licensing

**Who uses it**: Procurement, finance, contract administrators, IT asset managers

**What it answers**:
- What license type covers this software?
- How many licenses are allocated versus consumed?
- What contract covers this asset?
- What is the acquisition cost and current valuation?
- What warranty covers this hardware?

**Types**:
- License (exists in extended)
- License Type (exists in extended)
- License Status (exists in extended)
- Contract (enterprise)
- Cost Category (enterprise)
- Vendor (exists in extended)
- Vendor Status (exists in extended)

**Lookup types**:
- Contract Status (enterprise)

**Depends on Core**: Product, Deployment Site, Organization

**Replaces**: ServiceNow SAM (Software Asset Management), Flexera, Snow License Manager

**Source questions**: 210-221 (set 1), 182-192 (set 2 IT Asset Lifecycle, licensing subset)

## Domain: Change Control

**Who uses it**: CCB members, CM analysts, program managers

**What it answers**:
- What CRs and PRs are open against this product?
- What is the CCB disposition?
- What baselines are affected by this change?
- What work plan was approved?
- Has closed-loop verification been completed?
- What is the change cycle time?

**Types**: None new. Change control records (CRs, PRs, ECOs) are process records that belong in Jira/ServiceNow, not the CMDB. This domain is documentation and query patterns, not new CI types.

**Depends on Core**: Product, Product Version, Baseline, Person

**Note**: The constitution says "Process records (incidents, changes, problems) belong in Jira, not the CMDB." This domain provides guidance on how to connect Jira/ServiceNow change records to CMDB CIs, not new types.

**Source questions**: 164-181 (set 1), 138-152 (set 2)

## Domain: Asset Lifecycle

**Who uses it**: IT asset managers, property custodians, disposal officers

**What it answers**:
- What lifecycle phase is this asset in?
- What is the acquisition cost and depreciation?
- When is this asset scheduled for retirement?
- What disposal method was used?
- What destruction certification exists?

**Types**:
- Disposition (enterprise lookup)
- Disposal Method (enterprise lookup)

**Depends on Core**: Product, Server, Database, Organization, Person

**Note**: Most asset lifecycle attributes (acquisition cost, depreciation, lifecycle phase) are additional attributes on existing Core types (Server, Database) rather than new types. This domain adds attributes to Core types via overlay.

**Replaces**: ServiceNow HAM (Hardware Asset Management), Ivanti Neurons for ITAM

**Source questions**: 245-254 (set 1), 180-192 (set 2)

## Domain: Infrastructure

**Who uses it**: SRE, platform ops, network engineers, data center managers

**What it answers**:
- What hardware models are approved for this product?
- What VMs and containers run at each site?
- What network segments exist and what is connected to each?
- What is the rack position of this server?
- What facility type hosts this deployment?

**Types**:
- Hardware Model (exists in extended)
- Virtual Machine (exists in extended)
- Network Segment (exists in extended)
- Network Type (exists in extended)
- Location (exists in extended)
- Facility (exists in extended)

**Depends on Core**: Server, Database, Deployment Site, Organization

**Replaces**: ServiceNow Discovery (for the schema portion, not the discovery engine), Atlassian Marketplace CMDB connector apps

**Source questions**: 78-97 (set 1 deployment infrastructure), 43-60 (set 2 deployment infrastructure)

## Domain: Personnel

**Who uses it**: HR, security officers, training coordinators, facility managers

**What it answers**:
- What security clearance does this person hold?
- What training has this person completed?
- What facility access does this person have?
- What professional certifications does this person hold?
- What CM skill level has this person achieved?

**Types**: New types needed:
- Clearance (person's security clearance record)
- Training Record (completed training)
- Facility Access (person's access to specific facilities)

These extend the Person type in Core with specialized tracking. The Core Person type has phone, jobTitle, manager. The Personnel domain adds clearance, training, and access tracking.

**Depends on Core**: Person, Organization, Team

**Replaces**: No direct CMDB plugin. Usually tracked in HR systems or spreadsheets.

**Source questions**: 117-129 (set 1), 90-106 (set 2)

## Questions Not Assigned to a Domain

These question categories don't warrant their own domain:

### Upgrade Campaign Management (questions 255-260)
These are workflow/reporting questions answered by queries against Core types (Deployment Site version vs current Product Version). No new types needed. Documentation should cover the query patterns.

### Supplier and Subcontractor (questions 261-265)
The Vendor type in the Licensing domain covers this. No separate domain needed.

### DML and Library Hygiene (questions 222-235)
These are audit procedures, not CI types. The Distribution domain covers the DML types. Hygiene checks are automation/scripting, not schema.

### Audits and Verification (questions 236-244)
These are process outcomes (FCA, PCA results). The Compliance domain covers assessments. Audit results are typically process records in Jira/ServiceNow.

### Service Management and Workflows (questions 193-204, set 2)
Process records. Service requests, SLA timers, and automation rules belong in Jira/ServiceNow, not the CMDB.

### Air-Gapped Operations (questions 205-213, set 2)
Operational procedures for the import tools, not schema types. Covered in documentation.

### Organizational Structure (questions 214-222, set 2)
Core already has Organization, Team, Person. The Infrastructure domain adds Location and Facility. No separate domain needed.

## Implementation Priority

| Priority | Domain | Reason |
|----------|--------|--------|
| 1 | Infrastructure | Types already exist in extended. Most requested by users. |
| 2 | Compliance | Types already exist in extended. Required for defense customers. |
| 3 | Distribution | Types already exist in extended. Unique to CMDB-Kit (no competitor). |
| 4 | Licensing | Types already exist in extended. Competes with established tools. |
| 5 | Requirements | Types exist in enterprise. Niche audience. |
| 6 | Personnel | New types needed. Smallest audience. |
| 7 | Asset Lifecycle | Mostly attribute additions, not new types. |
| 8 | Change Control | No new types. Documentation only. |
