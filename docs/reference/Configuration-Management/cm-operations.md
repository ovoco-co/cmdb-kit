# CM Operations

Configuration management is not a single activity. It is four interlocking disciplines, each with distinct roles, artifacts, and CMDB types. This section explains how those disciplines map to the portfolio mode schema, who performs each function, and how the pieces fit together at Ovoco.


## CM Department Structure

A CM function needs two things: clear ownership and separation from development. The people who build the product should not be the same people who control its baselines. At Ovoco, this separation exists at the organizational level.

Ovoco Inc has two divisions: Ovoco Engineering (builds products) and Ovoco Operations (runs infrastructure and manages releases). The Release Engineering team, led by Lisa Kim, sits under Ovoco Engineering but operates independently from the platform development teams. This team owns the CM function.

```
Ovoco Inc
  Ovoco Engineering
    CRM Platform Team (Sarah Chen)              - builds OvocoCRM
    Analytics Platform Team (Michael Torres)    - builds OvocoAnalytics
    Release Engineering (Lisa Kim)              - CM function
  Ovoco Operations
    CRM Operations (David Park)                 - runs OvocoCRM sites
    Analytics Operations (Emily Rodriguez)      - runs OvocoAnalytics sites
    Infrastructure Team (James Wilson)          - shared infrastructure
```

Release Engineering is the CM team. In the CMDB, these relationships are captured through the Team type's `organization` and `teamLead` references. The Release Engineering record points to Ovoco Engineering as its parent organization and Lisa Kim as its lead.

For a larger organization, the CM function might be its own division with sub-teams for each discipline (library management, change control, status accounting). For Ovoco's scale, a single team handling all four disciplines is sufficient.


## The Four CM Pillars

ITIL and ISO 10007 both define configuration management through four activities. The portfolio mode schema has types that support each one.

### Configuration Identification

Configuration identification answers: what are we managing, and how do we name it? This is the act of selecting CIs, assigning identifiers, and recording their attributes.

In the portfolio mode schema, identification is the act of creating records. Every CI type in the Product CMDB branch (CR Product, CR Product Version, CR Server, CR Component Instance) represents something that has been identified as worth tracking. The naming convention matters: `OvocoCRM 2.4.0` is a Product Version, not a Product. `CR PBL 2.4.0` is a Baseline, not a Version.

Key schema types for identification:

| Type | Purpose | Key Attributes |
|------|---------|----------------|
| CR Product | Identifies a managed product | productType, currentVersion, vendor |
| CR Product Version | Identifies a specific release | versionNumber, versionStatus, releaseDate |
| CR Product Component | Identifies a subsystem | componentType, product |
| CR Component Instance | Identifies a deployed copy | server, productVersion |

The naming convention for baselines follows the pattern `[Product Prefix]-[Baseline Type]-[Version]`. For OvocoCRM baselines, this produces names like `CR PBL 2.4.0` (Product Baseline for version 2.4.0). The prefix `CR` distinguishes OvocoCRM baselines from OvocoAnalytics baselines (which use `AN`).

### Configuration Control

Configuration control answers: who can change what, and how do changes get approved? This is the discipline of evaluating, approving, and tracking changes to baselined CIs.

The portfolio mode schema supports configuration control through the Change Request type and the CR Baseline type. A Change Request records who asked for the change, what type it is, what impact it has, and what the CCB decided. A Baseline records the approved configuration at a point in time.

The Change Request type:

```json
{
  "Name": "CHG-001 Database Migration",
  "description": "Migrate PostgreSQL from 15 to 16",
  "changeType": "Normal",
  "impact": "High",
  "requestedBy": "Sam Rivera",
  "requestDate": "2025-12-01",
  "status": "Completed",
  "ccbDecision": "Approved",
  "ccbDate": "2025-12-05"
}
```

The `changeType` field references the Change Type lookup (Normal, Standard, Emergency). The `impact` field references Change Impact (High, Medium, Low). The `ccbDecision` field is free text, but in practice should contain one of: Approved, Approved with Conditions, Rejected, Deferred, or Tabled.

Configuration control also involves the CR Feature Implementation type. When a feature is approved for a release, a Feature Implementation record locks it to a specific Product Version with a frozen date:

```json
{
  "Name": "CR Advanced Reporting v2.4.0",
  "parentFeature": "CR Advanced Reporting",
  "productVersion": "OvocoCRM 2.4.0",
  "implementationStatus": "Frozen",
  "frozenDate": "2025-09-01",
  "jiraEpic": "CR-1234"
}
```

The `frozenDate` is the point after which the implementation cannot change without a new Change Request. This is the connection between change control and baseline management.

### Configuration Status Accounting

Configuration status accounting answers: what is the current state of every CI, and what has changed since the last baseline? This is the record-keeping discipline.

Status accounting is not a single type in the schema. It is the aggregate view across all types. The relevant status fields include:

- `versionStatus` on CR Product Version (Current, Previous, Planned, Sunset)
- `baselineStatus` on CR Baseline (Draft, Approved, Superseded)
- `implementationStatus` on CR Feature Implementation (Planned, In Progress, Frozen)
- `distributionStatus` on Library Item (Available, Restricted, Hold, Superseded, Archived)
- `deploymentStatus` on CR Server (Deployed, Staging, Decommissioned)
- `siteStatus` on CR Deployment Site (Active, Planned, Decommissioned)

A status accounting report is essentially a set of queries across these fields: how many servers are running version 2.4.0, which sites have not upgraded from 2.3.x, which baselines are current vs superseded, which library items are available for distribution. The CMDB is the system of record for all of these.

The CR Baseline type is central to status accounting. Each baseline captures a snapshot:

```json
{
  "Name": "CR PBL 2.4.0",
  "description": "Product Baseline for OvocoCRM 2.4.0",
  "productVersion": "OvocoCRM 2.4.0",
  "baselineType": "PBL",
  "baselineStatus": "Approved",
  "milestone": "PCA",
  "createdDate": "2025-09-10",
  "approvedDate": "2025-09-14"
}
```

By comparing the current baseline to the previous one (via the `previousBaseline` reference), you can determine exactly what changed between releases.

### Configuration Audit

Configuration audit answers: does the actual configuration match what the CMDB says? This is the verification discipline.

Two types of audit apply:

Functional Configuration Audit (FCA) verifies that a CI performs as its requirements specify. In CMDB terms, this means checking that every Requirement linked to a Product Version has status "Verified" and that every Feature Implementation is "Frozen" with a jiraEpic that has passed testing.

Physical Configuration Audit (PCA) verifies that the as-built configuration matches the as-designed configuration. In CMDB terms, this means checking that every CR Deployment Site has the `productVersion` that matches the current baseline, that every CR Server at that site runs the expected version, and that the Library Item distributed to the site has a valid checksum.

The Baseline Milestone lookup captures both audit types:

| Name | Milestone Phase |
|------|-----------------|
| SRR | Requirements |
| PDR | Design |
| CDR | Design |
| TRR | Testing |
| FCA | Audit |
| PCA | Audit |

FCA and PCA are the final milestones before a baseline is approved. SRR through TRR are intermediate reviews that build confidence as the product matures through its lifecycle.


## How the Four Pillars Connect

The pillars are not independent. They form a cycle:

1. Identification creates CI records and assigns them to a baseline
2. Control gates changes to those CIs through CCB approval
3. Status accounting tracks the cumulative effect of approved changes
4. Audit verifies the CMDB still reflects reality

In practice at Ovoco, this cycle plays out with each release. When OvocoCRM 2.4.0 was planned, the CRM Platform Team identified the features going into the release (CR Feature records). The CCB approved each change (Change Request records with ccbDecision "Approved"). Release Engineering tracked status through Feature Implementation records, freezing each one as code complete. Before release, FCA confirmed that requirements were verified and PCA confirmed the release package matched the baseline. The baseline record `CR PBL 2.4.0` was approved after PCA on 2025-09-14.

The CMDB types that carry this cycle:

| Pillar | Primary Types | Key Status Fields |
|--------|---------------|-------------------|
| Identification | CR Product, CR Product Version, CR Product Component | versionStatus |
| Control | Change Request, CR Feature Implementation, CR Baseline | ccbDecision, implementationStatus |
| Status Accounting | All types (aggregate queries) | All status fields |
| Audit | CR Baseline, Requirement, CR Deployment Site | baselineStatus, milestone |


## Baseline Types

The portfolio mode schema defines three baseline types, each representing a different level of maturity. These follow the standard systems engineering progression.

**Functional Baseline (FBL)** captures the approved requirements. An FBL is established at System Requirements Review (SRR) and says: "These are the requirements this version must satisfy." In the CMDB, an FBL record links to a Product Version and references Requirement records through the `documents` field (which points to CR Document records containing the requirements specification).

**Allocated Baseline (ABL)** captures the approved design. An ABL is established at Critical Design Review (CDR) and says: "This is how the product will be built to satisfy those requirements." An ABL adds Component Instance records to the baseline, showing which components implement which requirements.

**Product Baseline (PBL)** captures the approved product. A PBL is established at Physical Configuration Audit (PCA) and says: "This is the verified, tested product ready for distribution." The existing data shows `CR PBL 2.4.0` approved after PCA, which is the correct milestone for a product baseline.

The progression:

| Baseline Type | Established At | What It Captures |
|---------------|---------------|------------------|
| FBL | SRR | Approved requirements |
| ABL | CDR | Approved design (components allocated to requirements) |
| PBL | PCA | Approved product (tested, verified, ready for distribution) |

Each baseline record has a `previousBaseline` reference, creating a chain. When OvocoCRM 2.5.0 reaches PCA, a new `CR PBL 2.5.0` will be created with `previousBaseline` pointing to `CR PBL 2.4.0`.


## Role Definitions

CM requires specific roles with defined authority. These roles map to Person records in the CMDB, but the CMDB tracks them through team membership and job title rather than through a dedicated "CM Role" type. The distinction matters: a person can hold multiple CM roles, and roles can shift between people.

### CM Lead

The CM Lead owns the CM function. At Ovoco, this is Lisa Kim (Release Engineering team lead).

Responsibilities:
- Approves baselines before they go to the CCB
- Resolves disputes between development teams and operations on change classification
- Signs off on Library Item verification (quality gate G4)
- Chairs or participates in all CCB meetings
- Owns the CMDB schema (decides what types and attributes exist)
- Authorizes exceptions to CM processes

In the CMDB, the CM Lead appears as the `teamLead` on the Release Engineering team record and as the `approvedBy` reference on CR Baseline records.

### CM Analyst

The CM Analyst performs the day-to-day CM work: registering CIs, processing Change Requests, maintaining baselines, running status reports.

Responsibilities:
- Creates and maintains CI records across all Product CMDB types
- Validates Change Request submissions for completeness
- Updates Feature Implementation status as development progresses
- Generates baseline comparison reports
- Runs coverage analysis (requirements traced to implementations)
- Performs initial triage on incoming changes

At Ovoco's scale, members of the Release Engineering team share the CM Analyst role. In a larger organization, this would be a dedicated position.

### Librarian

The Librarian manages the Definitive Media Library (DML), the controlled store of approved software releases and documentation. This role owns the Library Item records.

Responsibilities:
- Receives software deliverables from development teams
- Verifies integrity (checksums, file counts, naming conventions)
- Creates Library Item records in the CMDB
- Manages distribution status (Available, Restricted, Hold, Superseded, Archived)
- Maintains the `supersedes` chain between Library Item versions
- Controls physical or logical access to the library location

In the portfolio mode schema, the Library Item type carries the Librarian's work:

```json
{
  "Name": "OvocoCRM v2.4.0 Release Package",
  "itemType": "Software Release",
  "distributionStatus": "Available",
  "fileCount": "12",
  "totalSize": "245 MB",
  "checksum": "sha256:a1b2c3...",
  "libraryLocation": "/releases/ovococrm/2.4.0/",
  "receivedDate": "2026-02-28",
  "storedDate": "2026-02-28"
}
```

The `receivedDate` and `storedDate` pair captures the intake process: the Librarian receives the package and, after verification, stores it in the library. The gap between these dates indicates verification time. Same-day values (as above) suggest a streamlined process.

### CCB Chair

The CCB Chair runs Configuration Control Board meetings and has the deciding vote on change approval.

Responsibilities:
- Schedules and chairs CCB meetings
- Ensures quorum before decisions are taken
- Records decisions in the ccbDecision field on Change Request records
- Escalates cross-product changes to a portfolio-level review
- Invokes emergency change procedures when needed

At Ovoco, the CCB structure has two levels. The CRM Product CCB is chaired by Sarah Chen (CRM Platform Team lead) and reviews changes to OvocoCRM. A Portfolio CCB, chaired by a director-level person, reviews changes that affect multiple products or shared infrastructure.

Emergency changes (like CHG-002, the contact import hotfix) bypass the regular CCB schedule. The emergency procedure requires a minimum of two reviewers with unanimous approval. Notice that CHG-002 has the same date for `requestDate` and `ccbDate` (2026-02-08), showing same-day emergency approval.

### PMO (Program Management Office)

The PMO represents the business side of change management. The PMO triages changes by priority, evaluates business impact, and decides whether a change belongs in the current release or gets deferred.

Responsibilities:
- Triages incoming Change Requests by business priority
- Evaluates five dimensions of impact: technical, cost, schedule, risk, performance
- Approves or rejects work plans (the effort estimate for implementing a change)
- Accepts deliverables during the Library Intake process
- Owns release scheduling decisions

At Ovoco, the PMO function is distributed. David Park (CRM Operations lead) handles operational priorities and site impact assessment. Sarah Chen handles feature prioritization for the CRM product. For changes that affect both products, the decision escalates to a joint review.


## CMDB Types That Support CM

The portfolio mode schema has six types specifically designed for CM operations. These all live under the OvocoCRM Library and Configuration Library branches of the schema hierarchy.

| Type | Schema Branch | CM Pillar | Records in Example Data |
|------|--------------|-----------|------------------------|
| Change Request | Shared Library | Control | 3 |
| CR Baseline | OvocoCRM Library | Identification, Status Accounting | 1 |
| CR Document | OvocoCRM Library | Identification | varies |
| CR Documentation Suite | OvocoCRM Library | Identification | varies |
| Library Item | Configuration Library | Control, Status Accounting | 3 |
| CR Feature Implementation | OvocoCRM Library | Control | 2 |

These six types, combined with the Requirement type and the various lookup types (Baseline Type, Baseline Milestone, Baseline Status, Change Type, Change Impact, Library Item Type, Distribution Status), form the schema foundation for the four CM pillars.

The CR Documentation Suite type groups related CR Documents into versioned packages. For example, a documentation suite for OvocoCRM 2.4.0 would contain the admin guide, API reference, and release notes as individual CR Document records. The suite carries its own `approvalDate` and `suiteStatus`, enabling controlled release of documentation alongside software.


## Mapping Roles to CMDB Permissions

Not every CM role needs the same level of access. The general principle: CM staff get write access, everyone else gets read access. The exceptions are change requestors (who can create Change Request records) and team leads (who can update status fields on their team's CIs).

| Role | Create CIs | Edit CIs | Create Baselines | Approve Changes | Edit Library Items |
|------|-----------|---------|------------------|----------------|-------------------|
| CM Lead | Yes | Yes | Yes | Yes | Yes |
| CM Analyst | Yes | Yes | Draft only | No | Yes |
| Librarian | No | Limited | No | No | Yes |
| CCB Chair | No | No | No | Yes | No |
| PMO | No | No | No | Triage only | No |
| Developer | No | Own CIs | No | No | No |

"Limited" for the Librarian means they can edit Library Item records and CR Document records but not product or infrastructure CIs. "Own CIs" for developers means they can update status on Feature Implementation records linked to their work (updating `implementationStatus` from "In Progress" to complete), but they cannot create new CI records or modify baseline-controlled attributes.

This permission model is enforced at the platform level (JSM Assets roles, ServiceNow ACLs, or whatever database adapter you use), not in the schema itself. The schema defines what data exists; the platform controls who can touch it.
