# CI Selection

Not everything should be a configuration item. Tracking too little means the CMDB cannot answer operational questions. Tracking too much means the CMDB drowns in maintenance overhead and stale data. This section provides the criteria for deciding what to track, the indicators that something should (or should not) be a CI, and a practical framework for making selection decisions using CMDB-Kit's type catalog.


## What Makes Something a CI

### The ITIL Definition

ITIL defines a configuration item as any component that needs to be managed in order to deliver an IT service. This is deliberately broad. A server is a CI. A software product is a CI. A document is a CI. A person can be a CI. The question is not "can this be a CI?" but "should this be a CI?"

### CIs Must Be Individually Identifiable, Subject to Change, and Manageable

Three properties distinguish CIs from other data:

Individually identifiable: the item has a unique name or identifier. You can point to it and say "this specific thing." "OvocoCRM version 2.4.0" is identifiable. "Some server somewhere" is not.

Subject to change: the item's attributes change over time in ways that matter operationally. A Deployment Site's version changes when an upgrade occurs. A server's status changes when it is decommissioned. If an item never changes, there is nothing to manage.

Manageable: someone is responsible for the item, and changes to it go through a defined process. A Product Version is managed because it goes through development, testing, and release approval. A temporary test file is not managed because no one governs its lifecycle.

### Industry and Government Standards for CI Designation

Formal CM standards provide additional criteria beyond ITIL's broad definition. Industry and government standards define specific CI designation criteria covering technical complexity, interface boundaries, separate delivery, and maintenance requirements. These standards are reflected in the positive and negative indicators below.


## Positive and Negative Indicators for CI Designation

### Positive Indicators

Each indicator is a reason to designate something as a CI. The more indicators that apply, the stronger the case.

**Critical Technology.** The item uses new, unproven, or high-risk technology. Novel technology carries deployment risk and warrants closer tracking. A newly adopted cloud service, a custom-built security module, or a first-generation hardware platform are candidates for CI designation because their behavior is less predictable.

**Independent End-use Function.** The item performs a function that a customer or operator would recognize as distinct. "Contact Import" is an independent function. "The third helper function in the import module" is not. In CMDB-Kit terms, this is the Feature type: a named capability that users interact with.

**Shared Across Products.** The item is used by multiple products. A shared authentication service, a common logging framework, or a shared database server affects more than one product when it changes. Shared items deserve CI status because their blast radius is wider.

**Defined Interface Boundary.** The item has a published interface that other components depend on. An API gateway, a message queue, or a database server with a defined connection contract has a boundary that must be managed. When the interface changes, all consumers are affected.

**Interchangeability Requirements.** The item could be replaced by an equivalent. Tracking it as a CI ensures the replacement is compatible. A specific hardware model, a licensed software product, or a vendor-supplied component might be replaced if the vendor exits the market or the product reaches end-of-life.

**Separate Delivery.** The item is delivered independently of other items. An installation ISO, a documentation package, or a firmware update that ships separately deserves its own CI record. In CMDB-Kit, this maps to the Product Media and Distribution Log types.

**Separate Test Requirements.** The item has its own test plan or test cases. If something is tested independently, it is managed independently, and it should be tracked independently. A component with its own regression test suite is a CI candidate.

**High Risk or Cost.** The item is expensive to develop, deploy, or replace. High-value items warrant the overhead of CI tracking because the cost of losing track of them exceeds the cost of maintaining a CI record.

**Separate Maintenance (Spare Stocking Rule).** The item is maintained, repaired, or replaced as a unit. In hardware terms: if you stock spares of it, it is a CI. In software terms: if you release patches for it independently, it is a CI.

### Negative Indicators

Each negative indicator is a reason not to designate something as a CI. The more that apply, the weaker the case for tracking it.

**No Independent Identity.** If the item does not have a meaningful name and cannot be referred to independently, it is probably not a CI. A code library that is always bundled with its parent application and never referenced separately does not need its own record.

**No Separate Change Control Needed.** If changes to the item are always part of a larger change and never reviewed independently, the overhead of a separate CI is wasted. A CSS file that always changes with its parent application does not need a CI record.

**No Separate Delivery or Maintenance.** If the item is never delivered, tested, or maintained separately from its parent, a separate CI is unnecessary. It is tracked as part of the parent CI (listed in the components attribute, for example).

**Tracking Adds No Value.** The fundamental test: would anyone query this CI? Would its current state inform a decision? If the answer to both is no, do not track it.

**Already Tracked in Another System.** If the item is authoritatively tracked in a dedicated system (an HR system for personnel details, a monitoring tool for real-time metrics, a test management tool for test cases), duplicating it in the CMDB adds synchronization burden without value. Instead, link to the authoritative system from the CMDB.

**No Customer or Accreditor Visibility Need.** If no external stakeholder (customer, auditor, accrediting body) needs to see this item's state, the overhead of formal tracking may not be justified.

**Reference or Lookup Data (Not a CI).** Lookup values (Product Status, Version Status, Environment Type) are not CIs. They are reference data used by CIs. They do not have independent lifecycles, are not baselined, and are not subject to individual change control. They exist in the schema for data integrity, not as managed configuration items.

### Cost of CI Designation

Every CI you designate adds overhead:

Change control: changes to the CI may require CCB review.

Baselines: the CI must be included in relevant baselines at decision gates.

Audits: the CI must be verified during CMDB audits.

Maintenance: the CI record must be kept accurate as the real-world item changes.

Reporting: the CI appears in dashboards and queries, adding to the information reviewers must process.

A CI that nobody queries, nobody changes, and nobody audits is pure overhead. The record exists, takes space, appears in reports, and requires maintenance, but it informs no decisions.

If you have 500 Product Component CIs and 450 of them have not been updated or queried in a year, you have too many components. Consider rolling low-value components into their parent CI (tracked as attributes on the Product or Product Version rather than as separate records).

The right number of CIs is the minimum needed to answer your operational questions and meet your compliance requirements.


## Scoping Criteria

### Start With What Supports Your Critical Services

Begin CI selection from the top: what services does your organization provide? For each service, what products support it? For each product, what infrastructure does it run on?

OvocoCRM is a service. It runs on the CRM Core product, which depends on a database server, an authentication module, and an API gateway. Each of these is a CI candidate because their state affects the service.

### The "Would an Outage Here Cause a P1?" Test

A fast heuristic: if this item fails, does it cause a Priority 1 incident? If yes, it is a CI. If it causes a P2, it is probably a CI. If its failure would not be noticed for a week, it is probably not worth tracking.

### Breadth vs Depth

Breadth means tracking many types of items at a shallow level (name, status, owner). Depth means tracking fewer types with rich detail (full attribute sets, relationship chains, lifecycle history).

Start broad and shallow. Track the major categories (products, servers, versions, deployment sites) with basic attributes. Add depth where it pays off: deployment sites need rich attributes because they are queried constantly, while network segments might need only name and type.


## The CMDB-Kit Type Catalog as a Selection Menu

CMDB-Kit's schema provides a menu of types organized into branches. Not every organization needs all of them. Walk through the catalog and select the types that match your processes.

### Base Schema as a Minimum Viable CMDB

The base schema includes the types needed for a basic CMDB:

Infrastructure: Product, Server, Database, Product Component.

Release management: Product Version, Document, Deployment.

Directory: Organization, Team, Person.

Lookups: Product Status, Version Status, Deployment Status, Environment Type, Document Type, Document State, Component Type, Priority, Organization Type, Deployment Role.

This covers the core use cases: what products exist, what versions are released, where they are deployed, and who is responsible. It is enough for a small organization with one product and straightforward operations.

### Extended Schema for Mature Organizations

The extended schema adds types for:

IT asset management: License, Vendor, Hardware Model, License Type, License Status, Vendor Status.

SLA management: SLA, SLA Status.

Advanced release management: Product Media, Product Suite, Certification, Distribution Log, Deployment Site, Site Status, Baseline, Baseline Type, Baseline Status, Documentation Suite.

Compliance: Assessment, Assessment Type, Assessment Status, Certification Type, Certification Status.

Network infrastructure: Network Segment, Virtual Machine, Network Type.

Extended features: Feature.

Extended directory: Location, Facility, Vendor.

Use the extended schema when your organization runs formal change control, manages multiple deployment sites, tracks compliance certifications, or needs to model the full release distribution chain.

### Walking Through the Branches

Product CMDB branch (infrastructure): Product, Server, Database, Product Component, Hardware Model, Network Segment, Virtual Machine, License, Feature, Assessment. These are the things your service is made of. Most organizations start with Product, Server, and Database, then add the rest as needed.

Product Library branch (release management): Product Version, Document, Deployment, Baseline, Documentation Suite, Product Media, Product Suite, Certification, Deployment Site, Distribution Log, SLA. These track the lifecycle of your releases. Product Version and Deployment are almost always needed. The distribution types (Product Media, Distribution Log) matter when you ship software to external customers or air-gapped sites.

Directory branch (people and organizations): Organization, Team, Person, Location, Facility, Vendor. These model who is responsible for what. Organization, Team, and Person are needed for ownership tracking. Location and Vendor come in when you manage physical sites or third-party suppliers.

Lookup Types branch (reference data): 26 lookup types in the extended schema. These are not CIs themselves but provide controlled vocabularies for CI attributes. Product Status, Version Status, and Environment Type are needed in any deployment. The others depend on which CI types you adopt.

### Library vs Engineering CMDB

Some organizations separate the engineering CMDB (what the product is made of) from the library CMDB (what has been released and deployed). In CMDB-Kit terms:

The engineering CMDB is the Product CMDB branch: Products, Servers, Databases, Components. It tracks the current state of the infrastructure.

The library CMDB is the Product Library branch: Versions, Baselines, Documents, Media, Deployments, Distribution Logs. It tracks the release history and deployment state.

Both branches can exist in the same schema (CMDB-Kit's default). Organizations that separate them typically do so for access control: the engineering team manages infrastructure CIs, and the CM team manages library CIs.


## What Not to Put in the CMDB

### Ephemeral Resources

Containers, serverless function instances, auto-scaled cloud VMs that spin up and down in minutes. These are too transient for CI tracking. Track the service they provide (a Product CI) rather than the individual instances.

### Data Better Tracked in Other Systems

Real-time performance metrics: belongs in the monitoring system.

Source code: belongs in the version control system.

Test cases and results: belongs in the test management system.

HR data (salary, performance): belongs in the HR system.

The CMDB links to these systems through references (URL attributes, external ID fields), but it does not duplicate their data.

### Avoiding CI Sprawl

CI sprawl is the state where the CMDB contains so many records that maintenance becomes impossible. Signs of sprawl: most records have not been updated in months, audits find large numbers of stale or incorrect records, teams stop trusting the CMDB because the data is unreliable.

Prevent sprawl by applying the CI designation criteria rigorously. Every new type should pass the "would anyone query this?" test. Every new record should pass the "does this item's state inform decisions?" test.


## Decision Framework

### The Five-question Flowchart

For each candidate CI, ask in order:

1. Does it support a service that matters to the organization? If no, do not track it.
2. Does its state change in ways that affect service delivery? If no, do not track it.
3. Is someone responsible for its lifecycle? If no, assign an owner or do not track it.
4. Would an outage or change to it trigger an operational response? If no, consider whether it adds value.
5. Is the cost of tracking it (maintenance, audit, CCB overhead) justified by the value of having it in the CMDB? If no, do not track it, or track it at a shallower level (fewer attributes).

If the answer to questions 1 through 4 is yes, it is a CI. If the answer to question 5 is uncertain, start with a minimal record (Name, status, owner) and add depth if queries demand it.

### Ownership, Change Frequency, and Stakeholders

Three additional factors inform the designation decision:

Ownership: if no team will own the CI record, it will become stale. Do not create CIs without assigned owners.

Change frequency: items that change often (weekly deployments, frequent configuration changes) benefit more from CI tracking than items that change rarely (a network switch installed five years ago that has never been modified).

Stakeholders: items with multiple stakeholders (a shared service used by three products) benefit from CI tracking because the CMDB provides a single source of truth that all stakeholders can reference.

### Mapping CIs to the Services They Support

Every CI should trace upward to a service. A Server supports a Product. A Product delivers a service to customers. A Product Version packages the product for delivery. A Deployment Site tracks where the service is available.

If a CI cannot be traced to a service, question its value. An unconnected CI is either an orphan (missing its relationship to a service) or an unnecessary record.

### Documenting Decisions

Record why each type was included or excluded from the schema. A simple log:

"Product Media: included because we need to track release artifacts for DML management and distribution auditing."

"Training Course: excluded because we track training in the LMS, not the CMDB."

These decisions help future team members understand the schema's scope and avoid re-debating settled questions.

### Starting From a Service Map

Draw a service map for your organization. For each service:

1. List the products that deliver it
2. List the infrastructure each product runs on
3. List the teams that own each product
4. List the customers or sites that use the service
5. List the documents, versions, and baselines that describe the service

Each item on the list is a CI candidate. Apply the five-question flowchart to each. The result is your initial CI inventory.

### The OvocoCRM Example

OvocoCRM provides a CRM service to customers. The service map:

Service: OvocoCRM CRM Platform.

Products: CRM Core, Search Service (both are Product CIs).

Infrastructure: CRM database server, API gateway (Server CIs), production database (Database CI).

Components: Core Platform, Authentication Module, Export Module, API Gateway (Product Component CIs).

Versions: OvocoCRM 2.3.1 (Previous), OvocoCRM 2.4.0 (Current) (Product Version CIs).

Customers: Acme Corp, Globex Corp, Initech (Organization CIs with associated Deployment Site CIs).

Documents: System Design Description, Version Description, Release Notes (Document CIs grouped in a Documentation Suite).

Teams: CRM Platform Team, Infrastructure Team, CRM Operations, Analytics Platform Team, Release Engineering (Team CIs under their respective Organizations).

Each of these passed the five-question test: they support the service, their state changes, they have owners, outages trigger responses, and the tracking cost is justified. This is the CI inventory that CMDB-Kit's extended schema was designed to model.
