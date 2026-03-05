# Service Management Design

A CMDB supports service management processes, but it does not replace them. The CMDB holds the persistent state: which CIs exist, how they relate to each other, what their current status is. The service management processes (change enablement, incident management, service level management, release management) use that state to make decisions, route work, and verify outcomes. This chapter maps ITIL 4 practices to CMDB-Kit's schema types and shows how to design your CMDB around the processes you actually run.


# Mapping Your Service Management Processes to CMDB Types

## Not Every Team Needs Every Type

CMDB-Kit's extended schema includes 55 types across four branches. No organization needs all of them on day one. A startup with a single product, a small team, and no compliance requirements might need only Application, Product Version, Product Component, and a handful of lookup types. A defense contractor managing three products across classified networks might need all 55 types plus custom extensions.

The right approach is to start with the processes you run and map backward to the types that support them. If you do not run a formal change control process, you do not need the Change Request type. If you do not track SLAs in the CMDB (perhaps your monitoring tool handles that), you do not need the SLA type. Each type should earn its place by supporting a real process.

## Start With the Processes You Actually Run

List the service management processes your organization performs. For each process, identify which CMDB types provide the data it needs:

| Process | Key CMDB Types | What the CMDB Provides |
|---------|---------------|----------------------|
| Change Enablement | Change Request, Change Type, Change Impact, Application, Product Component | Which CIs are affected, what kind of change, what impact level |
| Incident Management | Incident, Incident Severity, Incident Status, Application | Which application is affected, how severe, current status |
| Service Level Management | SLA, SLA Status, Application | Which applications have SLAs, what the targets are, whether SLAs are met |
| Release Management | Product Version, Version Status, Baseline, Deployment, Deployment Status | What versions exist, where they are deployed, what their baselines contain |
| Configuration Management | All types | The entire CI inventory and its relationships |
| IT Asset Management | License, Vendor, Hardware Model, Vendor Status | What licenses exist, which vendors supply them, when contracts expire |
| Knowledge Management | Document, Document Type, Document State, Documentation Suite | Which documents exist, what state they are in, which suite groups them |

If your organization runs only change enablement, incident management, and release management, focus on the types in those rows. The other types can be added later when the processes that need them are established.


# Change Enablement

## Change Request, Change Type, Change Impact Types

The Change Request type records proposed changes to the product or its infrastructure. In CMDB-Kit's extended schema:

```json
{
  "Name": "CHG-001",
  "description": "Migrate primary database from PostgreSQL 14 to 16",
  "changeType": "Normal",
  "impact": "High",
  "requestedBy": "Alex Chen",
  "requestDate": "2025-06-01",
  "status": "Approved"
}
```

Three supporting lookup types classify change requests:

Change Type defines the approval model. Standard changes are pre-approved routine operations that follow a documented procedure (restarting a service, applying a security patch). Normal changes require review and approval by the CCB or change authority. Emergency changes bypass normal timelines due to critical urgency (security vulnerability, production outage).

Change Impact rates the scope of effect. High impact means the change affects critical infrastructure, multiple products, or a large number of deployment sites. Medium impact affects a single product or limited infrastructure. Low impact is localized with minimal risk.

The Change Request type also references Deployment Status for its status attribute. This reuse of an existing lookup is pragmatic: Deployment Status values (Planned, In Progress, Completed, Failed, Rolled Back) apply equally to deployment tracking and change request tracking.

## How Change Records Reference Affected CIs

A Change Request's value comes from its connections to other CIs. The `requestedBy` attribute links to a Person record, establishing who proposed the change. But the full power of change management comes from linking the Change Request to the CIs it affects.

In practice, this linking happens in the issue tracker rather than the CMDB. The Change Request CI in Assets records the persistent state (what was proposed, what type, what impact, who requested it). The corresponding Jira issue carries asset reference fields pointing to the affected Application, Product Component, Deployment Site, and Baseline CIs.

This split follows the assets-vs-issues principle from the System Integration Patterns chapter. The Change Request CI persists as an audit record. The Jira issue tracks the workflow (review, approval, implementation, verification).

When the change is approved and implemented, the effects show up in other CI records: a new Product Version is created, components are updated, deployment sites receive the new version, baselines are created or superseded. The Change Request CI remains as the historical record of why those changes happened.

## Standard, Normal, and Emergency Change Models

Standard changes follow a pre-approved playbook. A documented procedure exists, the risk is understood, and the change authority has pre-approved execution without individual review. In the CMDB, a Standard change request records the event for audit purposes but does not require CCB review. Example: applying a monthly security patch following the established patching procedure.

Normal changes require individual review and approval. The change request goes through impact assessment, CCB review, and formal approval before implementation begins. Most changes in a managed environment are Normal changes. Example: migrating the primary database to a new version, adding a new API endpoint, or modifying the authentication module.

Emergency changes address critical situations that cannot wait for normal review timelines. An emergency CCB convenes with abbreviated notice, reviews an abbreviated impact assessment focused on risk and rollback, and approves or rejects. Post-implementation, the change receives full review at the next regular CCB meeting. Example: patching a zero-day vulnerability in production.

The CM Operations chapter covers the governance bodies (Product CCB, Strategic Delivery Body, Joint CM Working Group) that review changes and the five-dimension impact analysis methodology in detail.


# Incident Management

## Incident, Incident Severity, Incident Status Types

The Incident type records service disruptions and defects. In CMDB-Kit's extended schema:

```json
{
  "Name": "INC-042",
  "description": "CRM contact search returns timeout errors for queries with more than 100 results",
  "severity": "SEV2",
  "status": "Resolved",
  "reportedBy": "Jordan Lee",
  "reportDate": "2025-05-15",
  "resolvedDate": "2025-05-16",
  "affectedApplication": "CRM Core"
}
```

Incident Severity uses a four-tier model:

| Severity | Description | Example |
|----------|-------------|---------|
| SEV1 | Complete service outage or data loss | Application unreachable for all users |
| SEV2 | Major degradation affecting many users | Search timeouts for large queries |
| SEV3 | Minor issue with workaround available | Export formatting issue, manual workaround exists |
| SEV4 | Cosmetic or low-impact issue | UI alignment issue on settings page |

Incident Status tracks the investigation and resolution lifecycle: Open (reported, not yet investigated), Investigating (actively being worked), Mitigated (immediate impact reduced, root cause not yet resolved), Resolved (fix applied and verified), Closed (post-mortem complete). The "Closed" status explicitly requires a post-mortem to be complete, enforcing the practice of learning from incidents.

## Linking Incidents to Affected Applications

The `affectedApplication` attribute on the Incident type is the critical relationship. It links the incident to the specific Application CI that experienced the disruption. This is not just a label. It is a navigable reference that enables queries in both directions.

From the incident: "What application is affected?" The answer includes the application's current version, its components, its deployment sites, and its SLA.

From the application: "What incidents has this application experienced?" Query all Incident records where `affectedApplication` matches this application. Over time, this history reveals patterns. An application with recurring SEV2 incidents in the same component has a design or testing gap that needs addressing.

## Using the CMDB for Impact Analysis

When an incident is reported, the CMDB provides immediate impact context. The responder looks up the affected application and can answer:

Which deployment sites run this application? Query Deployment Site records referencing the application's Product Version. If the application runs at 50 sites, the incident's blast radius is 50 sites.

What components are involved? The Product Version's component list shows what the application is made of. If the incident is in the search module, the responder can identify the specific Product Component and check whether a known fix exists.

What SLA applies? The SLA record linked to this application shows the uptime target and response time commitment. A SEV1 incident on an application with a 99.95% uptime SLA has different urgency than the same severity on an internal tool with no SLA.

Who owns this application? The Application's owner (Team reference) identifies who should be engaged. The Team record identifies the team lead (Person reference) for escalation.

This is the return on investment for maintaining the CMDB. Every relationship you build between CIs pays dividends when an incident forces fast decisions with incomplete information.


# Service Level Management

## SLA Type and Application Linking

The SLA type records service level agreements between the service provider and its customers. Each SLA links to the Application it covers:

```json
{
  "Name": "CRM Core SLA",
  "description": "Production SLA for CRM Core application",
  "application": "CRM Core",
  "status": "Active",
  "targetUptime": "99.95%",
  "responseTime": "200ms p99",
  "reviewDate": "2026-01-15"
}
```

The `application` reference creates a direct connection between the contractual commitment and the technical infrastructure. When the CRM Core application experiences an incident, the SLA record tells the responder what the agreed targets are.

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

Product Version records each release of the product. The Building the Product Library chapter covers this type in detail. For service management purposes, the key attributes are `versionStatus` (where the version is in its lifecycle) and `components` (what the version contains).

Baseline captures a point-in-time configuration snapshot. When a version reaches a decision gate (design review, build verification, release approval), a Baseline freezes the configuration. The baseline records which version, which components, which documents were included at that moment. Once approved, a baseline is immutable.

Deployment records the act of deploying a version to an environment. The `environment` reference (via Environment Type lookup: Development, Staging, Production) tracks where the version has been deployed, and the `deploymentDate` records when.

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
  "seats": 10
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
  "modelType": "Rack Server",
  "specifications": "2x Xeon Gold 6342, 512GB RAM, 8x 2.4TB SAS"
}
```

Server CIs reference Hardware Model to record which physical hardware they run on. This enables capacity planning queries: "how many servers use the R750 model?" and "what is the total deployment base for this hardware model?"


# How the Schemas Map to ITIL 4 Practices

## Cross-reference With ITIL Practices

CMDB-Kit implements the "state side" of ITIL, not the "work side." This is a deliberate architectural decision. The CMDB records what exists and what state it is in. The issue tracker manages the work that creates, changes, or retires those CIs.

| ITIL 4 Practice | CMDB-Kit Types | CMDB Role |
|-----------------|---------------|-----------|
| Service Configuration Management | All types | Primary: the CMDB itself |
| Change Enablement | Change Request, Change Type, Change Impact | Records the change, its classification, and its impact |
| Incident Management | Incident, Incident Severity, Incident Status | Records the incident, its severity, and links to affected CIs |
| Service Level Management | SLA, SLA Status | Records the agreement and its lifecycle |
| Release Management | Product Version, Baseline, Deployment, Distribution Log | Records versions, what they contain, where they are deployed |
| IT Asset Management | License, Vendor, Hardware Model | Records licenses, suppliers, and hardware specifications |
| Service Asset and Configuration Management | All Product CMDB and Product Library types | The complete CI inventory with relationships |
| Knowledge Management | Document, Documentation Suite, Document Type, Document State | Records the document catalog and lifecycle |
| Problem Management | Not in schema | Handled as issues in the work management tool |
| Service Request Management | Not in schema | Handled as issues in the work management tool |

Problem Management and Service Request Management are deliberately absent from the schema. Problems are temporary work items (they close when the root cause is identified and resolved). Service requests are temporary work items (they close when fulfilled). Neither needs a persistent CI record. The issue tracker manages them, and the CMDB provides context through CI references on those issues.

## CSDM Domain Alignment

The Atlassian Common Service Data Model (CSDM) organizes service management data into domains. CMDB-Kit's four-branch taxonomy aligns with CSDM concepts:

Product CMDB aligns with CSDM's Technical domain: the infrastructure CIs (applications, servers, databases, components) that deliver services.

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
| Incident response | Affected application, version, SLA | Incident record | Application, Product Version, SLA, Incident |
| Quarterly vendor review | Vendor contracts, license expirations | Updated vendor status | Vendor, License |

This exercise reveals which types are essential (they appear in multiple processes), which are nice-to-have (they appear in one process), and which are unnecessary (they appear nowhere).

## Identifying Gaps

If a process needs data that no existing type provides, you have found a schema extension opportunity. If your incident management process needs to know "which data center region is this application deployed to" and no type captures region information, you might extend the Location type with a `region` attribute or create a new lookup type for regions.

Gaps should be addressed through the schema extension process described in the Schema Changes and Version Control chapter: add the type to schema-structure.json, define its attributes in schema-attributes.json, add it to LOAD_PRIORITY, create its data file, and validate.

## Identifying Types You Can Skip

Not every type in the extended schema is required. If your organization does not track:

Hardware models (you use cloud infrastructure exclusively): skip Hardware Model.

Formal assessments (you do not run security audits through the CMDB): skip Assessment, Assessment Type, Assessment Status.

Formal change classification (you use a lighter change process): skip Change Impact, and simplify Change Type to just the values you use.

Certifications (you do not track compliance certifications in the CMDB): skip Certification, Certification Type, Certification Status.

Removing types you do not need reduces schema complexity, simplifies imports, and avoids empty data files cluttering the repository. You can always add them back when a process requires them.

The base schema (20 types) is the minimal starting point. The extended schema (55 types) is the full-featured option. Most organizations land somewhere in between, starting with the base schema and extending as processes mature.
