# Schema Assessment

This page is an honest evaluation of what the CMDB-Kit schema does well, where it falls short, and what it does not cover at all. It was written after reviewing the schema against enterprise capability mapping frameworks, YaSM, APQC PCF, ServiceNow CSDM, and iTop defaults.

The purpose is not to sell the schema. If you are evaluating CMDB-Kit for your organization, this page should help you decide whether the schema fits your needs as-is, whether it can be extended to fit, or whether a different starting point would serve you better. Every strength described here is grounded in production use. Every weakness is a real limitation that you will encounter if you adopt the schema without modification.


# What the Schema Gets Right

The CMDB-Kit schema was not designed in a vacuum. It emerged from real configuration management work on a multi-product software portfolio, and several of its patterns hold up well when compared against commercial frameworks and ITIL-aligned reference models. Before cataloging the gaps, it is worth understanding what works and why.

## Product-centric hierarchy

Most commercial CMDB schemas organize around infrastructure. The starting question is "what servers and network devices exist?" and the schema fans out from there. CMDB-Kit inverts this. The root organizational concept is the Product, and infrastructure exists in service of products rather than the other way around.

This is validated by every framework reviewed. Enterprise capability maps place Product Realization as a top-level domain. YaSM organizes around services that deliver products. APQC positions configuration management (process area 8.7.7.1) in the context of service delivery rather than infrastructure management. Starting from "what do we build and deliver?" rather than "what servers do we own?" produces a more useful CMDB for organizations that develop and ship software.

In the OvocoCRM example data, the Product type sits at the top of the Product CMDB branch. Every Server, Database, and Product Component traces back to a Product through ownership or deployment references. This means you can answer "what infrastructure supports OvocoCRM?" by following references downward from a single Product record, rather than scanning every server and filtering by tags.

The Core schema defines Product with a compact set of attributes that capture this orientation:

```json
"Product": {
  "description": { "type": 0 },
  "productType": { "type": 0 },
  "technology": { "type": 0 },
  "owner": { "type": 1, "referenceType": "Team" },
  "status": { "type": 1, "referenceType": "Product Status" },
  "companionProducts": { "type": 1, "referenceType": "Product", "max": -1 }
}
```

The `owner` reference to Team, the `status` reference to a lookup type, and the `companionProducts` self-reference all reinforce the idea that products are the primary unit of organization. Infrastructure types like Server and Database exist as supporting actors, not as the schema's center of gravity.

## Core + Domains architecture

CMDB-Kit uses a Core + Domains architecture. The Core schema provides the essential types every CMDB needs, and opt-in domain modules add specialized capabilities. Portfolio mode introduces product-prefixed types for multi-product isolation.

The Core schema (defined in `schema/core/schema-attributes.json`) answers "what do we have?" It covers Products, Servers, Databases, Product Components, Product Versions, Documents, Deployments, and directory types like Organization, Team, and Person. An organization that just needs to track what exists and who owns it can stop at the Core schema and have a working CMDB with the essentials.

Domain modules (in `schema/domains/*/schema-attributes.json`) answer "how do we control changes?" They add types like Hardware Model and Network Segment (infrastructure domain), License (licensing domain), Assessment (compliance domain), Feature (features domain), Baseline and Documentation Suite (release management domain), Product Media and Product Suite (media domain), Certification (compliance domain), Deployment Site and Distribution Log (distribution domain), SLA, Facility, and Vendor. These types support release management, compliance tracking, and formal change control. An organization that ships software to customer sites and needs to track baselines, certifications, and distribution records adds the relevant domains.

Portfolio mode (in `schema/enterprise/schema-attributes.json`) answers "how do we manage a portfolio?" It introduces product-prefixed types (CR Server, AN Server, SS Server) for multi-product isolation, plus enterprise architecture types (Service, Capability, Business Process, Information Object), a Configuration Library branch, financial types (Contract, Cost Category), and requirements management (Requirement). Portfolio mode is designed for organizations that manage multiple software product lines with formal configuration management processes.

This layering maps cleanly to organizational maturity. A startup tracks products and servers with the Core schema. A growing company adds domain modules for change control and compliance. An enterprise with multiple product lines adds portfolio mode for multi-product isolation and formal CM discipline. Each level builds on the previous one without replacing it.

## Multi-product prefixing

Portfolio mode uses a prefix convention to isolate product-specific configuration items. OvocoCRM types use the "CR" prefix, OvocoAnalytics types use "AN", and shared infrastructure uses "SS". This means portfolio mode has CR Server, AN Server, and SS Server as separate types, each scoped to a single product line.

This solves a real problem. When a single CMDB contains servers for multiple products, queries become noisy. "Show me all servers" returns everything. Filtering by tags or labels is fragile and depends on data entry discipline. With prefixed types, product-scoped queries are structural. "Show me all CR Servers" returns only OvocoCRM servers by definition. Cross-product noise disappears because the type system enforces the boundary.

The portfolio mode structure file (`schema/enterprise/schema-structure.json`) shows this clearly. The root is "Ovoco Portfolio CMDB", which contains three product-level branches: "OvocoCRM CMDB", "OvocoAnalytics CMDB", and "Shared Services CMDB". Each branch contains its own prefixed copies of the relevant CI types. A fourth branch, "Ovoco Library", contains the release management types (Product Version, Baseline, Document, Distribution Log) similarly prefixed per product.

## Site versus Deployment Site

Portfolio mode distinguishes between a Site (a shared customer identity) and a Deployment Site (a product-specific deployment record at that customer). This two-record pattern solves the problem of different products at different versions at the same physical location.

Consider a customer like Acme Corp that runs both OvocoCRM and OvocoAnalytics. In portfolio mode, there is one Site record for Acme Corp (shared across products), one CR Deployment Site record tracking which OvocoCRM version Acme runs, and one AN Deployment Site record tracking which OvocoAnalytics version Acme runs. The Site record carries the shared customer identity. Each Deployment Site carries product-specific state: current version, previous version, target version, upgrade status, go-live date, and support team assignment.

The CR Deployment Site definition in `schema/enterprise/schema-attributes.json` shows the depth of this pattern:

```json
"CR Deployment Site": {
  "siteCode": { "type": 0 },
  "product": { "type": 1, "referenceType": "CR Product" },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "previousVersion": { "type": 1, "referenceType": "CR Product Version" },
  "targetVersion": { "type": 1, "referenceType": "CR Product Version" },
  "location": { "type": 1, "referenceType": "Location" },
  "customerOrganization": { "type": 1, "referenceType": "Organization" },
  "siteStatus": { "type": 1, "referenceType": "Site Status" },
  "workflowStatus": { "type": 1, "referenceType": "Site Workflow Status" },
  "upgradeStatus": { "type": 1, "referenceType": "Upgrade Status" },
  "componentPackage": { "type": 1, "referenceType": "CR Component Instance", "max": -1 },
  "environment": { "type": 1, "referenceType": "Environment Type" }
}
```

With three version references (current, previous, target), an upgrade status, and a workflow status, the Deployment Site becomes a complete state machine for managing rolling upgrades across a customer base. Most CMDB frameworks do not address this problem at all. They model infrastructure at a location but not the per-product deployment state that matters when you are coordinating upgrades across dozens of customer sites.

## Feature Implementation as immutable audit record

Portfolio mode includes a Feature Implementation type that links a Feature to a Product Version with a frozen status and date. Once a Feature Implementation record is created, it captures the state of a feature's inclusion in a specific release at a specific point in time.

```json
"CR Feature Implementation": {
  "parentFeature": { "type": 1, "referenceType": "CR Feature" },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "implementationStatus": { "type": 1, "referenceType": "Implementation Status" },
  "frozenDate": { "type": 0, "defaultTypeId": 4 },
  "jiraEpic": { "type": 0 },
  "notes": { "type": 0 }
}
```

This satisfies formal configuration management traceability requirements and baseline integrity practices. If an auditor asks "was Feature X included in Version 2.1, and what was its status at the time of release?", the Feature Implementation record answers that question directly. The `frozenDate` attribute records when the status was locked, creating an immutable audit trail.

No framework reviewed has an equivalent construct, but every governance framework that addresses baseline management would benefit from one. This is a genuine differentiator for organizations with formal CM requirements.

## Baseline model

The release management domain introduces Baseline with a `baselineType` reference to the Baseline Type lookup. Portfolio mode expands this significantly with product-prefixed baselines (CR Baseline, AN Baseline) that carry milestone references, component instance links, document references, and certification cross-references.

The Baseline Type lookup in portfolio mode is designed around the Functional/Allocated/Product baseline progression (FBL, ABL, PBL). This is rooted in formal configuration management discipline. Functional baselines capture what a system must do (requirements). Allocated baselines capture how the system is decomposed into components. Product baselines capture what was actually built and tested.

Most commercial CMDB schemas do not have baselines at all. ServiceNow CSDM does not define them. iTop does not define them. YaSM acknowledges the need for configuration baselines but does not prescribe a type structure. Organizations with formal CM requirements, particularly in government, defense, or regulated industries, will find that the baseline model saves significant design work.

## Lookup types as first-class objects

Every status value, category, and classification in the schema is a separate object type with its own records, each carrying at minimum a Name and a description field. Product Status, Version Status, Deployment Status, Environment Type, Document Type, Component Type, and dozens more are all defined as independent types in the schema.

This is more work to set up than simple picklists. Each lookup type needs its own data file with named records. But the payoff is significant: every status value is queryable, documentable, and auditable. You can ask "what does Deployment Status = Staged mean?" and get a description from the record itself. You can add new status values without modifying the schema. You can report on which status values are in use and which are orphaned.

Portfolio mode adds `sortOrder` (integer) attributes to many lookup types, allowing the UI to present values in a meaningful sequence rather than alphabetical order. For example, Baseline Status and Document State both carry `sortOrder` so that lifecycle states appear in their natural progression.

## Distribution Log

The enterprise Distribution Log tracks the full lifecycle of media delivery from request through verification. This is a pattern drawn from real configuration management practice where software media must be formally requested, prepared, shipped, received, installed, and verified at customer sites.

The CR Distribution Log in `schema/enterprise/schema-attributes.json` carries attributes for each stage of this lifecycle: `requestDate`, `requestorPerson`, `deliveryMethod`, `urgency`, `preparedByPerson`, `preparedDate`, `shippedDate`, `receivedDate`, `receiptConfirmedBy`, `installedDate`, `verifiedDate`, and `status` (referencing Transfer Status). It also tracks the media itself with `mediaType`, `fileName`, `fileSize`, `checksum`, and `encryptionMethod`.

No commercial CMDB framework includes a distribution log. Organizations that distribute software to customer sites, whether through physical media, secure file transfer, or managed deployment pipelines, will find this type directly useful. Organizations that deploy only to their own cloud infrastructure will not need it.


# What the Schema Gets Wrong

The schema has structural problems where the intent is clear but the implementation is incomplete. These are not missing features so much as broken wiring: the parts exist but are not connected properly.

## Service modeling is disconnected

Portfolio mode includes Service, Capability, Business Process, and Information Object types under the Enterprise Architecture branch. Service references Capability, and Capability references a parent Capability, creating a capability hierarchy. But Service has no relationship to infrastructure CIs. There is no reference from Service to Product, Server, Database, or any other CI type that might implement the service.

Here is the complete Service definition from `schema/enterprise/schema-attributes.json`:

```json
"Service": {
  "description": { "type": 0 },
  "serviceType": { "type": 1, "referenceType": "Service Type" },
  "owner": { "type": 1, "referenceType": "Team" },
  "status": { "type": 1, "referenceType": "Product Status" },
  "capability": { "type": 1, "referenceType": "Capability" }
}
```

The absence of a `supportedBy` or `implementedBy` reference means you cannot answer "what infrastructure supports the CRM service?" without manually cross-referencing Product ownership with Deployment records. YaSM's core principle is that every CI must trace to a service. The schema cannot enforce this. ServiceNow CSDM has explicit service-to-CI relationships. iTop has a built-in impact analysis engine. The schema has neither.

The fix is straightforward. Service needs a `supportedBy` multi-reference to Product or Product Component, or the schema needs a dedicated ServiceComponent association type that links a Service to the CIs that deliver it. Until this connection exists, the Enterprise Architecture branch is architecturally isolated from the rest of the schema.

## SLA links to Product, not Service

The SLA type in the licensing domain references Product:

```json
"SLA": {
  "description": { "type": 0 },
  "product": { "type": 1, "referenceType": "Product" },
  "status": { "type": 1, "referenceType": "SLA Status" },
  "targetUptime": { "type": 0 },
  "responseTime": { "type": 0 },
  "reviewDate": { "type": 0, "defaultTypeId": 4 }
}
```

But SLAs govern services, not products. A single product might implement multiple services with different SLA targets. The OvocoCRM platform might deliver both a "CRM Application Service" with 99.9% uptime and a "CRM Reporting Service" with 99.5% uptime. With the current schema, both SLAs would reference the same Product record, losing the distinction.

The portfolio mode version of SLA drops the Product reference entirely but does not replace it with a Service reference. It carries only status, targetUptime, responseTime, and reviewDate. The SLA floats without a clear owner.

SLA also lacks the attributes that YaSM requires for continuity planning: Recovery Time Objective (RTO), Recovery Point Objective (RPO), and service criticality rating. These are not exotic requirements. Any organization that must plan for disaster recovery needs these values, and the SLA type is the natural place for them.

## Cost Category is orphaned

Portfolio mode includes a Cost Category type under the Financial branch, designed for TBM (Technology Business Management) cost attribution:

```json
"Cost Category": {
  "description": { "type": 0 },
  "parentCategory": { "type": 1, "referenceType": "Cost Category" }
}
```

The self-referencing `parentCategory` allows building a cost hierarchy. But no CI type in the schema actually references Cost Category. Server does not reference it. Product does not reference it. License does not reference it. The type exists as an island with no connections to the rest of the schema.

The schema documentation describes how Cost Category should map to TBM cost towers (Compute, Storage, Network, Application, etc.) and how CI types should carry cost category references for chargeback and showback. The schema itself does not implement any of this. This is a documentation-reality gap: the vision is documented but the wiring is not built.


# What Is Missing

Beyond the structural issues, several areas are absent from the schema entirely. Some of these are deliberate boundary choices. Others are genuine gaps that adopters will need to fill.

## Problem and Known Error types

ITIL's incident-problem-known error chain is fundamental to service management. The schema does not include Problem or Known Error types. This is a deliberate design choice, not an oversight.

Change Request and Incident were removed from the schema because they are process records (events that happen) rather than configuration items (persistent state of the world). They belong in the work management tool, whether that is Jira, ServiceNow ITSM, or another platform, which links back to CIs via references. Problem and Known Error fall into the same category: they are work items triggered by events and eventually resolved, not standing configuration state.

The boundary rule is: if a record has an independent lifecycle that persists regardless of events, it is configuration state and belongs in the CMDB. If it is triggered by an event and resolved when the event is addressed, it is a work item. SLA and Contract remain in the schema because they are standing agreements with their own lifecycles. Change Request and Incident were removed because they are event-driven.

This is a defensible boundary, but adopters should be aware of it. If your CMDB platform requires Problem and Known Error types to support its built-in incident management workflows (as ServiceNow and iTop do), you will need to add them. If you use a separate work management tool, the schema's boundary is likely the right one.

## Service-to-CI dependency mapping

There is no way to model "Service X depends on Application Y which runs on Server Z" as an explicit dependency chain. The relationship exists conceptually (Service references Capability, Product owns Components, Components run on Servers) but there is no explicit dependency type that captures criticality, direction, or failure impact.

ServiceNow CSDM has explicit service-to-CI relationship types. iTop has a built-in impact analysis engine that traverses relationship graphs. YaSM requires dependency modeling for continuity planning. The CMDB-Kit schema has none of these.

Impact analysis in the current schema requires traversing implicit relationships: start at a Server, find what Product Components are deployed on it, find what Products own those Components, and infer which services are affected. This works in a small schema but becomes fragile as the number of CIs grows, because the traversal relies on every intermediate reference being correctly populated.

## Discovery and data quality metadata

No CI type carries attributes for data source, last verified date, or reconciliation status. There is no way to distinguish a record entered manually from one populated by an automated discovery scan. There is no way to flag stale records or track data quality scores.

YaSM defines four data quality metrics for CMDB governance: CI Completeness (percentage of mandatory fields filled), CI Accuracy (percentage of fields verified against reality), Relationship Accuracy (percentage of references that point to valid records), and Service Coverage (percentage of services with fully mapped CI dependencies). These metrics require metadata on each record to compute. The schema has no place to store any of this.

This is arguably a platform concern rather than a schema concern. JSM Assets and ServiceNow both track creation and modification timestamps natively. But the schema should at least include `dataSource` and `lastVerifiedDate` as explicit attributes so that organizations can track data provenance regardless of which platform they deploy to. Without these attributes, data quality governance depends entirely on platform-specific features that may or may not be available.

## Infrastructure types are minimal

The schema covers Server, Database, Virtual Machine, Network Segment, and Hardware Model. It does not include:

- Network Device (router, switch, firewall), present in both CSDM and iTop
- Storage (SAN, NAS, block storage), present in both CSDM and iTop
- Load Balancer, present in CSDM
- Cluster (database cluster, application cluster, Kubernetes), not modeled in any reviewed framework

This is a deliberate design choice. The schema tracks what you manage, not what you can scan. It prioritizes product-centric CIs over infrastructure-centric ones. The consequence is that organizations with significant network or storage infrastructure cannot model it without extending the schema.

Whether this is a gap or a feature depends on the organization. For product-focused software teams that deploy to cloud infrastructure, the existing types are sufficient. Application instances, databases, and virtual machines capture what matters. For infrastructure-heavy operations teams that manage physical data centers with racks of network equipment and storage arrays, the schema is a blocker until extended.

The infrastructure domain does include Hardware Model and Network Segment, acknowledging that some infrastructure modeling is necessary. But Network Segment represents a logical zone (with CIDR, VLAN, and gateway attributes), not a physical device. There is no type for the switch or firewall that connects segments.

## Security and compliance attributes are sparse

Assessment and Certification types exist in the compliance domain and portfolio mode, providing a way to record compliance evaluations and certifications against standards. But individual CIs carry no security metadata. There is no security classification attribute (Public, Internal, Confidential, Restricted) on any CI type. There is no PII indicator on Database or Server. There is no compliance status flag.

APQC process area 8.3.x (IT resilience and risk management) requires CIs to carry security and compliance attributes. YaSM requires every CI to have a Security Classification derived from an Underpinning Security Policy. The schema has none of this.

For organizations in regulated industries (government, healthcare, finance), this means adding a security classification attribute to every CI type before the schema is usable for compliance reporting. This is a straightforward extension, adding a `securityClassification` lookup reference to Product, Server, Database, and Network Segment, but it must be done before the schema can support compliance workflows.

## Financial tracking is skeletal

Portfolio mode's financial model consists of two types: Contract and Cost Category. Contract carries vendor, dates, value, and a contract manager. Cost Category carries a description and a parent hierarchy for building cost trees. That is the entire financial model.

Missing from the schema are: cost attributes on CIs (annual operating cost, depreciation value), cost category references on CIs (so that a Server can be attributed to the Compute cost tower), license cost tracking (the License type has no cost field in the licensing domain, though SS License in portfolio mode does include a `cost` attribute), budget allocation per team or product, and chargeback or showback mechanisms.

The schema documentation describes TBM tower mapping in detail, explaining how Server maps to the Compute tower, Database maps to the Database tower, and Network Segment maps to the Network tower. But the schema itself does not implement these mappings. Cost Category exists but nothing references it. This is the most significant documentation-reality gap in the schema.

## Continuity planning attributes

YaSM requires Service Components to carry Recovery Time Objective (RTO) and Recovery Point Objective (RPO) attributes. These are critical for business continuity and disaster recovery planning. No CI type in the schema carries RTO or RPO attributes.

The SLA type has `targetUptime` and `responseTime` but not recovery objectives. These are different concepts. Target uptime describes the expected availability during normal operations. RTO describes how quickly a service must be restored after an unplanned outage. RPO describes how much data loss is tolerable. An organization planning for disaster recovery needs all three, and the schema provides only the first two.

The natural home for RTO and RPO is either the SLA type (if recovery objectives are contractual commitments) or the Service type (if they are internal planning targets). Currently neither type carries them.

## Person type is thin at Core level

The Core Person type has five attributes beyond the standard description:

```json
"Person": {
  "description": { "type": 0 },
  "firstName": { "type": 0 },
  "lastName": { "type": 0 },
  "email": { "type": 0 },
  "role": { "type": 0 },
  "team": { "type": 1, "referenceType": "Team" }
}
```

There is no phone number, no job title, no manager reference, and no location. Portfolio mode fixes several of these gaps, adding `phone`, `jobTitle`, `organization`, `supervisor`, and `hireDate`. But organizations using only the Core schema will find the Person type insufficient for escalation paths, RACI matrices, or organizational reporting.

The `role` attribute in the Core schema is free text, not a lookup reference. This means you cannot reliably report on "all people with role = Engineer" because the values are not constrained. Someone might enter "Engineer", "Software Engineer", "SWE", or "Eng" and the schema has no way to normalize these.

## Feature type is isolated in the features domain

The features domain Feature type links to Product Version, Version Status, and Team:

```json
"Feature": {
  "description": { "type": 0 },
  "version": { "type": 1, "referenceType": "Product Version" },
  "status": { "type": 1, "referenceType": "Version Status" },
  "owner": { "type": 1, "referenceType": "Team" }
}
```

But there is no connection to Product (which product does this feature belong to?), no connection to Product Component (which component implements it?), and no connection to Requirement (which requirement does it satisfy?).

Portfolio mode fixes this partially. CR Feature adds an `implementedIn` multi-reference to CR Product, and CR Feature Implementation provides the version-level audit trail. But an organization using only the features domain cannot trace features to products or releases. The domain-level Feature is an island, connected only to Product Version and Team.

## Lookup types without data files

The schema defines lookup types that have no corresponding data files in the data directories. Importing the schema creates empty lookup lists for these types. The affected lookups are concentrated in portfolio mode and include: Service Type, Capability Status, Disposition, Library Item Type, Distribution Status, Delivery Method, Media Urgency, Transfer Status, Build Status, Sunset Reason, Implementation Status, Requirement Type, Requirement Status, Requirement Priority, Verification Method, Contract Status, Disposal Method, and Media Type.

This is a tooling gap, not a design gap. The types are correctly defined in the schema. The lookup values are described in the documentation. The JSON data files simply have not been populated. An adopter importing portfolio mode will need to create these data files before the lookup references produce usable dropdown values.


# Structural Observations

## Process record boundary

The schema draws a deliberate boundary between configuration state and process records. Configuration state, the persistent condition of assets, agreements, and relationships, belongs in the CMDB. Process records, events triggered by incidents, changes, or requests, belong in the work management tool.

This boundary is why Change Request and Incident types were removed from the schema. SLA remains because it is a standing agreement with a lifecycle independent of any specific event. Contract is similar. The rule is: if the record exists and has meaning whether or not any event is happening, it is configuration state. If it is created in response to an event and resolved when the event is addressed, it is a process record.

This is a sound boundary for organizations that use separate tools for CMDB and work management (for example, JSM Assets for configuration state and Jira for work items). It is less natural for organizations using integrated platforms like ServiceNow where CMDB and ITSM share a database and process records naturally reference CIs. Adopters on integrated platforms may want to re-add process types that the schema deliberately excludes.

## Portfolio mode is large and coupled

Portfolio mode contains product-prefixed types that duplicate the domain types per product line. CR Server and AN Server have identical attribute definitions, differing only in their reference targets (CR Hardware Model versus AN Hardware Model, CR Deployment Site versus AN Deployment Site). This is the cost of the prefixing pattern: schema size scales linearly with the number of products.

With two product lines (OvocoCRM and OvocoAnalytics) plus shared services, portfolio mode has the full portfolio model. Adding a third product line would require duplicating every product-prefixed type and adding each one to the LOAD_PRIORITY array in `tools/lib/constants.js`. This is manageable for three or four products but becomes unwieldy at five or more.

The prefixing pattern trades schema complexity for query simplicity. A prefixed schema is larger and harder to maintain, but product-scoped queries are trivial and cross-product contamination is impossible. An unprefixed schema is smaller and easier to maintain, but product-scoped queries depend on filter attributes that must be consistently populated.

## No explicit portfolio type

Portfolio mode uses the schema structure hierarchy to represent the portfolio. The root node is "Ovoco Portfolio CMDB", which contains "OvocoCRM CMDB", "OvocoAnalytics CMDB", and "Shared Services CMDB" as child branches. But there is no Portfolio CI type that you can query, assign an owner to, or attach financial data to.

The portfolio exists only as a structural convention in `schema/enterprise/schema-structure.json`. You cannot write a query that returns "the Ovoco portfolio and its associated products." You cannot assign a portfolio-level budget, risk rating, or governance board. If you need portfolio-level attributes, you must create a Portfolio type and add it to the schema.


# Framework Comparison Summary

| Dimension | CMDB-Kit Strength | CMDB-Kit Weakness |
|---|---|---|
| Product engineering | Strong (Product, Component, Version, Baseline, Feature Implementation) | No equivalent in CSDM, iTop, or YaSM |
| Release management | Strong (Distribution Log, Product Media, Product Suite, Documentation Suite) | Unique to CMDB-Kit |
| Service modeling | Present but disconnected (Service, Capability exist but lack CI relationships) | Weaker than CSDM, iTop, and YaSM |
| Infrastructure depth | Minimal (Server, Database, VM, Network Segment) | Weaker than CSDM and iTop |
| Change and incident integration | Delegated to work management tool (explicit boundary) | Different approach than CSDM and iTop (native integration) |
| Financial tracking | Skeletal (Contract, orphaned Cost Category) | Weaker than CSDM |
| Compliance and security | Assessment and Certification types, no CI-level attributes | Weaker than all frameworks |
| Multi-product isolation | Strong (prefixing pattern) | Unique approach, validated in production |
| Data quality governance | Not addressed | Weaker than YaSM |
| Formal CM discipline | Strong (baselines, controlled docs, media distribution) | Unique to CMDB-Kit |

The table reveals a clear pattern. CMDB-Kit is strongest in areas that commercial frameworks neglect: product engineering, release management, multi-product isolation, and formal configuration management discipline. It is weakest in areas that commercial frameworks prioritize: service modeling, infrastructure depth, financial tracking, and data quality governance.

This makes CMDB-Kit a strong fit for organizations that build and ship software products, particularly those with formal CM requirements or multi-product portfolios. It is a weaker fit for organizations that primarily operate infrastructure, manage services, or need deep financial tracking out of the box.


# Recommended Priorities

If you are extending the schema to address the gaps described above, the following priority order is based on impact, from highest to lowest.

## Connect Service to infrastructure CIs

Service modeling exists in portfolio mode but is inert without service-to-CI relationships. Adding a `supportedBy` multi-reference from Service to Product (or Product Component) would connect the Enterprise Architecture branch to the rest of the schema. This is the highest-impact single change because it enables service impact analysis, the most commonly requested CMDB capability.

## Populate missing lookup data files

Portfolio mode defines lookup types whose data files have not been created. The types are correctly designed. The values are described in the documentation. Creating the JSON data files is mechanical work that requires no design decisions, but without it, imports produce empty dropdown lists that degrade the user experience.

## Add security classification to CIs

A single lookup attribute (`securityClassification`) added to Product, Server, Database, and Network Segment would address the most basic compliance requirement. This is a small schema change with outsized value for organizations in regulated industries.

## Fix SLA to reference Service

Changing the SLA type's primary reference from Product to Service (or adding a Service reference alongside Product) is a small change that corrects a semantic error. SLAs govern services, and the schema should reflect that.

## Add cost references to CIs

Connecting Cost Category to the CI types that should reference it (Server, Database, License, Product) would implement the TBM mapping that the documentation describes. This turns Cost Category from an orphaned island into a working financial attribution model.

## Add Person attributes at Core level

Adding `phone`, `jobTitle`, and a `manager` reference to the Core Person type would make it sufficient for escalation paths and organizational reporting. Portfolio mode already has these attributes. Backporting them to the Core schema closes the gap for organizations that do not need full portfolio mode.

## Add RTO and RPO to SLA or Service

Adding Recovery Time Objective and Recovery Point Objective attributes is required for continuity planning. These belong on SLA (if they are contractual commitments) or Service (if they are internal planning targets). Either location works; what matters is that the attributes exist somewhere in the schema.

## Add data provenance attributes

Adding `dataSource` and `lastVerifiedDate` to infrastructure CI types (Server, Database, Virtual Machine, Network Segment) would enable data quality tracking regardless of platform. These attributes are cheap to add and valuable for any organization that cares about CMDB data accuracy.

The first two items, connecting Service to CIs and populating lookup data files, are schema bugs where the intent exists but the implementation is incomplete. The remaining items are genuine feature gaps that require design decisions about attribute placement and reference targets.
