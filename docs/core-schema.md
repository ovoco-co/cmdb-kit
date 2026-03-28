# The Core Schema

## Core Answers One Question

What do we ship and where does it go?

Everything in Core traces back to this. Every type, every attribute, every reference link exists because someone on the team needs to know what got built, what version it is, and where it ended up running. Core is one schema solving one problem: track what you ship and where it goes.

That focus is deliberate. A CMDB that tries to model everything models nothing well. Core gives you the types you need to manage a product through its lifecycle, from first release to the last deployment site, and leaves specialized concerns (infrastructure detail, compliance, licensing) to opt-in domain schemas. If your team ships software and deploys it to customer environments, Core has you covered. If you also need to track VMs and network segments, that is what domains are for.

The sections below walk through Core by the questions each category answers. Every type listed here maps directly to a type definition in `schema/core/schema-structure.json` and its attributes in `schema/core/schema-attributes.json`.

## Product Identity

**What questions does this answer?**

- What products do we manage?
- What components make up each product?
- Who owns each product?

Product identity is the foundation. Before you can track versions, deployments, or baselines, you need to know what you are tracking.

### Product

The central type in the schema. A Product represents a software application, platform, or system that your organization builds, maintains, or operates.

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Display name of the product (inherited from all types) |
| description | Text | What the product does |
| productType | Text | Free-text classification (SaaS, on-prem, library, etc.) |
| technology | Text | Primary technology stack |
| owner | Ref to Team | The team responsible for this product |
| status | Ref to Product Status | Current lifecycle status |
| companionProducts | Multi-ref to Product | Other products that are commonly deployed alongside this one |

The `companionProducts` field is a multi-reference back to Product itself. This captures the common pattern where products travel together. A CRM might always ship alongside a reporting dashboard and an API gateway. Recording that relationship means you can answer "if we are deploying Product A, what else should we be thinking about?" without relying on tribal knowledge.

### Product Component

Products are made of parts. A Product Component represents a discrete, independently identifiable piece of a product, such as a microservice, a frontend module, a shared library, or a database schema.

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Component name |
| description | Text | What the component does |
| componentType | Ref to Component Type | Classification (backend, frontend, API, library, etc.) |
| repository | Text | Source code repository URL or identifier |
| technology | Text | Technology or language used |
| owner | Ref to Team | The team responsible for this component |

Components are referenced by Product Version through a multi-reference, which lets you record exactly which components are included in a given release. When you need to answer "what changed in this release?" you look at the components attached to the version.

## Version and Release

**What questions does this answer?**

- What is the current version of this product?
- What versions have been released?
- What changed between this version and the last one?
- What features are included in this version?
- Who approved this release?

Version tracking turns a product from a name into a timeline. Without versions, you have a product. With versions, you have a product history.

### Product Version

A specific, identifiable release of a product. Product Version is one of the most connected types in Core because nearly everything downstream references it: deployments need a version, baselines snapshot a version, and documents attach to a version.

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Display name (often the version string itself) |
| description | Text | What is in this release |
| versionNumber | Text | Semantic version or release identifier |
| releaseDate | Date | When this version was released |
| status | Ref to Version Status | Current lifecycle status (Current, Beta, Previous, Deprecated, Retired) |
| components | Multi-ref to Product Component | Which components are included in this version |
| previousVersion | Ref to Product Version | The version this one succeeds (self-reference) |
| approvedBy | Ref to Person | Who approved the release |
| approvalDate | Date | When the release was approved |
| releaseNotes | Text | Summary of changes |

The `previousVersion` self-reference creates a linked list of releases. You can walk the chain backward to reconstruct the full release history of a product, and you can compare any two versions by examining their component lists side by side.

### Feature

A discrete capability or enhancement delivered as part of a product version.

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Feature name |
| description | Text | What the feature does |
| product | Ref to Product | Which product this feature belongs to |
| version | Ref to Product Version | Which version delivers this feature |
| status | Ref to Version Status | Current status of the feature |
| owner | Ref to Team | The team building this feature |

Features give you a finer grain than release notes. When a customer asks "when did you add multi-tenant support?" you can point to a Feature record linked to a specific version, owned by a specific team.

## Deployment

**What questions does this answer?**

- Where is this product deployed?
- What version is running at each site?
- What environment is each deployment (production, staging, dev)?
- What infrastructure supports each deployment?
- When was the last deployment?
- Who performed the deployment?
- Is this site current or behind?

Deployment tracking is where the schema earns its keep. Knowing what you built matters less than knowing where it is running and whether it is current.

Core models deployment with two distinct types, each serving a different purpose.

### Deployment Site

A Deployment Site represents a persistent, ongoing installation of a product at a specific customer or organizational location. Think of it as the answer to "where is this product running right now?"

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Site identifier |
| description | Text | Notes about this installation |
| product | Ref to Product | What is installed here |
| version | Ref to Product Version | What version is currently running |
| organization | Ref to Organization | The customer or entity at this site |
| environment | Ref to Environment Type | Production, staging, development, etc. |
| status | Ref to Site Status | Current site status (Active, Provisioning, Maintenance, Decommissioned) |
| sitePOC | Ref to Person | Point of contact at this site |
| supportTeam | Ref to Team | The team responsible for supporting this site |
| lastDeploymentDate | Date | When the site was last updated |
| deployedBy | Ref to Person | Who performed the last deployment |
| goLiveDate | Date | When this site originally went live |

Deployment Site is the type you query when a vulnerability is announced and you need to know which customers are running the affected version. It is the type that answers "who is still on v2.1?" and "which sites went live this quarter?"

### Deployment

A Deployment represents a single event: the act of deploying a specific version to a specific environment on a specific date.

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Deployment identifier |
| description | Text | Notes about this deployment event |
| version | Ref to Product Version | What was deployed |
| environment | Ref to Environment Type | Where it was deployed |
| deployDate | Date | When the deployment happened |
| status | Ref to Deployment Status | Outcome (successful, failed, rolled back) |
| deployedBy | Ref to Person | Who performed the deployment |

The distinction between these two types matters. A Deployment is an event: "v2.3.1 was deployed to production on February 10." A Deployment Site is persistent state: "Acme Corp's production instance is running v2.3.0." Deployments come and go. Deployment Sites persist and accumulate history. You need both. The Deployment tells you what happened. The Deployment Site tells you where things stand right now.

## Baselines

**What questions does this answer?**

- What is the approved configuration at this point in time?
- What is in the baseline (which versions, components, documents)?
- When was the baseline established?
- Who approved the baseline?
- What changed since the last baseline?

A baseline is a snapshot of approved configuration at a specific moment. In configuration management, baselines serve as reference points. You establish a baseline, and then you measure all subsequent changes against it. If something breaks, you know exactly what the approved state looked like before the change.

### Baseline

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Baseline identifier |
| description | Text | What this baseline represents |
| baselineType | Ref to Baseline Type | Classification (functional, allocated, product, etc.) |
| product | Ref to Product | Which product this baseline covers |
| version | Ref to Product Version | The version at the time of the baseline |
| status | Ref to Baseline Status | Current status (Draft, Approved, Superseded) |
| approvedBy | Ref to Person | Who approved the baseline |
| approvalDate | Date | When approval was granted |
| establishedDate | Date | When the baseline was formally established |
| components | Multi-ref to Product Component | Which components are included |
| documents | Multi-ref to Document | Which controlled documents are part of this baseline |

Baselines tie together versions, components, and documents into a single approved package. When an auditor asks "what was the approved configuration on January 15?" you pull the baseline that was current on that date and it tells you everything: which version, which components, and which documents were in scope.

## Dependencies

**What questions does this answer?**

- What does this product depend on?
- What depends on this product?
- If this server goes down, what products are affected?
- If this database goes down, what deployments break?

Dependencies are one of the most important things a CMDB tracks, and Core handles them in a way that might surprise you: the core schema does not define dependency attributes on types.

This is a deliberate design choice. Dependencies are expressed through adapter-level relationships, not schema-level attributes. The schema defines the types that participate in relationships: Product, Server, Database, Deployment Site, and the rest. The adapter for your target platform defines how those relationships are recorded.

In JSM Assets, dependencies are modeled as reference attributes between object types. A Product might reference the Servers it runs on, and a Database might reference the Server that hosts it. The JSM adapter maps these relationships when it syncs the schema.

In ServiceNow, dependencies are modeled through the `cmdb_rel_ci` relationship table, a separate table that stores typed relationships between any two configuration items. The relationship itself has a type (runs on, depends on, hosted by) and connects a parent CI to a child CI.

By keeping dependencies out of the core schema definition, CMDB-Kit stays platform-agnostic. The schema describes what things exist and what properties they have. The adapter translates relationships into whatever mechanism the target platform provides. This means the same schema works whether your CMDB uses reference attributes, relationship tables, or graph edges.

The types that most commonly participate in dependency relationships include Product, Server, Database, Product Component, and Deployment Site. The Core schema already includes Server and Database as first-class types with attributes like hostname, ipAddress, operatingSystem, databaseEngine, and environment, giving you the infrastructure anchor points that dependency mapping needs.

## People and Responsibility

**What questions does this answer?**

- Who is responsible for this product?
- Who is the point of contact at each deployment site?
- What team supports this deployment?
- Who do I call when something breaks at this site?

A CMDB without people in it is a catalog. A CMDB with people in it is an operational tool. The Directory branch of the schema exists so that every product, every deployment, and every baseline can point to a human being who is responsible for it.

### Person

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Display name |
| firstName | Text | Given name |
| lastName | Text | Family name |
| email | Text | Email address |
| phone | Text | Phone number |
| jobTitle | Text | Job title |
| role | Text | Functional role (developer, release manager, DBA, etc.) |
| team | Ref to Team | Which team this person belongs to |
| manager | Ref to Person | Direct manager (self-reference) |

### Team

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Team name |
| description | Text | What this team does |
| organization | Ref to Organization | Which organization this team belongs to |
| teamLead | Ref to Person | The team's lead |

### Organization

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Organization name |
| description | Text | What this organization does |
| orgType | Ref to Organization Type | Classification (vendor, customer, internal, partner, etc.) |
| website | Text | Organization website |
| parentOrganization | Ref to Organization | Parent organization (self-reference for hierarchy) |

The three Directory types form a hierarchy: Organizations contain Teams, Teams contain Persons. The `parentOrganization` self-reference on Organization lets you model divisions within a company or subsidiary relationships between companies.

These types show up as references throughout the rest of the schema. Product has an `owner` pointing to Team. Deployment Site has a `sitePOC` pointing to Person and a `supportTeam` pointing to Team. Product Version has an `approvedBy` pointing to Person. The Directory is the connective tissue that turns a data model into an accountability model.

## Documents

**What questions does this answer?**

- What controlled documents exist for this product?
- What version of the document applies to this release?
- Is the document current or superseded?

In configuration management, documents are configuration items. A system design document, a test plan, an installation guide, these are controlled artifacts that change over time and need to be tracked alongside the software they describe.

### Document

| Attribute | Type | Description |
|-----------|------|-------------|
| name | Text | Document title |
| description | Text | What the document covers |
| documentType | Ref to Document Type | Classification (design doc, test plan, user guide, etc.) |
| state | Ref to Document State | Current lifecycle state (draft, approved, superseded, archived) |
| product | Ref to Product | Which product this document relates to |
| version | Ref to Product Version | Which version this document applies to |
| author | Ref to Person | Who wrote the document |
| publishDate | Date | When the document was published |
| url | Text | Link to the document |

Documents tie into baselines through the `documents` multi-reference on Baseline. When a baseline is established, it captures not just the software version and components but also the set of approved documents that describe that configuration. This is how you answer "what was the approved test plan when we released v3.0?"

## The Type Hierarchy

Core organizes its types into four branches. Understanding this hierarchy helps you navigate the schema and understand where new types would fit if you extend it.

### Product CMDB

The things you build and run on. These are the configuration items that represent your software and the infrastructure it runs on.

- Product
- Server
- Database
- Product Component
- Feature

### Product Library

Lifecycle records that track how products change and move through environments over time.

- Product Version
- Document
- Deployment
- Deployment Site
- Baseline

### Directory

People and organizations. The human side of the CMDB.

- Organization
- Team
- Person

### Lookup Types

Reference data and enumerations that provide controlled vocabularies for the types above. Lookup types have only a name and description. They exist so that fields like "status" and "environment" are pick-lists rather than free text.

- Product Status
- Version Status
- Deployment Status
- Environment Type
- Document Type
- Document State
- Component Type
- Priority
- Organization Type
- Deployment Role
- Site Status
- Baseline Type
- Baseline Status

Every lookup type is a simple name-and-description pair. You populate them with the values that make sense for your organization. The example data that ships with CMDB-Kit includes sensible defaults (Production, Staging, Development for Environment Type, or Draft, Released, Deprecated for Version Status), but you are free to add, rename, or remove values to match your workflow.

## What Core Excludes

Core deliberately does not include:

- **Infrastructure detail.** Hardware models, virtual machines, network segments, IP subnets. These are available in the Infrastructure domain for teams that need them, but most product teams do not need to model their network topology in the same schema where they track releases.

- **Compliance tracking.** Security assessments, certifications, audit findings. The Compliance domain adds these types for organizations that need to track FedRAMP, SOC 2, or similar frameworks.

- **Media distribution.** Physical or digital media tracking, distribution logs, chain-of-custody records. This is a specialized concern that lives in its own domain.

- **Licensing.** Software license tracking, entitlements, renewal dates. Important for some organizations, irrelevant for others.

- **Requirements traceability.** Linking requirements to features to test cases. This is valuable for regulated environments but adds complexity that most teams do not need in their CMDB.

Each of these concerns is available as an opt-in domain schema that layers on top of Core. You start with Core, validate that it works for your team, and then add domains as the need arises. Core stays focused on product delivery: what you ship and where it goes.
