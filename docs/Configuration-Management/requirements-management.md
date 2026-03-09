# Requirements Management

Requirements management and configuration management are natural partners. Requirements define what the product should do. Configuration management tracks what the product actually is. Connecting the two answers the fundamental question: does the product as built match the product as specified?

CMDB-Kit includes a Feature type that provides a lightweight requirements anchor in the CMDB. This section covers how to use it, when it is enough on its own, when to integrate with a dedicated requirements tool, and how to extend the schema for richer requirements traceability.


# Using the Feature Type for Requirements

## What a Feature Record Represents

A Feature record represents a capability that the product provides. Not a user story, not a task, not a bug fix. A feature is a named capability: "Contact Import," "Deal Pipeline," "Email Tracking," "Custom Reports." Each feature persists in the CMDB as long as the product supports that capability, across multiple versions and releases.

A Feature is not the same as a requirement. A requirement specifies what the product must do ("the system shall support bulk import of contacts from CSV files"). A feature describes what the product does ("Contact Import: bulk import contacts from CSV and other CRMs"). The feature is the CMDB's view of the capability. The requirement is the specification that drove its development.

In many organizations, the feature record is sufficient. It answers "what capabilities does this product have, in which version, owned by which team?" without the overhead of a full requirements management system.

## Attributes: Description, Version, Status, Owner

The Feature type in CMDB-Kit's extended schema has four attributes:

```json
"Feature": {
  "description": { "type": 0 },
  "version": { "type": 1, "referenceType": "Product Version" },
  "status": { "type": 1, "referenceType": "Version Status" },
  "owner": { "type": 1, "referenceType": "Team" }
}
```

`description`: free text explaining what the feature does.

`version`: reference to the Product Version that introduced this feature. This is the "shipped in" version, not the current version. A feature introduced in OvocoCRM 2.0.0 still references 2.0.0 even when the product is at version 2.4.0.

`status`: reference to the Version Status lookup (Current, Beta, Previous, Deprecated, Retired). Reusing Version Status avoids creating a redundant lookup. A feature can be "Current" (actively supported), "Deprecated" (slated for removal), or "Retired" (removed from the product).

`owner`: reference to the Team responsible for the capability. This answers "who do I talk to about this feature?"

## Using Version Status Values to Track Feature Lifecycle

The Version Status lookup serves double duty for features:

Current: the feature is actively supported and available in the product.

Beta: the feature is in development or testing. It exists in the schema but has not shipped yet.

Deprecated: the feature is slated for removal. It still works but is no longer enhanced or recommended.

Retired: the feature has been removed from the product. The Feature record remains as a historical record.

This lifecycle parallels the product version lifecycle, which is why reusing the same lookup works. A deprecated feature often ships in the same version where it is first flagged for deprecation.

The OvocoCRM example data demonstrates the pattern:

```json
[
  {
    "Name": "Contact Import",
    "description": "Bulk import contacts from CSV and other CRMs",
    "version": "OvocoCRM 2.0.0",
    "status": "Current",
    "owner": "CRM Platform Team"
  },
  {
    "Name": "Deal Pipeline",
    "description": "Visual sales pipeline with drag-and-drop stages",
    "version": "OvocoCRM 2.0.0",
    "status": "Current",
    "owner": "CRM Platform Team"
  },
  {
    "Name": "Email Tracking",
    "description": "Open and click tracking for sent emails",
    "version": "OvocoCRM 2.1.0",
    "status": "Current",
    "owner": "CRM Platform Team"
  },
  {
    "Name": "Custom Reports",
    "description": "User-defined analytics dashboards",
    "version": "OvocoCRM 2.2.0",
    "status": "Current",
    "owner": "Analytics Platform Team"
  },
  {
    "Name": "Mobile Push Notifications",
    "description": "Real-time push notifications on mobile",
    "version": "OvocoCRM 2.3.0",
    "status": "Current",
    "owner": "CRM Platform Team"
  }
]
```

Several patterns emerge from this data. Features span multiple versions (Contact Import and Deal Pipeline both shipped in 2.0.0). Features are owned by different teams (CRM Platform Team, Analytics Platform Team). And the version reference creates traceability: you can query "what features shipped in version 2.2.0?" and get the answer directly from the CMDB.


# Requirement Types and Hierarchy

## Program Requirements (Top-level)

In formal requirements management, program requirements sit at the top of the hierarchy. These are the high-level capabilities that the product must provide, often derived from contracts, standards, or stakeholder needs. "The system shall provide a CRM with contact management, sales pipeline, and reporting capabilities" is a program requirement.

CMDB-Kit's Feature type maps naturally to program requirements. Each Feature record represents a top-level capability.

## Derived Requirements (Decomposition)

Program requirements decompose into derived requirements: more specific, implementable specifications. "The system shall support bulk import of contacts" decomposes into "the import shall accept CSV format," "the import shall detect duplicate contacts," "the import shall report errors in a downloadable log."

The base Feature type does not model this decomposition. If you need it, the Extending for Detailed Requirements section below describes how to add parent-child relationships to Feature records or create a separate Requirement type. The enterprise schema includes a dedicated Requirement type with attributes for requirementType (reference to Requirement Type lookup), status (reference to Requirement Status), priority (reference to Priority), source, verificationMethod (reference to Verification Method), verifiedDate, and parentRequirement (self-referential for decomposition).

## Interface Requirements

Interface requirements specify how the product interacts with external systems. "The CRM shall expose a REST API for contact data" or "the CRM shall integrate with LDAP for authentication" are interface requirements.

These are tracked as Features if the integration is a visible capability ("LDAP Authentication" as a feature). If the interface requirement is an internal technical specification, it belongs in a requirements management tool rather than the CMDB.

## Test Requirements

Test requirements specify what must be verified and how. They link to the features they validate. "Verify that bulk import handles 10,000 contacts in under 60 seconds" is a test requirement for the Contact Import feature.

Test management is typically handled by dedicated tools (Zephyr, TestRail, or equivalent) that integrate with the issue tracker. The CMDB does not replace test management, but it provides context: the Feature record in the CMDB tells you what capability is being tested, and the test management tool tracks the test cases, execution results, and coverage.


# Requirement Lifecycle

## Draft, Approved, Implemented, Verified, Closed States

In a formal requirements workflow, requirements move through a lifecycle:

Draft: the requirement is being defined. It has not been reviewed or approved.

Approved: the requirement has been reviewed and accepted as valid and implementable.

Implemented: the development team has built the capability specified by the requirement.

Verified: testing has confirmed that the implementation meets the requirement.

Closed: the requirement is fully traced from specification through verification. It ships in a version.

CMDB-Kit's Feature type uses Version Status (Current, Beta, Deprecated, Retired) rather than this formal lifecycle. This is sufficient for tracking the feature's presence in the product. For organizations that need the full lifecycle, extend the schema with a dedicated requirements status lookup or use a dedicated requirements tool.

## Immutable Audit Records Per Release

A critical pattern from production CMDB operations: when a feature ships in a release, freeze a snapshot of the feature's state at that moment. The Feature record in the CMDB can change over time (its description might be updated, its owner might change). But the frozen snapshot records exactly what was specified and verified at the time of release.

This pattern uses a Feature Implementation type. In the enterprise schema, Feature Implementation is a built-in type with these attributes:

```json
"Feature Implementation": {
  "parentFeature": { "type": 1, "referenceType": "Feature" },
  "productVersion": { "type": 1, "referenceType": "Product Version" },
  "implementationStatus": { "type": 1, "referenceType": "Implementation Status" },
  "frozenDate": { "type": 0, "defaultTypeId": 4 },
  "jiraEpic": { "type": 0 },
  "notes": { "type": 0 }
}
```

The Implementation Status lookup provides five values: Draft, In Progress, Complete, Verified, and Frozen. Once a Feature Implementation record reaches Frozen status, it becomes an immutable audit record. In the base and extended schemas, Feature Implementation is not included and can be added as a schema extension.

Each release creates a new Feature Implementation record for every feature included in that release. Once created and frozen, these records are immutable. They provide a per-feature audit trail across releases: "Contact Import was implemented in version 2.0.0 with this specification, and again in version 2.3.0 with an updated specification."

This three-layer approach provides the audit trail:

1. The requirements tool (if you use one) captures the full specification and its baseline
2. The Feature Implementation CI in the CMDB freezes the feature-to-version link at release time
3. The CMDB's built-in audit log records when the freeze occurred and who performed it


# Linking Features to Versions

## A Feature References the Product Version It Will Ship In

The `version` attribute on Feature is the primary traceability link. It answers "when did this feature first become available?" The answer is a Product Version record with its own attributes: version number, release date, status, and component list.

This link is one-directional in the base schema (Feature points to Product Version, but Product Version does not have a multi-reference back to Feature). To query "what features shipped in version 2.3.0?", use a filter on the Feature type:

```
objectType = "Feature" AND "Version" = "OvocoCRM 2.3.0"
```

## Tracking Which Features Are in Which Release

Because features reference the version they shipped in (not the current version), the feature inventory grows monotonically. Each release adds new features. Older features persist with their original version reference.

To see the complete feature set for the product:

```
objectType = "Feature" AND "Status" = "Current"
```

To see features introduced in a specific version:

```
objectType = "Feature" AND "Version" = "OvocoCRM 2.2.0"
```

To see deprecated features (candidates for removal):

```
objectType = "Feature" AND "Status" = "Deprecated"
```

## Feature Status as a Release Readiness Indicator

Before a release, query for features assigned to this version that are still in Beta:

```
objectType = "Feature" AND "Version" = "OvocoCRM 2.4.0" AND "Status" = "Beta"
```

If any features are still Beta, the release is not ready. All features must reach "Current" status before the release baseline can be approved. This query integrates naturally into the release gate process described in the CM Operations section.


# Traceability

## Traceability Link Types: Implements, Satisfies, Verifies, Derives, Documents

Full requirements traceability uses typed relationships between CIs:

Implements: a Product Component implements a Feature. The component is the code that delivers the capability.

Satisfies: a Feature satisfies a requirement (in the requirements tool). The feature is the CMDB record of the fulfilled requirement.

Verifies: a test case verifies a Feature. The test proves the feature works as specified.

Derives: a detailed requirement derives from a program requirement. Decomposition hierarchy.

Documents: a Document describes a Feature. The specification, user guide, or API reference that explains the capability.

In the base CMDB-Kit schema, these links are not explicitly modeled as separate relationship types. They exist implicitly through the reference attributes (Feature.version links to Product Version, Product Version.components links to Product Components). For organizations that need explicit typed traceability, extend the schema or use a dedicated requirements tool that integrates with the CMDB.

## Tracing Requirements Back to External Sources and Standards

Requirements often originate from external sources: regulatory standards (GDPR, HIPAA, PCI DSS), customer contracts, industry specifications (DISA STIGs, NIST 800-53), or internal policies. Tracing each requirement back to its source is essential for compliance audits.

In the CMDB, this traceability is indirect. The Feature record describes the capability. The requirements tool (if used) traces the underlying requirement to its source document. The CMDB's Document type can record the source standards as controlled documents, creating a complete chain: Source Standard (Document CI) to Requirement (in the requirements tool) to Feature (CI) to Product Version (CI) to Deployment Site (CI).

## Bidirectional Traceability From Requirement to Deployment

The complete traceability chain in CMDB-Kit:

Feature (what the product does) > Product Version (which release includes it) > Deployment Site (where it is installed) > Distribution Log (when it was delivered).

Reading forward: "Feature X shipped in version 2.3.0, which is deployed at 12 sites, with the most recent distribution on July 10."

Reading backward: "Deployment Site Acme Corp US-East runs version 2.3.1, which includes features Contact Import, Deal Pipeline, Email Tracking, Custom Reports, and Mobile Push Notifications."

This bidirectional traceability is one of the primary reasons to maintain features in the CMDB rather than only in the requirements tool. The CMDB connects features to the operational reality (where they are deployed) that the requirements tool does not track.


# Designing a Requirements Workflow

## Capturing Requirements as Feature Records

When a new capability is planned, create a Feature record in the CMDB:

1. Name the feature clearly (it will appear in queries, dashboards, and release notes)
2. Write a description that explains what the capability does (not how it is implemented)
3. Set the version to the target Product Version
4. Set the status to "Beta" (in development)
5. Set the owner to the responsible team

This creates the CMDB anchor for the capability before any code is written.

## Assigning Features to Teams

The `owner` attribute assigns team responsibility. This is not individual assignment (that happens in the issue tracker). It is capability ownership: which team is responsible for this feature's design, implementation, testing, and ongoing support.

Ownership queries support planning: "what features does the Analytics Platform Team own?" and "which team has the most features in the upcoming release?"

## Tracking Feature Status Through the Development Lifecycle

As the feature progresses:

Initial creation: status = "Beta", version = target version.

Development complete: no status change yet (the feature is still being tested).

Testing verified: update status to "Current" if the feature passes verification.

Release shipped: the feature remains "Current" with its version reference pointing to the shipped version.

Feature sunset: update status to "Deprecated" when the feature is slated for removal, then "Retired" when it is actually removed.

## Using the CMDB to Answer "What Shipped in Version X?"

The definitive answer comes from two queries:

Features: `objectType = "Feature" AND "Version" = "OvocoCRM 2.4.0"` returns the new capabilities introduced in this version.

All current features: `objectType = "Feature" AND "Status" = "Current"` returns the complete capability inventory, regardless of which version introduced each feature.

Combine with the Product Version record's component list to get the complete picture: what capabilities (Features) and what components (Product Components) make up this version.


# Baseline and Version Management

## Snapshot Requirements at Milestones

At each development milestone (design review, build verification, release approval), freeze the current state of all features assigned to the target version. This creates a requirements baseline.

In a formal process, the baseline is captured in the requirements tool and linked to the CMDB through the Baseline CI:

```json
{
  "Name": "OvocoCRM 2.4.0 Requirements Baseline",
  "baselineType": "Design",
  "productVersion": "OvocoCRM 2.4.0",
  "status": "Approved",
  "approvalDate": "2025-05-01"
}
```

The Baseline CI records that a requirements snapshot was taken. The snapshot content lives in the requirements tool. The CMDB provides the organizational context (when, who approved, which version, which type).

## Hybrid Container and Leaf Structure

Features can be both containers and leaves. A container feature groups related capabilities: "Reporting" might contain "Custom Reports," "Scheduled Reports," and "Export to PDF." A leaf feature is an individual capability.

The base Feature type does not model this hierarchy (no `parentFeature` attribute). If you need it, add a self-referential reference:

```json
"parentFeature": { "type": 1, "referenceType": "Feature" }
```

Keep the hierarchy shallow (two levels at most). Deep requirement decomposition belongs in the requirements tool, not the CMDB.

## Depends On vs Dependents: Decomposition vs Cross-cutting

Two types of feature relationships exist:

Decomposition: Feature B is part of Feature A. This is a parent-child relationship (container and leaf).

Cross-cutting dependency: Feature B depends on Feature A but is not part of it. "Email Tracking" depends on "Contact Import" (you need contacts to track emails to), but they are independent features.

Model decomposition with `parentFeature`. Model cross-cutting dependencies with a multi-reference attribute:

```json
"dependsOn": { "type": 1, "referenceType": "Feature", "max": -1 }
```

Keep dependencies explicit but minimal. Only model dependencies that affect release planning (if Feature B cannot ship without Feature A, that dependency matters). Do not model every conceptual relationship.


# Integration With Change Management

## Linking Features to Change Requests

When a change modifies a feature, the Change Request should reference the affected feature. This is typically done in the issue tracker (the Jira change request issue carries an asset reference to the Feature CI) rather than in the CMDB itself.

The traceability chain: Change Request (what changed) > Feature (what capability was affected) > Product Version (which release includes the change) > Deployment Site (where the change is deployed).

## Traceability: Requirement to Feature to Change to Deployment

The complete audit trail spans four systems:

1. Requirements tool: the original specification and its approval
2. Issue tracker: the change request and its approval, the work items that implemented it
3. CMDB: the Feature CI, the Product Version CI, the Deployment Site CIs, the Distribution Log CIs
4. DML: the actual artifacts that were deployed

An auditor can trace from "requirement R-1234" in the requirements tool to "Feature: Contact Import" in the CMDB, to "Change Request CHG-089" that modified the import logic, to "OvocoCRM 2.4.0" that includes the change, to "CR Acme Corp US-East" where it was deployed, to "DIST-2025-0147" recording the distribution. Every link is navigable. No gaps.


# Integration With Test Management

## Linking Test Cases to Requirements

Test cases live in the test management tool (Zephyr, TestRail, or equivalent). Each test case links to the Feature it verifies. The test management tool tracks execution results, pass/fail status, and coverage.

The CMDB does not duplicate test data. Instead, it provides the context that test reporting needs: "which version includes this feature?" and "which deployment sites will receive this version after testing passes?"

## Coverage Reporting

Requirements coverage reporting combines data from the requirements tool, the test management tool, and the CMDB:

From the requirements tool: how many requirements exist, how many have linked test cases.

From the test management tool: how many tests pass, how many fail, what is the coverage percentage.

From the CMDB: how many features are in the target version, how many are "Current" (verified), how many are still "Beta" (not yet verified).

A release readiness dashboard combines all three: "45 of 47 requirements have passing tests, 2 features are still in Beta, 12 deployment sites are scheduled for upgrade."


# Extending for Detailed Requirements

## When the Base Feature Type Is Enough

The base Feature type is enough when:

Your organization does not run a formal requirements management process. Features provide lightweight capability tracking without the overhead of decomposition, baselines, or formal traceability.

You use a dedicated requirements tool for specification and verification, and the CMDB only needs to track the capability at a high level.

Your product has fewer than 50 features and the development process is agile enough that formal requirements would slow it down.

## Adding Custom Attributes

Extend Feature with additional attributes when the base four are not sufficient:

`priority`: reference to a Priority lookup (High, Medium, Low). Useful for backlog prioritization.

`category`: reference to a Feature Category lookup (Core, Integration, Analytics, Mobile). Useful for grouping and reporting.

`externalReference`: text field for the requirement ID in an external requirements tool. Creates the link between the CMDB feature and the formal requirement.

`parentFeature`: self-referential reference for decomposition hierarchy.

`dependsOn`: multi-reference to other Features for cross-cutting dependencies.

## Adding Custom Types

For organizations with formal requirements processes, add dedicated types:

Feature Implementation: per-release snapshot of a feature's state. Immutable after creation. Provides the audit trail described in the Requirement Lifecycle section.

Requirement Source: tracks external standards, contracts, or policies that drive requirements. A Feature references the Requirement Source(s) it satisfies.

Test Coverage: tracks the number of tests and pass rate per feature per version. A lightweight alternative to full test management integration.

## Keeping It Pragmatic

The guiding principle: add complexity only when a process demands it. A startup tracking 20 features does not need Feature Implementation freeze records, decomposition hierarchies, or Requirement Source types. A defense contractor with 500 requirements across three products, regulatory compliance obligations, and formal audit cycles does need them.

Start with the base Feature type. Add attributes when you find yourself wanting to query on data you do not have. Add new types when a single type becomes overloaded with conflicting concerns. The schema should grow with your process, not ahead of it.
