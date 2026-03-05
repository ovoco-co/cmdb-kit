# Portfolio and Shared Services Management

When a single organization manages multiple products, the CMDB must serve them all without creating silos. The schema needs shared types that every product references and product-specific types that diverge where needed. Governance bodies must review changes that cross product boundaries. Lookup values must be consistent enough to enable cross-product reporting but flexible enough to accommodate product-specific needs. This chapter covers the patterns for managing a CMDB across a product portfolio and within a shared services department.


# Managing the CMDB Across a Program Portfolio

## One CMDB Schema vs Per-program Schemas

The first architectural decision is whether to use one schema for all products or a separate schema for each. Both approaches work, but they have different trade-offs.

One shared schema means all products see each other's types. Cross-product queries are simple because everything lives in the same schema. A single query can show all deployment sites across all products, all versions in flight across the portfolio, or all change requests affecting shared infrastructure. The cost is complexity: the schema has more types, and naming must be disciplined to avoid collisions.

Per-program schemas isolate each product completely. Each schema is simpler and self-contained. But cross-product queries require reaching across schemas, which most CMDB platforms make difficult. Shared types (organizations, locations, lookup values) must be duplicated in each schema, creating synchronization problems.

For most organizations, one shared schema with product prefixes is the better choice. The prefix pattern (described below) gives each product its own namespace within the shared schema while keeping shared types accessible to everyone.

## Modeling Programs as Organizational Units

In a multi-product portfolio, each product is typically managed by a distinct program or team. In the CMDB, model each program as an Organization or Team record in the Directory branch:

```json
{
  "Name": "OvocoCRM Program",
  "organizationType": "Department",
  "description": "Team responsible for OvocoCRM development and operations"
}
```

Product-specific types reference their program's Organization or Team as an owner. This enables queries like "show me all CIs owned by the OvocoCRM Program" or "show me all change requests from the OvocoAnalytics team."

## Scoping CI Ownership to Programs

Every CI should have a clear owner. In a multi-product portfolio, ownership follows the product prefix pattern:

- CR Product Version records are owned by the OvocoCRM Program
- AN Product Version records are owned by the OvocoAnalytics Program
- Shared infrastructure (TS-prefixed types) is owned by the Shared Services team

Ownership is tracked through reference attributes. The Team or Organization reference on a CI record identifies who is responsible for its accuracy and lifecycle management.

## Cross-program Dependencies and Shared CIs

Some CIs exist at the portfolio level rather than within any single product:

Shared infrastructure. Servers, databases, and networks that multiple products use. A shared authentication service or a common message queue serves all products and belongs to no single product.

Shared libraries. Code libraries used by multiple products. A common logging framework or a shared API client is a cross-product dependency.

Shared personnel. People who work across multiple products. A CM analyst who manages configuration for both OvocoCRM and OvocoAnalytics appears in both products' context.

These shared CIs need a home in the schema. The shared services prefix pattern (covered below) provides one.

## Portfolio-level Reporting From the CMDB

A portfolio manager needs views that span all products:

- All deployment sites across all products, with version and status
- All versions in pipeline (Beta or Planned) across the portfolio
- All change requests with cross-product impact
- All certifications approaching expiration, regardless of product

These queries work naturally in a single shared schema because all products live in the same namespace. A query like `objectType IN ("CR Deployment Site", "AN Deployment Site") AND "status" = "Active"` returns a portfolio-wide site inventory.


# Managing the CMDB Within a Shared Services Department

## Shared Services as the CMDB Custodian

In many organizations, a shared services department (or a CM team within one) manages the CMDB on behalf of all product teams. This team owns the schema design, maintains the import scripts, manages lookup values, and ensures data quality across the portfolio.

The shared services team does not own the product-specific CI data. Each product team owns its own Product Versions, Deployment Sites, and Components. But the shared services team owns the schema structure, the shared types (Directory, Lookup Types), and the shared infrastructure CIs.

## Separating Shared Infrastructure From Program-specific CIs

The product prefix pattern creates clear boundaries. In a three-product portfolio with shared services:

```
Product CMDB
├── CR CMDB (OvocoCRM product CIs)
│   ├── CR Application
│   ├── CR Server
│   └── CR Product Component
├── AN CMDB (OvocoAnalytics product CIs)
│   ├── AN Application
│   ├── AN Server
│   └── AN Product Component
└── TS CMDB (shared services infrastructure)
    ├── TS Application
    ├── TS Server
    └── TS Virtual Machine
```

The TS (shared services) prefix marks infrastructure that serves the entire portfolio: the Jira instance, the Confluence server, the CI/CD pipeline, the shared monitoring stack. These CIs do not belong to any single product.

Product-prefixed types (CR, AN) hold CIs specific to that product. A CR Server is a server that runs only OvocoCRM workloads. A TS Server runs shared infrastructure.

## Modeling Shared Services in the Directory Branch

The Directory branch remains unprefixed because organizations, teams, people, locations, and facilities are inherently shared. The OvocoCRM Program team and the OvocoAnalytics Program team are both Organization records in the same Directory branch.

If the shared services department itself is an organizational unit, model it as an Organization:

```json
{
  "Name": "CMDB Shared Services",
  "organizationType": "Department",
  "description": "Manages CMDB schema, shared infrastructure, and cross-product services"
}
```

## Service Catalog Alignment for Shared Services

A shared services department typically offers defined services to its product teams:

- CMDB schema management (adding types, modifying attributes, managing lookups)
- Data import and export (running the import scripts, generating reports)
- Platform administration (managing JSM Assets, Jira, Confluence)
- Media distribution (handling DML operations for all products)

Each service can be tracked as a CI if the organization wants to formalize its service catalog. The Service type discussed in the Enterprise Architecture chapter provides a model.

## Intake Process for New CI Types Requested by Programs

When a product team needs a new type in the schema, they submit a request to the shared services team. The intake process:

1. Product team describes the new type: name, purpose, proposed attributes, parent branch
2. Shared services team reviews for overlap (does an existing type already cover this?) and naming compliance
3. If the type is product-specific, it gets a product prefix (e.g., CR Feature Implementation)
4. If the type is shared, it goes in the appropriate shared branch
5. The type is added to schema-structure.json, schema-attributes.json, and LOAD_PRIORITY
6. A data file is created
7. Validation runs against the updated schema
8. The change is committed separately from data changes (per the git workflow rule)

## Access Control and Ownership Boundaries

In a shared schema, access control prevents product teams from modifying each other's data:

- The OvocoCRM team can read and write CR-prefixed types
- The OvocoAnalytics team can read and write AN-prefixed types
- The shared services team can read and write TS-prefixed types and all shared types
- Everyone can read the Directory and Lookup Types branches
- Only the shared services team can modify Lookup Types

In JSM Assets, this maps to object type-level permissions. Each product team gets a role with write access to their prefixed types and read access to everything else.


# When to Use a Global Lookup

## What Makes a Lookup Global vs Program-specific

A global lookup has values that must mean the same thing across all products. Site Status (Active, Provisioning, Maintenance, Decommissioned) should be consistent whether you are looking at a CR Deployment Site or an AN Deployment Site. If "Active" means "operational" for one product but "in development" for another, cross-product queries produce nonsense.

A program-specific lookup has values that only one product needs. If OvocoCRM tracks CRM editions (Standard, Professional, Enterprise) and OvocoAnalytics tracks analytics tiers (Basic, Advanced, Premium), these are product-specific lookups. Neither set of values makes sense for the other product.

## Global Lookups: Values That Must Be Consistent Across All Programs

All status lookups should be global: Application Status, Version Status, Deployment Status, Document State, Baseline Status, Certification Status, Site Status, and others. These represent lifecycle stages that are universal across products.

All classification lookups that apply to shared types should be global: Environment Type, Organization Type, Priority, and similar types that multiple products reference.

The test: if a dashboard shows this lookup value next to records from different products, would the value mean the same thing? If yes, it is global.

## Program-specific Lookups: Values That Only One Program Needs

Create a program-specific lookup when:

- The values only apply to one product's types
- Other products would never reference these values
- Mixing these values with another product's values would cause confusion

Name program-specific lookups with the product prefix: "CR CRM Edition" rather than "CRM Edition." The prefix makes it clear that this lookup belongs to a specific product.

## Decision Criteria for Global vs Scoped Lookups

When you are unsure whether a lookup should be global or scoped, ask:

1. Do multiple products reference this lookup type? If yes, it must be global.
2. Could this lookup type be useful to future products? If likely, make it global.
3. Are the values truly universal, or do they carry product-specific meaning? If universal, global. If product-specific, scoped.

When in doubt, start global. You can always split a global lookup into product-specific lookups later if the values diverge. Merging multiple product-specific lookups into one global lookup is harder because you need to update all the references.

## Managing Global Lookup Changes Across Consumers

When a global lookup value changes (renamed, split, or deprecated), every product that references it is affected. The change management process:

1. Propose the change with impact analysis: which products reference this lookup, how many CI records use the affected value?
2. Review with all affected product teams. A change to Site Status affects every product's Deployment Sites.
3. Apply the change and update all references in a coordinated release.
4. Validate that no orphaned references remain.

For adding a new value to a global lookup, the process is lighter. Adding "Suspended" to Site Status does not affect existing records; it just makes a new value available. But even additions should be communicated to all product teams so they know the new value exists.

## Governance for Adding Values to Global Lookups

Establish a simple governance process:

- Product teams can propose new lookup values
- The shared services team reviews proposals for consistency and naming
- Values that overlap with existing values are rejected (use the existing value instead)
- Descriptions are required for every new value
- Changes are tracked in git commits with clear messages

This governance does not need to be heavy. A brief review by the shared services team before each lookup change is sufficient.


# Practical Patterns

## A Shared Services Team Running One Schema for Multiple Programs

The most common pattern: one shared services team manages one schema for all products. The schema uses product prefixes:

```
Schema Root
├── Product CMDB
│   ├── CR CMDB (OvocoCRM)
│   │   ├── CR Application
│   │   ├── CR Server
│   │   └── CR Product Component
│   ├── AN CMDB (OvocoAnalytics)
│   │   ├── AN Application
│   │   └── AN Product Component
│   └── TS CMDB (Shared Services)
│       ├── TS Application
│       └── TS Server
├── Product Library
│   ├── CR Library
│   │   ├── CR Product Version
│   │   ├── CR Deployment Site
│   │   └── CR Distribution Log
│   └── AN Library
│       ├── AN Product Version
│       ├── AN Deployment Site
│       └── AN Distribution Log
├── Directory (shared, no prefix)
│   ├── Organization
│   ├── Team
│   ├── Person
│   └── Location
└── Lookup Types (shared, no prefix)
    ├── Application Status
    ├── Version Status
    └── (all other lookups)
```

LOAD_PRIORITY lists shared types first (all lookups, then Directory types), then TS shared services types, then product-specific types in any order. Within a product, dependencies come before dependents as usual.

## A Program Team Extending the Shared Schema With Program-specific Types

When a product team needs a type that does not exist in the shared schema:

1. They define the type with their product prefix (e.g., "CR Feature Implementation")
2. They define its attributes, which may reference both shared types and product-specific types
3. The shared services team adds it to the schema and LOAD_PRIORITY
4. The product team creates and maintains the data file

The product team owns the data. The shared services team owns the schema structure. This separation prevents product teams from making incompatible schema changes while giving them control over their own CI records.

## Keeping Shared Lookups in Sync Across Multiple Schema Directories

If your organization maintains multiple schema directories (base and extended, or separate directories for different deployment targets), shared lookups must stay in sync. A value added to Site Status in the extended schema should also appear in the base schema if the base schema uses it.

Two approaches:

Single source of truth. Maintain lookup data files in one location and copy or symlink them to other schema directories. This guarantees consistency.

Validation checks. Run a comparison script that verifies lookup values match across schema directories. Flag any discrepancies for resolution.

## The OvocoCRM Example: Shared Platform Team and Product Teams

Ovoco Inc runs two products: OvocoCRM and OvocoAnalytics. The company has:

A Platform Engineering team (shared services) that manages the CMDB schema, shared infrastructure (CI/CD pipeline, monitoring, authentication service), and cross-product coordination.

A CRM Team that owns OvocoCRM-specific CIs: the CRM application, its components, its deployment sites, its versions, and its distribution logs.

An Analytics Team that owns OvocoAnalytics-specific CIs: the analytics application, its data pipeline components, its deployment sites, and its versions.

Both products deploy to the same set of customers. Acme Corp runs both OvocoCRM and OvocoAnalytics. In the CMDB:

- One Organization record: "Acme Corp"
- One CR Deployment Site: "CR Acme Corp" (OvocoCRM v2.3.1, Active)
- One AN Deployment Site: "AN Acme Corp" (OvocoAnalytics v1.0.0, Provisioning)

The shared lookups (Site Status, Environment Type, Version Status) are the same for both products. When a portfolio dashboard shows "all active deployment sites," it queries both CR Deployment Site and AN Deployment Site in one view.

When the Platform Engineering team upgrades the shared authentication service, the change request is reviewed by a cross-product governance body (similar to a Joint CM Working Group) because it affects both products. The change gets a TS prefix because it modifies shared infrastructure. Both product teams are notified because the change touches their dependency chain.

This pattern scales. Adding a third product (OvocoInsights, prefix OI) means adding OI-prefixed types to the schema, creating a new branch under Product CMDB and Product Library, and giving the new product team write access to their prefixed types. The shared types, shared lookups, and governance processes stay the same.
