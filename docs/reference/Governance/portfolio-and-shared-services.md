# Portfolio and Shared Services

When a single organization manages multiple products, the CMDB must serve them all without creating silos. The schema needs shared types that every product references and product-specific types that diverge where needed. Lookup values must be consistent enough to enable cross-product reporting but flexible enough to accommodate product-specific needs. This section covers the patterns for managing a CMDB across a product portfolio and within a shared services department.


# Managing the CMDB Across a Program Portfolio

## One Schema vs Per-program Schemas

The first architectural decision is whether to use one schema for all products or a separate schema for each. Both approaches work, but they have different trade-offs.

One shared schema means all products see each other's types. Cross-product queries are simple because everything lives in the same namespace. A single query can show all deployment sites across all products, all versions in flight across the portfolio, or all change requests affecting shared infrastructure. The cost is complexity: the schema has more types, and naming must be disciplined to avoid collisions.

Per-program schemas isolate each product completely. Each schema is simpler and self-contained. But cross-product queries require reaching across schemas, which most CMDB platforms make difficult. Shared types (organizations, locations, lookup values) must be duplicated in each schema, creating synchronization problems.

For most organizations, one shared schema with product prefixes is the better choice. The prefix pattern (described below) gives each product its own namespace within the shared schema while keeping shared types accessible to everyone.

## Modeling Programs as Organizational Units

In a multi-product portfolio, each product is typically managed by a distinct program or team. In the CMDB, model each program as an Organization or Team record in the Directory branch. The enterprise schema defines Organization with an `orgType` attribute that references Organization Type, so you can classify each program using values like "Engineering" or "Operations."

In the OvocoCRM example data, Ovoco Inc has two child organizations: Ovoco Engineering and Ovoco Operations. Each organization contains teams that own specific products. The enterprise schema's team structure looks like this:

```json
{
  "Name": "CRM Platform Team",
  "description": "OvocoCRM core platform development",
  "organization": "Ovoco Engineering",
  "teamLead": "Sarah Chen"
}
```

```json
{
  "Name": "Analytics Platform Team",
  "description": "OvocoAnalytics development",
  "organization": "Ovoco Engineering",
  "teamLead": "Michael Torres"
}
```

Product-specific types reference their program's Organization or Team as an owner. The Product type has an `owner` attribute that references Team, so a query like "show me all Products owned by CRM Platform Team" works directly against the schema.

## Scoping CI Ownership to Programs

Every CI should have a clear owner. In a multi-product portfolio, ownership follows the product prefix pattern:

- CR-prefixed types are owned by the CRM Platform Team and CRM Operations
- AN-prefixed types are owned by the Analytics Platform Team and Analytics Operations
- SS-prefixed types (shared services infrastructure) are owned by the Infrastructure Team

Ownership is tracked through reference attributes. The Product type's `owner` attribute references Team. Product Component also has an `owner` attribute referencing Team. These references identify who is responsible for each CI's accuracy and lifecycle management.

## Cross-program Dependencies and Shared CIs

Some CIs exist at the portfolio level rather than within any single product:

Shared infrastructure. Servers, databases, and networks that multiple products use. The enterprise schema tracks these as SS-prefixed types: SS Product (Jira, Confluence, Jenkins, Grafana), SS Server, SS Virtual Machine, and SS Network Segment. These shared tools serve the entire portfolio, not just one product.

Shared services. The enterprise schema defines Service CIs that span products. The "Notification Delivery" service is owned by the Infrastructure Team but used by both OvocoCRM and OvocoAnalytics. The "CRM Platform Hosting" service is a technical service supporting the CRM product line.

Shared personnel. People who work across multiple products. A CM analyst who manages configuration for both OvocoCRM and OvocoAnalytics appears in both products' context. The Person type has a `team` attribute referencing Team, but a person may serve multiple programs. The Release Engineering team works across both product lines.

These shared CIs need a home in the schema. The shared services prefix pattern (covered below) provides one.

## Portfolio-level Reporting

A portfolio manager needs views that span all products:

- All deployment sites across all products, with status and environment type
- All versions with a "Beta" or "Current" status across the portfolio (referencing Version Status values)
- All SLAs with cross-product scope
- All certifications approaching expiration, regardless of product

These queries work naturally in the enterprise schema because all products live in the same namespace under the "Ovoco Portfolio CMDB" root. In a prefixed schema, a query like `objectType IN ("CR Deployment Site", "AN Deployment Site") AND status = "Active"` returns a portfolio-wide site inventory using the Site Status lookup values.


# Shared Services as CMDB Custodian

## The Shared Services Role

In many organizations, a shared services department (or a CM team within one) manages the CMDB on behalf of all product teams. This team owns the schema design, maintains the import scripts, manages lookup values, and ensures data quality across the portfolio.

The shared services team does not own the product-specific CI data. Each product team owns its own Product Versions, Deployment Sites, and Product Components. But the shared services team owns the schema structure, the shared types (Directory, Lookup Types), and the shared infrastructure CIs.

In the OvocoCRM example, the Infrastructure Team (under Ovoco Operations) fills this role, owning shared products like SS Jira, SS Confluence, SS Jenkins, and SS Grafana. The Release Engineering team (under Ovoco Engineering) manages build, release, and configuration management across both product lines.

## Separating Shared Infrastructure From Program-specific CIs

The product prefix pattern creates clear boundaries. In the enterprise schema with its nine branches:

```
Ovoco Portfolio CMDB
+-- OvocoCRM CMDB (CR-prefixed product CIs)
|   +-- CR Product
|   +-- CR Server
|   +-- CR Product Component
|   +-- CR Hardware Model
|   +-- CR Virtual Machine
|   +-- CR Assessment
|   +-- CR License
+-- OvocoAnalytics CMDB (AN-prefixed product CIs)
|   +-- AN Product
|   +-- AN Product Component
|   +-- AN Assessment
|   +-- AN License
+-- Shared Services CMDB (SS-prefixed infrastructure)
    +-- SS Product
    +-- SS Server
    +-- SS Virtual Machine
    +-- SS Network Segment
    +-- SS Hardware Model
    +-- SS Document
    +-- SS Certification
    +-- SS Assessment
    +-- SS License
```

The SS (shared services) prefix marks infrastructure that serves the entire portfolio: SS Jira, SS Confluence, SS Jenkins, and SS Grafana. These CIs do not belong to any single product.

Product-prefixed types (CR, AN) hold CIs specific to that product. A CR Server is a server that runs only OvocoCRM workloads. An SS Server runs shared infrastructure.

## Modeling Shared Services in the Directory Branch

The Directory branch remains unprefixed because organizations, teams, people, locations, and facilities are inherently shared. In the enterprise schema, Directory contains Organization, Team, Person, Location, Facility, and Vendor, all without product prefixes.

The shared services function is modeled through the organizational hierarchy. Ovoco Operations is the parent organization for operational teams:

```json
{
  "Name": "Ovoco Operations",
  "description": "Ovoco IT operations division",
  "orgType": "Operations",
  "parentOrganization": "Ovoco Inc"
}
```

The Infrastructure Team, which manages shared services infrastructure, belongs to Ovoco Operations. Its `organization` attribute references "Ovoco Operations" in the Organization data.

## Service Catalog Alignment

A shared services department typically offers defined services to its product teams. In the enterprise schema, these services are tracked as Service CIs under the Enterprise Architecture branch:

- "CRM Platform Hosting" (Technical Service, owned by Infrastructure Team, supporting Platform Operations capability)
- "Notification Delivery" (Shared Service, owned by Infrastructure Team, supporting Customer Communication capability)
- CMDB schema management (adding types, modifying attributes, managing lookups)
- Platform administration (managing SS Jira, SS Confluence, SS Jenkins, SS Grafana)

The enterprise schema includes a Service type, Capability type, and Business Process type for formalizing the service catalog and linking it to organizational capabilities.

## Intake Process for New Types

When a product team needs a new type in the schema, they submit a request to the shared services team. The intake process follows these steps.

The product team describes the new type: name, purpose, proposed attributes, and parent branch. The shared services team reviews for overlap (does an existing type already cover this?) and naming compliance.

If the type is product-specific, it gets a product prefix (for example, "CR Feature"). If the type is shared, it goes in the appropriate shared branch.

The type is added to `schema-structure.json` and `schema-attributes.json`. It is also added to `LOAD_PRIORITY` in `tools/lib/constants.js`, respecting dependency order so that referenced types appear before the new type. A data file is created using kebab-case naming. Validation runs against the updated schema with `node tools/validate.js --schema <dir>`. The change is committed separately from data changes, following the git workflow rule.

## Access Control and Ownership Boundaries

In a shared schema, access control prevents product teams from modifying each other's data:

- The CRM Platform Team and CRM Operations can read and write CR-prefixed types
- The Analytics Platform Team and Analytics Operations can read and write AN-prefixed types
- The Infrastructure Team can read and write SS-prefixed types and all shared types
- Everyone can read the Directory and Lookup Types branches
- Only the shared services team can modify Lookup Types

In JSM Assets, this maps to object type-level permissions. Each product team gets a role with write access to their prefixed types and read access to everything else.


# Global vs Program-specific Lookups

## What Makes a Lookup Global

A global lookup has values that must mean the same thing across all products. Site Status (Active, Provisioning, Maintenance, Decommissioned) should be consistent whether you are looking at a CR Deployment Site or an AN Deployment Site. If "Active" means "operational" for one product but "in development" for another, cross-product queries produce nonsense.

A program-specific lookup has values that only one product needs. If OvocoCRM tracks CRM editions (Standard, Professional, Enterprise) and OvocoAnalytics tracks analytics tiers (Basic, Advanced, Premium), these are product-specific lookups. Neither set of values makes sense for the other product.

## Global Lookups in the Schema

The enterprise schema defines its lookup types under Lookup Types, and all of them should be global. The status lookups include:

- Product Status (Active, Legacy, Planned, Retired)
- Version Status (Current, Beta, Previous, Deprecated, Retired)
- Deployment Status
- Site Status (Active, Provisioning, Maintenance, Decommissioned)
- Document State
- Baseline Status
- Certification Status
- License Status
- Vendor Status
- SLA Status
- Capability Status
- Contract Status
- Assessment Status
- Distribution Status
- Build Status
- Implementation Status
- Requirement Status

Classification lookups that apply to shared types should also be global: Environment Type, Organization Type, Priority, Component Type, Disposition (the TIME model: Tolerate, Invest, Migrate, Eliminate), and similar types that multiple products reference.

The test: if a dashboard shows this lookup value next to records from different products, would the value mean the same thing? If yes, it is global.

## Program-specific Lookups

Create a program-specific lookup when:

- The values only apply to one product's types
- Other products would never reference these values
- Mixing these values with another product's values would cause confusion

Name program-specific lookups with the product prefix: "CR CRM Edition" rather than "CRM Edition." The prefix makes it clear that this lookup belongs to a specific product.

## Decision Criteria

When you are unsure whether a lookup should be global or scoped, ask these questions:

Do multiple products reference this lookup type? If yes, it must be global.

Could this lookup type be useful to future products? If likely, make it global.

Are the values truly universal, or do they carry product-specific meaning? If universal, global. If product-specific, scoped.

When in doubt, start global. You can always split a global lookup into product-specific lookups later if the values diverge. Merging multiple product-specific lookups into one global lookup is harder because you need to update all the references.

## Managing Global Lookup Changes

When a global lookup value changes (renamed, split, or deprecated), every product that references it is affected. The change management process involves four steps.

Propose the change with impact analysis: which products reference this lookup, and how many CI records use the affected value?

Review with all affected product teams. A change to Site Status affects every product's Deployment Sites.

Apply the change and update all references in a coordinated release.

Validate that no orphaned references remain.

For adding a new value to a global lookup, the process is lighter. Adding "Suspended" to Site Status does not affect existing records; it just makes a new value available. But even additions should be communicated to all product teams so they know the new value exists.

## Governance for Lookup Values

Establish a simple governance process:

- Product teams can propose new lookup values
- The shared services team reviews proposals for consistency and naming
- Values that overlap with existing values are rejected (use the existing value instead)
- Descriptions are required for every new value, matching the format used in lookup data files
- Changes are tracked in git commits with clear messages


# Practical Patterns

## One Schema for Multiple Programs

The most common pattern: one shared services team manages one schema for all products. The schema uses product prefixes. The tree below shows how this maps to the enterprise schema's nine branches:

```
Ovoco Portfolio CMDB
+-- OvocoCRM CMDB
|   +-- CR Product
|   +-- CR Server
|   +-- CR Product Component
|   +-- CR Feature
|   +-- CR Feature Implementation
+-- OvocoAnalytics CMDB
|   +-- AN Product
|   +-- AN Product Component
|   +-- AN Feature
+-- Shared Services CMDB
|   +-- SS Product
|   +-- SS Server
|   +-- SS Virtual Machine
|   +-- SS Certification
|   +-- SS License
+-- Ovoco Library
|   +-- Site (shared across products)
|   +-- OvocoCRM Library
|   |   +-- CR Product Version
|   |   +-- CR Deployment Site
|   |   +-- CR Baseline
|   |   +-- CR Distribution Log
|   +-- OvocoAnalytics Library
|   |   +-- AN Product Version
|   |   +-- AN Deployment Site
|   |   +-- AN Distribution Log
|   +-- Shared Library
|       +-- SLA
|       +-- Requirement
+-- Enterprise Architecture
|   +-- Service
|   +-- Capability
|   +-- Business Process
|   +-- Information Object
+-- Configuration Library
|   +-- Library Item
+-- Financial
|   +-- Contract
|   +-- Cost Category
+-- Directory (shared, no prefix)
|   +-- Organization
|   +-- Team
|   +-- Person
|   +-- Location
|   +-- Facility
|   +-- Vendor
+-- Lookup Types (shared)
    +-- Product Status
    +-- Version Status
    +-- Site Status
    +-- Disposition
    +-- (44 other lookups)
```

The LOAD_PRIORITY array in `tools/lib/constants.js` lists shared types first (all lookups, then Directory types), then SS shared services types, then product-specific types in any order. Within a product, dependencies come before dependents as usual.

## Extending the Shared Schema With Program-specific Types

When a product team needs a type that does not exist in the shared schema:

The team defines the type with their product prefix (for example, "CR Feature"). The team defines its attributes, which may reference both shared types and product-specific types. The shared services team adds it to `schema-structure.json`, `schema-attributes.json`, and the LOAD_PRIORITY array. The product team creates and maintains the data file.

The product team owns the data. The shared services team owns the schema structure. This separation prevents product teams from making incompatible schema changes while giving them control over their own CI records.

## Keeping Lookups in Sync Across Schema Directories

If your organization maintains multiple schema directories (base, extended, and enterprise, or separate directories for different deployment targets), shared lookups must stay in sync. A value added to Site Status in the enterprise schema should also appear in the base schema if the base schema uses it.

Two approaches work here.

Single source of truth. Maintain lookup data files in one location and copy or symlink them to other schema directories. This guarantees consistency.

Validation checks. Run a comparison script that verifies lookup values match across schema directories. Flag any discrepancies for resolution.

## The OvocoCRM Example

Ovoco Inc runs OvocoCRM and OvocoAnalytics as a two-product portfolio. The company has:

Ovoco Engineering with the CRM Platform Team (owns CR Core Platform, CR API Gateway, CR Search Service, CR Authentication Module), the Analytics Platform Team (owns AN Analytics Engine, AN Data Pipeline, AN Dashboard Service), and Release Engineering (manages build, release, and configuration management across both product lines).

Ovoco Operations with CRM Operations (OvocoCRM deployment and site operations), Analytics Operations (OvocoAnalytics deployment and operations), and the Infrastructure Team (shared infrastructure and DevOps, owning SS Jira, SS Confluence, SS Jenkins, SS Grafana).

Both products deploy to the same set of customers. Acme Corporation runs both OvocoCRM and OvocoAnalytics. In the CMDB:

- One Organization record: "Acme Corporation" (orgType: "Customer")
- One CR Deployment Site: "CR Acme Corporation Production" (status: "Active", environment: "Production")
- One AN Deployment Site: "AN Acme Corporation Production" (status: "Provisioning", environment: "Production")

The shared lookups (Site Status, Environment Type, Version Status, Product Status) are the same for both products. When a portfolio dashboard shows "all active deployment sites," it queries both CR Deployment Site and AN Deployment Site in one view.

When the Infrastructure Team upgrades SS Jira or SS Jenkins, the change request is reviewed by a cross-product governance body because it affects both products. The change gets an SS prefix because it modifies shared infrastructure. Both product teams are notified because the change touches their dependency chain. Financial tracking through Contract CIs (such as "Ovoco Cloud Infrastructure Agreement" or "Ovoco Support Contract") connects vendor relationships to the shared services infrastructure.

This pattern scales. Adding a third product (OvocoInsights, prefix OI) means adding OI-prefixed types to the schema, creating a new branch under the portfolio root and the Ovoco Library, and giving the new product team write access to their prefixed types. The shared types, shared lookups, Enterprise Architecture branch, and governance processes stay the same.
