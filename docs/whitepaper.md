# Product-Delivery Configuration Management: A Standards-Aligned CMDB Schema for Software Product Organizations

CMDB-Kit Technical Whitepaper, March 2026


## 1. Executive Summary

Existing CMDB schemas fall into three categories: process-centric schemas built around ITIL workflows and service desk operations, infrastructure-centric schemas built around what discovery tools find on the network, and asset-centric schemas built around procurement lifecycle and financial tracking. Each serves its domain well, but none addresses the needs of organizations that build and deliver software products to customer sites.

Product delivery teams need to track what version is deployed where, what components make up each release, what infrastructure supports each deployment, what the approved baseline looks like versus what is actually running, and who is responsible at each customer site. These questions span configuration identification, change control, status accounting, and audit, the four functions defined by SAE EIA-649C, but no existing schema structures its types and relationships around answering them.

CMDB-Kit is an open-source, platform-agnostic CMDB schema designed specifically for product delivery. It provides a ready-to-use type hierarchy with example data and import scripts for JSM Assets and ServiceNow. This whitepaper details the technical architecture, maps every schema concept to the relevant industry standards (ITIL 4, SAE EIA-649C, MIL-HDBK-61B, ISO/IEC 20000), and explains the design decisions through the lens of production use.

CMDB-Kit does not replace process-centric or infrastructure-centric approaches. It fills a gap that those approaches leave open. Organizations with established ITIL service desks or ServiceNow CSDM deployments can use CMDB-Kit's product delivery patterns selectively, layering them on top of their existing CMDB without restructuring it.


## 2. The Product-Delivery Problem

### 2.1 What Product Delivery Teams Need

A software product organization builds products composed of components, releases versioned configurations of those products, deploys releases to customer sites, and maintains those deployments over time. The configuration management challenge is tracking the full chain: from requirements through features, through components and builds, through baselines and approvals, through media distribution and installation, to the deployed state at each customer site.

This chain creates tracking requirements that no process-centric, infrastructure-centric, or asset-centric schema addresses:

**Products with divergent component types.** Different products have fundamentally different component taxonomies. A cross-domain security gateway has firmware, content filters, and guard modules. A video conferencing platform has codecs, session controllers, and media gateways. A monitoring platform has agents, dashboards, and data collectors. A single Component Type lookup cannot accommodate all three without becoming meaningless noise.

**Multi-product deployment sites.** A customer site may run multiple products simultaneously, each at a different version, supported by a different team, on a different upgrade schedule. A single deployment record per site cannot represent this complexity without becoming overloaded with product-specific fields that are irrelevant to the other products at the same site.

**Custom feature sets per deployment.** Not every site gets the same configuration. Contract scope, security classification, network restrictions, and operational requirements all influence which features are active at a given deployment. The CMDB must track which features are deployed where, not just which version.

**Requirements-to-deployment traceability.** Auditors and program managers need to trace from a customer requirement through to the specific release that implements it and the specific sites where that release is deployed. This chain, requirement to feature to version to deployment site, must be queryable as a single path through the CMDB.

**Controlled media distribution.** For classified or air-gapped environments, software delivery involves physical media (encrypted drives, optical discs) with chain-of-custody tracking. The CMDB must record what media was prepared, how it was delivered, who received it, and whether installation was verified. This is not an edge case; it is the primary delivery mechanism for many defense and intelligence programs.

**Baselines that freeze configuration state.** The current state of a deployment changes continuously. The approved state at the time of a review or audit must be preserved as a baseline. Without baselines, answering "what was the approved configuration six months ago?" requires archaeology through email and version control history instead of a single query.

### 2.2 Why Existing Schemas Don't Work

**Process-centric schemas** (ITIL SACM, ServiceNow CSDM) organize around service desk workflows: incidents route to assignment groups, changes go through approval chains, SLAs attach to services. The CI model exists to support these workflows. Types like Server, Application, and Database exist because incidents happen to them and changes affect them. There is no concept of a product that composes multiple applications, a version that bundles components into a release, a baseline that freezes the approved configuration, or a deployment site that tracks per-customer state.

**Infrastructure-centric schemas** (discovery tool defaults, ServiceNow OOTB CI classes) organize around what network scanners find: servers, virtual machines, network devices, storage arrays. The type hierarchy reflects hardware taxonomy, not product architecture. An application is something that runs on a server, not something that gets built, baselined, released, and deployed to customer sites. There are no types for features, components as design abstractions, or controlled media distribution.

**Asset-centric schemas** (IT asset management tools) organize around procurement and financial lifecycle: purchase orders, contracts, warranty dates, depreciation schedules. A server is something that was purchased and will eventually be disposed of. The lifecycle is buy, deploy, maintain, retire. There is no concept of a product version, a deployment site, or a feature set.

### 2.3 The Tags-on-a-Flat-Schema Trap

The natural first attempt is to use an existing schema and add tags or custom fields to handle product-delivery concepts. Tag each CI with a product name. Add a "deployed version" field to servers. Create a custom "site" field on every record.

This approach fails as soon as the second product arrives. The tag filter must be added to every query, every dashboard, and every automation rule. Miss it once and you get cross-product noise. Custom fields proliferate because each product needs different metadata. Reporting becomes a matrix of tag combinations that no standard tool handles well. Data quality degrades because there is no structural enforcement of the product boundary.

CMDB-Kit's multi-product prefixing pattern (product-specific type hierarchies sharing a common directory and lookup vocabulary) was born from this exact failure. The flat schema with tags was the first design. It was replaced after a month of production use.


## 3. Schema Architecture

### 3.1 Four-Branch Taxonomy

CMDB-Kit organizes all configuration items into four branches. Each branch serves a distinct purpose in the configuration management lifecycle.

**Product CMDB** contains the things you build and operate. Products (applications), servers, databases, hardware models, network segments, virtual machines, and product components. Each product in the enterprise schema gets its own prefixed set of these types, so a query for "CR Server" returns only servers belonging to that product. This branch answers "what exists and how is it structured?"

**Product Library** contains the things you release and deploy. Product versions, baselines, documents, documentation suites, product media (controlled artifacts), product suites (bundled distribution packages), certifications, deployment sites, site assignments, and distribution logs. This branch answers "what was released, what was approved, where did it go, and who received it?"

**Directory** contains the people and organizations that do the work. Organizations, teams, people, locations, and facilities, shared across all products. A single customer identity (Site) connects to product-specific deployment records across the portfolio. This branch answers "who is responsible and where are they?"

**Lookup Types** contain the controlled vocabulary that constrains attribute values. Every status, category, classification, and enumeration is a separate object type with a name and description. This branch answers "what are the allowed values and what do they mean?"

The four-branch structure maps to ITIL SACM's functional areas: identification (Product CMDB), control (Product Library baselines and change delegation), status accounting (Lookup Types and lifecycle attributes), and audit (Product Library certifications and assessments).

### 3.2 Three-Layer Progressive Disclosure

The schema ships in three layers, each designed around a different organizational question rather than an arbitrary complexity tier.

**Base (20 types)** answers "what do we have and who owns it?" Products, servers, databases, components, versions, documents, deployments, organizations, teams, and people. The minimum viable set for a single product. A small team can populate it in a day. It deliberately omits baselines, certifications, assessments, and multi-site tracking because adding empty types before the foundation is solid creates maintenance overhead with no value.

**Extended (50 types)** answers "how do we control changes and track compliance?" Adds baselines (functional, allocated, product), certifications, assessments, hardware models, virtual machines, network segments, licensing, SLAs, vendors, locations, facilities, and deployment site tracking with personnel assignments. The dividing line between base and extended is whether the schema can support a change advisory board. Base cannot. Extended can.

**Enterprise (78+ types)** answers "how do we manage a portfolio of products?" Introduces product-prefixed types that give each product its own CI hierarchy while sharing directory and lookup data. Adds the enterprise architecture branch (services, capabilities, business processes), the configuration library (controlled software artifacts and media distribution), the financial branch (contracts, cost categories), and requirements traceability (requirements linked to features linked to implementations).

Each layer includes everything from the layer below. Start with base and upgrade later without losing data. The upgrade path requires no schema redesign because each layer is additive.

### 3.3 Multi-Product Isolation

When an organization manages multiple products that share infrastructure, a single-product schema breaks down. A server might host components from two products. A support team might handle three products at the same customer site. A location might have deployments of every product in the portfolio.

CMDB-Kit's enterprise schema addresses this with product-prefixed types. Each product gets its own branch in the type hierarchy:

```
Portfolio CMDB
  Product A CMDB
    PA Server, PA Component, PA Feature, PA Assessment...
  Product B CMDB
    PB Server, PB Component, PB Feature, PB Assessment...
  Shared Services CMDB
    SS Server, SS Application, SS Network Segment...
```

The prefix is not cosmetic. It scopes every query automatically. "Show all PA Servers in Production" is a single, unambiguous query. "Show all Servers where product = A" requires a compound query with a tag filter that must be applied everywhere. The structural approach eliminates an entire class of data quality problems.

Shared services (CI/CD infrastructure, monitoring, development tools) get their own branch with a shared services prefix. They serve all products equally and do not appear to belong to any single product.

The Directory and Lookup Types branches are shared across all products. One customer identity (Site), one organizational hierarchy, one set of status values. Product-specific deployment tracking lives in the Product Library branch under each product's prefix.

### 3.4 Site vs Deployment Site

The most common modeling error in multi-product CMDBs is treating a deployment site as a single record. When the same customer runs multiple products, each at a different version with a different support team, a single record becomes overloaded with product-specific fields.

CMDB-Kit separates the concept into two record types:

**Site** is a shared identity record in the Directory. It represents a customer, organization, or program. It has only a name. It exists so that deployment records across all products can reference the same customer identity.

**Deployment Site** is a product-specific record in a product's Library branch. It tracks everything about deploying that specific product to that specific customer: version, classification, network domains, feature set, workflow status, support team, and dates.

One Site can have zero, one, or many Deployment Site records, one per product deployed there. Each Deployment Site references exactly one Site.

Three supporting types extend deployment tracking:

- **Site Location Assignment** links a Deployment Site to physical locations with a location type (primary, alternate) and status. This handles deployments that span multiple buildings or mobile units.
- **Site Org Relationship** links a Deployment Site to organizations with a relationship type (host, customer). The host provides the facility; the customer uses the product.
- **Site Personnel Assignment** links people to Deployment Sites with deployment roles (site lead, field engineer, system administrator, media custodian).

### 3.5 Feature Implementation and Requirements Traceability

Configuration management for product delivery requires tracing from a customer requirement through to what was actually deployed. CMDB-Kit provides this chain through four connected types:

**Requirement** (enterprise schema) captures what the customer or program needs. Requirements link to Features.

**Feature** defines a capability of the product. Features link to Product Versions via Feature Implementation.

**Feature Implementation** is an immutable audit record that links a Feature to a specific Product Version with an implementation status. Once a feature is marked as implemented in a release, that record is frozen. This creates an auditable history of what was delivered in each release.

**Product Version** represents a specific release. Product Versions link to Deployment Sites via the deployment tracking chain.

The full traceability path: Requirement to Feature to Feature Implementation to Product Version to Deployment Site. An auditor can query "for Requirement X, show me every release that implements it and every site where those releases are deployed." This satisfies EIA-649C configuration verification requirements and supports formal CM audits.

### 3.6 Definitive Media Library

The Definitive Media Library (DML) is the controlled store of authorized software and documentation artifacts. CMDB-Kit models DML operations through three types in the enterprise schema:

**Product Media** represents a single deliverable artifact: an installation ISO, a container image, a database migration script, a configuration file. Each record carries the filename, file size, checksum, and the path to the artifact on the DML file server.

**Product Suite** bundles multiple media items into a versioned distribution package. A release typically ships as a suite containing all the artifacts needed for installation or upgrade.

**Distribution Log** tracks every delivery of media to a deployment site. It records the full chain of custody: who requested the delivery, who prepared the media, how it was shipped (network transfer, encrypted USB, physical media), when it was received, who confirmed receipt, when it was installed, and when installation was verified.

For air-gapped or classified environments where software cannot be transferred over a network, the Distribution Log provides the audit trail that proves the right media was delivered to the right site by the right person. Four lookup types support this tracking: Media Type, Transfer Status, Delivery Method, and Media Urgency.


## 4. Standards Alignment

CMDB-Kit was designed to satisfy the requirements of established configuration management standards. This section maps specific schema concepts to specific standard references so that compliance officers and auditors can verify alignment.

### 4.1 ITIL 4 Service Asset and Configuration Management

ITIL 4 defines Configuration Management as a practice that ensures "accurate and reliable information about the configuration of services, and the CIs that support them, is available when and where it is needed." The practice encompasses four activities: identifying and recording CIs, controlling changes to CIs, reporting CI status, and verifying CI accuracy.

**Configuration identification.** ITIL requires that every CI be uniquely identifiable with defined attributes and relationships. CMDB-Kit's type hierarchy provides the identification framework: every CI has a type, a name, a description, and typed relationships to other CIs. The schema structure files define what types exist and how they relate. The attribute files define what data each type carries. The lookup types provide controlled vocabulary so that attribute values are consistent and queryable.

**Configuration control.** ITIL requires that changes to CIs go through an authorized process. CMDB-Kit deliberately delegates change records (Change Requests, Incidents) to the work management tool (Jira, ServiceNow ITSM) rather than modeling them as CMDB types. This is a conscious boundary decision: change records are process events (they are triggered, worked, and resolved), not persistent configuration state. The CMDB holds baselines that freeze the approved configuration at a point in time. The work management tool holds the change records that authorize transitions between baseline states.

**Configuration status accounting.** ITIL requires the ability to report on the current and historical state of CIs. CMDB-Kit's lookup types provide the status vocabulary (Product Status, Version Status, Deployment Status, Site Workflow Status). The Product Version chain (each version referencing its predecessor via previousVersion) creates a complete release history. The Baseline types freeze state at specific points, providing historical snapshots.

**Configuration verification and audit.** ITIL requires verification that the CMDB accurately reflects the real world and that audits can confirm compliance. CMDB-Kit's Assessment and Certification types record audit events and their outcomes. Feature Implementation creates immutable audit records linking requirements to releases. The validation tools (offline schema validation, post-import verification) ensure data consistency.

**Service modeling.** ITIL 4 emphasizes that CIs exist to support services. CMDB-Kit's enterprise schema includes Service, Capability, and Business Process types that connect the product delivery model to service management concepts. Product types can be linked to Services they implement. The schema supports ITIL's service value chain by modeling the technology layer (products, infrastructure) that delivers value to the business layer (services, capabilities).

### 4.2 SAE EIA-649C Configuration Management Standard

EIA-649C defines four CM functions: configuration management planning, configuration identification, configuration change management, and configuration status accounting, plus a fifth function, configuration verification and audit. CMDB-Kit maps to each.

**5.1 CM Planning and Management (EIA-649C Section 5.1).** The standard requires identifying the context and environment for CM, documenting CM planning outcomes, and establishing procedures. CMDB-Kit supports this by providing the schema structure that defines what will be tracked (the CM plan's scope), the lookup types that define controlled vocabulary (the CM plan's terminology), and the documentation types that record procedures and plans.

**5.2 Configuration Identification (EIA-649C Section 5.2).** The standard defines configuration identification as "the process of identifying the product structure and selecting configuration items." CMDB-Kit's type hierarchy directly implements product structure: Product to Product Component represents the product decomposition. The three-layer schema supports the standard's concept of selecting CIs at the appropriate level of management (base for minimal tracking, extended for operational CM, enterprise for portfolio management).

EIA-649C Section 5.2.4 defines product structure as "a hierarchy of products and their product configuration information." CMDB-Kit's Product CMDB branch implements this hierarchy, with Products composed of Components, supported by Servers and Databases, and documented by the Product Library branch.

EIA-649C Section 5.2.6 defines configuration baselines. CMDB-Kit implements the three baseline types defined in the standard:

- **Functional Baseline (FBL):** The approved functional requirements. Mapped to Baseline records with Baseline Type = FBL.
- **Allocated Baseline (ABL):** The approved allocation of requirements to components. Mapped to Baseline records with Baseline Type = ABL.
- **Product Baseline (PBL):** The approved build and test results. Mapped to Baseline records with Baseline Type = PBL.

EIA-649C Section 5.2.8 defines configuration items as "an aggregation of hardware, software, processed materials, services, or any of its discrete portions, that is designated for configuration management." CMDB-Kit's CI selection criteria (documented in the CI Selection guide) implement this definition: a CI must be individually identifiable, subject to change, and manageable.

**5.3 Configuration Change Management (EIA-649C Section 5.3).** The standard requires managing requests for changes, evaluating and dispositioning changes, and implementing approved changes. CMDB-Kit delegates change records to the work management tool (as discussed in Section 4.1) while providing the baseline and version data that change management processes reference. A change request in Jira or ServiceNow references affected CIs in the CMDB. When the change is approved and implemented, the CMDB records the new version, updates deployment sites, and establishes a new baseline.

**5.4 Configuration Status Accounting (EIA-649C Section 5.4).** The standard requires capturing and reporting "the current status of configuration items and their associated product configuration information." CMDB-Kit's entire schema is a configuration status accounting system. Every CI type carries status attributes (via lookup type references). The Product Version chain records release history. Deployment Sites record current deployment state. Distribution Logs record delivery history. The validation and export tools enable status reporting.

**5.5 Configuration Verification and Audit (EIA-649C Section 5.5).** The standard requires verifying that "the product's configuration is consistent with its product configuration information" and conducting configuration audits. CMDB-Kit supports this through Assessment records (security assessments, compliance checks), Certification records (formal certifications with dates and expiration), Feature Implementation records (traceability from requirements to delivered capabilities), and the offline validation tools that check schema and data consistency.

### 4.3 MIL-HDBK-61B Configuration Management Guidance

MIL-HDBK-61B provides DoD guidance for applying CM on acquisition contracts. While it is guidance rather than a requirement, it defines patterns that CMDB-Kit implements.

**Baseline management.** MIL-HDBK-61B describes the three baseline types (Functional, Allocated, Product) and their lifecycle. CMDB-Kit's Baseline type with its Baseline Type lookup (FBL, ABL, PBL) implements this directly.

**Product structure.** MIL-HDBK-61B describes hierarchical product decomposition (system to subsystem to component to CI). CMDB-Kit's Product to Product Component hierarchy, extended by the enterprise schema's Component Instance and Feature Implementation types, maps to this decomposition.

**Interface management.** MIL-HDBK-61B addresses interfaces between CIs. CMDB-Kit's reference attributes between types (Product Component references Product, Deployment Site references Site and Location) model these interfaces.

**Media control.** MIL-HDBK-61B addresses control of software media including storage, distribution, and integrity verification. CMDB-Kit's Product Media, Product Suite, and Distribution Log types implement media control with checksum verification, chain-of-custody tracking, and delivery method classification.

**Status accounting.** MIL-HDBK-61B requires status accounting records that capture "the current approved configuration documentation, the status of proposed changes, and the implementation status of approved changes." CMDB-Kit's lookup-based status attributes, version chains, and deployment tracking provide this reporting capability.

### 4.4 ISO/IEC 20000 IT Service Management

ISO/IEC 20000-1 specifies requirements for an IT service management system. Configuration management is addressed in Section 8.5 (Service asset and configuration management).

ISO 20000 requires that CIs are identified and recorded, that CI information is controlled, that the CMDB is maintained to reflect the current state of services, and that configuration information is available to support other service management processes.

CMDB-Kit satisfies these requirements through its structured type hierarchy (identification and recording), its baseline model (controlled state), its import/export/sync tools (maintaining current state), and its platform adapters that integrate with JSM and ServiceNow where other service management processes run.

ISO 20000 also requires that configuration management considers "the interfaces and dependencies between services and service components." CMDB-Kit's reference attributes between CI types model these interfaces. The enterprise schema's Service type connects the product delivery model to the service management model.

### 4.5 Comparison with ServiceNow CSDM

ServiceNow's Common Service Data Model (CSDM) is the most widely adopted CMDB framework. Understanding where CMDB-Kit overlaps and diverges helps organizations that use ServiceNow evaluate whether and how to adopt CMDB-Kit's patterns.

**Where CMDB-Kit and CSDM overlap:**

Both provide a structured type hierarchy for CIs. Both separate infrastructure (servers, databases, networks) from applications. Both support service modeling (CSDM natively, CMDB-Kit via enterprise schema). Both use reference relationships between CI types.

**Where CMDB-Kit extends beyond CSDM:**

| Concept | CMDB-Kit | CSDM |
|---------|----------|------|
| Product as root concept | Product is the organizing type; infrastructure exists to support it | Application is a CI class under cmdb_ci; no product concept |
| Multi-product isolation | Product-prefixed types with shared directory | No equivalent; all CIs share the same class hierarchy |
| Deployment site tracking | Dedicated Deployment Site type with per-product state, personnel, and feature sets | Locations exist but not product-specific deployment tracking |
| Baselines (FBL/ABL/PBL) | Dedicated Baseline type with three standard baseline types | No baseline concept |
| Feature Implementation | Immutable audit record linking features to versions | No equivalent |
| Definitive Media Library | Product Media, Product Suite, Distribution Log with checksums and chain of custody | No DML modeling |
| Requirements traceability | Requirement to Feature to Implementation to Version to Deployment | No requirements tracking |
| Controlled media distribution | Distribution Log with delivery method, custody tracking, and verification | No equivalent |

**Where CSDM extends beyond CMDB-Kit:**

| Concept | CSDM | CMDB-Kit |
|---------|------|----------|
| Discovery integration | Native Discovery and Service Mapping | No discovery integration; data is manually imported |
| Infrastructure depth | Hundreds of CI classes for network devices, storage, cloud resources | Minimal infrastructure types; extend as needed |
| Financial tracking | Mature cost and contract models | Skeletal financial types (Contract, Cost Category) |
| ITSM integration | Native incident, change, problem workflows consuming CI data | Delegates process records to work management tools |
| Data quality | CMDB Health dashboards, Data Certification, IRE | Offline validation tools; no runtime quality monitoring |

**When to use CMDB-Kit with ServiceNow:** When the organization builds software products and needs product-delivery tracking that CSDM does not provide. CMDB-Kit's ServiceNow adapter creates custom tables for product-delivery types alongside ServiceNow's native CSDM classes. The two models coexist: CSDM handles service desk operations, CMDB-Kit handles product delivery.

**When to use CSDM alone:** When the organization is purely an IT operations shop that consumes services and manages infrastructure. CSDM is designed for this and does it well. Adding CMDB-Kit's product-delivery types would be unnecessary complexity.


## 5. Platform Implementation

### 5.1 Platform-Agnostic Design

CMDB-Kit separates the logical schema from the platform implementation. The schema is defined in JSON files (schema-structure.json for type hierarchy, schema-attributes.json for attribute definitions) that are platform-independent. Adapters translate the schema into platform-specific formats.

This separation means the same schema works on JSM Assets, ServiceNow, or any other CMDB platform. An organization can evaluate the schema offline, decide whether it fits their needs, and then import it into their chosen platform. Migrating to a different platform later does not require redesigning the schema.

### 5.2 JSM Assets Implementation

JSM Assets (formerly Insight) has no built-in CI class hierarchy. Every schema starts from a blank canvas. CMDB-Kit provides the full structure: object types, attributes, reference relationships, and lookup values. The JSM adapter creates all types and attributes via the Assets REST API.

JSM Assets' object type model maps directly to CMDB-Kit's schema: one JSM object type per CMDB-Kit type, one JSM attribute per CMDB-Kit attribute, reference attributes for inter-type relationships, and AQL queries for reporting.

### 5.3 ServiceNow Implementation

ServiceNow has a large built-in CI class hierarchy under cmdb_ci. CMDB-Kit maps to it in three tiers: OOTB tables for infrastructure types that ServiceNow already models (cmdb_ci_server for Server, cmdb_ci_ip_network for Network Segment), custom CI classes with independent identification rules for product-delivery types (u_cmdbk_product for Product, u_cmdbk_database for Database, u_cmdbk_product_component for Product Component, u_cmdbk_feature for Feature), and custom standalone tables for types that do not need CI class behavior (Person, Product Version, Document, Deployment, lookup types). Person uses a custom standalone table (u_cmdbk_person) because Person records represent external contacts, site POCs, and deployment stakeholders, not platform users. They should never be mapped to sys_user or any platform's user directory. Product-delivery types are custom CI classes because ServiceNow's OOTB Application and Database classes require hosting relationships that conflict with CMDB-Kit's product-centric model.

The ServiceNow adapter has been tested end-to-end against the Zurich release. All OOTB tables, custom table creation, CI class extensions, and relationship handling are verified.

### 5.4 Extensibility

CMDB-Kit is designed to be extended. Adding a new CI type requires four steps: add the type to schema-structure.json, add its attributes to schema-attributes.json, add it to the LOAD_PRIORITY list, and create a data file. The validation tools verify that the extended schema is internally consistent. The Writing Custom Adapters guide documents how to build adapters for platforms CMDB-Kit does not yet support.


## 6. Data Quality and Governance

### 6.1 Lookup Types as First-Class Objects

Every status, category, and classification in CMDB-Kit is a separate object type with a Name and description. This is more work to set up than a simple picklist, but it provides three data quality advantages:

Every value is documented. The description field explains what "Active" means in the context of this schema, what "Deprecated" implies for downstream processes, and what "Retired" means for audit purposes. A picklist value has no room for this context.

Every value is queryable. You can query "show me everything with Status = Deprecated" across all CI types because the lookup is a shared reference, not a per-type picklist.

Adding a value is a data change, not a schema change. Creating a new status value means adding a record to the lookup type. It does not require modifying the schema, restarting the platform, or running a migration.

### 6.2 Validation Pipeline

CMDB-Kit provides a multi-stage validation pipeline that catches errors before they reach the live CMDB:

**Offline validation** checks schema structure (valid JSON, type names resolve, reference types exist, no circular dependencies) and data files (all referenced types exist, all referenced lookup values exist, load priority order is valid). This runs without any connection to a CMDB platform.

**Import validation** runs during data import. The adapter checks that target tables exist, that referenced records can be resolved by name, and that data types match (references resolve to sys_ids, dates parse correctly).

**Post-import verification** compares local data files field-by-field against live CMDB data. It reports missing records, extra records, and field-level mismatches.

**Schema check** compares local schema definitions against live platform tables and columns. It verifies that every type exists, every custom column exists, and column types match expectations.

### 6.3 Taxonomy Governance

The schema's design supports governance without enforcing a specific governance model. The three-layer structure provides natural decision points: an organization adopts a layer based on its maturity, and the criteria for advancing to the next layer are defined by the schema's own design questions.

Adding a new type requires justification: which branch does it belong to? What CM function does it support? If a type does not serve at least one CM function (identification, control, status accounting, audit), it does not belong in the schema. This principle, derived from EIA-649C, acts as a natural governance filter.

The Taxonomy Playbook and Case Study documents provide complete guidance for organizations establishing their own governance process around the schema.


## 7. Case Study

CMDB-Kit's schema evolved through seven iterations on a production CMDB managing multiple product lines across deployment sites. Each iteration was forced by a problem the previous design could not solve.

The first design was a flat schema with tags to differentiate products. It failed within a month because products had fundamentally different component taxonomies. Product-prefixed types replaced tags.

The Site vs Deployment Site split was added when a single deployment record could not represent multiple products at the same customer site with different versions, teams, and schedules. Feature Implementation was added when auditors required traceable proof that every requirement allocated to a release was implemented and tested. Baselines were added when the question "what was the approved configuration six months ago?" could not be answered without archaeology. The Definitive Media Library types were added when controlled software artifacts needed chain-of-custody tracking for classified distribution.

Each design decision traced to a specific operational failure. The schema was not designed from theory and applied to practice. It was designed from practice and validated against theory. The standards alignment documented in Section 4 came after the production schema was stable, confirming that decisions driven by operational need aligned with decisions prescribed by formal standards.

The full case study, including detailed descriptions of each iteration and lessons learned, is available in the project documentation.


## 8. Conclusion

CMDB-Kit provides the first open-source CMDB schema designed for product delivery. It fills a gap that process-centric, infrastructure-centric, and asset-centric approaches leave open: tracking what you build, what you release, where you deploy it, and how to prove it to an auditor.

The schema aligns to ITIL 4 SACM, SAE EIA-649C, MIL-HDBK-61B, and ISO/IEC 20000 while remaining platform-agnostic. It runs on JSM Assets and ServiceNow today, with documented patterns for extending to other platforms.

For organizations that build and deliver software products, CMDB-Kit provides a production-ready starting point that eliminates the months of schema design work that every product-delivery CMDB implementation currently requires.

CMDB-Kit is free and open source under the MIT license. The schema, adapters, documentation, and example data are available at github.com/ovoco-co/cmdb-kit.


## Appendix A: Type List by Schema Layer

### Base (20 types)

Product, Server, Database, Product Component, Product Version, Document, Deployment, Organization, Team, Person, Product Status, Version Status, Deployment Status, Environment Type, Document Type, Document State, Component Type, Priority, Organization Type, Deployment Role

### Extended (adds 30 types)

Hardware Model, Network Segment, Virtual Machine, License, Assessment, Feature, Baseline, Documentation Suite, Product Media, Product Suite, Certification, Deployment Site, Distribution Log, SLA, Location, Facility, Vendor, Certification Type, Certification Status, Assessment Type, Assessment Status, Network Type, Baseline Type, Baseline Status, License Type, License Status, Site Status, Vendor Status, SLA Status

### Enterprise (adds 48+ types)

Product-prefixed types per product line, Shared Services types, Enterprise Architecture (Service, Capability, Business Process, Information Object), Configuration Library (Library Item), Financial (Contract, Cost Category), Requirement, Feature Implementation, Component Instance, Site Location Assignment, Site Org Relationship, Site Personnel Assignment, and additional lookup types.


## Appendix B: Standards Crosswalk Matrix

| CMDB-Kit Concept | ITIL 4 SACM | EIA-649C | MIL-HDBK-61B | ISO 20000 |
|------------------|-------------|----------|--------------|-----------|
| Product | Service Component | Product | Product | Service Component |
| Product Component | CI | Configuration Item | CI | CI |
| Product Version | Release Record | Product Configuration | Configuration | Release |
| Baseline (FBL/ABL/PBL) | Configuration Baseline | Section 5.2.6 | Section 5.3 | Configuration Baseline |
| Feature Implementation | N/A | Section 5.5 (Verification) | Section 7.3 (Audit) | N/A |
| Deployment Site | N/A | N/A | N/A | N/A |
| Distribution Log | N/A | Section 5.4 (Status Accounting) | Section 6.3 (Media Control) | N/A |
| Product Media | Definitive Media Library | Product Configuration Information | Media | N/A |
| Assessment | Configuration Audit | Section 5.5.4 | Section 7 | Audit |
| Certification | N/A | Section 5.5 | Section 7 | N/A |
| Lookup Types | Controlled Vocabulary | Section 5.2.3 (Terminology) | Section 4 | N/A |
| Change delegation | Change Enablement | Section 5.3 | Section 6 | Change Management |
| Site vs Deployment Site | N/A | N/A | N/A | N/A |
| Multi-product prefixing | N/A | N/A | N/A | N/A |

Note: "N/A" in the standards columns indicates concepts unique to CMDB-Kit's product-delivery model that have no direct equivalent in the standard. These are the schema's differentiators.


## Appendix C: CSDM Comparison Table

See Section 4.5 for the full comparison.

**CMDB-Kit provides 8 capability categories that CSDM does not model:**
Product as root concept, multi-product isolation (prefixed types), deployment site tracking (per-product state and personnel), baselines (FBL/ABL/PBL), feature implementation (immutable audit records), Definitive Media Library (media, suites, distribution logs), requirements traceability (requirement to feature to version to site), and controlled media distribution (chain of custody for air-gapped delivery).

**CSDM provides 5 capability categories that CMDB-Kit does not deeply model:**
Discovery integration (native Discovery and Service Mapping), infrastructure depth (hundreds of CI classes for network devices, storage, cloud), financial tracking (mature cost and contract models), native ITSM integration (incident, change, problem workflows consuming CI data), and runtime data quality monitoring (CMDB Health dashboards, Data Certification, IRE).

**Key architectural difference:** CMDB-Kit uses custom CI classes with independent identification rules for product-delivery types (Product, Database, Virtual Machine, Product Component, Feature, Assessment) rather than ServiceNow's OOTB classes, which require hosting/containment dependencies designed for discovery-driven infrastructure. This allows CMDB-Kit and CSDM to coexist on the same ServiceNow instance without conflicting.


## Appendix D: Glossary

| Term | Definition |
|------|------------|
| ABL | Allocated Baseline. The approved allocation of requirements to product components. |
| CI | Configuration Item. Any component designated for configuration management. |
| CM | Configuration Management. The discipline of managing product configuration throughout its lifecycle. |
| CMDB | Configuration Management Database. A structured repository of CIs and their relationships. |
| CSDM | Common Service Data Model. ServiceNow's framework for organizing CMDB data around services. |
| DML | Definitive Media Library. The controlled store of authorized software and documentation artifacts. |
| FBL | Functional Baseline. The approved functional requirements for a product. |
| IRE | Identification and Reconciliation Engine. ServiceNow's mechanism for deduplicating CI records. |
| ITIL | Information Technology Infrastructure Library. A framework for IT service management. |
| PBL | Product Baseline. The approved build that was released for deployment. |
| SACM | Service Asset and Configuration Management. The ITIL practice covering CI management. |
