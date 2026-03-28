# Service Management Design

A CMDB supports service management processes, but it does not replace them. The CMDB holds the persistent state: which CIs exist, how they relate to each other, what their current status is. The service management processes (change enablement, incident management, service level management, release management) use that state to make decisions, route work, and verify outcomes. This section maps ITIL 4 practices to CMDB-Kit's schema types and shows how to design your CMDB around the processes you actually run.


# Mapping Your Service Management Processes to CMDB Types

## Not Every Team Needs Every Type

CMDB-Kit's extended schema includes types across four branches (the enterprise schema expands to nine branches, adding Enterprise Architecture, Configuration Library, and Financial branches). No organization needs all of them on day one. A startup with a single product, a small team, and no compliance requirements might need only Product, Product Version, Product Component, and a handful of lookup types. A defense contractor managing three products across classified networks might need all extended types plus custom extensions.

The right approach is to start with the processes you run and map backward to the types that support them. If you do not track SLAs in the CMDB (perhaps your monitoring tool handles that), you do not need the SLA type. Each type should earn its place by supporting a real process.

## Start With the Processes You Actually Run

List the service management processes your organization performs. For each process, identify which CMDB types provide the data it needs:

| Process | Key CMDB Types | What the CMDB Provides |
|---------|---------------|----------------------|
| Change Enablement | Product, Product Component, Product Version, Baseline | Which CIs are affected, what version is deployed, what the baseline contains |
| Incident Management | Product, Product Version, Deployment Site, SLA | Which product is affected, where it is deployed, what the SLA targets are |
| Service Level Management | SLA, SLA Status, Product | Which products have SLAs, what the targets are, whether SLAs are met |
| Release Management | Product Version, Version Status, Baseline, Deployment, Deployment Status | What versions exist, where they are deployed, what their baselines contain |
| Configuration Management | All types | The entire CI inventory and its relationships |
| IT Asset Management | License, Vendor, Hardware Model, Vendor Status | What licenses exist, which vendors supply them, when contracts expire |
| Knowledge Management | Document, Document Type, Document State, Documentation Suite | Which documents exist, what state they are in, which suite groups them |

If your organization runs only change enablement, incident management, and release management, focus on the types in those rows. The other types can be added later when the processes that need them are established.


# Change Enablement

## Change Records Live in the Work Management Tool

Change requests are process records, not configuration items. They have a lifecycle (proposed, reviewed, approved, implemented, closed) and they belong in the work management tool (Jira, ServiceNow task tables) where workflow, approvals, and notifications are handled natively.

The CMDB's role in change enablement is to provide the CI context that change management processes consume. When a change advisory board reviews a proposed change, they need to know which CIs are affected, what version is currently deployed, what the baseline contains, and what the blast radius is. That context comes from the CMDB.

## How the CMDB Supports Change Assessment

A change request in Jira carries asset reference fields pointing to the affected Product, Product Component, Deployment Site, and Baseline CIs. These references let the change reviewer answer critical questions:

What CIs does this change affect? The asset references on the change request identify specific Product and Product Component records in the CMDB.

What version is currently deployed? The Product Version and Deployment Site records show what is running where.

What does the current baseline contain? The Baseline record lists every component and document that was approved at the last decision gate. The reviewer can see exactly what configuration the change will modify.

What is the blast radius? Querying Deployment Site records that reference the affected Product Version reveals how many sites are affected if the change introduces a defect.

When the change is approved and implemented, the effects show up in CI records: a new Product Version is created, components are updated, deployment sites receive the new version, baselines are created or superseded. The CMDB reflects the outcome. The change request in the issue tracker records the decision history and approval chain.

## Standard, Normal, and Emergency Change Models

Change management processes typically use three models, tracked and enforced in the work management tool:

Standard changes follow a pre-approved playbook. A documented procedure exists, the risk is understood, and the change authority has pre-approved execution without individual review. Example: applying a monthly security patch following the established patching procedure.

Normal changes require individual review and approval. The change request goes through impact assessment, CCB review, and formal approval before implementation begins. Most changes in a managed environment are Normal changes. Example: migrating the primary database to a new version, adding a new API endpoint, or modifying the authentication module.

Emergency changes address critical situations that cannot wait for normal review timelines. An emergency CCB convenes with abbreviated notice, reviews an abbreviated impact assessment focused on risk and rollback, and approves or rejects. Post-implementation, the change receives full review at the next regular CCB meeting. Example: patching a zero-day vulnerability in production.

The CM Operations section covers the governance bodies (Product CCB, Strategic Delivery Body, Joint CM Working Group) that review changes and the five-dimension impact analysis methodology in detail.


# Incident Management

## Incident Records Live in the Work Management Tool

Incidents are process records with a lifecycle (reported, investigated, mitigated, resolved, closed). They belong in the work management tool where triage, assignment, escalation, and resolution workflows are managed natively. Severity classifications, status transitions, and SLA timers are all work management concerns.

The CMDB's role in incident management is to provide the CI context that incident responders need for fast, informed decisions. When a SEV1 incident is reported, the responder needs to know which product is affected, what version is deployed, where it is deployed, and what the SLA commitments are. That context comes from the CMDB.

## Linking Incidents to CMDB Context

An incident in Jira carries asset reference fields pointing to the affected Product CI. This reference is the bridge between the work management record and the CMDB's configuration data. It enables queries in both directions.

From the incident: "What product is affected?" The answer includes the product's current version, its components, its deployment sites, and its SLA.

From the product: "What incidents has this product experienced?" Query incident records in the issue tracker where the asset reference matches this product. Over time, this history reveals patterns. A product with recurring incidents in the same component has a design or testing gap that needs addressing.

## Using the CMDB for Impact Analysis

When an incident is reported, the CMDB provides immediate impact context. The responder looks up the affected product and can answer:

Which deployment sites run this product? Query Deployment Site records referencing the product's Product Version. If the product runs at 50 sites, the incident's blast radius is 50 sites.

What components are involved? The Product Version's component list shows what the product is made of. If the incident is in the search module, the responder can identify the specific Product Component and check whether a known fix exists.

What SLA applies? The SLA record linked to this product shows the uptime target and response time commitment. A SEV1 incident on a product with a 99.95% uptime SLA has different urgency than the same severity on an internal tool with no SLA.

Who owns this product? The Product's owner (Team reference) identifies who should be engaged. The Team record identifies the team lead (Person reference) for escalation.

This is the return on investment for maintaining the CMDB. Every relationship you build between CIs pays dividends when an incident forces fast decisions with incomplete information.


# Service Level Management

## SLA Type and Product Linking

The SLA type records service level agreements between the service provider and its customers. Each SLA links to the Product it covers:

```json
{
  "Name": "CRM Core SLA",
  "description": "Production SLA for CRM Core product",
  "product": "CRM Core",
  "status": "Active",
  "targetUptime": "99.95%",
  "responseTime": "200ms p99",
  "reviewDate": "2026-01-15"
}
```

The `product` reference creates a direct connection between the contractual commitment and the technical infrastructure. When the CRM Core product experiences an incident, the SLA record tells the responder what the agreed targets are.

## Target Uptime and Response Time Attributes

The `targetUptime` and `responseTime` attributes are free text rather than numeric types. This is deliberate. Uptime targets come in many formats ("99.95%", "99.9% excluding planned maintenance", "four nines") and response time targets vary in measurement ("200ms p99", "500ms average", "1s max"). Free text accommodates the variety of SLA language without forcing a rigid format.

The trade-off is that free text cannot be calculated against. If you need automated SLA compliance checking (comparing actual uptime against the target), you need a monitoring tool that reads the target from the CMDB or maintains its own SLA definitions. The CMDB records the agreement. The monitoring tool enforces it.

## SLA Status Lifecycle

SLA Status tracks the agreement's lifecycle:

Draft: the SLA is being defined. Terms are under negotiation or review.

Active: the SLA is in effect. Uptime and response time commitments are being monitored.

Breached: the SLA terms have been violated. This status triggers review and remediation actions.

Expired: the SLA has passed its review date without renewal. This does not necessarily mean the service has no SLA. It means the agreement needs review and renewal.

The `reviewDate` attribute drives proactive management. A query for SLAs with review dates approaching in the next 60 days surfaces agreements that need attention before they expire.


# Release Management

## Product Version, Baseline, Deployment Types

Release management is where the CMDB provides the most value. Three types form the core:

Product Version records each release of the product. The Building the Product Library section covers this type in detail. For service management purposes, the key attributes are `status` (referencing Version Status, where the version is in its lifecycle) and `components` (what the version contains).

Baseline captures a point-in-time configuration snapshot. When a version reaches a decision gate (design review, build verification, release approval), a Baseline freezes the configuration. The baseline records which version, which components, which documents were included at that moment. Once approved, a baseline is immutable.

Deployment records the act of deploying a version to an environment. The `environment` reference (via Environment Type lookup: Development, Staging, Production) tracks where the version has been deployed, and the `deployDate` records when.

## The Release Lifecycle

A product version moves through a predictable lifecycle tracked by Version Status:

Beta: the version is in development or testing. Components are still changing. No deployment sites should reference a Beta version in production.

Current: the version is the latest stable release. New deployment sites receive this version. Upgrade campaigns target this version.

Previous: the version was Current but has been superseded. Deployment sites still running this version are on a supported but not latest release.

Deprecated: the version is no longer supported. Deployment sites on deprecated versions should be upgraded. Queries for "active sites on deprecated versions" drive upgrade planning.

Retired: the version has been removed from the supported catalog. No deployment sites should run it.

This lifecycle drives operational decisions. A portfolio manager queries "how many sites are on Current vs Previous vs Deprecated" to understand the upgrade debt across the deployment base.

## How Versions Reference Components and Previous Versions

The `previousVersion` attribute on Product Version creates a version chain: OvocoCRM 2.4.0 points to OvocoCRM 2.3.1, which points to OvocoCRM 2.3.0. This chain enables queries like "what came before this version?" and "how many versions behind is this deployment site?"

The `components` attribute (multi-reference to Product Component) records what the version contains. When a component changes between versions, the change is visible by comparing component lists. Version 2.3.1 includes Authentication Module v3.1, and Version 2.4.0 includes Authentication Module v3.2. The component-level change is traceable.

Together, version chains and component lists answer the fundamental release management question: what changed between version A and version B, and where is each version deployed?


# IT Asset Management

## License, Vendor, Hardware Model Types

IT asset management tracks the commercial and physical assets that support the product infrastructure.

The License type records software licenses:

```json
{
  "Name": "PostgreSQL Enterprise License",
  "description": "Enterprise license for production PostgreSQL instances",
  "licenseType": "Enterprise",
  "vendor": "PostgreSQL Global",
  "expirationDate": "2026-03-15",
  "status": "Active",
  "quantity": 10
}
```

The Vendor type records third-party suppliers with their contract status and expiry dates. The Hardware Model type records physical hardware specifications for servers and network equipment.

## License Tracking

License management in the CMDB answers three questions:

What licenses do we have? Query all License records by status.

When do they expire? Query License records where `expirationDate` is within 60 or 90 days. This drives proactive renewal.

Are we compliant? Compare the number of licensed seats against the number of active instances using that license. If you have 10 PostgreSQL Enterprise licenses and 12 active PostgreSQL Server CIs, you have a compliance gap.

The License type's `vendor` reference links to the Vendor record, which provides the commercial context: contract expiry, contact information, and vendor status. A Vendor with status "Under Review" flags a potential supply chain risk.

## Vendor Relationship Management

The Vendor type tracks supplier relationships:

```json
{
  "Name": "Cloud Provider Inc",
  "description": "Primary cloud infrastructure provider",
  "website": "https://cloudprovider.example.com",
  "contactEmail": "support@cloudprovider.example.com",
  "status": "Active",
  "contractExpiry": "2026-06-30"
}
```

Vendor Status values (Active, Under Review, Inactive, Terminated) track the relationship lifecycle. A quarterly vendor review process queries for vendors with upcoming contract expirations and vendors whose status is "Under Review."

The Hardware Model type complements Vendor by recording the specific hardware products in use:

```json
{
  "Name": "Dell PowerEdge R750",
  "manufacturer": "Dell Technologies",
  "modelNumber": "R750",
  "cpu": "2x Xeon Gold 6342",
  "ram": "512GB",
  "storage": "8x 2.4TB SAS",
  "formFactor": "2U Rack"
}
```

Hardware Model records serve as a catalog of approved configurations. When provisioning a new server, the team selects from the approved models. This enables capacity planning queries and standardization across the infrastructure.


# How the Schemas Map to ITIL 4 Practices

## Cross-reference With ITIL Practices

CMDB-Kit implements the "state side" of ITIL, not the "work side." This is a deliberate architectural decision. The CMDB records what exists and what state it is in. The issue tracker manages the work that creates, changes, or retires those CIs.

| ITIL 4 Practice | CMDB-Kit Types | CMDB Role |
|-----------------|---------------|-----------|
| Service Configuration Management | All types | Primary: the CMDB itself |
| Change Enablement | Product, Product Component, Product Version, Baseline | Provides CI context for change assessment and impact analysis |
| Incident Management | Product, Product Version, Deployment Site, SLA | Provides CI context for incident impact analysis and resolution |
| Service Level Management | SLA, SLA Status | Records the agreement and its lifecycle |
| Release Management | Product Version, Baseline, Deployment, Distribution Log | Records versions, what they contain, where they are deployed |
| IT Asset Management | License, Vendor, Hardware Model | Records licenses, suppliers, and hardware specifications |
| Service Asset and Configuration Management | All Product CMDB and Product Library types | The complete CI inventory with relationships |
| Knowledge Management | Document, Documentation Suite, Document Type, Document State | Records the document catalog and lifecycle |
| Enterprise Architecture (enterprise only) | Service, Capability, Business Process, Service Type, Service Status, Capability Status, Process Status | Models services, business capabilities, and processes |
| Problem Management | Not in schema | Handled as issues in the work management tool |
| Service Request Management | Not in schema | Handled as issues in the work management tool |

Change Requests and Incidents follow the same principle. They are process records with lifecycles managed in the work management tool (Jira, ServiceNow task tables), not CI types in the CMDB. The CMDB provides the CI context (affected products, versions, deployment sites, SLAs) that these processes consume through asset reference fields on their work items.

Problem Management and Service Request Management are also deliberately absent from the schema. Problems are temporary work items (they close when the root cause is identified and resolved). Service requests are temporary work items (they close when fulfilled). Neither needs a persistent CI record. The issue tracker manages them, and the CMDB provides context through CI references on those issues.

## CSDM Domain Alignment

The Atlassian Common Service Data Model (CSDM) organizes service management data into domains. CMDB-Kit's four-branch taxonomy aligns with CSDM concepts:

Product CMDB aligns with CSDM's Technical domain: the infrastructure CIs (products, servers, databases, components) that deliver services.

Product Library aligns with CSDM's Design domain (versions, baselines) and Sell/Consume domain (deployments, distribution logs, SLAs).

Directory aligns with CSDM's Foundation domain: the organizational entities (organizations, teams, people, locations) that everything else references.

Lookup Types aligns with CSDM's reference data layer: the controlled vocabularies that enforce consistency across all CI records.

The alignment is conceptual, not exact. CMDB-Kit is a vendor-neutral schema pattern, not a CSDM implementation. But understanding the mapping helps organizations that already use CSDM concepts to see where CMDB-Kit types fit.


# Designing for Your Actual Processes

## Worksheet: List Processes, Map to Types

Start with a simple exercise. List every service management process your organization runs (or plans to run). For each process, identify:

1. What data does the process need from the CMDB?
2. What data does the process create or update in the CMDB?
3. Which CMDB-Kit types provide that data?

Example for a small organization:

| Process | Data Needed | Data Created/Updated | Types Required |
|---------|-------------|---------------------|---------------|
| Release deployment | Version details, site list | Deployment records, site version updates | Product Version, Deployment Site, Deployment, Distribution Log |
| Incident response | Affected product, version, SLA | Updated CI status if needed | Product, Product Version, SLA, Deployment Site |
| Quarterly vendor review | Vendor contracts, license expirations | Updated vendor status | Vendor, License |

This exercise reveals which types are essential (they appear in multiple processes), which are nice-to-have (they appear in one process), and which are unnecessary (they appear nowhere).

## Identifying Gaps

If a process needs data that no existing type provides, you have found a schema extension opportunity. If your incident management process needs to know "which data center region is this product deployed to" and no type captures region information, you might extend the Location type with a `region` attribute or create a new lookup type for regions.

Gaps should be addressed through the schema extension process described in the Schema Changes and Version Control section: add the type to schema-structure.json, define its attributes in schema-attributes.json, add it to LOAD_PRIORITY, create its data file, and validate.

## Identifying Types You Can Skip

Not every type in the extended schema is required. If your organization does not track:

Hardware models (you use cloud infrastructure exclusively): skip Hardware Model.

Formal assessments (you do not run security audits through the CMDB): skip Assessment, Assessment Type, Assessment Status.

Certifications (you do not track compliance certifications in the CMDB): skip Certification, Certification Type, Certification Status.

Removing types you do not need reduces schema complexity, simplifies imports, and avoids empty data files cluttering the repository. You can always add them back when a process requires them.

The base schema is the minimal starting point. The extended schema is the full-featured option. The enterprise schema adds enterprise architecture types (Service, Capability, Business Process), financial tracking (Contract, Cost Allocation), requirements management (Requirement, Feature Implementation), and a configuration library. Most organizations land somewhere in between, starting with the base schema and extending as processes mature.
