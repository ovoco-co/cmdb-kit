# Building the Product Library

The Product Library branch is where release management lives in the CMDB. While the Product CMDB branch tracks what exists (applications, servers, databases, components), the Product Library tracks what was built, what was approved, what was shipped, and where it went. Every software release passes through the types in this branch: a Product Version record anchors the release, Documents capture the knowledge, a Baseline freezes the approved configuration, Certifications confirm compliance, and a Documentation Suite bundles it all together. This section walks through each type, its attributes, its relationships to other types, and how they combine into a complete release record.


# What the Product Library Branch Is

## The Release Management Side of the CMDB

The Product Library branch holds over a dozen types in portfolio mode, organized under each product's library (e.g., OvocoCRM Library, OvocoAnalytics Library). Seven of them form the core release management chain covered in this section:

- CR Product Version: the release itself
- CR Document: controlled documents produced during development
- CR Baseline: an approved snapshot of a version's configuration
- CR Documentation Suite: a versioned bundle of documents
- CR Certification: compliance certifications tied to the product
- CR Feature: product capabilities and enhancements
- CR Feature Implementation: immutable audit records linking features to specific releases

The remaining types in the branch (CR Product Media, CR Product Suite, CR Distribution Log, CR Deployment Site, CR Component Instance, Change Request, Incident, SLA) are covered in their own sections. This section focuses on the types that answer the question: what did we release, what documents describe it, and who approved it?

## What It Tracks

Think of the Product Library as the permanent record of your product's release history. An application might be running version 2.4.0 today, but the Product Library remembers every version that came before: what components each included, what documents were approved, what baselines were established, and what certifications were earned.

This history matters for several reasons. Rollback planning requires knowing what the previous version contained. Audit preparation requires showing what was approved and when. Compliance reporting requires demonstrating that certifications were current at the time of each release. Incident investigation requires tracing which components were present in the version deployed at the time of a failure.

Without a Product Library, this information lives in scattered wiki pages, email threads, and individual memories. With one, it lives in structured, queryable records that survive staff turnover and organizational change.


# Product Version as the Anchor

## Every Release Starts With a Product Version Record

CR Product Version is the most connected type in the Product Library. Nearly everything else in the branch references it. Baselines reference a version. Documentation Suites reference a version. Distribution Logs reference a version. Certifications apply to a version. Feature Implementations freeze against a version.

Here is the complete attribute definition from schema-attributes.json:

```json
"CR Product Version": {
  "description": { "type": 0 },
  "product": { "type": 1, "referenceType": "CR Product" },
  "versionStatus": { "type": 1, "referenceType": "Version Status" },
  "versionNumber": { "type": 0 },
  "components": { "type": 1, "referenceType": "CR Product Component", "max": -1 },
  "previousVersion": { "type": 1, "referenceType": "CR Product Version" },
  "releaseDate": { "type": 0, "defaultTypeId": 4 },
  "sunsetReason": { "type": 1, "referenceType": "Sunset Reason" },
  "sunsetDate": { "type": 0, "defaultTypeId": 4 },
  "documentationSuites": { "type": 1, "referenceType": "CR Documentation Suite", "max": -1 },
  "dmlPath": { "type": 0 },
  "productSuites": { "type": 1, "referenceType": "CR Product Suite", "max": -1 }
}
```

Portfolio mode captures significantly more than the basics. The product attribute links the version to its parent CR Product record. The versionStatus reference (to the Version Status lookup) tracks lifecycle state (Current, Previous, Sunset). The sunsetReason and sunsetDate attributes record why and when a version was retired. The documentationSuites and productSuites multi-references link directly to the documentation and distribution packages for this release. The dmlPath attribute records the version's location on the Definitive Media Library.

In the OvocoCRM example data, v2.3.1 is a maintenance release that has since been superseded by v2.4.0:

```json
{
  "Name": "OvocoCRM 2.3.1",
  "description": "Previous maintenance release",
  "product": "CR Core Platform",
  "versionStatus": "Previous",
  "versionNumber": "2.3.1",
  "previousVersion": "OvocoCRM 2.3.0",
  "releaseDate": "2025-06-01",
  "dmlPath": "/releases/cr/2.3.1/"
}
```

The current production release is OvocoCRM 2.4.0, with a release date of 2025-09-15 and versionStatus "Current." The sunset version, OvocoCRM 2.3.0, carries a sunsetReason of "Superseded" and a sunsetDate matching the 2.4.0 release.

The Name field is the canonical identifier. It combines the product name and the version number. This convention means that in a multi-product CMDB, version records are self-identifying: "OvocoCRM 2.3.1" and "OvocoAnalytics 1.0.0" cannot be confused even when viewed in a flat list.

## Version Numbering Conventions

CMDB-Kit does not enforce a version numbering scheme. The versionNumber attribute is a text field that accepts any string. Semantic versioning (major.minor.patch) is the most common convention, and the OvocoCRM example data uses it, but your organization might use date-based versions (2026.03), build numbers (build-4521), or any other format.

What matters is consistency within a product. If OvocoCRM uses semantic versioning, every OvocoCRM version should follow the same pattern. The versionNumber field is for human readability and sorting. The Name field is what other records reference.

## Linking Versions to Components

The components attribute is a multi-reference field (`"max": -1`) that points to CR Product Component records. It answers the question: what is included in this release?

In the OvocoCRM data, the current CR Product Component records are:

```json
"components": "CR Web Frontend;CR Backend API;CR Data Layer;CR Auth Service"
```

Each component references its parent product and has a componentType (Application, Service, Library) from the Component Type lookup. The CR Web Frontend is an Application component of CR Core Platform. The CR Auth Service is a Service component of CR Authentication Module. This means components can span products within the same portfolio.

Multi-reference values in CMDB-Kit data files use semicolons as delimiters. Each value must match the Name field of a CR Product Component record exactly.

This component list is a powerful traceability tool. When a security vulnerability is found in the CR Backend API component, you can query which versions include it. When a component is deprecated, you can identify which versions are affected. When planning a new release, you can see which components the previous version contained and decide what to add, remove, or update.

### Component Instances: Built Artifacts With Checksums

Portfolio mode adds CR Component Instance, which tracks specific built artifacts for each component in a release. While a CR Product Component describes what a component is, a CR Component Instance records a specific build with its checksum, build number, and DML path:

```json
{
  "Name": "CR Web Frontend 2.4.0-b142",
  "description": "Web frontend build 142 for 2.4.0",
  "component": "CR Web Frontend",
  "version": "2.4.0",
  "productVersion": "OvocoCRM 2.4.0",
  "buildDate": "2025-09-10",
  "buildNumber": "142",
  "checksum": "sha256:a1b2c3d4e5f6",
  "buildStatus": "Released",
  "packageSize": "45MB",
  "dmlPath": "/releases/cr/2.4.0/cr-web-frontend-2.4.0-b142.tar.gz"
}
```

Component Instances are referenced by CR Baseline records (via the componentInstances multi-reference) and by CR Deployment Site records (via the componentPackage multi-reference). This creates full traceability from an approved baseline through the exact builds it contains to the sites where those builds are deployed.

## Version Chains With previousVersion References

The previousVersion attribute creates a linked list of releases. Each version points to the one it replaced. Following the chain from OvocoCRM 2.4.0 backward:

```
OvocoCRM 2.4.0 → OvocoCRM 2.3.1 → OvocoCRM 2.3.0
```

This chain serves multiple purposes:

Release history navigation. In JSM Assets or any CMDB front end, clicking the previousVersion reference takes you directly to the prior release. You can walk the entire release history without running a search.

Rollback planning. When a deployment fails and you need to roll back, the previousVersion tells you exactly which version to restore. The components list on that previous version tells you what was included.

Delta analysis. Comparing the components lists of two consecutive versions reveals what changed. This is visible without any external documentation, encoded directly in the CI data.

Not every version needs a previousVersion reference. The first version in a product's history (OvocoCRM 2.3.0 in the example data) has no previous version. This is the root of the chain.


# Documentation Suite

## Grouping Documents Into Versioned Packages

A product release does not just ship code. It ships documentation: system specifications, installation guides, API references, release notes, test reports. A CR Documentation Suite bundles these documents into a single versioned package tied to a release.

The CR Documentation Suite attributes:

```json
"CR Documentation Suite": {
  "description": { "type": 0 },
  "suiteVersion": { "type": 0 },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "documents": { "type": 1, "referenceType": "CR Document", "max": -1 },
  "approvalDate": { "type": 0, "defaultTypeId": 4 },
  "approvedBy": { "type": 0 },
  "releaseNotes": { "type": 0 },
  "suiteStatus": { "type": 1, "referenceType": "Document State" },
  "dmlPath": { "type": 0 }
}
```

The productVersion attribute links the suite to the CR Product Version it covers. The documents attribute is a multi-reference to the individual CR Document records. The suiteStatus attribute tracks where the suite is in the publication process, using the Document State lookup values: Draft, Review, Published, Archived. The approvalDate and approvedBy fields record formal sign-off. The dmlPath points to the suite's location on the DML.

The OvocoCRM example has one Documentation Suite for the current 2.4.0 release:

```json
{
  "Name": "CR Doc Suite 2.4.0",
  "description": "Complete documentation package for OvocoCRM 2.4.0",
  "suiteVersion": "2.4.0",
  "productVersion": "OvocoCRM 2.4.0",
  "documents": "CR System Specification 2.4.0;CR Installation Guide 2.4.0",
  "approvalDate": "2025-09-12",
  "approvedBy": "Release Manager",
  "suiteStatus": "Published",
  "dmlPath": "/docs/cr/2.4.0/"
}
```

The suite bundles the two controlled documents for this release: the System Specification and the Installation Guide. Documents that did not change between releases do not need new records.

## Linking Documentation to the Version It Covers

The relationship between CR Documentation Suite and CR Document is many-to-many in practice. The suite has a documents multi-reference pointing to Document records, and each CR Document also has a documentationSuites multi-reference pointing back to the suites that include it. A single document (like "CR System Specification 2.4.0") might appear in multiple suites across versions if it was not updated between releases.

This means you do not need to create new document records for every release. A specification written for v2.3.0 might still be valid for v2.3.1. When a document does change, create a new version of the CR Document record (or update the existing one and change its documentState back to Draft), then include the updated document in the new suite.

## Document Lifecycle and Document State Values

Documents progress through four states (from the Document State lookup):

| State | Meaning |
|-------|---------|
| Draft | Document is being written |
| Review | Document is under peer review |
| Published | Document is approved and available |
| Archived | Document is no longer current |

A CR Documentation Suite should only reach "Published" suiteStatus when all its constituent documents individually have documentState "Published." If any document in the suite is still in Draft or Review, the suite remains in Review. This enforcement happens through process, not through schema constraints. The schema does not prevent you from publishing a suite with draft documents, but your review process should.


# Document Types and Release Requirements

## Document Type Codes and Their Meanings

The Document Type lookup classifies documents by their purpose. The Core + domains schema ships with eight types:

| Type | Purpose |
|------|---------|
| Runbook | Operational procedure for routine tasks |
| Architecture | System design and architecture documentation |
| SOP | Standard operating procedure |
| API Reference | API endpoint and usage documentation |
| Post-Mortem | Incident analysis and lessons learned |
| Release Notes | Summary of changes in a release |
| System Design | System design description and architectural decisions |
| Version Description | Comprehensive description of a product version and its contents |

Each type serves a different audience. Runbooks are for operators deploying and maintaining the system. Architecture documents are for developers and architects understanding the system design. SOPs are for teams following repeatable processes. API References are for integration developers. Post-Mortems capture institutional learning from incidents. Release Notes communicate changes to all stakeholders. System Design documents record design descriptions and the rationale behind architectural decisions. Version Descriptions provide a comprehensive summary of what a specific product version contains and how it differs from its predecessor.

## Required Documents Per Product Release

Not every document type is required for every release. A hotfix release like OvocoCRM 2.3.1 might only need Release Notes describing the fix. A major release like OvocoCRM 2.0.0 should have the full set: Architecture documentation, a Deployment Runbook, an API Reference, and Release Notes. A feature release like OvocoCRM 2.4.0 might add a System Design document and a Version Description alongside Release Notes.

Your organization should define which document types are required at each release level. A common pattern:

Major releases (x.0.0): Architecture, System Design, Runbook, SOP, API Reference, Version Description, Release Notes.

Minor releases (x.y.0): Release Notes, Version Description, updated Runbook (if deployment procedure changed), updated API Reference (if endpoints changed).

Patch releases (x.y.z): Release Notes only.

## Standard Practice Documents

Some documents apply to the product as a whole rather than to a specific version. SOPs like the Incident Response procedure and operational Runbooks like the Database Migration Guide persist across versions and are updated only when the procedure changes.

These documents still belong in the Documentation Suite for the current version, but their publishDate does not change with every release. The OvocoCRM "Incident Response SOP" was published on 2025-07-20 and remains valid through v2.3.1. The CRM Deployment Runbook and CRM API Architecture similarly carry forward into the v2.4 suite without modification.

## Version-to-document Mapping

The combination of Product Version, Documentation Suite, and Document creates a three-level traceability chain. Here is how the two current suites map:

```
Product Version "OvocoCRM 2.3.1"
  └── Documentation Suite "OvocoCRM 2.3 Documentation"
        ├── "CRM Deployment Runbook" (Runbook, published 2025-08-10)
        ├── "Incident Response SOP" (SOP, published 2025-07-20)
        ├── "CRM API Architecture" (Architecture, published 2025-06-01)
        └── "Database Migration Guide" (Runbook, published 2025-10-05)

Product Version "OvocoCRM 2.4.0"
  └── Documentation Suite "OvocoCRM 2.4 Documentation"
        ├── "OvocoCRM System Design Description" (System Design)
        ├── "OvocoCRM 2.4.0 Version Description" (Version Description)
        ├── "v2.4.0 Release Notes" (Release Notes)
        ├── "CRM Deployment Runbook" (Runbook, published 2025-08-10)
        └── "CRM API Architecture" (Architecture, published 2025-06-01)
```

Given any version, you can find its documentation suite. Given any document, you can find which suites include it and therefore which versions it applies to. Notice that "CRM Deployment Runbook" and "CRM API Architecture" appear in both suites, showing that these documents remained current across releases.


# Baselines

## What a Configuration Baseline Is

A baseline is an approved snapshot of a version's configuration at a specific point in time. It answers the question: what exactly was approved, and when?

In formal configuration management, baselines mark decision gates in the product lifecycle. The design is approved: that is a design baseline. The build is verified: that is a build baseline. The release is authorized for distribution: that is a release baseline. Each baseline represents a commitment: this configuration has been reviewed, approved, and is now under change control.

The Baseline attributes in CMDB-Kit:

```json
"Baseline": {
  "description": { "type": 0 },
  "baselineType": { "type": 1, "referenceType": "Baseline Type" },
  "version": { "type": 1, "referenceType": "Product Version" },
  "status": { "type": 1, "referenceType": "Baseline Status" },
  "approvalDate": { "type": 0, "defaultTypeId": 4 }
}
```

A baseline references its type (what kind of baseline), the version it captures (which release), its status (where it is in the approval lifecycle), and when it was approved.

## Baseline Type and Baseline Status Values

CMDB-Kit ships with three baseline types that map to the standard configuration management progression:

| Baseline Type | What It Captures |
|---------------|-----------------|
| Design | Approved design configuration (architecture, component definitions) |
| Build | Verified build configuration (tested and validated implementation) |
| Release | Approved release configuration (authorized for distribution) |

These three types align with the classical Functional Baseline (FBL), Allocated Baseline (ABL), and Product Baseline (PBL) from configuration management standards like ANSI/EIA 649-B. CMDB-Kit uses simpler names (Design, Build, Release) to make them accessible to organizations that do not use formal CM terminology.

The Design baseline says: "This is the approved architecture." The Build baseline says: "This implementation matches the approved design." The Release baseline says: "This build is approved for distribution to customers."

Baseline Status tracks the approval lifecycle:

| Status | Meaning |
|--------|---------|
| Draft | Baseline being defined, not yet reviewed |
| Approved | Baseline formally approved by the CCB or equivalent |
| Superseded | Replaced by a newer baseline |

A baseline starts as "Draft" while the version is being assembled. When the configuration control board (or equivalent approval body) signs off, it becomes "Approved." When the next version establishes its own baseline, the previous one becomes "Superseded."

## When to Create a Baseline

Create a baseline at every significant decision gate. The minimum for most organizations is a Release baseline for every version that ships to customers. The OvocoCRM example includes two:

```json
{
  "Name": "OvocoCRM 2.3.1 Release Baseline",
  "description": "Approved release configuration for v2.3.1",
  "baselineType": "Release",
  "version": "OvocoCRM 2.3.1",
  "status": "Approved",
  "approvalDate": "2026-02-09"
}
```

```json
{
  "Name": "OvocoCRM 2.4.0 Release Baseline",
  "description": "Approved release configuration for v2.4.0",
  "baselineType": "Release",
  "version": "OvocoCRM 2.4.0",
  "status": "Approved",
  "approvalDate": "2026-02-28"
}
```

Notice the approval dates precede or match the release dates. The v2.3.1 baseline was approved on 2026-02-09, one day before the release date of 2026-02-10. The v2.4.0 baseline was approved on 2026-02-28, one day before the release date of 2026-03-01. This temporal ordering is intentional: you approve first, then ship.

Organizations with more formal CM processes create baselines at each gate. A major release might have three baselines:

- "OvocoCRM 3.0.0 Design Baseline" (Approved at architecture review)
- "OvocoCRM 3.0.0 Build Baseline" (Approved after integration testing)
- "OvocoCRM 3.0.0 Release Baseline" (Approved for customer distribution)

Organizations with lighter processes might only create Release baselines for major and minor versions, skipping them for patch releases. The key is consistency: whatever your policy, apply it to every release at the same level.


# Certifications

## Tracking Compliance Certifications Against Versions

Certifications record that the product has been independently verified against a compliance standard. Unlike baselines (which are internal approvals), certifications come from external bodies and have expiration dates.

The Certification attributes:

```json
"Certification": {
  "description": { "type": 0 },
  "certificationType": { "type": 1, "referenceType": "Certification Type" },
  "status": { "type": 1, "referenceType": "Certification Status" },
  "issueDate": { "type": 0, "defaultTypeId": 4 },
  "expirationDate": { "type": 0, "defaultTypeId": 4 },
  "issuingBody": { "type": 0 }
}
```

## Certification Type, Status, Issuing Body, Expiration

The OvocoCRM example has two certifications:

```json
[
  {
    "Name": "SOC 2 Type II 2025",
    "description": "Annual SOC 2 Type II audit certification",
    "certificationType": "SOC 2 Type II",
    "status": "Active",
    "issueDate": "2025-08-15",
    "expirationDate": "2026-08-15",
    "issuingBody": "Deloitte"
  },
  {
    "Name": "ISO 27001 2024",
    "description": "Information security management certification",
    "certificationType": "ISO 27001",
    "status": "Active",
    "issueDate": "2024-03-01",
    "expirationDate": "2027-03-01",
    "issuingBody": "BSI Group"
  }
]
```

The expirationDate attribute is the most operationally important field. Certifications that expire without renewal can cause compliance failures, contract breaches, and lost business. In the platform setup sections (01-02 and 01-03), you will see how to set up automation rules that alert the team when a certification approaches its expiration date.

The Certification Status lifecycle (Active, Pending, Expired, Revoked) lets you track certifications through renewal cycles. When a SOC 2 audit begins, create a new certification record with "Pending" status. When the auditor issues the report, update to "Active." When the annual period ends, it either gets renewed (new record) or expires.

## Compliance Requirements Per Product

Different products may require different certifications. A healthcare product needs HIPAA. A payments product needs PCI DSS. A product serving European customers needs GDPR compliance.

In a multi-product CMDB, each product has its own set of certification records. The Certification Type lookup (SOC 2 Type II, ISO 27001, GDPR, HIPAA, PCI DSS) is shared, but the certification records are product-specific. This lets you query: "Show me all products with an active SOC 2 certification" or "Show me all certifications expiring in the next 90 days."


# Documentation Completeness Audit

## Checking All Required Documents Exist Per Version

Before a release ships, someone needs to verify that all required documents exist and are in Published state. This is the documentation completeness audit: a check that the Documentation Suite is actually complete.

The audit is straightforward. For the target release, find its Documentation Suite. Check that the suite contains at least one document of each required type for the release level. Check that every document in the suite has a state of "Published."

In AQL terms (for a JSM Assets deployment):

```
objectType = "Documentation Suite" AND "version" = "OvocoCRM 2.4.0"
```

Then inspect the documents list and verify each one is published:

```
objectType = "Document" AND "state" != "Published"
```

Any document in the suite that appears in the second query is a gap.

## Document Type Checklist

A practical checklist for a major release:

- At least one Architecture document (Published)
- At least one System Design document (Published)
- At least one Runbook covering deployment (Published)
- At least one SOP for incident response (Published)
- API Reference if the product has an API (Published)
- Version Description for the release (Published)
- Release Notes for the specific version (Published)

For minor and patch releases, the checklist shrinks to Release Notes plus any updated documents.

## Identifying Missing or Draft Documents Before Release

The most common documentation gap is not a missing document but an outdated one. The Architecture document from v2.0.0 might still be in the Documentation Suite for v2.4.0, but if the architecture changed significantly in v2.2.0, the document is stale even though its state says "Published."

Two practices help catch this:

First, check publish dates against the release timeline. If a document's publishDate is more than two versions old and the components it covers have changed, it needs review.

Second, include a documentation review step in your release process. Before the Release baseline is approved, verify that every document in the suite accurately reflects the current version's architecture, procedures, and interfaces.


# Building a Complete Release Record

## Walkthrough: From Version Through Baseline to Deployment

Here is the full lifecycle of a release, showing how each Product Library type fits together:

Step 1: Create the Product Version record. Set the version number, list the components, link to the previous version. Status is "Beta" during development and testing.

Step 2: Assemble documents. Create or update Document records for anything that changed. New architecture? Create a new Architecture document. Changed deployment procedure? Update the Runbook. Write Release Notes.

Step 3: Create the Documentation Suite. Bundle the current documents into a suite, link it to the version. Suite state is "Draft" until all documents are approved.

Step 4: Create the Baseline. Start with a "Draft" Release baseline linked to the version. When the CCB or release manager approves, update to "Approved" and set the approval date.

Step 5: Publish the suite. Once all documents are in "Published" state, update the Documentation Suite to "Published."

Step 6: Update the version status. Change the Product Version status from "Beta" to "Current." If a previous version exists, update its status from "Current" to "Previous."

Step 7: Deploy. Create Deployment records for each environment (Staging first, then Production). This is covered in detail in the Designing Site Deployments section (04-03).

## The OvocoCRM Example Release Lifecycle

Walking through the actual OvocoCRM data shows how all the types connect for the v2.4.0 release:

The version record "OvocoCRM 2.4.0" carries the full component list (six components), a release date of 2026-03-01, status "Current," and a previousVersion link to "OvocoCRM 2.3.1."

The baseline "OvocoCRM 2.4.0 Release Baseline" is linked to the version, typed as "Release," approved on 2026-02-28 (one day before the release date).

The documentation suite "OvocoCRM 2.4 Documentation" bundles five documents and links to the version. It includes two new document types (System Design and Version Description) alongside carried-forward documents. All documents and the suite are in "Published" state.

The previous release, v2.3.1, retains its own complete record: the "OvocoCRM 2.3.1 Release Baseline" (approved 2026-02-09) and the "OvocoCRM 2.3 Documentation" suite with four documents. Its status is now "Previous."

Two certifications ("SOC 2 Type II 2025" and "ISO 27001 2024") confirm that the product meets compliance requirements, with expiration dates tracked for renewal.

The complete picture for the current release:

```
OvocoCRM 2.4.0 (Product Version, Current)
  ├── previousVersion → OvocoCRM 2.3.1 (Previous)
  ├── components → Contact Manager, Deal Pipeline, Email Integration,
  │                REST API, Webhook Service, Report Generator
  ├── OvocoCRM 2.4.0 Release Baseline (Approved, 2026-02-28)
  ├── OvocoCRM 2.4 Documentation (Published)
  │     ├── OvocoCRM System Design Description
  │     ├── OvocoCRM 2.4.0 Version Description
  │     ├── v2.4.0 Release Notes
  │     ├── CRM Deployment Runbook
  │     └── CRM API Architecture
  ├── SOC 2 Type II 2025 (Active, expires 2026-08-15)
  └── ISO 27001 2024 (Active, expires 2027-03-01)
```

Every record in this tree is a CI in the CMDB. Every relationship is a reference that can be queried, reported on, and audited. This is the Product Library doing its job: providing a permanent, structured record of what was released, what was approved, what documentation describes it, and where it was deployed.
