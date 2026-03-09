# Taxonomy Design

Every CMDB needs a classification system that organizes its configuration items into a navigable hierarchy. This classification system is the taxonomy. It determines what categories of things the CMDB tracks, how those categories relate to each other, and where each type sits in the overall tree. A poorly designed taxonomy leads to confusion, duplicated types, and wasted effort. A well-designed one makes the CMDB self-documenting: any user can browse the hierarchy and quickly find the type they need.

In CMDB-Kit, the taxonomy is defined in two schema files that work together:

- `schema-structure.json` declares the types and their parent-child hierarchy
- `schema-attributes.json` declares the fields (attributes) each type carries

These two files are the complete definition of what the CMDB holds. Every type you add to them becomes a category in the hierarchy. Every record you create in the data files is an instance filed into one of those categories.

This section explains how the taxonomy is organized, how to decide what becomes a type, and how to extend the schema for your own needs.

The design of a taxonomy also reflects how your organization thinks about its products over time. Configuration management tracks a product through its entire lifecycle, from development through introduction, growth, maturity, and eventual decline. A well-designed taxonomy supports all of these phases without restructuring. You do not add new types when a product matures; you populate types that were already waiting. During development, the Product Component and Document types are active. During growth, deployment tracking and compliance types come alive. During decline, the status fields on Product and Deployment Site records shift to "Deprecated" and "Retired." The taxonomy stays stable while the data evolves.

# The Branch Hierarchy

CMDB-Kit organizes all configuration items into top-level branches. These branches are themselves entries in `schema-structure.json`, but they exist purely as containers. You never create records for "Product CMDB" or "Directory." They are structural parents that group related types together.

The base and extended schemas use a four-branch hierarchy:

```
Product CMDB
Product Library
Directory
Lookup Types
```

The enterprise schema expands this to a nine-branch hierarchy under the root "Ovoco Portfolio CMDB":

```
OvocoCRM CMDB
OvocoAnalytics CMDB
Shared Services CMDB
Ovoco Library
Enterprise Architecture
Configuration Library
Financial
Directory
Lookup Types
```

Each branch serves a distinct purpose, and together the branches cover the full scope of configuration management: what you build, what you release, who is involved, and the reference data that ties it all together.

The branching model is a deliberate simplification. A flat list of a hundred unrelated types would be hard to navigate, hard to secure, and hard to maintain. Hierarchy solves these problems. Navigation becomes intuitive: an administrator looking for server records expands the relevant product CMDB branch and finds them immediately, without scrolling past document types and lookup values. Access control becomes natural: you can apply permissions at the branch level, restricting the Directory branch to HR and management or the library branches to release managers. And the grouping makes the schema self-documenting: all types under a library branch relate to release management, and all types under Directory relate to people and organizations.

## Product CMDB

The Product CMDB branch holds the technical infrastructure that makes your product work. These are the configuration items that operations teams monitor, developers deploy to, and architects design around.

In the base schema, this branch contains four types:

```json
{ "name": "Product", "parent": "Product CMDB", "description": "Software products and applications" }
{ "name": "Server", "parent": "Product CMDB", "description": "Compute instances and hosts" }
{ "name": "Database", "parent": "Product CMDB", "description": "Database instances" }
{ "name": "Product Component", "parent": "Product CMDB", "description": "Modular parts of a product" }
```

The Product type is the highest-level technical CI most teams care about. It represents a distinct software product or service. In the OvocoCRM example data, there are six products: CRM Core, API Gateway, Analytics Engine, Mobile API, Notification Service, and Search Service. Each one has its own deployment lifecycle, its own team ownership, and its own monitoring.

Here is the full attribute definition for Product from `schema-attributes.json`:

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

The `productType` attribute is free text (values like "Web Application" or "API Service"). The `owner` attribute is a single reference to a Team record. The `status` attribute references the Product Status lookup type, which holds lifecycle values like Active, Planned, Deprecated, and Retired. The `companionProducts` attribute is a multi-reference back to other Product records, allowing you to express relationships between products that work together.

Server represents a compute instance, whether physical hardware, a cloud VM, or a container host. Database records a database instance and references the Server it runs on. Product Component represents a modular part of a product, typically a deployable service, library, or module.

The distinction between Product and Product Component is scope. A Product is the whole service as seen by operations. A Product Component is one piece of it as seen by developers. The CRM Core product might contain the Contact Manager, Deal Pipeline, and Email Integration components.

The extended schema adds six more types to this branch: Hardware Model, Network Segment, Virtual Machine, License, Assessment, and Feature. These cover infrastructure catalog items, network topology, IT asset management, compliance evaluation, and product capability tracking.

## Product Library

The Product Library branch is the release management side of the CMDB. Where Product CMDB tracks what things are, Product Library tracks what was released, what documents describe it, where it was deployed, and what changed.

In the base schema, this branch contains three types:

```json
{ "name": "Product Version", "parent": "Product Library", "description": "Released software versions" }
{ "name": "Document", "parent": "Product Library", "description": "Controlled documentation" }
{ "name": "Deployment", "parent": "Product Library", "description": "Version deployed to an environment" }
```

Product Version is the anchor record for every release. Every other record in the Product Library ultimately traces back to a version. Its `previousVersion` attribute creates a self-referencing chain, so you can trace backward from the current release to the first. The `components` attribute is a multi-reference to Product Component, listing every component included in the version. In the data file, multi-references use semicolons: `"components": "Contact Manager;Deal Pipeline;Email Integration"`.

Document represents a controlled document tied to the product, covering architecture documents, runbooks, SOPs, release notes, and any other documentation that needs lifecycle management. Deployment records a specific instance of deploying a version to an environment; the combination of version, environment, and date makes each deployment record unique.

The extended schema adds eight more types: Baseline, Documentation Suite, Product Media, Product Suite, Certification, Deployment Site, Distribution Log, and SLA. These cover formal release management (baselines and media), compliance (certifications), multi-site distribution (deployment sites and distribution logs), and service level agreements.

The SLA type uses a `product` attribute rather than referencing infrastructure directly:

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

This means you can query the CMDB to answer questions like "which products have active SLAs?" without joining through intermediate infrastructure types.

## Directory

The Directory branch holds the people, organizations, and places that every other branch references. These are the "who" and "where" types. They tend to be loaded first (after lookup types) because many CI types reference them.

In the base schema, the Directory has three types:

```json
{ "name": "Organization", "parent": "Directory", "description": "Companies and departments" }
{ "name": "Team", "parent": "Directory", "description": "Engineering and operations teams" }
{ "name": "Person", "parent": "Directory", "description": "Team members and contacts" }
```

Organization can model corporate hierarchies through its `parentOrganization` self-reference. Teams group people within an organization and own products and components. Person sits at the center of many relationships, referenced by attributes like `author` on Document, `deployedBy` on Deployment, and `teamLead` on Team.

The extended schema adds Location (physical places like offices and data centers), Facility (specific areas within a location such as server rooms), and Vendor (third-party suppliers who provide licenses, hardware, and services).

The Directory branch may seem simple, but it is foundational. Because so many CI types reference Person, Team, and Organization, these records must be loaded early in the import process. The LOAD_PRIORITY array in `tools/lib/constants.js` places Directory types right after lookup types, ensuring that by the time Product, Document, or Deployment records are imported, the people and teams they reference already exist.

## Lookup Types

Lookup types are the reference data that gives CI fields their allowed values. Every lookup type sits under the Lookup Types branch, and each has only two attributes: Name and description. They hold simple records like:

```json
{ "Name": "Active", "description": "Currently in production use" }
```

The base schema includes ten lookup types:

```
Product Status, Version Status, Deployment Status, Environment Type,
Document Type, Document State, Component Type, Priority,
Organization Type, Deployment Role
```

The extended schema adds twelve more:

```
Certification Type, Certification Status, Assessment Type, Assessment Status,
Network Type, Baseline Type, Baseline Status, License Type, License Status,
Site Status, Vendor Status, SLA Status
```

Lookup types are always imported first because every other type depends on them for reference values. The pattern is consistent: every CI type that has a status or classification field also has a corresponding lookup type. This pairing is deliberate and should be followed when you add your own types.

The enterprise schema extends the lookup branch further with types like Service Type, Capability Status, Disposition, Library Item Type, Requirement Type, Requirement Status, Requirement Priority, Verification Method, Contract Status, and others. These support the additional branches and types that the enterprise schema introduces.

# CI Type vs Lookup Type vs Attribute

One of the most common design decisions when building a taxonomy is whether something should be a CI type, a lookup type, or an attribute on an existing type. Getting this wrong leads to either an over-complicated schema with types that should have been attributes, or a flat schema that buries important data inside free-text fields.

## When to Create a CI Type

Make something a CI type when it has its own lifecycle, its own attributes beyond a name, and you need to track individual records of it. A Server has a hostname, an IP address, an operating system, and goes through provisioning, active use, and decommissioning. It is clearly a CI type.

The test is whether you would want to query, filter, and report on this thing independently. If someone would ask "show me all servers in the production environment" or "which products are owned by CRM Platform Team," those are CI types. The things being queried (Server, Product) need to be first-class types in the schema.

Another indicator: if the thing participates in relationships with multiple other types, it should be a CI type. A Person is referenced by Document (as author), Deployment (as deployer), and Team (as lead). That web of relationships demands a dedicated type.

## When to Create a Lookup Type

Make something a lookup type when it is a fixed list of values used to classify or categorize other records. "Active, Planned, Deprecated, Retired" is a set of Product Status values. You would never add attributes like "owner" or "deployment date" to a status value. It is a lookup type.

If you find yourself wanting a dropdown or picklist on a CI form, that list should almost always be a lookup type. The benefits are significant:

- Consistent spelling and casing across all records (no "active" vs "Active" vs "ACTIVE")
- Values have descriptions that explain what they mean
- Adding a new value is a data change, not a schema change
- Multiple CI types can share the same lookup (Environment Type is used by Server, Database, Virtual Machine, and Deployment)

The sharing test is useful: if two different CI types would both benefit from the same set of values, it belongs in a shared lookup type.

## When to Make It an Attribute

When something is a characteristic of a CI rather than a thing in its own right, model it as an attribute. The technology stack of a product ("Node.js, React, PostgreSQL") is descriptive text. It has no lifecycle of its own, no independent attributes, and nobody queries for it as a standalone entity. It belongs as a text attribute on Product.

CMDB-Kit supports several attribute types:

- Text (`"type": 0`): Free-form text for descriptions, hostnames, URLs
- Date (`"type": 0, "defaultTypeId": 4`): A date value in YYYY-MM-DD format
- Integer (`"type": 0, "defaultTypeId": 1`): A whole number for quantities like license counts
- Boolean (`"type": 0, "defaultTypeId": 2`): A true/false value
- Single reference (`"type": 1, "referenceType": "TypeName"`): A link to one record of another type
- Multi-reference (`"type": 1, "referenceType": "TypeName", "max": -1`): A link to many records of another type

The guideline: if you can describe the thing as "the [attribute] of [CI]" and it sounds natural, it is an attribute. "The hostname of the server." "The release date of the version." "The status of the baseline." If instead you would say "the server's [thing] is a [thing] that also has its own [properties]," you need a separate type.

## Grey Areas and How to Resolve Them

Sometimes the decision is not obvious. A "technology stack" could be modeled as a free-text attribute on Product (simple), as a lookup type with values like "Node.js," "Python," "Go" (moderately structured), or as a full CI type with its own attributes for version, license, and end-of-life date (complex). The right answer depends on what questions you need to answer.

If you only need to know "what technology does this product use?" a text attribute is fine. If you need to ensure consistent naming across all products and filter by technology, a lookup type is better. If you need to track technology versions, license costs, and end-of-life dates independently of the products that use them, you need a CI type.

When in doubt, start with the simpler option. Promoting an attribute to a lookup type, or a lookup type to a CI type, is easier than demoting in the other direction, because demotion requires migrating existing records and references.

## A Worked Example

Consider whether "environment" should be a CI type, a lookup type, or an attribute.

An environment has a name (Production, Staging, Development, QA, DR) and a description. It does not have its own lifecycle, its own owner, or its own independent attributes. Multiple CI types need to reference the same set of environment values: Server, Database, Virtual Machine, Deployment, and Deployment Site all have an `environment` attribute.

This is a classic lookup type. The schema defines it as Environment Type under Lookup Types, and each of those CI types has a reference attribute pointing to it:

```json
"environment": { "type": 1, "referenceType": "Environment Type" }
```

If environments had their own capacity limits, cost centers, and approval workflows, they would be CI types. But they do not. They are classification values, so they are lookup types. This pattern repeats throughout the schema: whenever you see a set of short, descriptive values that categorize something else, you are looking at a lookup type.

# Parent-child Relationships

## How schema-structure.json Defines the Hierarchy

Each entry in `schema-structure.json` is an object with three fields:

```json
{ "name": "Database", "parent": "Product CMDB", "description": "Database instances" }
```

The `name` field is the type name in Title Case. This becomes the display name in the target database. The `parent` field is the name of the parent type, which must exactly match another entry's name. The root branches omit the parent field (or reference the root container in the enterprise schema). The `description` field is a brief explanation of what the type represents.

The parent field creates the tree structure that CMDB platforms render as a navigable hierarchy. The import adapter reads this field to create the correct parent-child relationships in the target database.

## When to Nest Types Under a Parent

Every type in `schema-structure.json` has a parent field (except the root branches). The parent determines where the type appears in the tree.

Nest a type under a parent when it belongs conceptually to that branch. Deployment belongs to Product Library because it is part of release management. Server belongs to Product CMDB because it is part of the technical infrastructure. Product Status belongs to Lookup Types because it is a reference data enumeration.

Keep types at the same level (siblings under the same parent) when they are peers in the same domain but are not subtypes of each other. Product, Server, Database, and Product Component are all siblings under Product CMDB. None is a child of another. This is a flat-within-branch design that keeps the hierarchy shallow and easy to navigate.

You should avoid deeply nesting types. A two-level hierarchy (branch, then type) is sufficient for most schemas. Adding a third level (branch, parent type, child type) is rarely needed and complicates navigation. If you find yourself wanting deep nesting, consider whether the child type should instead be a separate type at the same level, related by a reference attribute rather than by parent-child hierarchy.

For example, you might be tempted to nest Virtual Machine under Server, since VMs run on servers. But in CMDB-Kit, both are siblings under Product CMDB. The relationship between them is captured by the `server` reference attribute on Virtual Machine, not by the parent-child hierarchy. This keeps the tree flat while preserving the relationship in the data.

## Inheritance Considerations

Some CMDB platforms support attribute inheritance, where a child type automatically gets all attributes of its parent type. CMDB-Kit does not enforce this at the schema layer. Each type in `schema-attributes.json` declares exactly the attributes it has, with no implicit inheritance from parents.

This means if you nest a type under a parent, it does not automatically gain the parent's attributes. If you want shared attributes, you add them explicitly to each type.

The advantage of explicit attributes is clarity: reading a type's entry in `schema-attributes.json` tells you everything about it without tracing up the hierarchy. The cost is some repetition, which is acceptable for a well-defined schema.

When you deploy to a platform that does support inheritance, you can restructure the attribute assignments at that point. The CMDB-Kit schema serves as the canonical source of truth, and the adapter layer handles any platform-specific mappings.

# Base vs Extended vs Enterprise Schema

CMDB-Kit ships three schema tiers. Each tier builds on the previous one, adding types for increasingly sophisticated configuration management needs. You choose the tier that matches your organization's maturity and requirements.

## Base Schema

The base schema defines CI types and lookup types. The four branch containers (Product CMDB, Product Library, Directory, Lookup Types) are structural parents only and are not counted. This is the starting point for organizations that are new to CMDB or want a focused, minimal scope.

The base schema covers the fundamentals:

```
Product CMDB (4 CI types)
  Product, Server, Database, Product Component

Product Library (3 CI types)
  Product Version, Document, Deployment

Directory (3 CI types)
  Organization, Team, Person

Lookup Types (10 types)
  Product Status, Version Status, Deployment Status,
  Environment Type, Document Type, Document State,
  Component Type, Priority, Organization Type, Deployment Role
```

Start with the base when you want to prove the value of the CMDB quickly. It covers what you build (Product CMDB), what you release (Product Library), who is involved (Directory), and the reference data that ties it together (Lookup Types). You can always grow into the extended schema later by adding types incrementally.

## Extended Schema

The extended schema adds types on top of the base. It covers release management (baselines, media, suites, distribution logs), compliance (certifications, assessments), multi-site deployments (deployment sites, distribution logs), and IT asset management (licenses, vendors, hardware models).

The types added to each branch:

```
Product CMDB (+6 CI types)
  Hardware Model, Network Segment, Virtual Machine,
  License, Assessment, Feature

Product Library (+8 CI types)
  Baseline, Documentation Suite, Product Media, Product Suite,
  Certification, Deployment Site, Distribution Log, SLA

Directory (+3 CI types)
  Location, Facility, Vendor

Lookup Types (+12 types)
  Certification Type, Certification Status, Assessment Type,
  Assessment Status, Network Type, Baseline Type, Baseline Status,
  License Type, License Status, Site Status, Vendor Status, SLA Status
```

Notice the pattern: every new CI type that has a status or classification field also introduces the corresponding lookup type. When it adds License, it also adds License Type and License Status. This pairing keeps reference data organized and prevents free-text status fields from creeping in.

Start with the extended schema when you already know you need release management, compliance features, or multi-site deployment tracking. Starting with extended and removing what you do not need is often faster than starting with base and adding what you do need, because the extended schema has already worked out the relationships and lookup types for you.

## Enterprise Schema

The enterprise schema restructures the hierarchy into nine top-level branches under a root container ("Ovoco Portfolio CMDB"). Instead of a single Product CMDB branch, the enterprise schema introduces product-prefixed branches for each product in the portfolio:

- OvocoCRM CMDB (CR-prefixed types) for OvocoCRM engineering and operations CIs
- OvocoAnalytics CMDB (AN-prefixed types) for OvocoAnalytics engineering and operations CIs
- Shared Services CMDB (SS-prefixed types) for shared infrastructure

The Ovoco Library branch replaces Product Library and contains product-specific sub-branches (OvocoCRM Library, OvocoAnalytics Library) plus a Shared Library for cross-product records like SLA and Requirement. The enterprise schema adds Feature and Feature Implementation as product-prefixed types (CR Feature, CR Feature Implementation, AN Feature, AN Feature Implementation), along with Site Personnel Assignment for tracking personnel roles at deployment sites.

Three new branches cover domains that do not fit the product-centric model:

- Enterprise Architecture with Service, Capability, Business Process, and Information Object
- Configuration Library with the Library Item type for controlled software artifacts
- Financial with Contract and Cost Category for contractual and cost tracking

The enterprise schema adds a Requirement type in the Shared Library with formal attributes: requirementType (ref Requirement Type), status (ref Requirement Status), priority (ref Requirement Priority), source, verificationMethod (ref Verification Method), verifiedDate, and parentRequirement (self-referencing for decomposition). It also introduces numerous additional lookup types (Baseline Milestone, Build Status, Implementation Status, Requirement Type, Requirement Status, Requirement Priority, Verification Method, Contract Status, Disposition, Service Type, Capability Status, and more).

The enterprise schema is designed for large organizations with formal configuration management boards, multi-product portfolios, and regulatory compliance requirements. It supports patterns like the Technology Business Management (TBM) taxonomy for cost attribution, TIME model disposition analysis (Tolerate, Invest, Migrate, Eliminate), traceable requirements with verification methods, and the Feature Implementation freeze pattern for immutable per-release audit records.

Most organizations should start with the base or extended schema. Move to enterprise when you need multi-product portfolio management, service catalog modeling, capability mapping, formal requirements traceability, or financial tracking within the CMDB.

The enterprise schema also demonstrates an important design principle: new branches are added only when the types they contain genuinely belong to a different domain. Enterprise Architecture types (Service, Capability, Business Process) are not release artifacts, not infrastructure CIs, not people, and not reference data. They describe the organizational landscape at a strategic level. Creating a new branch for them is correct. If the types had been shoehorned into a product CMDB branch, the branch names would have become misleading. Similarly, splitting product-specific CIs into CR-prefixed and AN-prefixed branches keeps each product's configuration items cleanly separated while sharing Directory and Lookup Types across the portfolio.

## Choosing Between Tiers

The decision is not permanent. The schemas are additive, so you can start with base and grow into extended by adding types one at a time. The key considerations:

Start with base when you are new to CMDB, want a small scope to prove value quickly, or plan to add types incrementally as needs emerge.

Start with extended when you already know you need release management, compliance, multi-site deployments, or IT asset management.

Start with enterprise when you need service catalog modeling, capability mapping, formal requirements traceability, configuration library management, or financial tracking.

In all cases, you can remove types you do not need. Deleting a type from `schema-structure.json` and `schema-attributes.json` (and removing it from `LOAD_PRIORITY` in `tools/lib/constants.js`) is straightforward. The validation tool will tell you if any remaining types reference the deleted one through their attribute definitions.

Be careful when removing types that other types reference. If you remove Vendor, you must also remove or update the `vendor` attribute on License, since it references the Vendor type. The validation tool catches these orphaned references, so always run it after making structural changes.

# Extending the Taxonomy With Custom Types

When you need a type that does not exist in the base or extended schema, follow a five-step process.

The process is the same regardless of whether you are adding a CI type, a lookup type, or both. The key rule is that dependencies must exist before dependents: if your new type references another type, that referenced type must already be in the schema and earlier in the LOAD_PRIORITY array.

## Step 1: Add to schema-structure.json

Create a new entry with the type name, parent, and description. Place it under the appropriate branch:

```json
{ "name": "Service Request", "parent": "Product Library", "description": "Internal or external service requests" }
```

## Step 2: Add Attributes to schema-attributes.json

Define the fields the type carries. Use the attribute type reference to choose the right field types:

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

## Step 3: Add to LOAD_PRIORITY

Open `tools/lib/constants.js` and add the new type to the `LOAD_PRIORITY` array. Place it after all the types it references. Since Service Request references Person (Directory), Request Type (Lookup), Deployment Status (Lookup), and Priority (Lookup), it must come after all of those in the array.

## Step 4: Create the Data File

Create a JSON file in the data directory using kebab-case: `data/service-request.json`. The file name is derived from the type name by lowercasing and replacing spaces with hyphens. Start with an empty array if you have no records yet:

```json
[]
```

## Step 5: Validate

Run the validation tool to confirm everything connects correctly:

```bash
node tools/validate.js --schema schema/extended
```

If your new type references a lookup type that does not exist yet (like "Request Type" in the example above), you need to add that lookup type first, following the same five steps. Always add dependencies before dependents.

## Adding a Companion Lookup Type

Most CI types that carry a status or classification field need a corresponding lookup type. If you are adding a Service Request type with a `requestType` attribute, you should also add a Request Type lookup.

Add the lookup type to `schema-structure.json`:

```json
{ "name": "Request Type", "parent": "Lookup Types", "description": "Classification of service requests" }
```

Add it to `schema-attributes.json` with only a description attribute (the standard pattern for all lookup types):

```json
"Request Type": {
    "description": { "type": 0 }
}
```

Create its data file at `data/request-type.json`:

```json
[
    { "Name": "Access Request", "description": "Request for system access or permissions" },
    { "Name": "Information Request", "description": "Request for information or documentation" },
    { "Name": "Service Provisioning", "description": "Request to provision a new service" }
]
```

Add it to `LOAD_PRIORITY` before Service Request, since Service Request references it. Lookup types generally appear early in the priority array, ahead of all CI types.

## Worked Example: Adding an Integration Type

Suppose OvocoCRM needs to track its integrations with third-party systems. Each integration connects a Product to an external system, has a status, and records the protocol used.

First, add the type to `schema-structure.json`:

```json
{ "name": "Integration", "parent": "Product CMDB", "description": "Third-party system integrations" }
```

Next, add attributes to `schema-attributes.json`:

```json
"Integration": {
    "description": { "type": 0 },
    "product": { "type": 1, "referenceType": "Product" },
    "externalSystem": { "type": 0 },
    "protocol": { "type": 0 },
    "status": { "type": 1, "referenceType": "Product Status" },
    "owner": { "type": 1, "referenceType": "Team" }
}
```

This reuses the existing Product Status lookup (Active, Planned, Deprecated, Retired) rather than creating a new one. Reuse keeps the schema lean. The `product` attribute references the Product type, so when someone views the CRM Core product record, they can trace to all its integrations.

Add "Integration" to `LOAD_PRIORITY` in `constants.js`, after Product (since it references Product):

```javascript
'Product',
'Integration',    // new - references Product, Team, Product Status
'Server',
```

Create `data/integration.json`:

```json
[
    {
        "Name": "Salesforce Sync",
        "description": "Bidirectional contact sync with Salesforce",
        "product": "CRM Core",
        "externalSystem": "Salesforce",
        "protocol": "REST API",
        "status": "Active",
        "owner": "CRM Platform Team"
    },
    {
        "Name": "Stripe Billing",
        "description": "Payment processing integration",
        "product": "CRM Core",
        "externalSystem": "Stripe",
        "protocol": "Webhook",
        "status": "Active",
        "owner": "CRM Platform Team"
    }
]
```

Validate:

```bash
node tools/validate.js --schema schema/extended
```

# Naming Conventions

Consistent naming is critical because references between types use exact string matching. A typo in a type name or attribute name will cause import failures or broken references.

## Title Case for Type Names

Every type name uses Title Case with spaces between words:

- Product Component (not productComponent, not product_component, not product-component)
- Deployment Site (not DeploymentSite, not deployment site)
- SLA (acronyms stay uppercase)

This is the display name users see in the CMDB interface. It is also the exact string used in the `name` field of `schema-structure.json` and as the key in `schema-attributes.json`.

Consistency matters because references between types use these exact names. If a Deployment's `version` attribute references "Product Version," that string must match the type name exactly, including case and spacing. A reference to "product version" or "ProductVersion" will fail.

## camelCase for Attribute Names

Attribute names in `schema-attributes.json` and in data files use camelCase:

- versionNumber (not version_number, not VersionNumber)
- deployDate (not deploy_date, not DeployDate)
- affectedProduct (not affected_product, not AffectedProduct)
- productType (not product_type, not ProductType)

The import adapter automatically converts camelCase to Title Case for display. So `deployDate` in the JSON becomes "Deploy Date" in the CMDB interface. You do not need to worry about display names; just write clean camelCase and the tooling handles the rest.

## kebab-case for Data File Names

Data files in the `data/` directory use kebab-case derived from the type name:

- Product Version becomes `product-version.json`
- Deployment Site becomes `deployment-site.json`
- Product becomes `product.json`
- SLA becomes `sla.json`

The conversion rule: lowercase the type name and replace spaces with hyphens. Acronyms follow the same rule: SLA becomes `sla.json`, not `S-L-A.json`.

The import script resolves file names to type names automatically. When it sees `product-version.json`, it knows to load those records as Product Version objects. If the file name does not match any type in the schema, the import skips it and warns.

## Lookup Type Names Follow Their CI Type

Lookup type names follow a predictable pattern derived from the CI type and attribute they serve. The Product type has a `status` attribute that references "Product Status." The Baseline type has a `baselineType` attribute that references "Baseline Type."

This naming convention makes it easy to find the lookup type for any given attribute. If you see a `status` attribute on a type called "Widget," you can expect its lookup type to be "Widget Status."

## Reference Values Use Exact Name Matching

When a data record references another record, it uses the exact Name value from the referenced record. This is case-sensitive. If the Product Status lookup has a record with `"Name": "Active"`, then a Product record's status field must say `"Active"`, not `"active"` or `"ACTIVE"`.

For multi-reference fields, values are separated by semicolons in the data file. A Product Version that includes three components would have:

```json
"components": "Contact Manager;Deal Pipeline;Email Integration"
```

Each value between semicolons must exactly match the Name of a Product Component record.

# Real-world Examples

## How OvocoCRM Models a SaaS Product

The example data included with CMDB-Kit models OvocoCRM, a fictional SaaS CRM product. Here is how the taxonomy maps to a real product across all four branches.

In the Product CMDB branch, OvocoCRM has six products (CRM Core, API Gateway, Analytics Engine, Mobile API, Notification Service, Search Service) and six components (Contact Manager, Deal Pipeline, Email Integration, REST API, Webhook Service, Report Generator). Products represent the running services. Components represent the deployable modules that compose them. The `companionProducts` multi-reference on Product lets you express that the API Gateway and CRM Core work together.

In the Product Library branch, OvocoCRM tracks five versions (2.0.0 through 2.3.1), forming a version chain through `previousVersion` references. Each version lists its components. Deployments record when versions reached staging and production. Documents, baselines, certifications, and media records round out the release management picture.

In the Directory branch, three organizations (Ovoco Inc and two departments), four teams (CRM Platform Team, Analytics Platform Team, Mobile, QA), and eight people provide the human context. Every CI that needs an owner, author, or deployer references these records.

In the Lookup Types branch, ten base lookups and sixteen extended lookups provide the reference data. Product Status values (Active, Planned, Deprecated, Retired) give every product a clear lifecycle position. Environment Type values (Production, Staging, Development, QA, DR) ensure consistent environment naming across servers, databases, VMs, and deployments.

## Tracing a Single Feature From Requirement Through Deployment

To see how the taxonomy connects across branches, follow the "Email Tracking" feature through the CMDB:

The Feature record "Email Tracking" has a description of "Open and click tracking for sent emails," linked to version OvocoCRM 2.1.0, with status Current and owned by CRM Platform Team.

Product Version OvocoCRM 2.1.0 has versionNumber "2.1.0," releaseDate 2025-09-01, status Previous, and lists six components. Its previousVersion is OvocoCRM 2.0.0, creating the version chain.

Among the version's components is Email Integration, a Service component in the ovoco/email-integration repository, built with Go and IMAP/SMTP technology.

Deployment records show how a later version (which still includes Email Integration) moved through environments. "v2.3.0 Staging Deploy" and "v2.3.0 Production Deploy" each record who deployed it and when.

Jordan Lee deployed v2.3.0 to both staging and production. Jordan is a Person record with a team reference to CRM Platform Team, which references the Ovoco Engineering organization.

This trace crosses all four branches: Feature and Product (Product CMDB), Product Version and Deployment (Product Library), Person and Team (Directory), and Version Status and Environment Type (Lookup Types). That cross-branch connectivity is the whole point of the taxonomy. No single branch tells the complete story, but together they give you full traceability from a product capability through its release lifecycle to the people who delivered it.

## Mass Customization and Multi-site Deployment

Some organizations deliver the same product in many configurations, each tailored to a customer or environment. This creates specific configuration management challenges: each customer deployment may run a different version, the same component may be configured differently at each site, and documentation may need customer-specific variants.

The taxonomy handles this through the Deployment Site type. Rather than creating a separate Product type per customer, you create one Product and multiple Deployment Site records. Each Deployment Site links to a Location and tracks its own status and go-live date. The Distribution Log records which version was delivered to which site and when.

The separation between Location (a physical place in the Directory branch) and Deployment Site (a product instance at that place in the Product Library branch) is deliberate. One Location might host deployment sites for multiple products. The same product might have deployment sites at many locations. This many-to-many relationship is modeled through the reference attributes rather than through the type hierarchy.

## Product-specific Type Prefixes for Multi-product CMDBs

When your CMDB tracks multiple products that have genuinely different concepts, you can use type name prefixes to distinguish product-specific types from shared ones. A common convention is a two-letter prefix:

- Shared types: Product, Server, Database (no prefix)
- Product Alpha types: PA Deployment Profile, PA Tenant Config
- Product Beta types: PB Feature Flag, PB Region Setting

Most types in a well-designed taxonomy are shared. Product, Server, Database, Product Version, Document, Person, and all lookup types work across products. Create product-specific types only when a product has a concept that genuinely does not apply to other products.

Before creating a product-specific type, ask: could this concept apply to other products in the future? If yes, make it a shared type now. Renaming types later is more work than designing for reuse upfront.

CMDB-Kit's base and extended schemas follow the shared-types approach: all types are generic and product-agnostic. Two products share the same Product type but have different Product records. They share the same Product Version type but have different version records. Where products differ is in their data, not their types. This approach enables cross-product reporting without translation and means teams moving between products find a familiar structure. Shared lookup types like Environment Type and Document State enforce consistent vocabulary across all products, so "Production" means the same thing everywhere in the CMDB.
