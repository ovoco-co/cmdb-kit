# Configuration Management Operations

Configuration management is more than a database. It is a set of operational processes, governance structures, and roles that keep the CMDB accurate and useful. This chapter covers the day-to-day operations of a CM department: the four pillars of CM activity, the roles that execute them, the governance bodies that approve changes, the classification system that routes changes to the right authority level, the baseline process that freezes approved configurations, and the emergency procedures that handle urgent situations.


# CM Department Structure

## The Four Pillars of CM

Configuration management rests on four activities, each with a distinct purpose:

### Identification

Identification answers: what are we tracking? It encompasses selecting which items become CIs, defining the schema types and attributes for those CIs, assigning naming conventions, and establishing the taxonomy. In CMDB-Kit terms, identification is the work of building schema-structure.json and schema-attributes.json, deciding what goes into LOAD_PRIORITY, and choosing what data files to create.

Identification is not a one-time activity. Every time the organization adds a product, extends the schema, or creates a new lookup type, identification is happening. The Taxonomy Design chapter covers this activity in detail.

### Control

Control answers: who approves changes, and how? It encompasses change classification, impact assessment, CCB governance, and the approval workflows that gate changes to controlled CIs. When a product version's components change, when a baseline is established, when a deployment site's status updates, control processes govern those changes.

Control is the most visible CM activity because it touches every team. Developers submit change requests. CCBs approve or reject them. CM analysts track the status. The governance bodies described later in this chapter are the control mechanism.

### Status Accounting

Status accounting answers: what is the current state of everything? It encompasses maintaining the CMDB data, generating reports, answering queries about what version is where, what changes are pending, and what baselines are current. Status accounting is the return on investment for all the identification and control work. If you cannot answer "what version is deployed at site X?" then the CMDB is not serving its purpose.

In CMDB-Kit terms, status accounting is the data layer: the JSON files, the import scripts, the validation tools, and the AQL queries that extract meaning from CI records.

### Verification and Audit

Verification answers: is the CMDB accurate? It encompasses comparing what the CMDB says against what actually exists, finding discrepancies, and correcting them. Running `node tools/validate.js` is a form of verification. Comparing exported CMDB data against actual deployed infrastructure is another.

Audits are periodic, formal verification activities. A quarterly CMDB audit might check that every active deployment site has a current version, every baseline is properly locked, every document in a documentation suite is published, and every distribution log matches actual deliveries.

## Role Definitions

### CM Lead

The CM Lead owns the CM process across the organization. Primary responsibilities:

- Quality verification: reviews and approves CI data before import
- Exception authority: handles cases that do not fit standard processes
- Baseline approval: signs off on baseline creation and locking
- Escalation point: resolves disputes between product teams and governance bodies
- Schema governance: approves changes to the schema structure and lookup values

In a multi-product portfolio, the CM Lead typically sits in the shared services department and works across all product teams.

### CM Analyst

CM Analysts handle the day-to-day work of configuration management:

- Request processing: processes change requests, media distribution requests, and site registrations
- Data validation: verifies CI data accuracy before and after imports
- Tracking: maintains status of in-flight changes, distributions, and deployments
- Reporting: generates status accounting reports for stakeholders
- Closure: verifies that completed work is reflected in the CMDB before closing requests

Most organizations have one or more CM Analysts per product, with the ratio depending on change volume and CMDB complexity.

### Librarian

The Librarian manages the Definitive Media Library and controlled documentation:

- Library intake: receives submitted artifacts, verifies metadata, runs security scans
- File verification: validates checksums, confirms naming compliance, checks classification markings
- Storage management: moves verified artifacts to controlled storage on the DML
- Document CI updates: creates or updates Document records in the CMDB after intake
- Archive management: moves superseded artifacts to archive, manages retention policy

The Librarian role is often combined with the CM Analyst role in smaller organizations. In larger organizations, especially those with classified environments, it is a dedicated position because of the volume and sensitivity of DML operations.

### CCB Chair

The CCB Chair presides over Configuration Control Board meetings:

- Meeting organization: sets agenda, schedules reviews, ensures quorum
- Decision authority: calls for votes, records decisions, manages tie-breaking
- Escalation routing: forwards cross-product changes to the portfolio-level governance body
- Emergency authority: can convene emergency CCBs on short notice

Each product typically has its own CCB Chair. The portfolio-level governance body (Strategic Delivery Body or equivalent) has its own chair, usually the Program Manager.

### Program PMO

The Program Management Office provides the administrative and coordination layer:

- Resource allocation: ensures CM activities are staffed and funded
- Schedule coordination: aligns CM milestones with program schedules
- Risk tracking: monitors CM-related risks (schema drift, data quality degradation, audit findings)
- Reporting: aggregates CM metrics for program leadership


# Change Control Governance Bodies

## Product Configuration Control Boards

### Scope and Membership

Each product has its own CCB that governs changes within that product's scope. A product CCB reviews changes to the product's CIs: its applications, components, versions, deployments, deployment sites, and product-specific documentation.

Membership typically includes: the CCB Chair, the CM Lead, the Chief Engineer or technical lead, the product's development lead, the QA lead, and the Information Security officer.

### Meeting Frequency and Approval Authority

Product CCBs meet on a regular cadence. Weekly meetings are common during active development and release phases. Bi-weekly or monthly meetings suffice during maintenance periods.

The product CCB has authority to approve or reject changes within its product scope. Changes that affect multiple products, the release roadmap, or shared infrastructure escalate to the portfolio-level governance body.

### CCB Meeting Organization and Slide Deck Formats

A standard CCB meeting follows a consistent format:

- Review of action items from previous meeting
- Review of pending change requests (each CR presented with its five-dimension impact analysis)
- New business: new CRs submitted since last meeting
- Decision recording: each CR receives an Approved, Rejected, or Deferred status
- Action items assigned

CCB decisions are recorded in two places: the Jira Change Request record (status field updated to Approved/Rejected) and Confluence meeting minutes (the official record of authority for audit purposes).

### Decision Documentation

Every CCB decision must be traceable. The minimum documentation:

- Which CR was reviewed (Jira issue key)
- What the decision was (Approved, Rejected, Deferred)
- Who made the decision (attendee list with votes if applicable)
- Any conditions on approval (e.g., "approved contingent on successful staging deployment")
- Date and time of the decision

## Strategic Delivery Body

### Portfolio-level Release Decisions

The Strategic Delivery Body (SDB) is the portfolio-level governance body. It operates above the product CCBs and manages decisions that span multiple products.

The SDB is chaired by the Program Manager. Members include the CM Lead, Chief Engineer, each product's team lead, PMO, and the Information Security Manager.

The SDB meets bi-weekly during inception and design phases, and weekly during integration and delivery phases.

Its authority includes: approving or rejecting initiative placement in release windows, authorizing release go/no-go decisions, approving cross-product baseline changes, and re-sequencing initiatives when resource conflicts arise.

### Cross-program Impact Assessment

When a change request affects multiple products, the product CCB escalates it to the SDB. The SDB reviews the cross-program impact:

- Does the change affect shared infrastructure?
- Does it require coordinated deployment across products?
- Does it change interfaces between products?
- Does it affect the release schedule for other products?

The SDB's inputs include the release matrix, dependency register, risk log, baseline status, and the five-dimension impact analyses from each affected product's CCB.

## Joint CM Working Group

### Cost, Schedule, and Performance Impact Assessment

The Joint CM Working Group (JCMWG) is an advisory body that provides impact assessments for Class I changes. It does not have approval authority. It provides recommendations that inform CCB and SDB decisions.

The JCMWG assesses changes across five dimensions:

1. Technical: component complexity, integration points, testing scope
2. Cost: development effort, testing resources, infrastructure costs, documentation effort
3. Schedule: timeline impact, dependent initiatives, release window constraints
4. Risk: regulatory impact, deployment risk, user adoption risk
5. Performance: system performance impact, user experience effects, resource utilization

A JCMWG review is required for changes that affect multiple products, impact more than 10 deployment sites, or modify locked baselines. The results are attached to the Change Request in Jira and presented at the CCB or SDB meeting.

## Interface Control Working Group

### Interface Specifications and Compatibility

The Interface Control Working Group (ICWG) manages the interfaces between products. When Product A depends on an API provided by Product B, the ICWG maintains the Interface Control Document (ICD) that specifies the contract.

The ICWG reviews interface changes before they reach the product CCBs. If a change to OvocoCRM's API would break OvocoAnalytics' integration, the ICWG flags the incompatibility and requires a coordinated change plan.

The ICWG tracks interface compatibility across release windows and ensures that interface test cases exist for every documented interface. When interfaces change, the ICWG updates the ICD and notifies all consuming products.


# Change Classification

## Class I Changes (Form, Fit, Function)

Class I changes affect the form, fit, or function of a product. They alter what the product does, how it interfaces with other systems, or how it performs. Examples:

- Adding a new API endpoint
- Changing the database schema
- Modifying the authentication mechanism
- Altering a documented interface between products
- Changing a component that affects system performance

Class I changes require full CCB review with a five-dimension impact analysis. If the change affects multiple products or the release roadmap, it escalates to the SDB.

A change is automatically classified as Class I if it affects more than one product, regardless of its form/fit/function impact. A shared library update that changes no behavior but touches code used by both OvocoCRM and OvocoAnalytics is Class I because of its cross-product scope.

## Class II Changes (Implementation Details)

Class II changes affect implementation details without altering form, fit, or function. Examples:

- Refactoring internal code without changing behavior
- Updating a dependency to a compatible version
- Fixing a typo in documentation
- Adjusting logging levels
- Minor UI changes that do not alter functionality

Class II changes are handled at the product CCB level with a lighter review process. They do not require a JCMWG assessment or SDB review.

The boundary between Class I and Class II is not always clear. When in doubt, classify as Class I. It is better to over-review a minor change than to under-review a significant one.

## Impact Assessment Methodology

### Five-dimension Impact Analysis Matrix

Every Class I change receives a five-dimension impact assessment:

| Dimension | Questions to Answer |
|-----------|-------------------|
| Technical | What components are affected? How many integration points are touched? What is the testing scope? |
| Cost | What is the development effort? What testing resources are needed? What infrastructure costs are involved? |
| Schedule | Does this affect the release timeline? Are there dependent initiatives? Does it fit the current release window? |
| Risk | What regulatory implications exist? What is the deployment risk? What is the user adoption risk? |
| Performance | Will system performance change? Will user experience be affected? Will resource utilization change? |

Each dimension is rated (typically High/Medium/Low) with a narrative explanation. The composite assessment informs the CCB's decision: a change with High technical and schedule impact but Low cost and risk impact might be approved with a timeline extension. A change with High risk impact might be rejected regardless of other dimensions.


# Baseline Management Process

## Creating Baselines

Baselines are created at decision gates in the release lifecycle. The Building the Product Library chapter covered the three baseline types (Design, Build, Release). Here we cover the operational process for creating them.

Step 1: Identify the scope. A Release baseline for OvocoCRM 2.3.1 includes the Product Version record, its component list, the Documentation Suite, and all referenced documents.

Step 2: Verify completeness. Before creating the baseline, confirm that all included CIs are in their expected state: components are finalized, documents are published, the version record has the correct component list.

Step 3: Create the Baseline record. Set the type (Design, Build, or Release), link it to the Product Version, and set the status to "Draft."

Step 4: Submit for approval. The baseline goes to the CCB (or CM Lead for lighter-weight baselines) for review.

Step 5: On approval, update the Baseline status to "Approved" and set the approval date.

## Locking Baselines

Once a baseline is approved, it should be locked. Locking means the baseline becomes immutable: no changes to its contents, no changes to the CIs it references (at least not in the context of this baseline).

In practice, locking means:

- The Baseline record's status is "Approved" and should not be changed except to "Superseded" when a new baseline replaces it
- The Product Version, Documentation Suite, and Documents referenced by the baseline should not be modified without creating a new baseline
- Any changes to baselined CIs require a new change request, a new approval cycle, and a new baseline

The CM Lead approves the lock. Once locked, only a new baseline (for the next version) supersedes it.

## Documenting Baselines

Each baseline should be documented with:

- What it contains: the version, components, documents, and other CIs included
- When it was approved: the approval date
- Who approved it: the CCB or CM Lead
- Why it exists: which decision gate triggered its creation
- Where the reference copy lives: the DML path for any associated artifacts

This documentation lives in the Baseline CI record (description and approval date attributes) and in the CCB meeting minutes that record the approval decision.

## Baseline Audit and Verification

Periodically verify that baselines are accurate:

- Check that every approved baseline's referenced CIs still exist and are in the expected state
- Verify that no CI referenced by an approved baseline has been modified without a new baseline being created
- Confirm that superseded baselines have been properly marked
- Check that baseline naming is consistent across the portfolio


# Emergency Change Procedures

## Go/No-go Decision Criteria

An emergency change bypasses the standard CCB review timeline. It is used when a critical issue requires immediate action: a security vulnerability, a production outage, a data integrity problem.

The go/no-go decision considers:

- Severity of the issue (is it affecting production users right now?)
- Availability of a tested fix (is the fix verified in staging?)
- Rollback readiness (can we revert if the fix fails?)
- Business impact of waiting (what is the cost per hour of the current state?)

If the answer is "yes, it is critical, we have a fix, we can roll back, and waiting costs more than acting," the emergency change proceeds.

## Expedited Approval Workflows

Emergency CCBs convene with as little as two hours' notice, compared to the standard five or more business days for a regular product CCB meeting.

The emergency workflow:

1. Emergency change request submitted with severity justification
2. Emergency CCB convenes (CCB Chair plus minimum quorum)
3. Impact assessment is abbreviated: focus on risk and rollback plan
4. CCB approves or rejects
5. If approved, deployment proceeds immediately
6. Post-implementation review occurs at the next regular CCB meeting

If the emergency deployment fails, the emergency CCB reconvenes to decide between rollback and fix-forward. Both paths are documented:

Rollback: revert to the previous version, create a rollback baseline, update the Deployment Site record, document the rollback distribution. A root cause analysis follows.

Fix-forward: develop and deploy a new fix through the same emergency path. The original issue and the fix-forward are both documented on the Change Request.

Every emergency change produces a complete audit trail: the Change Request in Jira, the CCB decision in both Jira and Confluence, the updated Deployment Site and Distribution Log records in the CMDB, and the DML records showing which artifacts were deployed or rolled back.
