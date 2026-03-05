# Taxonomy Design

# What a CMDB Taxonomy Is

## The Classification System for Your CI Types

A CMDB taxonomy is the hierarchical classification system that organizes every type of Configuration Item your organization tracks. It answers the question: what categories of things do we manage, and how do they relate to each other?

Think of it as the filing system for your IT universe. Just as a library organizes books into sections (fiction, non-fiction, reference) and then subdivides further (history, science, biography), a CMDB taxonomy organizes configuration items into branches and then into specific types within each branch.

In CMDB-Kit, the taxonomy is defined in two files:

- `schema-structure.json` declares the types and their parent-child hierarchy
- `schema-attributes.json` declares the fields (attributes) each type carries

Every type you add to these files becomes a "drawer" in the filing system. Every record you create in the data files is an item filed into one of those drawers.

## Why Hierarchy Matters

A flat list of fifty unrelated types is hard to navigate, hard to secure, and hard to maintain. Hierarchy solves three problems:

**Navigation.** When a user opens the CMDB in JSM Assets or any other front end, they see branches they can expand. An administrator looking for server records does not need to scroll past document types and lookup values. They expand "Product CMDB" and find servers immediately.

**Inheritance.** In many CMDB platforms, child types inherit attributes from parent types. While CMDB-Kit does not enforce inheritance at the schema layer (each type declares its own attributes explicitly), the hierarchy communicates intent. All types under Product Library relate to release management. All types under Directory relate to people and organizations. This grouping makes the schema self-documenting.

**Access control.** When you deploy to a platform like JSM Assets, you can apply permissions at the branch level. The Directory branch might be restricted to HR and management. The Product Library branch might be visible to release managers. Hierarchy gives you natural permission boundaries.

# Configuration Management Theory

## Product Lifecycle Phases: Development, Introduction, Growth, Maturity, Decline

Configuration management tracks a product through its entire lifecycle. Understanding these phases helps you design a taxonomy that serves the product at every stage:

**Development.** The product exists only as components and design documents. Your taxonomy needs types for Product Component, Feature, and Document. Baselines capture approved designs.

**Introduction.** The first release ships. You create Product Version records, deployment records, and begin tracking deployment sites. The Product Library branch comes alive.

**Growth.** New versions ship frequently. Change requests flow in. Incidents get reported. Your taxonomy needs operational types like Change Request, Incident, and SLA.

**Maturity.** The product is stable. Focus shifts to maintenance, license compliance, and audit. Assessment and Certification types become important. Documentation suites need to stay current.

**Decline.** The product is being retired. Status fields on Application, Deployment Site, and Product Version records shift to "Deprecated" and "Retired." The taxonomy does not shrink, but the active records do.

A well-designed taxonomy supports all five phases without restructuring. You do not add new types when a product matures; you populate types that were already waiting.

## CM's Role in Managing Product Evolution

Configuration management is not just tracking what exists today. It tracks how things change over time and why. The taxonomy encodes this through:

- **Version chains.** Product Version records link to their previousVersion, creating a history. You can trace backward from the current release to the first.
- **Baselines.** A Baseline freezes a point-in-time snapshot of the configuration. When a release ships, the baseline records exactly what was in it.
- **Change records.** Every modification to the product should trace back to a Change Request. The taxonomy gives you the type to record it.

## Design Reuse vs Common Design Decisions

When designing a CMDB for multiple products, you face a choice: should each product define its own taxonomy, or should products share a common one?

CMDB-Kit takes the common design approach. The base and extended schemas define types that work across products. An Application is an Application whether it is a CRM, an analytics platform, or a mobile app. A Product Version is a Product Version regardless of what it versions.

This matters because:

- Shared lookup types (like Environment Type or Document State) enforce consistent vocabulary across products
- Cross-product reporting works without translation
- Teams moving between products find a familiar structure

Where products differ is in their data, not their types. Two products share the same Application type but have different Application records.

## Mass Customization and Its CM Implications

Some organizations deliver the same product in many configurations, each tailored to a customer or environment. This pattern, sometimes called mass customization, creates specific CM challenges:

- Each customer deployment may run a different version
- The same component may be configured differently at each site
- Documentation may need customer-specific variants

The taxonomy handles this through the Deployment Site type. Rather than creating a separate Application type per customer, you create one Application and multiple Deployment Site records. Each Deployment Site links to a Location and tracks its own status and go-live date. The Distribution Log records which version was delivered to which site and when.

# The Four-branch Hierarchy

CMDB-Kit organizes all configuration items into four top-level branches. These branches are themselves types in schema-structure.json, but they exist purely as containers. You never create records for "Product CMDB" or "Directory." They are structural parents only.

```
Product CMDB
Product Library
Directory
Lookup Types
```

## Product CMDB

The Product CMDB branch holds the technical infrastructure that makes your product work. These are the CIs that operations teams monitor, developers deploy to, and architects design around.

### Application

An Application represents a distinct software service or system. This is the highest-level technical CI most teams care about. In the example data, OvocoCRM tracks six applications: the core CRM, an API gateway, an analytics engine, a mobile API, a notification service, and a search service.

Key attributes: description, applicationType (free text like "Web Application" or "API Service"), technology (the tech stack), owner (reference to Team), status (reference to Application Status).

When to create an Application record: when the thing has its own deployment lifecycle, its own team ownership, or its own monitoring. If it runs as a process and people page when it goes down, it is an Application.

### Server

A Server is a compute instance, whether physical hardware, a cloud VM, or a container host. Servers host applications and databases.

Key attributes: hostname, ipAddress, operatingSystem, environment (reference to Environment Type), cpu, ram, storage.

The environment reference is important. The same application might run on servers in Production, Staging, and Development. The Environment Type lookup ensures consistent naming.

### Database

A Database records a database instance. It references the Server it runs on and the Environment Type it belongs to.

Key attributes: databaseEngine (e.g., "PostgreSQL 15"), version, server (reference to Server), storageSize, environment (reference to Environment Type).

### Product Component

A Product Component is a modular part of a product, typically a deployable service, library, or module. Components are the building blocks that Product Versions are assembled from.

Key attributes: componentType (reference to Component Type, with values like Service, Library, Database, Queue, Cache, Gateway, Frontend), repository (the source code location), technology, owner (reference to Team).

The distinction between Application and Product Component is scope. An Application is the whole service as seen by operations. A Product Component is one piece of it as seen by developers. The CRM Core application might contain the Contact Manager, Deal Pipeline, and Email Integration components.

### Hardware Model

A Hardware Model is a catalog entry for approved hardware or instance types. This is not a specific physical server; it is a model specification that many servers might match.

Key attributes: manufacturer, modelNumber, cpu, ram, storage, formFactor.

Use this when your organization maintains a list of approved hardware configurations or cloud instance types that deployments must choose from.

### Network Segment

A Network Segment represents a network zone, VLAN, or subnet. These are the boundaries that infrastructure teams manage and security teams audit.

Key attributes: networkType (reference to Network Type, with values like DMZ, Application Tier, Data Tier, Management), cidr, vlan, gateway.

### Virtual Machine

A Virtual Machine records a VM or container instance. It references the physical Server it runs on.

Key attributes: hostname, server (reference to Server), operatingSystem, cpu, ram, environment (reference to Environment Type).

The difference between Server and Virtual Machine is that a Server can exist without a parent (it is the physical or top-level host), while a Virtual Machine always references the Server that hosts it.

### License

A License tracks a software license your organization holds. This is for IT asset management, ensuring you know what you are entitled to use, when licenses expire, and who supplies them.

Key attributes: licenseType (reference to License Type, with values like Per Seat, Per Core, Enterprise, Open Source, SaaS Subscription), vendor (reference to Vendor), expirationDate, quantity (integer), status (reference to License Status).

### Assessment

An Assessment records a security or compliance evaluation. Assessments are periodic activities with findings that may require remediation.

Key attributes: assessmentType (reference to Assessment Type, with values like Security Audit, Penetration Test, Compliance Review, Architecture Review), assessmentDate, status (reference to Assessment Status), assessor (reference to Person), findings (free text).

### Feature

A Feature represents a product capability. Features link to the Product Version that introduced them and the Team that owns them.

Key attributes: version (reference to Product Version), status (reference to Version Status), owner (reference to Team).

Features serve as a bridge between product management and configuration management. When someone asks "what version added email tracking?" the Feature record provides the answer.

## Product Library

The Product Library branch is the release management side of the CMDB. Where Product CMDB tracks what things are, Product Library tracks what was released, what documents describe it, where it was deployed, and what changed.

### Product Version

A Product Version is the anchor record for every release. Every other record in the Product Library ultimately traces back to a version.

Key attributes: versionNumber (e.g., "2.3.1"), releaseDate, status (reference to Version Status), components (multi-reference to Product Component, listing every component included in this version), previousVersion (self-reference to Product Version, creating the version chain).

The components field is a multi-reference. A single version might include six components, and the field lists all of them with semicolons in the data file (e.g., "Contact Manager;Deal Pipeline;Email Integration").

### Document

A Document represents a controlled document tied to the product. This includes architecture documents, runbooks, SOPs, release notes, and any other documentation that needs lifecycle management.

Key attributes: documentType (reference to Document Type), state (reference to Document State, with values like Draft, Review, Published, Archived), author (reference to Person), publishDate, url.

### Deployment

A Deployment records a specific instance of deploying a version to an environment. The combination of version, environment, and date makes each deployment record unique.

Key attributes: version (reference to Product Version), environment (reference to Environment Type), deployDate, status (reference to Deployment Status), deployedBy (reference to Person).

### Baseline

A Baseline freezes a point-in-time snapshot of the product configuration. Baselines are used in formal release management to record exactly what was approved for deployment.

Key attributes: baselineType (reference to Baseline Type, with values like Design, Build, Release), version (reference to Product Version), status (reference to Baseline Status, with values like Draft, Approved, Superseded), approvalDate.

### Documentation Suite

A Documentation Suite groups multiple Document records into a versioned package. When version 2.3.0 ships, its documentation suite might include the release notes, the updated architecture doc, and the installation guide.

Key attributes: version (reference to Product Version), documents (multi-reference to Document), state (reference to Document State).

### Product Media

A Product Media record tracks a downloadable artifact or binary. This is the definitive media library (DML) concept from ITIL, recording what was built and ensuring integrity through checksums.

Key attributes: version (reference to Product Version), fileName, fileSize, checksum.

One media record per deliverable artifact. If a release produces an installer, a Docker image, and a database migration script, that is three Product Media records.

### Product Suite

A Product Suite bundles multiple Product Media items into a distribution package. When you ship a complete release, the suite collects all the artifacts that travel together.

Key attributes: version (reference to Product Version), media (multi-reference to Product Media).

### Certification

A Certification tracks a compliance certification held against a version of the product. Certifications have expiration dates and issuing bodies.

Key attributes: certificationType (reference to Certification Type, with values like SOC 2 Type II, ISO 27001, GDPR, HIPAA, PCI DSS), status (reference to Certification Status), issueDate, expirationDate, issuingBody.

### Deployment Site

A Deployment Site represents a customer location, region, or tenant instance where the product is deployed. This is distinct from a Location (which is a physical place in the Directory branch). A Deployment Site is product-specific: it tracks which version runs there, what environment type it is, and when it went live.

Key attributes: location (reference to Location), status (reference to Site Status), environment (reference to Environment Type), goLiveDate.

The separation between Location (a place) and Deployment Site (a product instance at that place) is deliberate. One Location might host deployment sites for multiple products. And the same product might have deployment sites at many locations.

### Distribution Log

A Distribution Log entry records that a specific version was delivered to a specific site on a specific date by a specific person. This is the audit trail for software distribution.

Key attributes: version (reference to Product Version), site (reference to Deployment Site), distributionDate, distributedBy (reference to Person).

### Change Request

A Change Request records a proposed or completed change to the product or its infrastructure. Change types align with ITIL change models: Standard (pre-approved, low risk), Normal (requires assessment), and Emergency (expedited for critical issues).

Key attributes: changeType (reference to Change Type), impact (reference to Change Impact), requestedBy (reference to Person), requestDate, status (reference to Deployment Status).

### Incident

An Incident records a service disruption or degradation. Incidents reference the affected application, enabling impact analysis across the CMDB.

Key attributes: severity (reference to Incident Severity, with values SEV1 through SEV4), status (reference to Incident Status), reportedBy (reference to Person), reportDate, resolvedDate, affectedApplication (reference to Application).

### SLA

An SLA (Service Level Agreement) records the agreed performance targets for an application. SLAs link services to measurable commitments.

Key attributes: application (reference to Application), status (reference to SLA Status), targetUptime, responseTime, reviewDate.

## Directory

The Directory branch holds the people, organizations, and places that every other branch references. These are the "who" and "where" types. They tend to be loaded first (after lookup types) because many CI types reference them.

### Organization

An Organization represents a company, department, or division. Organizations can nest through the parentOrganization self-reference, allowing you to model corporate hierarchies.

Key attributes: orgType (reference to Organization Type), website, parentOrganization (self-reference to Organization).

### Team

A Team groups people within an organization. Teams own applications and components.

Key attributes: organization (reference to Organization), teamLead (reference to Person).

### Person

A Person is an individual. People author documents, deploy versions, report incidents, and lead teams. The Person type sits at the center of many relationships.

Key attributes: firstName, lastName, email, role (free text), team (reference to Team).

### Location

A Location is a physical place: an office, a data center, a customer site. Locations provide the geographic context that Deployment Sites and Facilities reference.

Key attributes: address, city, country, locationType (free text).

### Facility

A Facility is a specific area within a location, such as a server room, a secure area, or a lab. Facilities reference their parent Location.

Key attributes: location (reference to Location), facilityType, capacity.

### Vendor

A Vendor is a third-party supplier. Vendors supply licenses, hardware, and services. Tracking vendor relationships in the CMDB gives you a single place to see contract dates and contact information.

Key attributes: website, contactEmail, status (reference to Vendor Status), contractExpiry.

## Lookup Types

Lookup types are the reference data that gives CI fields their allowed values. They are described in detail in the Lookup Types training document, but their role in the taxonomy is important to understand here.

Every lookup type sits under the Lookup Types branch. Each has only two attributes: Name and description. They hold simple records like `{ "Name": "Active", "description": "Currently in production use" }`.

The extended schema includes 26 lookup types:

- Application Status, Version Status, Deployment Status, Environment Type
- Document Type, Document State, Component Type, Priority
- Organization Type, Deployment Role
- Change Type, Change Impact
- Incident Severity, Incident Status
- Certification Type, Certification Status
- Assessment Type, Assessment Status
- Network Type
- Baseline Type, Baseline Status
- License Type, License Status
- Site Status, Vendor Status, SLA Status

Lookup types are always imported first because every other type depends on them for reference values.

# How to Decide What Is a CI Type vs a Lookup Type vs an Attribute

## Rule of Thumb: Lifecycle and Attributes

The decision framework is straightforward:

**Make it a CI type** when the thing has its own lifecycle, its own attributes beyond a name, and you need to track individual records of it. A Server has a hostname, an IP address, an operating system, and goes through provisioning, active use, and decommissioning. It is a CI type.

**Make it a lookup type** when the thing is a fixed list of values used to classify other records. "Active, Planned, Deprecated, Retired" is a set of Application Status values. You would never add attributes like "owner" or "deployment date" to a status value. It is a lookup type.

**Make it an attribute** when the thing is a property of something else and does not warrant its own record. The technology stack of an application ("Node.js, React, PostgreSQL") is descriptive text. It has no lifecycle of its own. It is a text attribute on Application.

## Fixed Lists of Values as Lookup Types

If you find yourself wanting a dropdown or picklist on a CI form, that list should almost always be a lookup type. The benefits:

- Consistent spelling and casing across all records (no "active" vs "Active" vs "ACTIVE")
- Values have descriptions that explain what they mean
- Adding a new value is a data change, not a schema change
- Multiple CI types can share the same lookup (Environment Type is used by Server, Database, Virtual Machine, and Deployment)

The test: if two different CI types would both benefit from the same set of values, it belongs in a shared lookup type.

## Properties as Attributes

When something is a characteristic of a CI rather than a thing in its own right, model it as an attribute. Attributes come in several types in CMDB-Kit:

- **Text** (`"type": 0`): Free-form text. Used for descriptions, hostnames, URLs.
- **Date** (`"type": 0, "defaultTypeId": 4`): A date value in YYYY-MM-DD format.
- **Integer** (`"type": 0, "defaultTypeId": 1`): A whole number. Used for quantities like license counts.
- **Boolean** (`"type": 0, "defaultTypeId": 2`): A true/false value.
- **Single reference** (`"type": 1, "referenceType": "TypeName"`): A link to one record of another type.
- **Multi-reference** (`"type": 1, "referenceType": "TypeName", "max": -1`): A link to many records of another type.

The guideline: if you can describe the thing as "the [attribute] of [CI]" and it sounds natural, it is an attribute. "The hostname of the server." "The release date of the version." "The severity of the incident."

If instead you would say "the server's [thing] is a [thing] that also has its own [properties]," you need a separate type.

# Parent-child Relationships

## When to Nest Types Under a Parent vs Keeping Them Flat

Every type in schema-structure.json has a parent field (except the four root branches, which have no parent). The parent determines where the type appears in the tree.

Nest a type under a parent when:

- It belongs conceptually to that branch (Deployment belongs to Product Library because it is part of release management)
- Users would expect to find it there when browsing
- The types in that branch share a common domain

Keep types at the same level (siblings under the same parent) when:

- They are peers in the same domain but are not subtypes of each other
- One does not "contain" or "specialize" the other

In CMDB-Kit, all CI types are direct children of their branch. Application, Server, Database, and Product Component are all siblings under Product CMDB. None is a child of another. This is a flat-within-branch design that keeps the hierarchy shallow and easy to navigate.

You should avoid deeply nesting types. A three-level hierarchy (branch, type) is sufficient for most schemas. Adding a fourth level (branch, parent type, child type) is rarely needed and complicates navigation.

## Inheritance Implications

Some CMDB platforms support attribute inheritance, where a child type automatically gets all attributes of its parent type. CMDB-Kit does not enforce this at the schema layer. Each type in schema-attributes.json declares exactly the attributes it has.

This means if you nest a type under a parent, it does not automatically gain the parent's attributes. If you want shared attributes, you add them explicitly to each type.

The advantage of explicit attributes is clarity: reading a type's entry in schema-attributes.json tells you everything about it without tracing up the hierarchy. The cost is some repetition, which is acceptable for a well-defined schema.

## How schema-structure.json Parent Field Works

Each entry in schema-structure.json is an object with three fields:

```json
{ "name": "Database", "parent": "Product CMDB", "description": "Database instances" }
```

- **name**: The type name in Title Case. This becomes the display name in the target database.
- **parent**: The name of the parent type. Must exactly match another entry's name. The four root branches omit this field.
- **description**: A brief explanation of what the type represents.

The parent field creates the tree structure that CMDB platforms render as a navigable hierarchy. The import adapter reads this field to create the correct parent-child relationships in the target database.

# Product-specific Type Prefixes

## When to Use Product Prefixes

When your CMDB tracks multiple products, you may want to distinguish product-specific CI types from shared ones. A common convention is to prefix the type name with a short product identifier.

For example, if you manage three products, you might use two-letter prefixes:

- Shared types: Application, Server, Database (no prefix)
- Product Alpha types: PA Application Config, PA Deployment Profile
- Product Beta types: PB Tenant Instance, PB Feature Flag

The prefix makes it immediately clear, when browsing or querying, which product a type belongs to.

## Shared Types vs Product-specific Types

Most types in a well-designed taxonomy are shared. Application, Server, Database, Product Version, Document, Person, and all lookup types are the same regardless of product. These should never carry a prefix.

Create product-specific types only when a product has a concept that genuinely does not apply to other products. If Product Alpha has a "Tenant Instance" concept but Product Beta does not, that is a candidate for a prefixed type.

Before creating a product-specific type, ask: could this concept apply to other products in the future? If yes, make it a shared type now. Renaming types later is more work than designing for reuse upfront.

## Organizing Multi-product Schemas

There are two approaches to multi-product schemas:

**Single schema, shared types.** All products share one schema. Product-specific data is distinguished by attribute values (e.g., an "application" attribute on Product Version that says which product the version belongs to), not by separate types. This is the simpler approach and works well when products are similar.

**Single schema, prefixed types.** All products share one schema, but product-specific types carry a prefix. Shared types remain unprefixed. This works when products have genuinely different concepts but you still want one CMDB for cross-product reporting.

CMDB-Kit's base and extended schemas follow the first approach: all types are shared and generic. When you extend the schema for your organization, you choose which approach fits your situation.

# Base Schema vs Extended Schema

## When to Start With Base and Grow

The base schema defines 20 types: 4 branch containers, 6 CI types, and 10 lookup types. Start with base when:

- You are new to CMDB and want to learn the concepts before adding complexity
- Your organization only needs core types (applications, servers, databases, components, versions, documents, deployments)
- You want to prove the value of the CMDB quickly with a small, focused scope
- You plan to add types incrementally as needs emerge

The base schema covers the fundamentals: what you build (Product CMDB), what you release (Product Library), who is involved (Directory), and the reference data that ties it together (Lookup Types).

## When to Start With Extended and Trim

The extended schema adds 39 more types on top of the base, bringing the total to 59. Start with extended when:

- You already know you need release management features (baselines, media, suites, distribution logs)
- You need change management and incident tracking in the CMDB
- You have compliance requirements (certifications, assessments)
- You manage multi-site deployments (deployment sites, distribution logs)
- You track IT assets (licenses, vendors, hardware models)

Starting with extended and removing what you do not need is often faster than starting with base and adding what you do need, because the extended schema has already worked out the relationships and lookup types for you.

## Side-by-side Comparison

The base schema covers:

```
Product CMDB (4 types)
  Application, Server, Database, Product Component

Product Library (3 types)
  Product Version, Document, Deployment

Directory (3 types)
  Organization, Team, Person

Lookup Types (10 types)
  Application Status, Version Status, Deployment Status,
  Environment Type, Document Type, Document State,
  Component Type, Priority, Organization Type, Deployment Role
```

The extended schema adds:

```
Product CMDB (+7 types)
  Hardware Model, Network Segment, Virtual Machine,
  License, Assessment, Feature

Product Library (+10 types)
  Baseline, Documentation Suite, Product Media, Product Suite,
  Certification, Deployment Site, Distribution Log,
  Change Request, Incident, SLA

Directory (+3 types)
  Location, Facility, Vendor

Lookup Types (+16 types)
  Change Type, Change Impact, Incident Severity, Incident Status,
  Certification Type, Certification Status, Assessment Type,
  Assessment Status, Network Type, Baseline Type, Baseline Status,
  License Type, License Status, Site Status, Vendor Status, SLA Status
```

Notice the pattern: every new CI type in the extended schema that has a status or classification field also adds the corresponding lookup type. When you add Incident, you also get Incident Severity and Incident Status. This pairing is deliberate and should be followed when you add your own types.

# Extending the Taxonomy With Custom Types

## The 5-step Process

When you need a type that does not exist in the base or extended schema, follow these five steps:

**Step 1: Add to schema-structure.json.** Create a new entry with the type name, parent, and description. Place it under the appropriate branch.

```json
{ "name": "Service Request", "parent": "Product Library", "description": "Internal or external service requests" }
```

**Step 2: Add attributes to schema-attributes.json.** Define the fields the type carries. Use the attribute type reference to choose the right field types.

```json
"Service Request": {
  "description": { "type": 0 },
  "requestType": { "type": 1, "referenceType": "Request Type" },
  "requestedBy": { "type": 1, "referenceType": "Person" },
  "requestDate": { "type": 0, "defaultTypeId": 4 },
  "status": { "type": 1, "referenceType": "Deployment Status" },
  "priority": { "type": 1, "referenceType": "Priority" }
}
```

**Step 3: Add to LOAD_PRIORITY.** Open `tools/lib/constants.js` and add the new type to the LOAD_PRIORITY array. Place it after all the types it references. Since Service Request references Person (Directory), Request Type (Lookup), Deployment Status (Lookup), and Priority (Lookup), it must come after all of those in the array.

**Step 4: Create the data file.** Create a JSON file in the data directory using kebab-case: `data/service-request.json`. Start with an empty array if you have no records yet:

```json
[]
```

**Step 5: Validate.** Run the validation tool to confirm everything connects correctly:

```bash
node tools/validate.js --schema schema/extended
```

If your new type references a lookup type that does not exist yet (like "Request Type" in the example above), you need to add that lookup type first, following the same five steps. Always add dependencies before dependents.

## Worked Example: Adding a Service Type

Suppose your organization wants to track IT services as a formal concept, separate from applications. A Service is a higher-level construct that might comprise multiple applications.

Step 1 - Add to schema-structure.json:

```json
{ "name": "Service", "parent": "Product CMDB", "description": "IT services delivered to the organization" }
```

Step 2 - Add attributes to schema-attributes.json:

```json
"Service": {
  "description": { "type": 0 },
  "serviceOwner": { "type": 1, "referenceType": "Team" },
  "applications": { "type": 1, "referenceType": "Application", "max": -1 },
  "status": { "type": 1, "referenceType": "Application Status" },
  "criticality": { "type": 1, "referenceType": "Priority" }
}
```

This reuses existing lookup types (Application Status and Priority) rather than creating new ones. Reuse keeps the schema lean.

Step 3 - Add to LOAD_PRIORITY in constants.js, after Application (since it references Application):

```javascript
'Application',
'Service',    // new - references Application, Team, Application Status, Priority
'Server',
```

Step 4 - Create `data/service.json`:

```json
[
  {
    "Name": "Customer Portal",
    "description": "Self-service portal for customer account management",
    "serviceOwner": "Platform Engineering",
    "applications": "CRM Core;API Gateway",
    "status": "Active",
    "criticality": "Critical"
  }
]
```

Step 5 - Validate:

```bash
node tools/validate.js --schema schema/extended
```

# Naming Conventions

## Title Case for Type Names

Every type name uses Title Case with spaces between words:

- Product Component (not productComponent, not product_component, not product-component)
- Deployment Site (not DeploymentSite, not deployment site)
- SLA (acronyms stay uppercase)

This is the display name users see in the CMDB interface. It is also the exact string used in the "name" field of schema-structure.json and as the key in schema-attributes.json.

Consistency matters because references between types use these exact names. If a Deployment's version attribute references "Product Version," that string must match the type name exactly, including case and spacing.

## camelCase for Attribute Names

Attribute names in schema-attributes.json and in data files use camelCase:

- versionNumber (not version_number, not VersionNumber)
- deployDate (not deploy_date, not DeployDate)
- affectedApplication (not affected_application)

The import adapter automatically converts camelCase to Title Case for display. So `deployDate` in the JSON becomes "Deploy Date" in the CMDB interface. You do not need to worry about display names; just write clean camelCase and the tooling handles the rest.

## kebab-case for Data File Names

Data files in the data/ directory use kebab-case derived from the type name:

- Product Version becomes `product-version.json`
- Deployment Site becomes `deployment-site.json`
- SLA becomes `sla.json`

The conversion rule is simple: lowercase the type name and replace spaces with hyphens.

The import script resolves file names to type names automatically. When it sees `product-version.json`, it knows to load those records as Product Version objects. If the file name does not match any type in the schema, the import skips it and warns.

# Real-world Examples

## How OvocoCRM Models a SaaS Product

The example data included with CMDB-Kit models OvocoCRM, a fictional SaaS CRM product. Here is how the taxonomy maps to a real product:

**Product CMDB branch.** OvocoCRM has six applications (CRM Core, API Gateway, Analytics Engine, Mobile API, Notification Service, Search Service) and six components (Contact Manager, Deal Pipeline, Email Integration, REST API, Webhook Service, Report Generator). Applications represent the running services. Components represent the deployable modules that compose them.

**Product Library branch.** OvocoCRM tracks five versions (2.0.0 through 2.3.1), forming a version chain through previousVersion references. Each version lists its components. Deployments record when versions reached staging and production. Documents, baselines, certifications, and media records round out the release management picture.

**Directory branch.** Three organizations (Ovoco Inc and two departments), four teams (Platform Engineering, Data Engineering, Mobile, QA), and eight people. Every CI that needs an owner, author, or deployer references these records.

**Lookup Types.** Ten base lookups and sixteen extended lookups provide the reference data. Application Status values (Active, Planned, Deprecated, Retired) give every application a clear lifecycle position. Environment Type values (Production, Staging, Development, QA, DR) ensure consistent environment naming across servers, databases, VMs, and deployments.

## Tracing a Single Feature From Requirement Through Deployment

To see how the taxonomy connects, follow the "Email Tracking" feature through the CMDB:

1. **Feature record.** "Email Tracking" is a Feature with description "Open and click tracking for sent emails," linked to version OvocoCRM 2.1.0, status Current, owned by Platform Engineering.

2. **Product Version.** OvocoCRM 2.1.0 has versionNumber "2.1.0," releaseDate 2025-09-01, status Previous, and lists six components. Its previousVersion is OvocoCRM 2.0.0.

3. **Components.** The version includes Email Integration (a Service component in the ovoco/email-integration repository, built with Go and IMAP/SMTP) among its components.

4. **Deployment.** "v2.3.0 Staging Deploy" and "v2.3.0 Production Deploy" show how a later version (which still includes Email Integration) moved through environments. Each deployment records who deployed it and when.

5. **People and teams.** Jordan Lee deployed v2.3.0 to both staging and production. Jordan is a Person record with a team reference. The team references an organization.

This trace crosses all four branches: Feature and Application (Product CMDB), Product Version and Deployment (Product Library), Person and Team (Directory), and Version Status and Environment Type (Lookup Types). That cross-branch connectivity is the whole point of the taxonomy. No single branch tells the complete story, but together they give you full traceability from a product capability through its release lifecycle to the people who delivered it.
