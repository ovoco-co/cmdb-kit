# Product-Delivery Configuration Management: An Open-Source CMDB Schema with Standards-Aligned Domain Extensions

CMDB-Kit Technical Whitepaper, March 2026


# Executive Summary

Existing CMDB schemas fall into three categories: process-centric schemas built around ITIL workflows and service desk operations, infrastructure-centric schemas built around what discovery tools find on the network, and asset-centric schemas built around procurement lifecycle and financial tracking. Each serves its domain well, but none addresses the needs of organizations that build and deliver software products to customer sites.

Product delivery teams need to track what version is deployed where, what components make up each release, what infrastructure supports each deployment, what the approved baseline looks like versus what is actually running, and who is responsible at each customer site. These questions span configuration identification, change control, status accounting, and audit, the four functions defined by SAE EIA-649C, but no existing schema structures its types and relationships around answering them.

CMDB-Kit is an open-source, platform-agnostic CMDB schema designed specifically for product delivery. Core tracks what you ship and where it goes. Domains add specialized concerns, each aligned to a Unified Architecture Framework (UAF) viewpoint and each replacing a paid platform plugin or filling a capability gap that no commercial tool addresses. This whitepaper details the technical architecture, maps every schema concept to the relevant industry standards (ITIL 4, SAE EIA-649C, MIL-HDBK-61B, ISO/IEC 20000), and explains the design decisions through the lens of production use.

CMDB-Kit does not replace process-centric or infrastructure-centric approaches. It fills a gap that those approaches leave open. Organizations with established ITIL service desks or ServiceNow CSDM deployments can use CMDB-Kit's product delivery patterns selectively, layering them on top of their existing CMDB without restructuring it.


# The Product-Delivery Problem

## What Product Delivery Teams Need

A software product organization builds products composed of components, releases versioned configurations of those products, deploys releases to customer sites, and maintains those deployments over time. The configuration management challenge is tracking the full chain: from requirements through features, through components and builds, through baselines and approvals, through media distribution and installation, to the deployed state at each customer site.

This chain creates tracking requirements that no process-centric, infrastructure-centric, or asset-centric schema addresses:

## Products with divergent component types

Different products have fundamentally different component taxonomies. A cross-domain security gateway has firmware, content filters, and guard modules. A video conferencing platform has codecs, session controllers, and media gateways. A monitoring platform has agents, dashboards, and data collectors. A single Component Type lookup cannot accommodate all three without becoming meaningless noise.

## Multi-product deployment sites

A customer site may run multiple products simultaneously, each at a different version, supported by a different team, on a different upgrade schedule. A single deployment record per site cannot represent this complexity without becoming overloaded with product-specific fields that are irrelevant to the other products at the same site.

## Custom feature sets per deployment

Not every site gets the same configuration. Contract scope, security classification, network restrictions, and operational requirements all influence which features are active at a given deployment. The CMDB must track which features are deployed where, not just which version.

## Requirements-to-deployment traceability

Auditors and program managers need to trace from a customer requirement through to the specific release that implements it and the specific sites where that release is deployed. This chain, requirement to feature to version to deployment site, must be queryable as a single path through the CMDB.

## Controlled media distribution

For classified or air-gapped environments, software delivery involves physical media (encrypted drives, optical discs) with chain-of-custody tracking. The CMDB must record what media was prepared, how it was delivered, who received it, and whether installation was verified. This is not an edge case; it is the primary delivery mechanism for many defense and intelligence programs.

## Baselines that freeze configuration state

The current state of a deployment changes continuously. The approved state at the time of a review or audit must be preserved as a baseline. Without baselines, answering "what was the approved configuration six months ago?" requires archaeology through email and version control history instead of a single query.

## Why Existing Schemas Don't Work

## Process-centric schemas

Process-centric schemas (ITIL SACM, ServiceNow CSDM) organize around service desk workflows: incidents route to assignment groups, changes go through approval chains, SLAs attach to services. The CI model exists to support these workflows. Types like Server, Application, and Database exist because incidents happen to them and changes affect them. There is no concept of a product that composes multiple applications, a version that bundles components into a release, a baseline that freezes the approved configuration, or a deployment site that tracks per-customer state.

## Infrastructure-centric schemas

Infrastructure-centric schemas (discovery tool defaults, ServiceNow OOTB CI classes) organize around what network scanners find: servers, virtual machines, network devices, storage arrays. The type hierarchy reflects hardware taxonomy, not product architecture. An application is something that runs on a server, not something that gets built, baselined, released, and deployed to customer sites. There are no types for features, components as design abstractions, or controlled media distribution.

## Asset-centric schemas

Asset-centric schemas (IT asset management tools) organize around procurement and financial lifecycle: purchase orders, contracts, warranty dates, depreciation schedules. A server is something that was purchased and will eventually be disposed of. The lifecycle is buy, deploy, maintain, retire. There is no concept of a product version, a deployment site, or a feature set.

## The Tags-on-a-Flat-Schema Trap

The natural first attempt is to use an existing schema and add tags or custom fields to handle product-delivery concepts. Tag each CI with a product name. Add a "deployed version" field to servers. Create a custom "site" field on every record.

This approach fails as soon as the second product arrives. The tag filter must be added to every query, every dashboard, and every automation rule. Miss it once and you get cross-product noise. Custom fields proliferate because each product needs different metadata. Reporting becomes a matrix of tag combinations that no standard tool handles well. Data quality degrades because there is no structural enforcement of the product boundary.

CMDB-Kit's multi-product prefixing pattern (product-specific type hierarchies sharing a common directory and lookup vocabulary) was born from this exact failure. The flat schema with tags was the first design. It was replaced after a month of production use.


# Schema Architecture

## Four-Branch Taxonomy

CMDB-Kit organizes all configuration items into four branches. Each branch serves a distinct purpose in the configuration management lifecycle.

### Product CMDB

Contains the things you build and operate. Products (applications), servers, databases, hardware models, network segments, virtual machines, and product components. In portfolio mode, each product gets its own prefixed set of these types, so a query for "CR Server" returns only servers belonging to that product. This branch answers "what exists and how is it structured?"

### Product Library

Contains the things you release and deploy. Product versions, baselines, documents, deployment sites, and deployments. This branch answers "what was released, what was approved, and where did it go?"

### Directory

Contains the people and organizations that do the work. Organizations, teams, people, locations, facilities, and vendors, shared across all products. A single customer identity (Site) connects to product-specific deployment records across the portfolio. This branch answers "who is responsible and where are they?"

### Lookup Types

Contains the controlled vocabulary that constrains attribute values. Every status, category, classification, and enumeration is a separate object type with a name and description. This branch answers "what are the allowed values and what do they mean?"

The four-branch structure maps to ITIL SACM's functional areas: identification (Product CMDB), control (Product Library baselines and change delegation), status accounting (Lookup Types and lifecycle attributes), and audit (Feature Implementation records and certifications via the compliance domain).

## Core and Domains

The schema is organized as a self-contained Core with opt-in domain extensions. Each piece has a clear purpose and a clear buyer, rather than tiers organized by arbitrary complexity.

### Core

Core tracks what you ship and where it goes. It is the complete product-delivery CMDB: products, components, features, versions, baselines, deployments, deployment sites, infrastructure (servers, databases, virtual machines, hardware models, network segments), documents, and the full directory of people, teams, organizations, locations, facilities, and vendors. Core includes the controlled vocabulary (lookup types) that constrains every attribute value. A small team can populate Core in a day. It covers the minimum viable set for tracking a product through its entire delivery lifecycle, from build through baseline through deployment.

### Domains

Domains add specialized concerns that not every organization needs. Each domain is a self-contained package with its own schema structure, attributes, and data files. Each domain maps to a viewpoint in the Unified Architecture Framework (UAF), which means the boundaries are not arbitrary. They follow the same organizational lines that enterprises already use to structure their architecture and operations. Each domain replaces a paid platform plugin or fills a capability gap that no commercial CMDB tool addresses at any price.

The available domains:

### Compliance

Tracks security assessments and compliance certifications. Maps to the UAF security domain. Replaces ServiceNow GRC and Vulnerability Response, JSM marketplace compliance apps.

### Licensing

Tracks software license allocations and expirations. Maps to the UAF acquisition domain. Replaces ServiceNow SAM Pro, JSM marketplace license trackers.

### Distribution

Manages controlled media packages and tracks chain-of-custody delivery to customer sites. Maps to the UAF operational viewpoint. No commercial CMDB platform offers this capability.

### SLA

Defines and tracks service level agreements. Maps to the UAF services viewpoint. Complements built-in SLA modules on both platforms.

### EA

Enterprise Architecture maps services, capabilities, and business processes to the product portfolio. Maps to the UAF capability and services viewpoints. Replaces ServiceNow CSDM implementation services and ITOM Service Mapping.

### Financial

Tracks contracts, vendors, and cost attribution. Maps to the UAF acquisition domain. Replaces ServiceNow ITFM.

### Requirements

Traces requirements through baselines to deployed configurations. Maps to the UAF information domain. No commercial CMDB plugin offers requirements traceability.

### SCCM

Models SCCM infrastructure and tracks security findings. Maps to the UAF security domain. Replaces ServiceNow ITOM Discovery SCCM integration and JSM Data Manager SCCM adapter.

### Portfolio mode

Portfolio mode is a structural pattern, not a domain. It reorganizes Core plus whatever domains are loaded into product-prefixed types with shared directory and lookups. It handles multi-product organizations that need query isolation between product lines. Portfolio mode adds product-prefixed CI types for each product line, a shared services branch for cross-product infrastructure, Component Instance and Feature Implementation types for build-level traceability, and site assignment types (location, organization, personnel) for deployment RACI.

Each domain depends only on Core, with one exception: SCCM depends on both Core and the compliance domain. Everything else can be loaded independently. An organization starts with Core, evaluates which specialized concerns apply to their program, and loads only those domains. The upgrade path is additive: loading a new domain never requires modifying Core data.

## Multi-Product Isolation

When an organization manages multiple products that share infrastructure, a single-product schema breaks down. A server might host components from two products. A support team might handle three products at the same customer site. A location might have deployments of every product in the portfolio.

CMDB-Kit's portfolio mode addresses this with product-prefixed types. Each product gets its own branch in the type hierarchy:

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

## Site vs Deployment Site

The most common modeling error in multi-product CMDBs is treating a deployment site as a single record. When the same customer runs multiple products, each at a different version with a different support team, a single record becomes overloaded with product-specific fields.

CMDB-Kit separates the concept into two record types:

### Site

Site is a shared identity record in the Directory. It represents a customer, organization, or program. It has only a name. It exists so that deployment records across all products can reference the same customer identity.

### Deployment Site

Deployment Site is a product-specific record in a product's Library branch. It tracks everything about deploying that specific product to that specific customer: version, classification, network domains, feature set, workflow status, support team, and dates.

One Site can have zero, one, or many Deployment Site records, one per product deployed there. Each Deployment Site references exactly one Site.

Three supporting types extend deployment tracking in portfolio mode:

- Site Location Assignment links a Deployment Site to physical locations with a location type (primary, alternate) and status. This handles deployments that span multiple buildings or mobile units.
- Site Org Relationship links a Deployment Site to organizations with a relationship type (host, customer). The host provides the facility; the customer uses the product.
- Site Personnel Assignment links people to Deployment Sites with deployment roles (site lead, field engineer, system administrator, media custodian).

## Feature Implementation and Requirements Traceability

Configuration management for product delivery requires tracing from a customer requirement through to what was actually deployed. CMDB-Kit provides this chain through connected types across Core and its domains:

### Requirement

Requirement (requirements domain) captures what the customer or program needs. Requirements link to Features.

### Feature

Feature (Core) defines a capability of the product. Features link to Product Versions via Feature Implementation.

### Feature Implementation

Feature Implementation (portfolio mode) is an immutable audit record that links a Feature to a specific Product Version with an implementation status. Once a feature is marked as implemented in a release, that record is frozen. This creates an auditable history of what was delivered in each release.

### Product Version

Product Version (Core) represents a specific release. Product Versions link to Deployment Sites via the deployment tracking chain.

The full traceability path: Requirement to Feature to Feature Implementation to Product Version to Deployment Site. An auditor can query "for Requirement X, show me every release that implements it and every site where those releases are deployed." This satisfies EIA-649C configuration verification requirements and supports formal CM audits.

## Definitive Media Library

The Definitive Media Library (DML) is the controlled store of authorized software and documentation artifacts. CMDB-Kit models DML operations through types in the distribution domain:

### Product Media

Product Media represents a single deliverable artifact: an installation ISO, a container image, a database migration script, a configuration file. Each record carries the filename, file size, checksum, and the path to the artifact on the DML file server.

### Product Suite

Product Suite bundles multiple media items into a versioned distribution package. A release typically ships as a suite containing all the artifacts needed for installation or upgrade.

### Distribution Log

Distribution Log tracks every delivery of media to a deployment site. It records the full chain of custody: who requested the delivery, who prepared the media, how it was shipped (network transfer, encrypted USB, physical media), when it was received, who confirmed receipt, when it was installed, and when installation was verified.

For air-gapped or classified environments where software cannot be transferred over a network, the Distribution Log provides the audit trail that proves the right media was delivered to the right site by the right person. Supporting lookup types in the distribution domain track Media Type, Transfer Status, Delivery Method, and Media Urgency.

The distribution domain is loaded separately from Core because not every organization ships controlled media. Teams deploying via CI/CD pipelines to cloud environments do not need DML tracking. Teams delivering to classified government sites need it as their primary delivery mechanism. The domain structure lets each organization load only what applies.


# Standards Alignment

CMDB-Kit was designed to satisfy the requirements of established configuration management standards. This section maps specific schema concepts to specific standard references so that compliance officers and auditors can verify alignment.

## ITIL 4 Service Asset and Configuration Management

ITIL 4 defines Configuration Management as a practice that ensures "accurate and reliable information about the configuration of services, and the CIs that support them, is available when and where it is needed." The practice encompasses four activities: identifying and recording CIs, controlling changes to CIs, reporting CI status, and verifying CI accuracy.

### Configuration identification

ITIL requires that every CI be uniquely identifiable with defined attributes and relationships. CMDB-Kit's type hierarchy provides the identification framework: every CI has a type, a name, a description, and typed relationships to other CIs. The schema structure files define what types exist and how they relate. The attribute files define what data each type carries. The lookup types provide controlled vocabulary so that attribute values are consistent and queryable.

### Configuration control

ITIL requires that changes to CIs go through an authorized process. CMDB-Kit deliberately delegates change records (Change Requests, Incidents) to the work management tool (Jira, ServiceNow ITSM) rather than modeling them as CMDB types. This is a conscious boundary decision: change records are process events (they are triggered, worked, and resolved), not persistent configuration state. The CMDB holds baselines that freeze the approved configuration at a point in time. The work management tool holds the change records that authorize transitions between baseline states.

### Configuration status accounting

ITIL requires the ability to report on the current and historical state of CIs. CMDB-Kit's lookup types provide the status vocabulary (Product Status, Version Status, Deployment Status, Site Workflow Status). The Product Version chain (each version referencing its predecessor via previousVersion) creates a complete release history. The Baseline types freeze state at specific points, providing historical snapshots.

### Configuration verification and audit

ITIL requires verification that the CMDB accurately reflects the real world and that audits can confirm compliance. The compliance domain's Assessment and Certification types record audit events and their outcomes. Feature Implementation creates immutable audit records linking requirements to releases. The validation tools (offline schema validation, post-import verification) ensure data consistency.

### Service modeling

ITIL 4 emphasizes that CIs exist to support services. The EA domain includes Service, Capability, and Business Process types that connect the product delivery model to service management concepts. Product types can be linked to Services they implement. The schema supports ITIL's service value chain by modeling the technology layer (products, infrastructure) that delivers value to the business layer (services, capabilities).

## SAE EIA-649C Configuration Management Standard

EIA-649C defines four CM functions: configuration management planning, configuration identification, configuration change management, and configuration status accounting, plus a fifth function, configuration verification and audit. CMDB-Kit maps to each.

### CM Planning and Management (EIA-649C Section 5.1)

The standard requires identifying the context and environment for CM, documenting CM planning outcomes, and establishing procedures. CMDB-Kit supports this by providing the schema structure that defines what will be tracked (the CM plan's scope), the lookup types that define controlled vocabulary (the CM plan's terminology), and the documentation types that record procedures and plans.

### Configuration Identification (EIA-649C Section 5.2)

The standard defines configuration identification as "the process of identifying the product structure and selecting configuration items." CMDB-Kit's type hierarchy directly implements product structure: Product to Product Component represents the product decomposition. The Core-plus-domains architecture supports the standard's concept of selecting CIs at the appropriate level of management: Core for product delivery tracking, domains for specialized concerns like compliance and distribution, portfolio mode for multi-product management.

EIA-649C Section 5.2.4 defines product structure as "a hierarchy of products and their product configuration information." CMDB-Kit's Product CMDB branch implements this hierarchy, with Products composed of Components, supported by Servers and Databases, and documented by the Product Library branch.

EIA-649C Section 5.2.6 defines configuration baselines. CMDB-Kit implements the three baseline types defined in the standard:

- Functional Baseline (FBL): The approved functional requirements. Mapped to Baseline records with Baseline Type = FBL.
- Allocated Baseline (ABL): The approved allocation of requirements to components. Mapped to Baseline records with Baseline Type = ABL.
- Product Baseline (PBL): The approved build and test results. Mapped to Baseline records with Baseline Type = PBL.

EIA-649C Section 5.2.8 defines configuration items as "an aggregation of hardware, software, processed materials, services, or any of its discrete portions, that is designated for configuration management." CMDB-Kit's CI selection criteria (documented in the CI Selection guide) implement this definition: a CI must be individually identifiable, subject to change, and manageable.

### Configuration Change Management (EIA-649C Section 5.3)

The standard requires managing requests for changes, evaluating and dispositioning changes, and implementing approved changes. CMDB-Kit delegates change records to the work management tool (as discussed in Section 4.1) while providing the baseline and version data that change management processes reference. A change request in Jira or ServiceNow references affected CIs in the CMDB. When the change is approved and implemented, the CMDB records the new version, updates deployment sites, and establishes a new baseline.

### Configuration Status Accounting (EIA-649C Section 5.4)

The standard requires capturing and reporting "the current status of configuration items and their associated product configuration information." CMDB-Kit's entire schema is a configuration status accounting system. Every CI type carries status attributes (via lookup type references). The Product Version chain records release history. Deployment Sites record current deployment state. Distribution Logs in the distribution domain record delivery history. The validation and export tools enable status reporting.

### Configuration Verification and Audit (EIA-649C Section 5.5)

The standard requires verifying that "the product's configuration is consistent with its product configuration information" and conducting configuration audits. CMDB-Kit supports this through Assessment records in the compliance domain (security assessments, compliance checks), Certification records in the compliance domain (formal certifications with dates and expiration), Feature Implementation records in portfolio mode (traceability from requirements to delivered capabilities), and the offline validation tools that check schema and data consistency.

## MIL-HDBK-61B Configuration Management Guidance

MIL-HDBK-61B provides DoD guidance for applying CM on acquisition contracts. While it is guidance rather than a requirement, it defines patterns that CMDB-Kit implements.

### Baseline management

MIL-HDBK-61B describes the three baseline types (Functional, Allocated, Product) and their lifecycle. CMDB-Kit's Baseline type with its Baseline Type lookup (FBL, ABL, PBL) implements this directly.

### Product structure

MIL-HDBK-61B describes hierarchical product decomposition (system to subsystem to component to CI). CMDB-Kit's Product to Product Component hierarchy, extended by portfolio mode's Component Instance and Feature Implementation types, maps to this decomposition.

### Interface management

MIL-HDBK-61B addresses interfaces between CIs. CMDB-Kit's reference attributes between types (Product Component references Product, Deployment Site references Site and Location) model these interfaces.

### Media control

MIL-HDBK-61B addresses control of software media including storage, distribution, and integrity verification. The distribution domain's Product Media, Product Suite, and Distribution Log types implement media control with checksum verification, chain-of-custody tracking, and delivery method classification.

### Status accounting

MIL-HDBK-61B requires status accounting records that capture "the current approved configuration documentation, the status of proposed changes, and the implementation status of approved changes." CMDB-Kit's lookup-based status attributes, version chains, and deployment tracking provide this reporting capability.

## ISO/IEC 20000 IT Service Management

ISO/IEC 20000-1 specifies requirements for an IT service management system. Configuration management is addressed in Section 8.5 (Service asset and configuration management).

ISO 20000 requires that CIs are identified and recorded, that CI information is controlled, that the CMDB is maintained to reflect the current state of services, and that configuration information is available to support other service management processes.

CMDB-Kit satisfies these requirements through its structured type hierarchy (identification and recording), its baseline model (controlled state), its import/export/sync tools (maintaining current state), and its platform adapters that integrate with JSM and ServiceNow where other service management processes run.

ISO 20000 also requires that configuration management considers "the interfaces and dependencies between services and service components." CMDB-Kit's reference attributes between CI types model these interfaces. The EA domain's Service type connects the product delivery model to the service management model.

## Comparison with ServiceNow CSDM

ServiceNow's Common Service Data Model (CSDM) is the most widely adopted CMDB framework. Understanding where CMDB-Kit overlaps and diverges helps organizations that use ServiceNow evaluate whether and how to adopt CMDB-Kit's patterns.

### Where CMDB-Kit and CSDM overlap

Both provide a structured type hierarchy for CIs. Both separate infrastructure (servers, databases, networks) from applications. Both support service modeling (CSDM natively, CMDB-Kit via the EA domain). Both use reference relationships between CI types.

### Where CMDB-Kit extends beyond CSDM

| Concept | CMDB-Kit | CSDM |
|---------|----------|------|
| Product as root concept | Product is the organizing type; infrastructure exists to support it | Application is a CI class under cmdb_ci; no product concept |
| Multi-product isolation | Product-prefixed types in portfolio mode with shared directory | No equivalent; all CIs share the same class hierarchy |
| Deployment site tracking | Dedicated Deployment Site type with per-product state, personnel, and feature sets | Locations exist but not product-specific deployment tracking |
| Baselines (FBL/ABL/PBL) | Dedicated Baseline type in Core with three standard baseline types | No baseline concept |
| Feature Implementation | Immutable audit record in portfolio mode linking features to versions | No equivalent |
| Definitive Media Library | Distribution domain: Product Media, Product Suite, Distribution Log with checksums and chain of custody | No DML modeling |
| Requirements traceability | Requirements domain: Requirement to Feature to Implementation to Version to Deployment | No requirements tracking |
| Controlled media distribution | Distribution domain: Distribution Log with delivery method, custody tracking, and verification | No equivalent |
| Assessment and certification | Compliance domain: Assessment and Certification types with lifecycle tracking | Requires separately licensed GRC module |
| License tracking | Licensing domain: License type with vendor, expiration, and allocation | Requires separately licensed SAM Pro |

### Where CSDM extends beyond CMDB-Kit

| Concept | CSDM | CMDB-Kit |
|---------|------|----------|
| Discovery integration | Native Discovery and Service Mapping | No discovery integration; data is manually imported |
| Infrastructure depth | Hundreds of CI classes for network devices, storage, cloud resources | Minimal infrastructure types; extend as needed |
| Financial tracking | Mature cost and contract models | Financial domain provides contracts and cost categories |
| ITSM integration | Native incident, change, problem workflows consuming CI data | Delegates process records to work management tools |
| Data quality | CMDB Health dashboards, Data Certification, IRE | Offline validation tools; no runtime quality monitoring |

### When to use CMDB-Kit with ServiceNow

When the organization builds software products and needs product-delivery tracking that CSDM does not provide. CMDB-Kit's ServiceNow adapter creates custom tables for product-delivery types alongside ServiceNow's native CSDM classes. The two models coexist: CSDM handles service desk operations, CMDB-Kit handles product delivery. Domains can be loaded selectively, so the organization only creates custom tables for the specialized concerns that apply to their program.

### When to use CSDM alone

When the organization is purely an IT operations shop that consumes services and manages infrastructure. CSDM is designed for this and does it well. Adding CMDB-Kit's product-delivery types would be unnecessary complexity.


# Platform Implementation

## Platform-Agnostic Design

CMDB-Kit separates the logical schema from the platform implementation. The schema is defined in JSON files (schema-structure.json for type hierarchy, schema-attributes.json for attribute definitions) that are platform-independent. Core has its own schema files. Each domain has its own schema files. Adapters load Core and overlay whichever domains the organization selects, then translate the combined schema into platform-specific formats.

This separation means the same schema works on JSM Assets, ServiceNow, or any other CMDB platform. An organization can evaluate the schema offline, decide which domains apply to their needs, and then import the selected combination into their chosen platform. Migrating to a different platform later does not require redesigning the schema. Adding a domain later does not require modifying the existing Core data.

## JSM Assets Implementation

JSM Assets (formerly Insight) has no built-in CI class hierarchy. Every schema starts from a blank canvas. CMDB-Kit provides the full structure: object types, attributes, reference relationships, and lookup values. The JSM adapter creates all types and attributes via the Assets REST API. Domains can be loaded selectively: the adapter accepts paths to Core plus any combination of domain directories.

JSM Assets' object type model maps directly to CMDB-Kit's schema: one JSM object type per CMDB-Kit type, one JSM attribute per CMDB-Kit attribute, reference attributes for inter-type relationships, and AQL queries for reporting.

## ServiceNow Implementation

ServiceNow has a large built-in CI class hierarchy under cmdb_ci. CMDB-Kit maps to it in three tiers: OOTB tables for infrastructure types that ServiceNow already models (cmdb_ci_server for Server, cmdb_ci_ip_network for Network Segment), custom CI classes with independent identification rules for product-delivery types (u_cmdbk_product for Product, u_cmdbk_database for Database, u_cmdbk_product_component for Product Component, u_cmdbk_feature for Feature), and custom standalone tables for types that do not need CI class behavior (Person, Product Version, Document, Deployment, lookup types). Person uses a custom standalone table (u_cmdbk_person) because Person records represent external contacts, site POCs, and deployment stakeholders, not platform users. They should never be mapped to sys_user or any platform's user directory. Product-delivery types are custom CI classes because ServiceNow's OOTB Application and Database classes require hosting relationships that conflict with CMDB-Kit's product-centric model.

Domain types follow the same mapping pattern. Compliance domain types (Assessment, Certification) become custom CI classes. Distribution domain types (Product Media, Distribution Log) become custom standalone tables. The adapter creates only the tables for domains the organization has selected.

The ServiceNow adapter has been tested end-to-end against the Zurich release. All OOTB tables, custom table creation, CI class extensions, and relationship handling are verified.

## Extensibility

CMDB-Kit is designed to be extended. Adding a new CI type to Core requires four steps: add the type to schema-structure.json, add its attributes to schema-attributes.json, add it to the LOAD_PRIORITY list, and create a data file. The validation tools verify that the extended schema is internally consistent.

Creating a new domain follows the same pattern in a self-contained directory: a schema-structure.json defining the domain's types, a schema-attributes.json defining its attributes, a data directory with example records, and a README explaining the domain's purpose and UAF alignment. The validation tools check cross-references between the domain and Core to ensure referential integrity.

The Writing Custom Adapters guide documents how to build adapters for platforms CMDB-Kit does not yet support.


# Data Quality and Governance

## Lookup Types as First-Class Objects

Every status, category, and classification in CMDB-Kit is a separate object type with a Name and description. This is more work to set up than a simple picklist, but it provides three data quality advantages:

Every value is documented. The description field explains what "Active" means in the context of this schema, what "Deprecated" implies for downstream processes, and what "Retired" means for audit purposes. A picklist value has no room for this context.

Every value is queryable. You can query "show me everything with Status = Deprecated" across all CI types because the lookup is a shared reference, not a per-type picklist.

Adding a value is a data change, not a schema change. Creating a new status value means adding a record to the lookup type. It does not require modifying the schema, restarting the platform, or running a migration.

## Validation Pipeline

CMDB-Kit provides a multi-stage validation pipeline that catches errors before they reach the live CMDB:

### Offline validation

Offline validation checks schema structure (valid JSON, type names resolve, reference types exist, no circular dependencies) and data files (all referenced types exist, all referenced lookup values exist, load priority order is valid). This runs without any connection to a CMDB platform. The validator loads Core and overlays any selected domains, checking cross-schema references between them.

### Import validation

Import validation runs during data import. The adapter checks that target tables exist, that referenced records can be resolved by name, and that data types match (references resolve to sys_ids, dates parse correctly).

### Post-import verification

Post-import verification compares local data files field-by-field against live CMDB data. It reports missing records, extra records, and field-level mismatches.

### Schema check

Schema check compares local schema definitions against live platform tables and columns. It verifies that every type exists, every custom column exists, and column types match expectations.

## Taxonomy Governance

The schema's design supports governance without enforcing a specific governance model. The Core-plus-domains structure provides natural decision points: an organization adopts Core and then selects domains based on program requirements. The criteria for adding a domain are defined by the domain's own purpose statement and UAF alignment.

Adding a new type requires justification: which branch does it belong to? What CM function does it support? If a type does not serve at least one CM function (identification, control, status accounting, audit), it does not belong in the schema. This principle, derived from EIA-649C, acts as a natural governance filter.

The Taxonomy Playbook and Case Study documents provide complete guidance for organizations establishing their own governance process around the schema.


# Case Study

CMDB-Kit's schema evolved through seven iterations on a production CMDB managing multiple product lines across deployment sites. Each iteration was forced by a problem the previous design could not solve.

The first design was a flat schema with tags to differentiate products. It failed within a month because products had fundamentally different component taxonomies. Product-prefixed types replaced tags.

The Site vs Deployment Site split was added when a single deployment record could not represent multiple products at the same customer site with different versions, teams, and schedules. Feature Implementation was added when auditors required traceable proof that every requirement allocated to a release was implemented and tested. Baselines were added when the question "what was the approved configuration six months ago?" could not be answered without archaeology. The Definitive Media Library types were added when controlled software artifacts needed chain-of-custody tracking for classified distribution.

Each design decision traced to a specific operational failure. The schema was not designed from theory and applied to practice. It was designed from practice and validated against theory. The standards alignment documented in Section 4 came after the production schema was stable, confirming that decisions driven by operational need aligned with decisions prescribed by formal standards.

The full case study, including detailed descriptions of each iteration and lessons learned, is available in the project documentation.


# Conclusion

CMDB-Kit provides the first open-source CMDB schema designed for product delivery. Core tracks what you ship and where it goes. Domains add specialized concerns, each aligned to a UAF viewpoint, each replacing a paid platform plugin or filling a capability gap that no commercial tool addresses. Together they fill a gap that process-centric, infrastructure-centric, and asset-centric approaches leave open: tracking what you build, what you release, where you deploy it, and how to prove it to an auditor.

The schema aligns to ITIL 4 SACM, SAE EIA-649C, MIL-HDBK-61B, and ISO/IEC 20000 while remaining platform-agnostic. It runs on JSM Assets and ServiceNow today, with documented patterns for extending to other platforms. Domains can be loaded selectively, so each organization gets the specialized tracking it needs without adopting types that do not apply to its program.

For organizations that build and deliver software products, CMDB-Kit provides a production-ready starting point that eliminates the months of schema design work that every product-delivery CMDB implementation currently requires.

CMDB-Kit is free and open source under the MIT license. The schema, adapters, documentation, and example data are available at github.com/ovoco-co/cmdb-kit.


# Appendix A: Type List by Schema Component

## Core

### Product CMDB

Product, Server, Database, Product Component, Hardware Model, Network Segment, Virtual Machine, Feature

### Product Library

Product Version, Document, Deployment, Deployment Site, Baseline

### Directory

Organization, Team, Person, Location, Facility, Vendor

### Lookup Types

Product Status, Version Status, Deployment Status, Environment Type, Document Type, Document State, Component Type, Priority, Organization Type, Network Type, Baseline Type, Baseline Status, Site Status, Vendor Status, Deployment Role

## Compliance Domain

Assessment, Assessment Type, Assessment Status, Certification, Certification Type, Certification Status

## Licensing Domain

License, License Type, License Status

## Distribution Domain

Documentation Suite, Product Media, Product Suite, Distribution Log, Library Item, Library Item Type, Distribution Status, Delivery Method, Media Urgency, Transfer Status, Media Type

## SLA Domain

SLA, SLA Status

## EA Domain

Service, Service Type, Capability, Capability Status, Business Process, Information Object, Disposition

## Financial Domain

Contract, Contract Status, Cost Category, Disposal Method

## Requirements Domain

Requirement, Requirement Type, Requirement Status, Requirement Priority, Verification Method

## SCCM Domain

SCCM Site, SCCM Site Role, SCCM Collection, SCCM Security Role, SCCM Service Account, SCCM Boundary Group, SCCM Finding, SCCM Site Type, SCCM Role Type, SCCM Finding Category

## Portfolio Mode (adds to Core and loaded domains)

Product-prefixed CI types per product line, Shared Services branch, Component Instance, Feature Implementation, Site Location Assignment, Site Org Relationship, Site Personnel Assignment, Baseline Milestone, Build Status, Sunset Reason, Implementation Status, Site Type, Site Workflow Status, Upgrade Status


# Appendix B: Standards Crosswalk Matrix

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
| Lookup Types | Controlled Vocabulary | Section 5.2.3 (Terminology) | N/A | N/A |
| Change delegation | Change Enablement | Section 5.3 | Section 6 | Change Management |
| Site vs Deployment Site | N/A | N/A | N/A | N/A |
| Multi-product prefixing | N/A | N/A | N/A | N/A |

Note: "N/A" in the standards columns indicates concepts unique to CMDB-Kit's product-delivery model that have no direct equivalent in the standard. These are the schema's differentiators.


# Appendix C: Domain and UAF Viewpoint Mapping

| UAF Viewpoint / Domain | Question it asks | CMDB-Kit answer |
|------------------------|-----------------|-----------------|
| Resources viewpoint (Rs) | What infrastructure supports the work? | Core: Server, Database, VM, Hardware Model, Network Segment |
| Projects viewpoint (Pj) | What are we building or changing? | Core: Product, Product Version, Product Component, Feature, Deployment, Baseline |
| Personnel viewpoint (Pr) | Who does the work? | Core: Organization, Team, Person, Location, Facility, Vendor |
| Standards viewpoint (St) | What rules do we follow? | Core: Lookup Types (controlled vocabularies) |
| Services viewpoint (Sv) | What services do we provide? | EA domain: Service, Capability. SLA domain: SLA |
| Capability viewpoint (Cv) | What can we do? | EA domain: Capability, Business Process |
| Operational viewpoint (Op) | How do we do it? | Distribution domain: Documentation Suite, Product Media, Distribution Log |
| Security domain (Se) | How do we protect it? | Compliance domain: Assessment, Certification. SCCM domain: SCCM Finding |
| Information domain (If) | What data flows between systems? | EA domain: Information Object. Requirements domain: Requirement, Verification Method |
| Acquisition domain (Aq) | How do we procure and fund it? | Financial domain: Contract, Cost Category. Licensing domain: License |


# Appendix D: CSDM Comparison Summary

See Section 4.5 for the full comparison.

### CMDB-Kit provides capability categories that CSDM does not model

Product as root concept, multi-product isolation (prefixed types in portfolio mode), deployment site tracking (per-product state and personnel), baselines (FBL/ABL/PBL in Core), feature implementation (immutable audit records in portfolio mode), Definitive Media Library (distribution domain: media, suites, distribution logs), requirements traceability (requirements domain: requirement to feature to version to site), controlled media distribution (distribution domain: chain of custody for air-gapped delivery), assessment and certification tracking (compliance domain), and license management (licensing domain).

### CSDM provides capability categories that CMDB-Kit does not deeply model

Discovery integration (native Discovery and Service Mapping), infrastructure depth (extensive CI class library for network devices, storage, cloud), financial tracking (mature cost and contract models beyond the financial domain), native ITSM integration (incident, change, problem workflows consuming CI data), and runtime data quality monitoring (CMDB Health dashboards, Data Certification, IRE).

### Key architectural difference

CMDB-Kit uses custom CI classes with independent identification rules for product-delivery types (Product, Database, Virtual Machine, Product Component, Feature, Assessment) rather than ServiceNow's OOTB classes, which require hosting/containment dependencies designed for discovery-driven infrastructure. This allows CMDB-Kit and CSDM to coexist on the same ServiceNow instance without conflicting.


# Appendix E: Glossary

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
| UAF | Unified Architecture Framework. An architecture framework evolved from DoDAF that organizes enterprise views into standardized viewpoints. |


# About Ovoco

Ovoco is a configuration management and CMDB consulting firm that helps federal agencies and mid-market companies implement, migrate, and maintain their configuration management systems.

We combine deep CMDB expertise with open-source tooling (CMDB-Kit, Migration Kit) and vendor-neutral advisory to deliver right-sized solutions, not enterprise transformations that take years and cost millions.

## Services

- CMDB implementation and schema design
- ITSM platform migrations (Jira, ServiceNow, GitLab)
- Configuration management process design
- SCCM security assessments
- Capture and proposal support for government programs

## Get in touch

Website: https://ovoco.co
Email: janel@ovoco.co
GitHub: https://github.com/ovoco-co
CMDB-Kit: https://ovoco.co/cmdb-kit

Ovoco LLC, Ogden, UT
