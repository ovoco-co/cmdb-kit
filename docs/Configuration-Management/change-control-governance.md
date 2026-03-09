# Change Control Governance

Change control is the discipline that prevents uncoordinated modifications from destabilizing a product. Without it, developers patch production systems without telling the release team, infrastructure changes break upstream dependencies, and nobody can answer "what changed and why?" when something goes wrong. A CMDB supports change control by providing the configuration item context that change processes consume, and by recording the baselines that changes modify.

This section covers governance bodies, change classification, impact analysis, baseline management, and emergency procedures. All of these map to types and attributes in CMDB-Kit's enterprise schema, with OvocoCRM as the running example.


# Governance Bodies

Change control governance is structured as a hierarchy of review bodies, each with a defined scope and authority level. Smaller changes are decided quickly at the product level. Larger changes escalate to bodies with broader organizational visibility.

## Product Configuration Control Board

The Product CCB is the primary decision-making body for changes to a single product. For OvocoCRM, this board reviews changes that affect OvocoCRM alone, such as a database migration, a new feature, or a schema modification.

Membership typically includes the product manager or PMO lead, the development lead, the CM analyst or lead, and a test lead. In the OvocoCRM example data, a Product CCB reviewing CHG-001 (Database Migration from PostgreSQL 15 to 16) would include representatives from the CRM Platform Team and Infrastructure Team.

The Product CCB meets on a regular cadence, often biweekly. Its authority covers approving, rejecting, or deferring changes that affect only its product and do not cross product boundaries or alter shared infrastructure.

Quorum for a Product CCB is typically three members. Decisions are by majority vote. The CCB chair (usually the product manager) breaks ties.

## Strategic Delivery Body (Portfolio CCB)

When a change affects multiple products or shared infrastructure, it escalates to the Portfolio CCB. In the Ovoco universe, a change that modifies the shared authentication service used by both OvocoCRM and OvocoAnalytics would require Portfolio CCB review.

This body has broader membership: all product managers, the CM lead, security representatives, and senior development leads. It meets less frequently, typically monthly, because it handles higher-impact decisions.

The Portfolio CCB decides changes involving cross-product dependencies, changes to shared baselines, changes with significant cost or schedule impact, and any change flagged as Class I (discussed below). Quorum is five members, with decisions by majority.

## Joint CM Working Group

The Joint CM Working Group is a technical advisory body, not a decision-making one. It evaluates the cost, schedule, and performance implications of proposed changes and provides recommendations to the appropriate CCB.

This group includes technical leads, architects, and analysts who can assess how a proposed change ripples through the system. For OvocoCRM, the Joint CM Working Group might analyze how a proposed database migration affects deployment timelines at customer sites, what the cost impact is for revalidation testing, and whether performance benchmarks need updating.

The working group does not approve or reject changes. It produces impact assessments that inform CCB decisions.

## Interface Control Working Group

The Interface Control Working Group reviews changes that affect interfaces between systems or between products. An interface change, such as modifying an API contract between OvocoCRM and OvocoAnalytics, crosses product boundaries even if the code change is small.

This group ensures that both sides of an interface agree on the proposed change before it reaches the CCB. It reviews interface control documents, validates that the change is backward-compatible or that both sides are prepared for a breaking change, and confirms that integration tests cover the modified interface.

Changes approved by the Interface Control Working Group still require CCB approval for implementation. The working group's role is to certify that the interface implications have been analyzed and agreed upon by all affected parties.


# Change Classification

Not every change needs the same level of scrutiny. Change classification sorts proposed changes into categories that determine the review path, the approval authority, and the documentation requirements.

## Class I Changes: Form, Fit, Function

A Class I change affects the form, fit, or function of a configuration item. "Form" means the physical or logical shape of the item. "Fit" means how it interfaces with other items. "Function" means what it does or how well it does it.

The form-fit-function test is straightforward: if you swap the changed item into the system in place of the original, does anything behave differently from the user's or integrator's perspective? If yes, it is Class I.

Examples in OvocoCRM terms:

- Changing the Contact Import feature to accept a new file format (function change, Class I)
- Modifying the REST API response schema for the Deal Pipeline endpoint (fit change, Class I)
- Restructuring the database schema to split a table into two (form change, Class I)

Class I changes always require CCB review. They may require Portfolio CCB review if they cross product boundaries. They update baselines and require formal verification before closure.

Most organizations classify changes into three types in their work management tool: Standard (pre-approved routine changes), Normal (changes requiring CAB review), and Emergency (urgent changes bypassing normal process).

Class I changes map to the "Normal" type. They follow the full review cycle, from submission through CCB review to implementation and verification.

## Class II Changes: Implementation Details

A Class II change modifies how something is implemented without affecting form, fit, or function. From the outside, the item behaves identically before and after the change.

Examples in OvocoCRM terms:

- Refactoring internal code for performance without changing any API behavior
- Upgrading a library dependency to a patch version with only internal bug fixes
- Reorganizing internal documentation without changing content

Class II changes can be approved at a lower level, often by the development lead or CM analyst, without full CCB review. They still get recorded in the work management tool for audit trail purposes, but the review path is shorter.

Class II changes map to the "Standard" change type. They are pre-approved routine changes that follow an abbreviated process.

## Applying the Form-Fit-Function Test

When a change request arrives, the first question is: does this change form, fit, or function?

| Dimension | Question | OvocoCRM Example |
|-----------|----------|------------------|
| Form | Does the structure change? | Splitting the contacts table into contacts and contact_metadata |
| Fit | Do interfaces change? | Changing the response format of /api/v2/contacts |
| Function | Does behavior change? | Adding date range filtering to the export endpoint |

If the answer to any row is "yes," the change is Class I. If all three answers are "no," the change is Class II.

Gray areas exist. A performance optimization that doubles query speed does not change function (the query returns the same results), but it may change non-functional requirements that are part of the product specification. When in doubt, classify upward. It is easier to approve a Class I change quickly than to discover a Class II change should have been Class I after it breaks something.


# Five-Dimension Impact Analysis

Before a CCB can make an informed decision, the proposed change needs an impact assessment. Most organizations use three summary levels: High (major impact to services or users), Medium (moderate impact, limited scope), and Low (minimal impact, no user disruption). These levels are recorded on the change record in the work management tool.

Behind each summary level sits a five-dimension analysis that the Joint CM Working Group (or the change submitter, for simpler changes) produces.

## Technical Impact

What systems, components, and interfaces does this change affect? How many lines of code change? How many configuration items need updating? Does it require changes to other products?

For CHG-001 (Database Migration), the technical impact is high: every component that issues SQL queries is potentially affected, the migration requires downtime, and rollback planning is complex.

## Cost Impact

What is the direct cost to implement the change? What is the indirect cost, such as retesting, retraining, or rescheduling other work? Does the change affect licensing, hosting, or contract terms?

A database migration has moderate cost impact: developer time for testing, potential cloud infrastructure costs during migration windows, and time diverted from feature work.

## Schedule Impact

Does this change delay other deliverables? Does it affect committed release dates? Does it require rescheduling deployment windows at customer sites?

CHG-001 required coordinating with the Infrastructure Team for migration windows and with site deployments for the version rollout. Schedule impact was medium because the migration could be staged across sites rather than requiring a simultaneous cutover.

## Risk Impact

What could go wrong? What is the probability of failure? What is the blast radius if it fails? Is the change reversible?

Database migrations carry high risk impact. A failed migration can corrupt data, and while rollback plans exist, they add hours to any outage window. The blast radius is the entire application.

## Performance Impact

Does the change affect response times, throughput, resource consumption, or scalability? Does it change capacity requirements?

PostgreSQL 16 offers performance improvements over 15 for certain query patterns, so performance impact was expected to be positive. The assessment still documented the baseline benchmarks that needed re-running after migration.

## Combining Dimensions into a Summary

The five dimensions feed into a summary impact assessment that informs the change record in the work management tool (Jira, ServiceNow, or similar). A practical scoring approach:

| Dimension | CHG-001 Score | CHG-003 Score |
|-----------|---------------|---------------|
| Technical | High | Medium |
| Cost | Medium | Low |
| Schedule | Medium | Low |
| Risk | High | Low |
| Performance | Low (positive) | Low |
| Summary | High | Medium |

The summary is not a simple average. Any single dimension scoring "High" typically drives the summary to "High." The CCB needs to see both the summary and the individual dimension scores to make an informed decision.


# Where Change Records Live

Change requests are work items, not configuration items. They belong in the work management tool (Jira, ServiceNow, or similar), not in the CMDB. The CMDB provides the CI context that change processes consume: which components are affected, what baselines are at stake, and how configuration items relate to each other.

A typical change record in the issue tracker captures the governance outcome: the change type (Standard, Normal, or Emergency), the summary impact assessment (High, Medium, Low), who submitted the request, when the CCB reviewed it, and what decision was reached. The five-dimension impact detail lives in the change description or in linked documentation.

The CMDB's role is to answer the questions that inform these fields. When a change is proposed, the CMDB shows which CIs are affected, what their dependencies are, what baseline they belong to, and what the blast radius looks like. The change record references CIs by name or key, but the record itself lives in the issue tracker where it follows a workflow with approvals, assignments, and state transitions.

The OvocoCRM example illustrates two changes spanning the classification spectrum:

CHG-001 (Database Migration) is a Normal change with High impact. It was requested on 2025-12-01 and the CCB decided on 2025-12-05, four days later, consistent with a scheduled biweekly CCB cycle. The CMDB provided the context: which components depend on PostgreSQL, which deployments would be affected, and which baseline the migration would update.

CHG-002 (Contact Import Hotfix) is an Emergency change, also High impact. Same-day request and decision (2026-02-08), reflecting the emergency CCB procedure described later in this section. The CMDB showed the blast radius: which component instances ran the affected code and which customer sites had the vulnerable version deployed.


# Baseline Management Process

A baseline is a formally approved snapshot of a product's configuration at a specific point in time. Changes are measured against baselines: "what changed since the last approved state?" Without baselines, change control has nothing to control against.

## Baseline Types

CMDB-Kit's enterprise schema defines three baseline types that correspond to progressive stages of product maturity:

```json
[
  { "Name": "FBL", "description": "Functional Baseline - approved requirements" },
  { "Name": "ABL", "description": "Allocated Baseline - approved design" },
  { "Name": "PBL", "description": "Product Baseline - approved product configuration" }
]
```

**Functional Baseline (FBL)** captures the approved requirements for a release. After the System Requirements Review (SRR), the set of requirements is frozen into an FBL. Any subsequent change to requirements must go through change control. For OvocoCRM, an FBL for version 3.0.0 would capture the approved feature list, performance targets, and API contracts before development begins.

**Allocated Baseline (ABL)** captures the approved design. After the Preliminary Design Review (PDR) or Critical Design Review (CDR), the architecture and component design are frozen. Changes to the design, such as choosing a different database engine or restructuring the service architecture, require CCB approval against this baseline.

**Product Baseline (PBL)** captures the approved product as built. After the Functional Configuration Audit (FCA) and Physical Configuration Audit (PCA), the actual delivered software, its documentation, and its configuration are frozen. The PBL is what gets deployed to customer sites.

The OvocoCRM example data includes one baseline:

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

This PBL was created after the Physical Configuration Audit for OvocoCRM 2.4.0. Four days elapsed between creation and approval, during which the CCB reviewed and signed off on the baseline contents.

## Baseline Milestones

Each baseline is associated with a milestone that marks a formal review gate:

```json
[
  { "Name": "SRR", "description": "System Requirements Review", "milestonePhase": "Requirements" },
  { "Name": "PDR", "description": "Preliminary Design Review", "milestonePhase": "Design" },
  { "Name": "CDR", "description": "Critical Design Review", "milestonePhase": "Design" },
  { "Name": "TRR", "description": "Test Readiness Review", "milestonePhase": "Testing" },
  { "Name": "FCA", "description": "Functional Configuration Audit", "milestonePhase": "Audit" },
  { "Name": "PCA", "description": "Physical Configuration Audit", "milestonePhase": "Audit" }
]
```

The milestones flow in order through the development lifecycle:

SRR produces the FBL. Requirements are reviewed, approved, and frozen. For OvocoCRM 3.0.0, SRR would confirm the feature list and acceptance criteria.

PDR and CDR produce the ABL. The design is reviewed at increasing levels of detail. PDR confirms the high-level architecture. CDR confirms the detailed component design.

TRR confirms that the product is ready for formal testing. It does not produce a new baseline type, but it validates that the ABL is still accurate and that test plans cover the FBL requirements.

FCA verifies that the product as built satisfies the FBL requirements. Every requirement should trace to an implementation and a test result.

PCA verifies that the product documentation, media, and configuration match the actual delivered product. PCA produces the PBL.

## The CR Baseline Type

The enterprise schema's CR Baseline type captures all of this:

```json
"CR Baseline": {
  "description": { "type": 0 },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "baselineType": { "type": 1, "referenceType": "Baseline Type" },
  "baselineStatus": { "type": 1, "referenceType": "Baseline Status" },
  "milestone": { "type": 1, "referenceType": "Baseline Milestone" },
  "createdDate": { "type": 0, "defaultTypeId": 4 },
  "approvedDate": { "type": 0, "defaultTypeId": 4 },
  "approvedBy": { "type": 1, "referenceType": "Person" },
  "previousBaseline": { "type": 1, "referenceType": "CR Baseline" },
  "componentInstances": { "type": 1, "referenceType": "CR Component Instance", "max": -1 },
  "documents": { "type": 1, "referenceType": "CR Document", "max": -1 },
  "certification": { "type": 1, "referenceType": "CR Certification" },
  "documentationSuite": { "type": 1, "referenceType": "CR Documentation Suite" },
  "changeLog": { "type": 0 },
  "notes": { "type": 0 },
  "dmlPath": { "type": 0 }
}
```

Several attributes deserve attention:

`previousBaseline` creates a chain. CR PBL 2.4.0 would reference CR PBL 2.3.0, which references CR PBL 2.2.0. This chain enables baseline comparison: what changed between 2.3.0 and 2.4.0?

`componentInstances` (multi-reference) captures exactly which component versions are included in this baseline. This is the bill of materials for the release.

`documents` (multi-reference) captures which controlled documents are part of the baseline. Release notes, installation guides, API documentation, all versioned and frozen.

`certification` links to the compliance certification that applies to this baseline. A PBL for a regulated product must reference its certification status.

`changeLog` records the changes from the previous baseline as free text. This is the human-readable summary of what changed and why.

`dmlPath` records where the baseline's media is stored in the Definitive Media Library. This connects the logical baseline record to the physical artifacts.

## Baseline Status Lifecycle

```json
[
  { "Name": "Draft", "description": "Baseline being defined" },
  { "Name": "Approved", "description": "Baseline formally approved" },
  { "Name": "Superseded", "description": "Replaced by newer baseline" }
]
```

A baseline starts as Draft while its contents are being assembled and reviewed. Once the CCB approves it, the status moves to Approved. When the next version's baseline is approved, the previous baseline moves to Superseded. Superseded baselines are never deleted. They remain as the historical record of what the product looked like at that point in time.

## Naming Convention

Baseline records follow the naming pattern `[Product Prefix] [Type] [Version]`. The OvocoCRM example uses "CR PBL 2.4.0" where CR is the product prefix, PBL is the baseline type, and 2.4.0 is the version. An FBL for OvocoCRM 3.0.0 would be named "CR FBL 3.0.0."


# Emergency Change Procedures

Emergency changes bypass the normal CCB schedule when a critical issue demands immediate action. The emergency procedure trades thoroughness for speed, but it does not skip governance entirely. It compresses the process into hours instead of days.

## When to Invoke Emergency Procedures

Emergency changes apply when a production system is down or severely degraded, when a security vulnerability is actively being exploited, or when a regulatory deadline will be missed without immediate action. The key criterion is that waiting for the next scheduled CCB meeting would cause unacceptable harm.

In the OvocoCRM example, CHG-002 (Contact Import Hotfix) was an emergency change. A race condition in the contact import feature was causing data corruption in production. Waiting for the next biweekly CCB meeting was not an option.

## The Emergency Process

The emergency process compresses the normal cycle into a same-day timeline:

The submitter files the change request and flags it as Emergency. The CM analyst validates the request within one hour, confirming it meets the threshold for emergency treatment.

The CM lead notifies the CCB chair and convenes an Emergency CCB. This can happen by phone or video call rather than a scheduled meeting. Quorum for an Emergency CCB is two members, and the decision must be unanimous. The reduced quorum acknowledges that not everyone may be reachable on short notice, while the unanimity requirement ensures that the smaller group has full confidence in the decision.

If approved, implementation begins immediately. The developer starts work the same day, with an expedited work plan due within 24 hours.

Verification follows an expedited path. The normal multi-day verification cycle is compressed, though the same verification criteria apply.

Retroactive documentation must be completed within five business days. This includes the full impact assessment, the detailed work plan, and the verification report that would normally precede implementation. The emergency procedure does not waive documentation requirements. It reorders them.

## Recording Emergency Changes

Emergency changes are recorded in the work management tool alongside normal changes. The change type is set to "Emergency," and the compressed timeline is visible in the dates. For CHG-002, the request date and CCB decision date are both 2026-02-08, the telltale sign of an emergency change. In a post-incident review, these records show exactly how many emergency changes occurred, what their impact was, and how quickly they were resolved.

## Preventing Emergency Change Abuse

Emergency changes should be rare. If more than a few percent of changes are classified as Emergency, the normal process may be too slow or too infrequent. Track the ratio of Emergency to Normal changes over time. A rising trend suggests the CCB cadence needs adjustment, the change classification criteria need tightening, or the product has deeper quality issues that regular changes are not addressing.


# Connecting Governance to the Schema

The governance bodies, classification rules, and impact analysis described in this section span the CMDB and the work management tool. Here is how they connect:

| Governance Concept | Where It Lives | Key Details |
|-------------------|-----------------|-------------|
| Change submission | Work management tool (Jira, ServiceNow) | Requester, date, description, affected CIs |
| Classification | Work management tool | Standard, Normal, Emergency |
| Impact assessment | Work management tool | High, Medium, Low (five-dimension detail in description) |
| CCB decision | Work management tool | Decision, date, conditions |
| Lifecycle tracking | Work management tool | Status workflow from submission through closure |
| CI context | CMDB | Components, dependencies, deployment sites affected |
| Baseline snapshot | CMDB (CR Baseline) | baselineType, milestone, componentInstances |
| Baseline approval | CMDB (CR Baseline) | baselineStatus, approvedBy, approvedDate |
| Baseline chain | CMDB (CR Baseline) | previousBaseline |

The governance process spans both systems. A change is submitted and tracked in the work management tool, where it is classified, assessed for impact, reviewed by the appropriate CCB, implemented, verified, and closed. The CMDB provides the CI context throughout: which components are affected, what their dependencies are, and what baselines are at stake. If the change modifies a baseline, a new CR Baseline record is created in the CMDB with the updated component list, and the previous baseline is marked Superseded.

This is configuration management's core loop. Identify what you have (baselines in the CMDB), control what changes (change records in the work management tool informed by CMDB data), and account for the result (updated baselines with full traceability to the changes that produced them).
