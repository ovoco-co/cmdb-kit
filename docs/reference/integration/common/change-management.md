# Change Management in Jira

Change requests, incidents, and problem reports are process records, not configuration items. They have lifecycles (opened, reviewed, resolved, closed) and belong in the work management tool where workflow engines, approval gates, SLA timers, and assignment rules handle them natively. This section covers how to model these processes in Jira, how to connect them to CMDB data for impact analysis, and how to automate the handoff between the two systems.

The same patterns apply to ServiceNow or any other work management tool with asset reference capabilities. The concepts are platform-neutral; the examples use Jira terminology.


# Work Type Architecture

## Separating Work from State

The tool responsibility matrix defines the boundary:

| System | Tracks | Example Records |
|--------|--------|-----------------|
| CMDB (Assets) | What is (persistent state) | Deployment Site, Product Version, Baseline, Product Component |
| Work management (Jira) | What needs to happen (temporary work) | Change Request, Incident, Problem Report, Media Request |

A Change Request opens when someone proposes a modification and closes when the change is implemented and verified. The record disappears from active queues. But the change's effects persist in the CMDB: a new Product Version, updated Product Components, a new Baseline, modified Deployment Sites.

An Incident opens when something breaks and closes when it is resolved. The incident disappears. The CMDB still shows the Product, its components, the affected Deployment Sites, and any configuration changes made during resolution.

The boundary test: does the record survive after the work is done? If yes, it is a CI and belongs in the CMDB. If no, it is a work item and belongs in the issue tracker.

## Work Types for Configuration Management

Each CM process maps to a Jira work type (called "issue type" in Data Center):

| Work Type | Category | Purpose |
|-----------|----------|---------|
| Change Request | Change | Proposed modifications to products or infrastructure |
| Problem Report | Problem | Defect or service degradation reports |
| Site Upgrade | Change | Upgrade a deployment site to a new product version |
| Site Registration | Service Request | Onboard a new customer deployment site |
| Site Decommission | Change | Retire a deployment site |
| Media Request | Service Request | Software media delivery to a deployment site |
| Document Request | Service Request | Controlled document delivery |
| Work Plan | Sub-task | Detailed implementation tasks under a Change Request |
| Action Item | Service Request | General tracking (action items, internal work) |

Incidents use the platform's built-in incident work type rather than a custom type. Jira Service Management provides incident management features (severity classification, SLA timers, on-call integration) that a custom type would need to replicate.


# Change Request

## Fields

A change request carries both work management fields (who, when, what status) and CMDB reference fields (which CIs are affected). The CMDB fields are Assets custom fields that present a picker searching the CMDB.

| Field | Type | Purpose |
|-------|------|---------|
| Product | Assets reference | Which product is affected (cascades to downstream fields) |
| Product Version | Assets reference, cascaded | Which version is affected |
| Component | Assets reference, cascaded | Which component is being changed |
| Affected Sites | Assets reference, multi-select | Which deployment sites are in the blast radius |
| Change Type | Select | Standard, Normal, or Emergency |
| Impact | Select | High, Medium, or Low (summary of five-dimension analysis) |
| CCB Required | Boolean | Whether this change requires CCB review |
| Current State | Text | What exists today |
| Proposed Change | Text | What will change |
| Justification | Text | Why the change is needed |
| Risk Assessment | Text | What could go wrong |
| Rollback Plan | Text | How to reverse the change if it fails |

The Product field is Tier 1 (no dependencies). Product Version, Component, and Affected Sites are Tier 2 (they cascade from Product, showing only objects that belong to the selected product). The cascade prevents data entry errors: selecting OvocoCRM in the Product field filters Product Version to show only OvocoCRM versions, and Affected Sites to show only active OvocoCRM deployment sites.

## The Three Change Models

The Change Type field controls the workflow path:

**Standard** changes are pre-approved routine changes. A documented procedure exists, the risk is understood, and the change authority has pre-approved execution without individual review. The workflow skips CCB review and moves directly to implementation. Example: applying a monthly security patch following the established patching procedure.

**Normal** changes require individual review and approval. The change request goes through impact assessment, CCB review, and formal approval before implementation begins. Most changes in a managed environment are Normal. Example: migrating the primary database to a new version, adding a new API endpoint, modifying the authentication module.

**Emergency** changes address critical situations that cannot wait for normal review timelines. An emergency CCB convenes with abbreviated notice, reviews a focused risk and rollback assessment, and approves or rejects. Post-implementation, the change receives full review at the next regular CCB meeting. Example: patching a zero-day vulnerability in production. See the Change Control Governance section for the full emergency procedure.

## Workflow

```
                          ┌──────────┐
                          │ Rejected │
                          └────▲─────┘
                               │
┌──────┐    ┌────────┐    ┌────┴─────┐    ┌────────────────┐    ┌───────────┐    ┌──────────┐
│ Open ├───►│ Review ├───►│CCB Review├───►│ Implementation ├───►│ Verifying ├───►│ Resolved │
└──────┘    └───┬────┘    └──────────┘    └────────────────┘    └───────────┘    └──────────┘
                │                                ▲
                └────────────────────────────────┘
                     (Standard: skip CCB)
```

Open: the change request has been submitted. An analyst validates the request, confirms it meets the classification criteria, and assigns the change type.

Review: the analyst or CM lead reviews the impact assessment. For Standard changes, the reviewer can approve directly and the workflow advances to Implementation. For Normal and Emergency changes, the workflow advances to CCB Review.

CCB Review: the appropriate CCB reviews the change. The CCB can approve (advance to Implementation), reject (move to Rejected), or defer (return to Review with conditions). For Emergency changes, this step happens same-day with a two-member quorum.

Implementation: the change is being executed. Work Plan sub-tasks track individual implementation steps. Each Work Plan carries hour estimates and a suspense date.

Verifying: the change has been implemented and is being verified. For changes that affect baselines, verification includes confirming the CMDB baseline record has been updated with the new components and documents.

Resolved: the change is complete and verified. Automation rules update the CMDB: new Product Version records, updated Deployment Site versions, new or superseded Baselines.

## Impact Assessment Using CMDB Data

When an analyst opens a change request, the linked CMDB objects provide immediate context for the five-dimension impact analysis:

**Technical impact.** The Component reference shows exactly which part of the product is changing. Query the CMDB for all Product Versions that include this component. Query Deployment Sites running those versions. The count of affected sites is the blast radius.

```
objectType = "CR Deployment Site"
AND "Product Version"."Components" = "CR Authentication Module"
AND "Site Status" = "Active"
```

**Schedule impact.** The Affected Sites field shows which deployment sites need the change. If sites are in different time zones or have different maintenance windows, the deployment schedule becomes visible.

**Risk impact.** The Baseline reference shows what approved configuration the change will modify. Comparing the current baseline's component list against the proposed changes reveals the scope of re-verification needed.

The CMDB turns impact assessment from guesswork into data. Instead of "this change probably affects some sites," the analyst sees "this change affects 23 active deployment sites across 4 organizations."

## Rollback Planning

The Rollback Plan field on the change request captures the reversal strategy. For changes that modify CMDB state, the rollback plan should reference specific CMDB records:

- Which Product Version to revert to (by name)
- Which Baseline was in effect before the change
- Which Deployment Sites need the rollback applied
- Whether Distribution Logs need to be created for the rollback media

For a database migration change, the rollback plan might read: "Restore from pre-migration snapshot. Revert Deployment Site version references from OvocoCRM 2.5.0 to OvocoCRM 2.4.0. No media redistribution required; existing 2.4.0 media is still in the DML."

If the rollback is executed, the CMDB reflects the reverted state. The Deployment Sites point back to the previous version. The new Product Version's status changes to reflect the rollback. The change request records the decision and timeline.


# Incident Management

## Using the Built-in Incident Work Type

Jira Service Management provides a native incident management workflow with severity classification, SLA timers, escalation rules, and on-call integration. Use this rather than creating a custom work type. Add Assets custom fields to connect incidents to CMDB data.

## Fields

| Field | Type | Purpose |
|-------|------|---------|
| Product | Assets reference | Which product is affected |
| Product Version | Assets reference, cascaded | Which version is affected |
| Deployment Site | Assets reference, cascaded | Which site is experiencing the issue |
| Severity | Select (built-in) | SEV1 through SEV4 |
| Summary | Text | What happened |

The key CMDB reference is the Product field. From the linked Product record, the responder can traverse to:
- Product Version (what version is deployed)
- Product Components (what the product is made of)
- Deployment Sites (where the product runs)
- SLA (what the uptime and response commitments are)
- Team and Person (who owns the product, who to escalate to)

## Workflow

Incidents follow the platform's built-in workflow:

```
┌──────────┐    ┌───────────────┐    ┌───────────┐    ┌──────────┐    ┌────────┐
│ Reported ├───►│ Investigating ├───►│ Mitigated ├───►│ Resolved ├───►│ Closed │
└──────────┘    └───────────────┘    └───────────┘    └──────────┘    └────────┘
```

Mitigated and Resolved are separate states. Mitigation means the user impact is reduced (workaround in place, traffic rerouted). Resolution means the root cause is fixed. This distinction matters for SLA measurement: time-to-mitigate and time-to-resolve are different metrics.

## Impact Analysis from the CMDB

When an incident is reported, the CMDB provides immediate context:

**Which sites are affected?** Query Deployment Sites running the affected product version:

```
objectType = "CR Deployment Site"
AND "Product Version" = "OvocoCRM 2.4.0"
AND "Site Status" = "Active"
```

If the answer is 50 sites, this is a SEV1. If the answer is 1 internal test site, the severity is lower.

**What SLA applies?** The SLA record linked to the product shows the uptime target and response time commitment. A SEV1 incident on a product with 99.95% uptime has four minutes of monthly error budget.

**Who owns this?** The Product's owner reference (Team) and the Team's teamLead reference (Person) identify who to escalate to without hunting through email or Slack.

**What changed recently?** Query recent change requests linked to this product. A recent deployment correlates with a new incident pattern more often than not.

## Incident-to-Change Linkage

When an incident reveals a defect that requires a code change, the incident links to a new Change Request using the "generates / generated from" issue link type. This creates traceability: Incident INC-042 generated Change Request CHG-015, which produced Product Version 2.4.1, which was deployed to Deployment Sites via Distribution Logs.

The full chain spans both systems:
1. Incident (Jira) identifies the problem
2. Change Request (Jira) authorizes the fix
3. Product Version (CMDB) records the new release
4. Distribution Log (CMDB) records where it was shipped
5. Deployment Site (CMDB) reflects the updated version


# Problem Reports

## When to Use Problem Reports vs Incidents

An incident is an unplanned service disruption. A problem is the underlying root cause of one or more incidents. In practice, many teams start with incidents and create problem reports only when a pattern emerges (the same component causes repeated incidents).

Problem reports use a custom work type because Jira's built-in problem management may not include all the fields needed for CM traceability.

## Fields

| Field | Type | Purpose |
|-------|------|---------|
| Product | Assets reference | Which product is affected |
| Product Version | Assets reference, cascaded | Which version exhibits the defect |
| Component | Assets reference, cascaded | Which component has the root cause |
| Severity | Select | Critical, High, Medium, Low |
| Steps to Reproduce | Text | How to trigger the defect |
| Root Cause | Text | Analysis of the underlying cause |
| Workaround | Text | Temporary mitigation until fixed |

## Workflow

```
┌──────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────┐    ┌────────┐
│ Open ├───►│ Investigating ├───►│ Root Cause   ├───►│ Resolved ├───►│ Closed │
│      │    │               │    │ Identified   │    │          │    │        │
└──────┘    └───────────────┘    └──────────────┘    └──────────┘    └────────┘
```

When the root cause is identified, the problem report links to a Change Request that authorizes the fix. The problem stays open until the fix is verified across affected sites. Multiple incidents can link to a single problem report, establishing the pattern.


# CCB Integration

## Modeling CCB Approval in Jira

The CCB Review step in the change request workflow maps to a Jira approval. On Data Center, this uses a workflow transition with a validator or condition that checks for CCB member approval. On Cloud, this uses the built-in approval feature on transitions.

Configure the CCB Review transition to require approval from a group representing the CCB membership. The approver sees the change details, the impact assessment, the rollback plan, and the linked CMDB objects (affected components, deployment sites, baselines) on a single screen.

## Routing by Change Type

Automation rules route changes to the correct review body:

- **Standard** changes skip CCB Review and transition directly to Implementation after analyst review
- **Normal** changes route to the Product CCB for review
- **Emergency** changes trigger a notification to the CCB chair and CM lead, requesting immediate review

For changes that cross product boundaries (affecting both OvocoCRM and OvocoAnalytics), the change routes to the Portfolio CCB instead of a product-level CCB. The routing rule checks whether the Affected Sites field contains sites from multiple product prefixes.

## Recording the Decision

The CCB decision is captured as:
- An approval or rejection on the workflow transition
- A comment recording the decision rationale, conditions, and any modifications required
- The transition timestamp, which serves as the CCB decision date

For audit purposes, the approval record in Jira provides the same traceability as a standalone decision record. Who approved, when they approved, and what they approved are all captured in the issue history.


# Automation Rules

## CMDB Updates on Change Completion

When a change request resolves, automation rules update the CMDB to reflect the new state:

**New Product Version.** If the change produced a new release, the release team creates the Product Version CI in the CMDB (or automation creates it from the change request's metadata).

**Updated Deployment Sites.** After upgrade work completes at each site, automation updates the Deployment Site's productVersion reference to point to the new version.

**New Baseline.** If the change modifies a controlled baseline, a new CR Baseline record is created with the updated components and documents. The previous baseline's status changes to Superseded.

**Distribution Log.** When media is shipped to sites, automation creates Distribution Log records capturing what was sent, when, and to whom.

## Incident-Triggered Notifications

When an incident is filed against a product, automation can:
- Look up the product's SLA in the CMDB and display the targets on the incident
- Identify the product owner (Team) and notify the team lead
- Query for recent changes to the same product and flag them as potential causes

## Scheduled Data Quality Checks

Automation rules running on a schedule can query the CMDB for data quality issues and create action items:
- Deployment Sites with no assigned Product Version
- Products with no active SLA
- Baselines in Draft status older than 30 days
- Certifications approaching expiration

These rules bridge the gap between the CMDB (which holds the data) and the work management tool (which tracks the remediation work).


# Worked Example: OvocoCRM Database Migration

This example traces a change through the full lifecycle across both Jira and the CMDB.

## The Change Request

A developer proposes migrating OvocoCRM from PostgreSQL 15 to PostgreSQL 16. They file a change request in Jira:

- Product: OvocoCRM (selected from CMDB)
- Product Version: OvocoCRM 2.4.0 (cascaded from Product)
- Component: CR Database Engine (cascaded from Product)
- Affected Sites: all 12 active OvocoCRM deployment sites (multi-select from CMDB)
- Change Type: Normal
- Impact: High (derived from five-dimension analysis)
- CCB Required: Yes
- Current State: PostgreSQL 15.4 across all deployment sites
- Proposed Change: Upgrade to PostgreSQL 16.1
- Risk Assessment: Data corruption risk during migration, extended downtime window
- Rollback Plan: Restore from pre-migration database snapshot, revert to PostgreSQL 15.4 binaries

## CCB Review

The change routes to the Product CCB. The reviewers see:
- 12 active Deployment Sites affected (from CMDB query)
- Current Baseline: CR PBL 2.4.0 (from CMDB)
- SLA target: 99.95% uptime (from CMDB)
- Impact assessment: High technical, Medium cost, Medium schedule, High risk, Low performance

The CCB approves with conditions: stage the migration across sites in three waves, with 48 hours between waves to monitor for issues.

## Implementation

Three Work Plan sub-tasks are created, one per wave. Each Work Plan carries hour estimates and a suspense date. As each wave completes, the wave's Deployment Sites are updated in the CMDB to reflect the new database version.

## CMDB Updates

After all waves complete:
- A new Product Version "OvocoCRM 2.4.1" is created in the CMDB (the version with PostgreSQL 16 support)
- A new Baseline "CR PBL 2.4.1" is created, referencing the updated Product Components
- The previous baseline "CR PBL 2.4.0" moves to Superseded
- All 12 Deployment Sites reference the new Product Version
- Distribution Logs record the media delivery to each site

The change request in Jira resolves. The work is done. But the CMDB carries the permanent record: what changed, what the new configuration looks like, and where it is deployed.
