# Taxonomy Playbook

Taxonomy is schema design. It is the act of deciding what types exist in your CMDB, how they relate to each other, what attributes they carry, and what controlled vocabulary constrains their values. This playbook is written for a configuration manager walking into a new organization and needing to stand up a schema, whether on ServiceNow, JSM Assets, iTop, or any other CMDB platform. It covers the full arc from stakeholder discovery through governance, then works through a detailed example showing how CMDB-Kit's own three-layer taxonomy was designed and why each decision was made. Three appendices at the end provide ready-to-use starter taxonomies, CI type checklists by domain, and attribute templates.


# Before You Touch the Tool

## Understand What the CMDB Is For

A CMDB answers questions. It does not just store data. Every type you create, every attribute you define, and every relationship you model should trace back to a question that someone in the organization needs answered. The three questions every CMDB must answer are: What do we have? How is it connected? Who is responsible?

The most common failure mode in taxonomy design is building the schema around what you can discover instead of what you need to manage. Discovery tools scan networks and return lists of servers, virtual machines, and network devices. That is useful information, but it is not a taxonomy. A taxonomy reflects the organization's management intent, not its network topology. If nobody makes decisions based on distinguishing a load balancer from a firewall, modeling them as separate types adds complexity without value.

Before opening any tool, scope the CMDB to the organization's actual configuration management obligations. These come from three sources: contractual requirements (what you promised customers you would track), regulatory requirements (what a compliance framework demands), and operational requirements (what your change, incident, and problem management processes need to function). The union of those three sets defines the outer boundary of your taxonomy. Anything outside that boundary is aspirational, and aspirational types that nobody populates are worse than missing types because they create the illusion of coverage.

## Stakeholder Discovery

The people who consume CMDB data determine what the CMDB must contain. Before designing a single type, map those people to the decisions they make.

Change advisory board members need to know what a proposed change will affect. Incident managers need to know what depends on a failed component so they can assess blast radius. Security teams need to know what software versions are deployed and where, so they can assess vulnerability exposure. Finance teams need to know what contracts cover which products, and when those contracts expire. Audit teams need to know that controlled configurations match their approved baselines.

Each of these stakeholders implies specific types, attributes, and relationships. The CAB implies that CI types carry enough detail to assess change risk, which means status, environment, and dependency relationships. Incident management implies upward traceability from infrastructure to products and services. Security implies version tracking and deployment records. Finance implies contract and license types. Audit implies baselines and certification records.

A useful interview question for each stakeholder: "When you approve a change (or investigate an incident, or run an audit), what do you need to know about the thing being changed?" The answers map directly to attributes and relationships.

The stakeholder map drives scope. Do not design the taxonomy first and then look for consumers. Find the consumers first and let their questions shape the taxonomy.

## Inventory What Already Exists

No organization starts from zero. Before designing anything, inventory what already exists: spreadsheets tracking assets, wiki pages listing servers, monitoring tools with host inventories, procurement databases with license records, HR systems with employee directories, facilities systems with location data.

Discovery tools may already be deployed. SCCM, Lansweeper, Qualys, Jamf, and ServiceNow Discovery all maintain inventories of varying depth. An existing service catalog or service portfolio document tells you what the organization thinks it delivers. Even tribal knowledge counts: the engineer who knows which three servers must not be rebooted on the same day is carrying relationship data in their head.

Each of these existing sources has an authoritative domain. HR owns people data. Facilities owns locations. Procurement owns contracts. The CMDB does not replace these systems. It references them. Understanding what exists and who owns it prevents two problems: duplicating data that already has a better home, and missing data that nobody realized was relevant.


# Designing the Classification Model

## Choose a Classification Framework

There are three common starting points for a CMDB taxonomy, and the best results come from combining two of them.

The first option is to start from a standard. ITIL defines CI type categories (hardware, software, documentation, SLA, people). ServiceNow's Common Service Data Model (CSDM) organizes types into layers from foundation data through design, build, and governance. Technology Business Management (TBM) towers classify IT spending into categories like Application, Compute, Network, Storage, and Security. ISO/IEC 20000 defines service asset categories. Any of these provides a validated structure that covers common ground.

The second option is to start from your services. List the services the organization delivers. For each service, list what supports it: applications, servers, databases, networks, people. The supporting infrastructure becomes your CI type list. This is the pragmatic approach for small and mid-size organizations because it produces a taxonomy that directly reflects operational reality rather than theoretical completeness.

The third option is to start from discovery data. Let discovery tools scan the environment and use the discovered classes as a starting point. This works as a cross-check but carries a risk: you end up modeling what is scannable rather than what matters. A network scan finds routers and switches, but it does not find business services, deployment sites, or controlled documentation.

The recommended approach combines the second and first options. Start from your services to ensure the taxonomy is grounded in what the organization actually does. Then validate against a standard framework to find gaps you might have missed. If ITIL says you should track documentation as CIs and your service-driven list does not include a Document type, that gap is worth examining.

## Define Your CI Type Hierarchy

Hierarchy depth matters. Too shallow and everything is generic: a single "CI" type with a classification dropdown does not support meaningful queries or inheritance. Too deep and the taxonomy becomes a maintenance burden: nobody knows whether to create a "Linux Server" or a "Virtual Linux Server" or an "Ubuntu 22.04 Virtual Server."

A practical rule of thumb is two to four levels. Each level answers a different question. Level one (the category) answers "what broad domain does this belong to?" with values like Infrastructure, Application, Service, or People. Level two (the type) answers "what kind of thing is this?" with values like Server, Database, or Network Segment. Level three (the subtype) answers "what specific variant?" with values like Linux Server, Windows Server, or Virtual Machine. A fourth level is rarely needed and is usually better handled with a classification attribute.

The test for when to stop subdividing is whether the proposed subtypes share the same attributes and relationships. If a Linux Server and a Windows Server both carry hostname, IP address, CPU, RAM, storage, and environment, they do not need to be separate types. A single Server type with an operating system attribute handles the distinction. If, however, a Virtual Machine carries a hypervisor reference that a physical server does not, that is a genuine structural difference that warrants a separate type.

Inheritance is the mechanism that makes hierarchy practical. In platforms that support it, child types inherit attributes from their parents. Design parent types to carry common fields (name, description, status, owner) so that child types only define what is unique to them. CMDB-Kit's schema structure uses this pattern: Product CMDB is a parent category, and Product, Server, Database, and Product Component inherit from it.

```json
[
  { "name": "Product CMDB", "description": "Product infrastructure and components" },
  { "name": "Product", "parent": "Product CMDB", "description": "Software products and applications" },
  { "name": "Server", "parent": "Product CMDB", "description": "Compute instances and hosts" },
  { "name": "Database", "parent": "Product CMDB", "description": "Database instances" },
  { "name": "Product Component", "parent": "Product CMDB", "description": "Modular parts of a product" }
]
```

## Reference Data and Lookup Types

Statuses, environments, criticality levels, categories, and classifications are the vocabulary of your CMDB. They constrain every CI record, and they should be defined early because nearly everything depends on them.

CMDB-Kit models every piece of reference data as a first-class object type with a Name and a description. This is more work than a simple dropdown list, but it pays off in three ways. First, every value is documented: the description explains what "Active" means in this context, which prevents drift in interpretation. Second, every value is queryable as its own record, making it available for reporting and automation. Third, adding or changing a value is a data operation, not a schema change.

```json
[
  { "Name": "Active", "description": "Product is live and serving traffic" },
  { "Name": "Planned", "description": "Product is approved but not yet built" },
  { "Name": "Deprecated", "description": "Product is being phased out" },
  { "Name": "Retired", "description": "Product has been decommissioned" }
]
```

Status values should reflect lifecycle, not opinion. "Active" and "Retired" are lifecycle states that drive operational decisions. "Important" and "Low Priority" are opinions that change depending on who you ask. Environment values must match what operations actually calls its environments. If the team says "staging" and the CMDB says "pre-production," nobody will use the right value. Criticality or business impact levels should align with your incident priority matrix so that a Critical CI generating a P1 incident is not a coincidence but a structural link.

Keep lookup lists short. If a dropdown has thirty values, nobody picks the right one. Five to eight values per lookup is a practical ceiling. If you need more granularity, consider a two-level classification (category and subcategory) rather than a single long list.

## The Attribute Question

For each CI type, the question is not "what could we track?" but "what does someone need to make a decision?" Every attribute you define is an attribute someone must populate and maintain. Empty fields are worse than missing fields because they create uncertainty about whether the data was never entered or was entered and then cleared.

Attributes fall into six categories. Identity attributes (name, identifier, serial number) answer "what is this thing?" Classification attributes (type, subtype, category, environment) answer "what kind of thing is it?" Ownership attributes (owner team, support group, department) answer "who is responsible?" Lifecycle attributes (status, install date, retirement date) answer "where is it in its lifecycle?" Technical attributes (operating system, version, IP address, hostname) answer "what are its specifications?" Relationship attributes (runs on, depends on, managed by) answer "how is it connected?"

A counterintuitive but important principle: fewer mandatory fields produce higher data quality. When every field is mandatory, people enter placeholder values to get past the form. When only the fields that truly matter are mandatory, the data in those fields tends to be accurate. Make identity, classification, and ownership mandatory. Make lifecycle and technical attributes encouraged but optional.

The distinction between free text and lookup is critical. If you want to report on a field or filter by it, it must be a lookup reference, not free text. Free text works for descriptions, URLs, and unique identifiers. It fails for anything you need to aggregate because "Production," "Prod," "PROD," and "production" are four different values in a free-text field but one value in a lookup.

In CMDB-Kit's base schema, the Server type illustrates this balance. The hostname and ipAddress fields are free text because every value is unique. The environment field is a reference to the Environment Type lookup because you need to filter and report by environment:

```json
"Server": {
  "description": { "type": 0 },
  "hostname": { "type": 0 },
  "ipAddress": { "type": 0 },
  "operatingSystem": { "type": 0 },
  "environment": { "type": 1, "referenceType": "Environment Type" },
  "cpu": { "type": 0 },
  "ram": { "type": 0 },
  "storage": { "type": 0 }
}
```

## Relationship Design

Relationships are the value of a CMDB. Without them, it is just an asset register: a list of things with no context about how they interact. With relationships, the CMDB can answer the question that matters most during an incident or change: if this thing breaks or changes, what else is affected?

Five core relationship patterns cover most needs. "Runs on" or "hosted on" connects an application to a server, or a virtual machine to a host. "Depends on" or "used by" connects a service to an application, or an application to a database. "Managed by" or "owned by" connects a CI to a person or team. "Located at" connects a CI to a physical location. "Part of" or "contains" connects a server to a rack, or a rack to a data center.

Start with "depends on" because it drives impact analysis. If Application A depends on Database B, and Database B runs on Server C, then losing Server C impacts Database B, which impacts Application A. That chain is the reason the CMDB exists. Direction matters: if A depends on B, then losing B impacts A, not the other way around.

Do not model every possible relationship. Model the ones that answer "if this breaks, what else breaks?" and "if this changes, what else needs to change?" A relationship between a server and its manufacturer is useful for procurement but irrelevant for incident management. A relationship between an application and its database is useful for both.

In CMDB-Kit, relationships are modeled as reference attributes. A Database has a `server` attribute that references a Server record. A Product Version has a `components` attribute that references multiple Product Component records. The schema makes relationships explicit and queryable:

```json
"Database": {
  "description": { "type": 0 },
  "databaseEngine": { "type": 0 },
  "version": { "type": 0 },
  "server": { "type": 1, "referenceType": "Server" },
  "storageSize": { "type": 0 },
  "environment": { "type": 1, "referenceType": "Environment Type" }
}
```


# Platform Considerations

## ServiceNow

ServiceNow ships with CSDM (Common Service Data Model), a reference architecture that organizes CI types into layers: foundation data (locations, companies, users), design (business and technical services), build (CI classes for hardware, software, network), and governance (policies and baselines). The built-in CI class hierarchy is deep, running from `cmdb_ci` through `cmdb_ci_computer` to `cmdb_ci_server` to `cmdb_ci_server_linux`. You can extend this hierarchy with custom classes but you cannot restructure the base.

Use CSDM as a starting point rather than gospel. It covers infrastructure classification, service modeling, discovery integration, and ITSM process linkage well. It does not cover product development lifecycle, release baselines, controlled documentation as CIs, deployment site tracking, or feature-to-release traceability. For those patterns, extend CSDM with custom CI classes using the approaches described later in this playbook.

Discovery patterns map to CI classes automatically in ServiceNow, and service mapping creates relationship topology. These are powerful capabilities, but they reinforce the infrastructure-centric view. Make sure your taxonomy also covers the product-centric types that discovery cannot find.

## JSM Assets

JSM Assets gives you a blank canvas. The object schema is fully custom: you define the entire type hierarchy, every attribute, and every relationship. There is no built-in CI class hierarchy. This is both freedom and risk. Freedom because your taxonomy can match your organization exactly. Risk because there is no guardrail to catch a poorly designed schema.

Reference attributes create relationships in JSM Assets, and you plan cardinality at design time by choosing single-select or multi-select references. AQL (Assets Query Language) is the primary query mechanism, so design your types so that common queries are simple. If the most common question is "show me all servers in production," then Server should be a type and environment should be a queryable reference attribute, not a text field.

JSM Cloud also provides three schema templates when creating a new object schema: IT Asset Management, People, and Facilities. The ITAM template covers hardware assets with attributes like asset tag, serial number, and procurement dates. The People template covers employees, teams, and departments. The Facilities template covers sites, buildings, floors, and rooms. All three are fully editable after creation.

These templates provide a solid IT asset management foundation, but they do not cover software products as CIs (only software models for licensing), release management, baselines, service modeling, or any configuration management discipline concepts. They model what you buy and operate, not what you build and release. CMDB-Kit's schemas fill that gap.

## iTop

iTop ships with a PHP-defined class hierarchy that is ITIL-aligned out of the box: infrastructure CIs (Server, Virtual Machine, Network Device), application CIs (Application Solution, Database Schema, Web Application), software tracking, virtualization, network, documents, contacts, locations, and services. It also has built-in typology (dropdown hierarchies) for classifying CIs within a type, and an impact analysis engine that uses CI relationships to compute blast radius.

The default model is usable immediately for IT operations. Consider the default classes before creating custom ones. Use CMDB-Kit patterns for product library and deployment types that iTop does not provide.

## Platform-Agnostic Principles

A well-designed taxonomy is portable. If you design it correctly, migrating between platforms is a data exercise, not a redesign. This requires separating the logical model (types, attributes, relationships) from the physical implementation (platform tables, fields, references).

Document the taxonomy outside the tool. The tool is not the documentation. If your taxonomy only exists as a schema inside JSM Assets or ServiceNow, then understanding the design requires access to the tool. A separate, version-controlled document (or a set of JSON files, as CMDB-Kit provides) makes the taxonomy reviewable, diffable, and portable.

## Where CMDB-Kit Fits Alongside Platform Defaults

The platform defaults and CMDB-Kit solve different problems. Platform defaults excel at infrastructure inventory, discovery integration, and ITSM process linkage. CMDB-Kit excels at product engineering, release management, deployment tracking, and formal configuration management.

| Concern | JSM Templates | ServiceNow CSDM | iTop Default | CMDB-Kit |
|---------|--------------|-----------------|--------------|----------|
| Hardware inventory | Yes | Yes | Yes | Partial (Server, Hardware Model) |
| Software licensing | Models only | Yes | Yes | Yes (License type) |
| Service modeling | No | Yes | Yes | Enterprise only (Service, Capability) |
| Product engineering | No | No | No | Yes (Product, Component, Feature) |
| Release management | No | No | No | Yes (Version, Baseline, Documentation Suite) |
| Deployment tracking | No | Limited | No | Yes (Deployment Site, Distribution Log) |
| Discovery integration | Data Manager | Native | Partial | No (adapters import, not discover) |

The practical approach depends on your platform. If you are on ServiceNow, start with CSDM and use CMDB-Kit patterns to fill product engineering gaps. If you are on JSM Assets, start with CMDB-Kit's base or extended schema as your primary model. If you are on iTop, start with the default classes and add CMDB-Kit patterns for product library and deployment types. If you are platform-shopping, CMDB-Kit's schema files are platform-neutral JSON that you can evaluate against any target.


# Implementation Sequence

## Phase 1: Foundation

The first four weeks should produce a working CMDB that covers your most critical services, not a comprehensive schema that covers everything. Define the core CI types that support those services. Build lookup types first (statuses, environments, criticality) because nearly everything references them. Import or create data for those types only.

Validate with one real change request. Walk a change through the process using CMDB data. Can the change advisory board see what they need? Can they identify what the change affects, who owns the affected CIs, and what the blast radius is? If yes, the foundation is working. If no, the taxonomy needs adjustment before you expand.

In OvocoCRM terms, the foundation phase would produce Product records for CRM Core, API Gateway, Analytics Engine, and the other applications. It would produce Server records for the production and staging hosts. It would produce Team and Person records for Platform Engineering and Data Engineering. And it would produce the lookup types that constrain those records: Product Status, Environment Type, Component Type.

## Phase 2: Expansion

Weeks five through twelve add the supporting types that turn an asset list into a relationship graph. People, teams, locations, vendors, and facilities provide the "who" and "where" dimensions. Building relationship topology for one critical service end-to-end proves that the schema can support impact analysis.

Connect to discovery sources during this phase for automated population. Discovery handles infrastructure CIs (servers, virtual machines, network devices) far more accurately than manual entry. Let it populate the types it can find, and focus manual effort on the types it cannot: products, components, services, and organizational records.

Validate with incident management. When an incident is raised against a server, can you trace upward to see which products run on it? Can you identify the owning team for escalation? Can you see the deployment environment to assess whether production customers are affected?

## Phase 3: Breadth

Months three through six extend the schema to remaining services and add types that serve additional stakeholders. Financial types (contracts, cost categories) serve finance and procurement. Assessment and certification types serve security and compliance. Change request and incident types serve ITSM processes.

Integrate the CMDB with change, incident, and problem management workflows so that every change references affected CIs and every incident links to impacted infrastructure. Establish data quality metrics and ownership: each type should have a data steward responsible for accuracy within their domain.

## Phase 4: Maturity

Ongoing maturity work includes automating data quality checks, adding lifecycle management (decommission workflows that update CI status and clear relationships), and periodic taxonomy review. Types that were relevant at launch may become irrelevant as the organization evolves. Types that were not needed at launch may become necessary as new products or compliance requirements emerge.

Federation is the mature approach to data that has a better home elsewhere. HR systems own people data. The CMDB references HR records rather than duplicating them. Procurement systems own contract data. The CMDB links to procurement records. The goal is not to centralize all data in the CMDB but to centralize the relationships between data that lives in its authoritative sources.


# Governance

## Who Owns the Taxonomy

The taxonomy is a controlled artifact, not a living wiki that anyone can edit. Treating it as uncontrolled leads to type sprawl, inconsistent naming, and duplicate types that model the same concept differently.

The configuration manager owns the schema design: type definitions, attribute definitions, relationship definitions, and lookup values. Data stewards own accuracy within their domain: the networking team ensures network segment records are current, the operations team ensures server records reflect reality. The change advisory board (or its equivalent) approves structural changes to the schema, not individual data changes but changes to the types themselves, such as adding a new CI type, adding an attribute to an existing type, or modifying a relationship.

This governance structure prevents two failure modes. Without a schema owner, different teams create overlapping types (one team's "Application" is another team's "Software Product"). Without data stewards, nobody is accountable when records go stale. Without change approval for structural changes, the schema drifts until it no longer matches its documentation.

## When to Add a New CI Type

Four conditions should all be true before creating a new CI type. First, someone needs to track the thing for change impact, incident correlation, or compliance. Second, the thing has distinct attributes that do not fit an existing type. Third, the thing has distinct relationships that matter operationally. Fourth, it is not just a subtype that could be handled with a classification attribute on an existing type.

If the proposed type shares all its attributes and relationships with an existing type and differs only in a classification value, add a lookup value instead. "Linux Server" and "Windows Server" share hostname, IP, CPU, RAM, storage, and environment. A Server type with an operating system attribute handles the distinction better than two separate types.

## When to Retire a CI Type

Three conditions justify removing a type. No active records remain: every instance has been retired or deleted. No process references it: no automation, report, query, or workflow depends on the type. Or the type was never populated, meaning it was aspirational at creation but never became operational. In the last case, removing it is an act of honesty that brings the schema in line with reality.

## Taxonomy Change Process

Schema changes follow a controlled process. The proposal identifies what type is being added, modified, or removed, and why. The impact assessment examines how the change affects existing queries, reports, integrations, and automation. Approval comes from the configuration manager plus any impacted data stewards. Implementation includes the schema change itself, any data migration needed, and documentation updates. Communication notifies all consumers of the change, especially those whose queries or automation may need adjustment.


# Enterprise Architecture in the CMDB

## When EA Types Earn Their Place

Most organizations eventually ask whether the CMDB should also serve as an enterprise architecture repository. The answer depends on whether you have the people to maintain the data. EA types like Service, Capability, and Business Process are only worth adding when someone will actively maintain them. An empty Capability type is worse than no Capability type because it signals that the CMDB tracks capabilities when it does not.

Add EA types when a dedicated architect or architecture team maintains a capability map, when the organization needs to answer questions like "which services depend on this capability?" or "which capabilities have no implementing service?", and when strategic planning requires a live view of the application portfolio rather than a slide deck that was accurate six months ago.

Do not add EA types when nobody owns the data, when the organization has no formal architecture practice, or when a spreadsheet is genuinely sufficient for the scale.

## Service Modeling

A business service is something the organization delivers: "Customer Relationship Management," "Payroll Processing," "Analytics and Reporting." A technical service is the technology that implements it: "CRM Platform Hosting," "Payroll Database Cluster." Service modeling in the CMDB connects business intent to physical infrastructure:

```
Business Service: "Customer Relationship Management"
  └── Technical Service: "CRM Platform Hosting"
        └── Application: "CRM Core"
              ├── Component: "Contact Manager"
              ├── Component: "Deal Pipeline"
              └── Server: "crm-app-01"
```

Each level answers a different question. The service level answers "what do we deliver?" The application level answers "what software delivers it?" The infrastructure level answers "what hardware supports it?"

The value is impact analysis. When crm-app-01 goes down, trace upward: CRM Core runs on it, CRM Platform Hosting depends on CRM Core, and Customer Relationship Management depends on CRM Platform Hosting. Without service modeling, incident managers know a server is down. With it, they know which business functions are impaired and can prioritize accordingly.

Service types need at minimum: name, service type (Business, Technical, Shared), owner (team or organization), status, and a reference to the capability it supports.

## Capability Mapping

A business capability is something the organization can do, independent of how it does it. "Customer Management" is a capability. "OvocoCRM running on AWS" is an implementation of that capability. Capabilities are stable over time (you always need to manage customer relationships) even as the implementations change.

Capabilities decompose hierarchically:

```
Enterprise Capabilities
├── Customer Management
│   ├── Lead Tracking
│   └── Account Management
├── Platform Operations
├── Business Intelligence
└── Customer Communication
```

Tracking capabilities as CIs enables gap analysis (a capability with no service referencing it is an unmet need), redundancy detection (a capability referenced by multiple services may represent waste), strategic planning (a capability with status "Planned" is on the roadmap but not yet implemented), and impact analysis (if a capability's implementing service goes down, what business function is lost).

Capability types need: name, description, parent capability (a self-reference for hierarchy), owner (organization), and status.

## Application Portfolio Management and the TIME Model

The simplest form of enterprise architecture that almost every organization can maintain is application portfolio management. It requires no new types, just discipline with existing ones.

Application Status (Active, Planned, Deprecated, Retired) gives you the portfolio lifecycle at a glance. Add a Disposition attribute using the Gartner TIME model: Tolerate (works but receives minimal investment), Invest (strategic, receives active development), Migrate (needs replacement, migration planned), and Eliminate (should be retired as soon as possible).

The two dimensions together drive decisions. An "Active" application with disposition "Eliminate" needs retirement planning. A "Planned" application with disposition "Invest" is a strategic new build. An "Active" application with disposition "Tolerate" can be left alone unless it becomes a risk.

Combined with Vendor and License data, this gives portfolio managers a three-dimensional view: what exists (status), what to do about it (disposition), and what it costs (license and vendor records). This is achievable without dedicated EA tools and without adding new CI types.

## The CMDB as EA Repository vs Feeding a Separate EA Tool

Two approaches exist. The first treats the CMDB as the EA repository: capabilities, services, and business processes are CI types, and EA views are generated from CMDB queries. This maximizes accuracy because there is one source of truth, but it may lack the modeling sophistication of dedicated EA tools. It works best for organizations without a separate architecture team.

The second approach has the CMDB feed a dedicated EA tool. The CMDB holds operational data (applications, servers, deployments). A dedicated tool like LeanIX or Ardoq imports this data and adds strategic layers. This gives architects their preferred tools while keeping operational data grounded in reality. It works best for large enterprises with established architecture practices.

For most organizations, the first approach is simpler and sufficient. Add Service and Capability types to the schema, populate them, and generate views from queries. Reserve the second approach for when the first demonstrably fails to meet architecture team needs.

## Keeping EA Data Aligned With Operational Reality

The biggest risk in enterprise architecture is stale data. Architecture diagrams that do not match deployed reality create false confidence. When capabilities and services live as CI records in the CMDB, alignment is structural. A capability's service references point to live Service records. If a service is retired, the capability's implementation list visibly shrinks. No one has to remember to update a slide deck.

Three practices keep EA data current. First, change triggers: when a significant CI changes (new application, retired server, new deployment site), the architecture team reviews the impact on capability and service records. Second, periodic reconciliation: quarterly, compare capability and service records to operational reality, and treat any discrepancy as either a CMDB gap or an EA gap. Third, ownership: each capability and service record has an owner, and if nobody owns it, it should not be in the CMDB.


# How CMDB-Kit's Taxonomy Was Designed

This is the most important section of the playbook. It explains the decisions behind CMDB-Kit's three-layer schema, serves as a worked example of the process described in the preceding sections, and provides a rationale document for anyone extending or adapting the schema for their own organization.

## The Design Problem

CMDB-Kit needed a taxonomy that could work as a teaching tool for people who have never built a CMDB, scale from a proof of concept to a multi-product enterprise without requiring a redesign, run on platforms with no built-in CI class hierarchy (like JSM Assets) and platforms with one (like ServiceNow), and demonstrate real configuration management patterns rather than just IT asset inventory.

Most open-source CMDB schemas model infrastructure (servers, networks, storage) because that is what discovery tools find. That was deliberately not the starting point here. The question was not "what can we scan?" but "what does a configuration manager need to control?"

## Theoretical Foundation

The taxonomy draws on three sources, layered in order of influence.

Configuration management standards define four CM functions: identification, change control, status accounting, and audits. The taxonomy was designed so that each function has somewhere to land. CI types exist for the things you identify (Product, Server, Component). Change Request and Incident types exist for change control. Status and lifecycle lookups exist for status accounting. Baselines, Certifications, and Assessments exist for audits. If a CI type does not support at least one CM function, it does not belong in the schema.

The baseline and media library discipline directly influenced several design choices. The baseline model (Functional, Allocated, Product) influenced the Baseline type and its Baseline Type lookup (FBL, ABL, PBL). The distinction between a CI's identity and its deployed instances influenced the separation of Product Component (what it is) from Component Instance (what was built and released) in the enterprise schema. The Definitive Media Library pattern (Product Media, Product Suite, Distribution Log) comes from treating controlled software artifacts as configuration items in their own right.

ITIL Service Asset and Configuration Management (SACM) provided the four-branch structure: things you build (Product CMDB), things you release (Product Library), people who do the work (Directory), and controlled vocabulary (Lookup Types). The extended and enterprise layers add ITIL's service modeling concepts (Service, Capability, Business Process) and ITSM records (Change Request, Incident, SLA). ITIL's principle that a CMDB should support service impact analysis, not just asset tracking, drove the relationship model: every CI connects upward to a product and downward to infrastructure.

## Why Product-Centric, Not Infrastructure-Centric

Most CMDB taxonomies start with infrastructure: servers, networks, storage, then attach applications on top. CMDB-Kit inverts this. The root organizing concept is the Product, and infrastructure exists to support products.

This was a deliberate choice based on operational experience. When a change advisory board reviews a change, they ask "what product does this affect?" not "what server is this on?" When an incident is raised, the first question is "which product is down?" not "which VM faulted?" The taxonomy should mirror the questions people actually ask.

The base schema makes this concrete. Product is a peer of Server and Database under Product CMDB, not a child of them. A server exists because a product needs it. A database exists because a product stores data in it. The dependency flows from product downward.

In the OvocoCRM example data, the products are the organizing concept. CRM Core, API Gateway, Analytics Engine, Mobile API, Notification Service, and Search Service are the six products. Servers like crm-app-01 and crm-db-01 exist because CRM Core needs them. Components like Contact Manager and Deal Pipeline exist because CRM Core is composed of them. The taxonomy reflects this: products come first, and everything else relates to them.

```json
[
  {
    "Name": "CRM Core",
    "description": "Primary CRM application handling contacts, deals, and workflows",
    "productType": "Web Application",
    "technology": "Node.js, React, PostgreSQL",
    "owner": "Platform Engineering",
    "status": "Active"
  }
]
```

This does not mean infrastructure is unimportant. It means the taxonomy is organized around the thing the organization delivers (products and services), not the thing it operates (hardware and networks).

## The Three-Layer Strategy

The three layers were not designed as "basic, medium, advanced." They were designed around three different organizational questions.

The base layer answers "what do we have and who owns it?" It has four branches (Product CMDB, Product Library, Directory, Lookup Types) and covers the minimum viable set of CM questions: what products exist, what versions have been released, where are they deployed, and who is responsible. A small team can populate this in a day. It is deliberately incomplete, with no baselines, no change records, and no assessments, because adding those before you have the foundation creates empty types that nobody maintains. The base layer is also the teaching layer. Someone learning CMDB concepts can read the entire schema in ten minutes and understand how types relate to each other.

The extended layer answers "how do we control changes and track compliance?" It adds the types needed for operational CM: Baselines, Certifications, Assessments, Change Requests, Incidents, and SLAs. It also adds infrastructure depth (Virtual Machine, Network Segment, Hardware Model) and organizational depth (Location, Facility, Vendor). The dividing line between base and extended is whether you can run a change advisory board with just the schema. The base schema cannot support a CAB. The extended schema can. It provides everything you need for ITIL-aligned service management except service modeling and financial tracking.

The enterprise layer answers "how do we manage a portfolio of products?" When an organization has more than one product sharing infrastructure, shared services, and customer sites, the single-product schema breaks down. You need to know which product's deployment at which site is running which version. The enterprise schema introduces product-prefixed types (CR Server, AN Server, SS Server) that isolate product-specific CIs while sharing Directory and Lookup data across the portfolio. The prefixing is not cosmetic: it enables queries scoped to a single product ("show me all CR Servers in Production") without cross-product noise. Enterprise also adds branches that only matter at scale: Enterprise Architecture (Service, Capability, Business Process), Configuration Library (controlled software artifacts), and Financial (Contract, Cost Category).

## Key Design Decisions and Their Rationale

**Lookup types as first-class objects, not picklists.** Every status, category, and classification is a separate object type with a Name and description. This means every value is documented (the description explains what "Active" means in context), every value is referenceable (you can query "show me everything with Status = Deprecated"), and adding a value is a data change, not a schema change.

**Separation of Product Library from Product CMDB.** The CMDB branch holds what exists now (current infrastructure state). The Library branch holds what was released (versioned artifacts, baselines, deployment records). This mirrors the CM distinction between "as-deployed" configuration and "as-released" configuration. A server's current state might differ from its baselined state, and the schema must represent both.

**Site as a shared identity, Deployment Site as product-specific.** In the enterprise schema, a Site (like "ACME Corp Dallas") is a single Directory record shared across products. Each product has its own Deployment Site record (CR Deployment Site, AN Deployment Site) that tracks product-specific deployment details at that location. This avoids duplicating site identity data while allowing each product to track its own deployment state independently. Different products at the same customer site can be at different versions, with different support teams, on different upgrade schedules.

**Feature Implementation as an immutable audit record.** The enterprise schema includes Feature Implementation, a type that links a Feature to a Product Version with an implementation status. Once a feature is marked as implemented in a release, that record is frozen. This creates an auditable history of what was delivered in each release, which is required for regulated industries but useful anywhere you need to answer "when did we ship this feature?"

**No discovery-driven types.** The schema does not include types like "Router," "Switch," "Load Balancer," or "Firewall" that discovery tools typically surface. These can be modeled as subtypes of Network Segment or Server if needed, or handled through a Component Type lookup value. The taxonomy stays closer to "what we manage" than "what we can scan." Organizations with discovery tools can extend the schema to match their discovered classes.

## Where CMDB-Kit Fits in the Landscape

CMDB-Kit is not trying to be a universal CMDB taxonomy. It is a product-centric, CM-discipline taxonomy designed for organizations that build and deliver software products. It fits best when the organization develops products (not just operates infrastructure), when configuration management is a formal discipline (not just IT asset tracking), when release management, baselines, and controlled documentation matter, and when the CMDB needs to answer "what version is deployed where?" not just "what servers do we own?"

It fits less well when the organization is purely an IT operations shop with no product development, when discovery-driven infrastructure inventory is the primary goal, when the CMDB is mainly for IT asset management and procurement, or when ServiceNow CSDM is already adopted and working. For those scenarios, start from the platform's built-in model and use CMDB-Kit's patterns selectively where they add value.

## Lessons from Production Use

The multi-product prefixing pattern came from a production CMDB managing multiple product lines across deployment sites. Several lessons emerged from that experience.

Prefixing adds visual noise but eliminates query ambiguity. When you have hundreds of servers across multiple products, "CR Server" is instantly filterable. "Server with product = OvocoCRM" requires a compound query that is slower and more error-prone.

Shared services (tooling, CI/CD pipelines, monitoring) need their own branch, not a product prefix. They serve all products equally and should not appear to belong to any single product.

The Site vs Deployment Site split was not in the original design. It was added after discovering that different products at the same physical site had different support teams, different upgrade windows, and different contractual obligations. A single "Deployment" record could not represent this complexity without becoming overloaded.

Feature Implementation was added to satisfy an audit requirement: prove that every requirement allocated to a release was actually implemented and tested. It became the most-queried type in the schema because it answered the question engineers and program managers asked daily: "is this feature in this release?"

Baselines (FBL, ABL, PBL) were initially seen as bureaucratic overhead. They became essential when the organization needed to answer "what was the approved design at the time of a specific review?" months after the review happened. Without baselines, that answer requires archaeology. With them, it is a single query.


# Starter Taxonomies

Three ready-to-use starting points at different scales. Each is self-contained. Pick the one that matches your organization's current needs and expand later.

## Small Organization

The small org taxonomy is for teams with a single product, no formal change control, and no compliance requirements. It covers the basics: what do you have, what versions exist, and who owns it. This corresponds directly to CMDB-Kit's base schema.

The CI types span four branches. Under Product CMDB: Product, Server, Database, and Product Component. Under Product Library: Product Version, Document, and Deployment. Under Directory: Organization, Team, and Person.

Ten lookup types constrain these records: Product Status (Active, Planned, Deprecated, Retired), Version Status, Deployment Status, Environment Type (Production, Staging, Development, Test, DR), Document Type (Design Document, User Guide, API Reference, Release Notes, Test Plan), Document State (Draft, In Review, Approved, Superseded, Archived), Component Type (Application, Service, Library, Module, Plugin, Database Schema), Priority (Critical, High, Medium, Low), Organization Type (Engineering, Operations, Customer, Vendor, Partner), and Deployment Role (Site Lead, Technical Contact, Support Contact).

You can import this taxonomy directly using `SCHEMA_DIR=schema/base`. A small team can populate all the data in a single day.

## Mid-Size Organization

The mid-size org taxonomy adds operational CM capability to the small org foundation. It is for teams running change advisory boards, tracking compliance, managing licenses, and operating across multiple environments and locations. This corresponds to CMDB-Kit's extended schema.

Beyond the small org types, the mid-size taxonomy adds Hardware Model, Network Segment, Virtual Machine, License, Assessment, and Feature under Product CMDB. It adds Baseline, Documentation Suite, Product Media, Product Suite, Certification, Deployment Site, Distribution Log, Change Request, Incident, and SLA under Product Library. It adds Location, Facility, and Vendor under Directory.

Sixteen additional lookup types support these new CI types: Change Type, Change Impact, Incident Severity, Incident Status, Certification Type, Certification Status, Assessment Type, Assessment Status, Network Type, Baseline Type, Baseline Status, License Type, License Status, Site Status, Vendor Status, and SLA Status.

You can import this taxonomy directly using `SCHEMA_DIR=schema/extended`.

## Enterprise

The enterprise taxonomy is for organizations managing multiple products, tracking financial obligations, modeling services and capabilities, and operating formal configuration management. This corresponds to CMDB-Kit's enterprise schema.

Three key structural differences set the enterprise taxonomy apart. CI types are product-prefixed (CR Server, AN Server, SS Server) to isolate product-specific data. A shared Site type represents customer locations across products while each product gets its own Deployment Site record. New branches appear that do not exist in the smaller taxonomies: Enterprise Architecture (Service, Capability, Business Process, Information Object), Configuration Library (Library Item for controlled software artifacts), and Financial (Contract, Cost Category).

Additional lookup types include Baseline Milestone, Site Type, Site Workflow Status, Upgrade Status, Service Type, Capability Status, Disposition (for the TIME model), Library Item Type, Distribution Status, Delivery Method, Media Urgency, Transfer Status, Build Status, Sunset Reason, Implementation Status, Requirement Type, Requirement Status, Requirement Priority, Verification Method, Contract Status, Disposal Method, and Media Type.

You can import this taxonomy directly using `SCHEMA_DIR=schema/enterprise`.

## Choosing Between Them

The deciding factors are operational maturity and staffing. If you do not run a change advisory board, do not track compliance certifications, and have one person maintaining the CMDB, start with the small org taxonomy. If you run a CAB, track certifications, and have one to three people maintaining data, use the mid-size taxonomy. If you manage more than one product, need service or capability modeling, track contracts and costs in the CMDB, and have three or more maintainers, use the enterprise taxonomy.

Start small. Every type you add is a type someone has to maintain. Unused types with empty records are worse than missing types because they create the illusion of coverage. You can always promote from base to extended to enterprise by adding types incrementally.


# CI Types by Domain

This section organizes common CI types by functional domain. Use it as a checklist when designing your schema. Not every organization needs every type. Include a type only when someone will maintain its data and a process will consume it.

## Infrastructure

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Server | Physical and virtual compute | hostname, IP, OS, CPU, RAM, storage, environment | hosts Applications, located at Location |
| Virtual Machine | VMs and containers | hostname, OS, CPU, RAM, hypervisor | runs on Server, hosts Applications |
| Database | Database instances | engine, version, storage size, environment | runs on Server, used by Application |
| Network Segment | Network zones | CIDR, VLAN, gateway, network type | contains Servers, connects to other segments |
| Hardware Model | Approved hardware specs | manufacturer, model number, form factor, CPU, RAM | referenced by Servers |
| Storage Array | Centralized storage | capacity, RAID level, protocol | used by Servers, located at Facility |
| Load Balancer | Traffic distribution | virtual IP, algorithm, pool members | fronts Applications |
| Firewall | Network security | ruleset, firmware, zone pairs | protects Network Segments |

## Applications and Middleware

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Product / Application | Software products | product type, technology, owner, status | contains Components, deployed to Sites |
| Product Component | Modular parts | component type, repository, technology, owner | belongs to Product, built into Versions |
| Component Instance | Built artifact | version, checksum, build date, build status | instance of Component, included in Media |
| Feature | Product capabilities | description, status, version | belongs to Product, implemented in Version |
| License | Software entitlements | license type, vendor, quantity, expiration | covers Application, supplied by Vendor |
| Middleware | Integration layer | type, version, port, protocol | connects Applications |

## Services

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Service | What the org delivers | service type, owner, status, SLA | supports Capability, implemented by Applications |
| Capability | What the org can do | parent capability, owner, status | decomposition hierarchy, supported by Services |
| Business Process | How work gets done | owner, capabilities, applications | uses Capabilities, supported by Applications |
| SLA | Service level targets | target uptime, response time, review date | governs Service or Product |
| Information Object | Data flows | producer, consumers, classification | flows between Applications |

## Release Management

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Product Version | Released software | version number, release date, status | contains Components, has Baselines |
| Baseline | Approved configuration | baseline type (FBL/ABL/PBL), approval date, status | snapshots a Version |
| Documentation Suite | Versioned doc package | version, state | groups Documents for a Version |
| Product Media | Distributable files | filename, file size, checksum | belongs to Version, bundled in Suite |
| Product Suite | Distribution bundle | version | groups Media files |
| Distribution Log | Delivery audit trail | distribution date, site, distributed by | tracks Media delivery to Sites |

## Change and Incident

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Change Request | Proposed changes | change type, impact, requestor, status | affects Products and Components |
| Incident | Service disruptions | severity, status, reported by, resolved date | affects Product |
| Assessment | Security and compliance reviews | assessment type, date, status, assessor, findings | evaluates Products and infrastructure |
| Certification | Compliance certifications | cert type, status, issue date, expiration, issuing body | certifies Products or infrastructure |

## People and Organizations

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Organization | Companies and departments | org type, parent org, website | contains Teams |
| Team | Functional groups | organization, team lead | contains Persons, owns Products |
| Person | Individuals | first name, last name, email, role | belongs to Team, authors Documents |
| Vendor | Third-party suppliers | website, contact, status, contract expiry | supplies Licenses, provides support |

## Locations and Facilities

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Location | Physical addresses | address, city, country, location type | contains Facilities |
| Facility | Specific spaces | location, facility type, capacity | houses Servers, located at Location |
| Deployment Site | Customer installations | location, status, environment, go-live date | runs Product Versions |
| Site | Shared customer identity | cross-product site reference | referenced by product-specific Deployment Sites |

## Financial

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Contract | Financial agreements | vendor, start date, end date, value, status | covers Products, with Vendor |
| Cost Category | Cost classification | TBM tower, sub-tower | attributes costs to Products and infrastructure |

## Documents and Controlled Artifacts

| CI Type | What It Tracks | Typical Attributes | Key Relationships |
|---------|---------------|-------------------|-------------------|
| Document | Controlled documentation | document type, state, author, publish date, URL | belongs to Documentation Suite |
| Library Item | Controlled software artifact | item type, version, checksum, distribution status | versioned, tracked for distribution |
| Requirement | Traceable requirements | requirement type, status, priority, verification method | allocated to Versions |


# Attribute Templates

This section provides standard attribute sets per CI type category. Each attribute includes its rationale so you can decide whether it belongs in your schema. Attributes are grouped by purpose: identity, classification, ownership, lifecycle, technical, and relationships.

## Identity Attributes

Every CI type needs a way to be uniquely identified and described. Two attributes are universal and should appear on every type.

Name is the primary identifier, built into most platforms as a default field. It must be unique within a type. Use a naming convention that makes the value meaningful: "crm-app-01" tells you more than "Server 47." Description explains what this CI is and why it exists. It helps new team members understand the record without external context and gives auditors the rationale behind each CI's inclusion in the CMDB.

## Classification Attributes

Classification attributes let you filter and report. The rule is simple: if you want to report on it, it must be a lookup reference, not free text.

Status is the most important classification attribute and applies to nearly everything. It tracks lifecycle state, drives dashboards and filters, and enables retirement workflows. Environment applies to infrastructure and deployments, separating production from dev/test, which is critical for change impact assessment. ComponentType distinguishes applications from services from libraries from modules. ProductType classifies products by their nature (Web Application, API Service, Platform). ServiceType separates Business Services from Technical Services from Shared Services. Disposition implements the Gartner TIME model (Tolerate, Invest, Migrate, Eliminate) for portfolio planning. Priority drives triage and scheduling for change requests and requirements. Severity drives escalation and response targets for incidents.

## Ownership Attributes

Every CI should have a clear owner. Ownership drives accountability for data quality and lifecycle decisions.

The owner attribute (a reference to Team) identifies which team is responsible for a CI. It applies to products, components, and services. TeamLead (a reference to Person) provides an escalation point for the team. Organization (a reference to Organization) places teams in the organizational hierarchy. Author (a reference to Person) tracks who wrote a document, for review and update responsibility. Assessor identifies who conducted a security or compliance assessment. RequestedBy creates an audit trail for who initiated a change request.

## Lifecycle Attributes

Lifecycle attributes track when things happened. Dates are critical for compliance, audit, and operational awareness. Only add dates that someone will actually track. An empty date field provides no value and creates a false impression of missing data.

The most commonly used lifecycle dates are: releaseDate for Product Versions (when the version was released), deployDate for Deployments (when the deployment happened), goLiveDate for Deployment Sites (when the site went operational), approvalDate for Baselines (when the baseline was approved), publishDate for Documents (when the document was published), issueDate and expirationDate for Certifications (when granted and when expiring, which drives renewal alerts), requestDate and resolvedDate for Incidents (the difference computes response time), and distributionDate for Distribution Logs (when media was shipped).

Infrastructure dates like installDate, commissionDate, decommissionDate, warrantyStartDate, and warrantyEndDate are useful for server lifecycle management and procurement planning, but only if the operations team will maintain them.

## Technical Attributes for Infrastructure

Infrastructure CIs carry specification attributes that serve capacity planning, patching decisions, and compatibility assessments. Hostname and ipAddress identify the machine on the network. OperatingSystem drives patching and compatibility decisions. CPU, RAM, and storage support capacity planning. DatabaseEngine identifies the engine (MySQL, PostgreSQL, Oracle). CIDR, VLAN, and gateway define network segment boundaries. Manufacturer, modelNumber, and formFactor identify hardware for procurement. SerialNumber, assetTag, and macAddress tie CMDB records to physical or financial asset tracking systems.

## Technical Attributes for Software

Software CIs carry attributes that connect source code to deployed artifacts. VersionNumber records the semantic version (e.g., 3.2.1). Repository points to the source code location. Technology identifies the implementation language or framework. FileName, fileSize, and checksum describe distributable media and enable integrity verification. URL links to documentation.

## Relationship Attributes

Relationships are implemented as reference attributes. They are the connections that make the CMDB more than an asset list.

The most important relationship attributes in CMDB-Kit's schema are: server (a reference from Database or Virtual Machine to its hosting Server), location (a reference from Facility or Deployment Site to its physical Location), vendor (a reference from License to its supplying Vendor), version (a reference from Deployment, Baseline, or Distribution Log to the relevant Product Version), components (a multi-reference from Product Version to its constituent Product Components), documents (a multi-reference from Documentation Suite to its Documents), parentProduct, parentOrganization, and parentCapability (self-references that create hierarchical decomposition), previousVersion (linking Product Versions into a chain), and affectedProduct (connecting Incidents to the impacted Product).

## What to Leave Out

Common attributes that sound useful but often go unmaintained: risk rating (rarely updated after initial entry, use Assessment records instead), business criticality (useful only if someone reviews it quarterly, otherwise it becomes stale opinion), estimated cost (unless finance actually populates this, it will be wrong, use Contract records instead), notes or comments (free text that nobody reads, use the description field or link to a wiki page), and last reviewed date (only useful if you have a review process that actually updates it).
