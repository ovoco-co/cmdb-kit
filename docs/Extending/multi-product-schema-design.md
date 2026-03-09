# Multi-Product Schema Design

<!-- outline-v2 section 02-02 -->

CMDB-Kit's single-product schema works well when one application is all you manage. The moment a second product enters the portfolio, every product-specific type needs its own copy so that references, deployment sites, and release pipelines stay isolated. This section explains the product-prefix strategy used in the enterprise schema, walks through the rules for shared versus prefixed types, and provides a step-by-step guide for adding a third product.

All examples below are drawn from the actual enterprise schema files in `schema/enterprise/`.

## Product-Prefixed Type Strategy

Each product in the portfolio receives a short uppercase prefix that is prepended to every product-specific type name. The enterprise schema uses three prefixes:

| Prefix | Product | Description |
|--------|---------|-------------|
| CR | OvocoCRM | The flagship CRM platform |
| AN | OvocoAnalytics | The analytics and reporting product |
| SS | Shared Services | Internal tools and shared infrastructure |

The prefix becomes part of the type name with a space separator: `CR Product`, `AN Deployment Site`, `SS Server`. This convention keeps types visually grouped in alphabetical listings and makes AQL/IQL queries unambiguous when filtering across product boundaries.

Choosing a prefix:

- Two or three uppercase letters, derived from the product name.
- Short enough to keep type names readable (avoid four-letter prefixes).
- Unique across the portfolio. Check existing prefixes before assigning.
- Document the mapping in a central location (your schema README or wiki).

The prefix applies to the type name in `schema-structure.json`, the key in `schema-attributes.json`, the data file name (kebab-case: `cr-product.json`), and the entry in `LOAD_PRIORITY`.

## Schema Hierarchy for Multi-Product

The enterprise schema uses a nine-branch hierarchy under a single portfolio root. This structure separates product-specific branches from shared branches:

```
Ovoco Portfolio CMDB (root)
  OvocoCRM CMDB              -- CR-prefixed product engineering types
  OvocoAnalytics CMDB        -- AN-prefixed product engineering types
  Shared Services CMDB       -- SS-prefixed infrastructure types
  Ovoco Library              -- Release management and deployment
    OvocoCRM Library          --   CR-prefixed library types
    OvocoAnalytics Library    --   AN-prefixed library types
    Shared Library            --   Unprefixed cross-product types
    Site                      --   Shared site identity
  Enterprise Architecture    -- Services, capabilities, processes
  Configuration Library      -- Controlled software artifacts
  Financial                  -- Contracts and cost attribution
  Directory                  -- Organizations, teams, persons, locations
  Lookup Types               -- Reference data enumerations
```

In `schema-structure.json`, the product branches are top-level children of the root:

```json
[
  { "name": "Ovoco Portfolio CMDB", "description": "Root - Ovoco SaaS Portfolio CMDB" },

  { "name": "OvocoCRM CMDB", "parent": "Ovoco Portfolio CMDB", "description": "OvocoCRM product engineering and operations" },
  { "name": "CR Product", "parent": "OvocoCRM CMDB", "description": "OvocoCRM products and modules" },
  { "name": "CR Server", "parent": "OvocoCRM CMDB", "description": "Deployed OvocoCRM server infrastructure" },

  { "name": "OvocoAnalytics CMDB", "parent": "Ovoco Portfolio CMDB", "description": "OvocoAnalytics product engineering and operations" },
  { "name": "AN Product", "parent": "OvocoAnalytics CMDB", "description": "OvocoAnalytics products and modules" },
  { "name": "AN Server", "parent": "OvocoAnalytics CMDB", "description": "Deployed OvocoAnalytics server infrastructure" }
]
```

Each product's CMDB branch and Library branch mirror the same set of types, just with different prefixes. The OvocoCRM CMDB branch holds 11 engineering and operations types (CR Feature, CR Product, CR Server, CR Hardware Model, CR Network Segment, CR Product Component, CR Component Instance, CR Virtual Machine, CR Assessment, CR License, CR Feature Implementation). The OvocoCRM Library branch holds 12 release and deployment types (CR Product Version, CR Baseline, CR Document, CR Documentation Suite, CR Product Media, CR Product Suite, CR Certification, CR Deployment Site, CR Site Location Assignment, CR Site Org Relationship, CR Site Personnel Assignment, CR Distribution Log). OvocoAnalytics mirrors these, minus CR Virtual Machine.

## Shared Types vs Product-Specific Types

The core design decision in a multi-product schema is which types to share and which to prefix. The rule is straightforward: if a record belongs to exactly one product, prefix it. If it spans the portfolio, leave it unprefixed.

### Types that stay shared (unprefixed)

These types appear once in the schema and are referenced by all product-prefixed types:

- All Lookup Types (Product Status, Version Status, Deployment Status, Environment Type, etc.) - 40 lookup types in the enterprise schema, all unprefixed
- All Directory types (Organization, Team, Person, Location, Facility, Vendor)
- Enterprise Architecture types (Service, Capability, Business Process, Information Object)
- Configuration Library types (Library Item)
- Financial types (Contract, Cost Category)
- Cross-product library records (SLA, Requirement)
- Site - the shared identity record for customer locations

### Types that get prefixed

Every type that carries product-specific data or references product-specific types:

- Product and its decomposition (Product, Product Component, Component Instance)
- Infrastructure CIs (Server, Virtual Machine, Hardware Model, Network Segment)
- Release management (Product Version, Baseline, Document, Documentation Suite, Product Media, Product Suite)
- Deployment (Deployment Site, Site Location Assignment, Site Org Relationship, Site Personnel Assignment, Distribution Log)
- Compliance (Certification, Assessment, License)
- Features (Feature, Feature Implementation)

### The Site vs Deployment Site pattern

Site is the most important shared type. It represents the abstract identity of a customer location, independent of any product. Each product then has its own Deployment Site type (CR Deployment Site, AN Deployment Site) that references the shared Site:

```json
{
  "CR Deployment Site": {
    "site": { "type": 1, "referenceType": "Site" },
    "product": { "type": 1, "referenceType": "CR Product" },
    "productVersion": { "type": 1, "referenceType": "CR Product Version" },
    "customerOrganization": { "type": 1, "referenceType": "Organization" },
    "siteStatus": { "type": 1, "referenceType": "Site Status" }
  }
}
```

This two-record pattern lets you answer both "which sites have any Ovoco product?" (query Site) and "what version of OvocoCRM is running at Fort Bragg?" (query CR Deployment Site). A customer location that runs both OvocoCRM and OvocoAnalytics gets one Site record plus two Deployment Site records, one prefixed CR and one prefixed AN.

### Reference isolation

Prefixed types only reference other types with the same prefix or shared types. They never reference types from a different product. CR Server references CR Hardware Model and CR Deployment Site, never AN Hardware Model. This isolation is enforced by the `referenceType` values in `schema-attributes.json`:

```json
{
  "CR Server": {
    "hardwareModel": { "type": 1, "referenceType": "CR Hardware Model" },
    "siteLocation": { "type": 1, "referenceType": "CR Deployment Site" },
    "networkSegment": { "type": 1, "referenceType": "CR Network Segment" },
    "deploymentStatus": { "type": 1, "referenceType": "Deployment Status" },
    "location": { "type": 1, "referenceType": "Location" }
  }
}
```

Notice the pattern: `CR Hardware Model` (same prefix), `CR Deployment Site` (same prefix), `Deployment Status` (shared lookup), `Location` (shared directory). No AN-prefixed references appear.

## Extending CMDB-Kit's Schema Files for Multi-Product

To convert a single-product enterprise schema into a multi-product schema, you modify three files: `schema-structure.json`, `schema-attributes.json`, and `tools/lib/constants.js`.

### Step 1 - Create the hierarchy branches

Add the portfolio root, product CMDB branches, and product Library branches to `schema-structure.json`. Container types (like "OvocoCRM CMDB") are pure grouping nodes with no attributes of their own; they do not need entries in `schema-attributes.json` or `LOAD_PRIORITY`.

### Step 2 - Clone and prefix product-specific types

For each type that needs prefixing, create a copy with the product prefix in both schema files. The attribute definitions are identical except that `referenceType` values point to the prefixed versions:

```json
{
  "AN Product Component": {
    "description": { "type": 0 },
    "product": { "type": 1, "referenceType": "AN Product" },
    "parentComponent": { "type": 1, "referenceType": "AN Product Component" },
    "version": { "type": 0 },
    "componentType": { "type": 1, "referenceType": "Component Type" }
  }
}
```

Compare with the CR version, the only differences are the `referenceType` values:

```json
{
  "CR Product Component": {
    "description": { "type": 0 },
    "product": { "type": 1, "referenceType": "CR Product" },
    "parentComponent": { "type": 1, "referenceType": "CR Product Component" },
    "version": { "type": 0 },
    "componentType": { "type": 1, "referenceType": "Component Type" }
  }
}
```

### Step 3 - Move shared types under shared branches

Types like SLA and Requirement move under a Shared Library branch. Lookup types remain unprefixed under Lookup Types. Directory types remain under Directory.

### Step 4 - Create data files

Each prefixed type needs its own kebab-case data file: `cr-product.json`, `an-product.json`, `cr-deployment-site.json`, `an-deployment-site.json`, etc. Shared types keep their original file names: `site.json`, `sla.json`.

## LOAD_PRIORITY Ordering Rules for Prefixed Types

The `LOAD_PRIORITY` array in `tools/lib/constants.js` controls import order. Every importable type must appear, and dependencies must come before dependents. With prefixed types, two additional rules apply.

### Rule 1 - Shared types before any product types

All lookup types, Directory types, Financial types, and Enterprise Architecture types must appear before any prefixed type. These are the foundation that every product references:

```js
const LOAD_PRIORITY = [
  // ===== LOOKUP TYPES (no dependencies) =====
  'Product Status',
  'Version Status',
  'Deployment Status',
  // ... all 40 lookup types ...

  // ===== DIRECTORY =====
  'Organization',
  'Person',
  'Team',
  'Location',
  'Facility',
  'Vendor',

  // ===== FINANCIAL =====
  'Contract',
  'Cost Category',

  // ===== ENTERPRISE ARCHITECTURE =====
  'Capability',
  'Service',
  'Business Process',
  'Information Object',

  // ===== SHARED SERVICES CMDB =====
  'SS Hardware Model',
  'SS Server',
  // ... SS types ...

  // ===== OVOCOANALYTICS =====
  'AN Product',
  // ... AN types ...

  // ===== OVOCOCRM =====
  'CR Product',
  // ... CR types ...
];
```

### Rule 2 - Interleave product types by dependency, not by category

Within a product block, types must be ordered so that every referenced type appears earlier. This means you cannot group all "CMDB" types together and then all "Library" types. Instead, the ordering follows the dependency chain:

```js
// ===== OVOCOCRM (interleaved: types before their dependents) =====
'CR Product',                // no product-specific deps
'CR Feature',                // no product-specific deps
'CR Hardware Model',         // no product-specific deps
'CR Product Component',      // refs CR Product
'CR Product Version',        // refs CR Product, CR Product Component
'CR Feature Implementation', // refs CR Feature, CR Product Version
'CR Component Instance',     // refs CR Product Component, CR Product Version
'CR Document',               // refs CR Product, CR Product Version
'CR Documentation Suite',    // refs CR Product Version, CR Document (circular)
'CR Product Media',          // refs CR Product
'CR Product Suite',          // refs CR Product Version, CR Product Media (circular)
'CR Certification',          // refs CR Product, CR Document
'CR Baseline',               // refs CR Product Version, CR Component Instance, CR Certification
'CR Deployment Site',        // refs CR Product, CR Product Version, Site
'CR Network Segment',        // refs CR Deployment Site
'CR Server',                 // refs CR Hardware Model, CR Deployment Site, CR Network Segment
'CR Virtual Machine',        // refs CR Server, CR Deployment Site
'CR Assessment',             // refs CR Product, CR Product Version, CR Deployment Site
'CR License',                // refs CR Product, CR Deployment Site
'CR Site Location Assignment',
'CR Site Org Relationship',
'CR Site Personnel Assignment',
'CR Distribution Log',
```

### Circular dependencies

Some circular references are unavoidable. CR Product Version references CR Documentation Suite (via `documentationSuites`), and CR Documentation Suite references CR Product Version (via `productVersion`). The same pattern exists for CR Product Version and CR Product Suite.

The import script handles this by creating the records in the order listed, then relying on a second pass or post-import fixup to resolve the backward references. In `LOAD_PRIORITY`, place the type that has fewer circular fields first. CR Product Version comes before CR Documentation Suite because Product Version's core identity does not depend on the suite, even though it has an optional reference to it.

### Rule 3 - Shared cross-product types after all product types

The shared Site type must appear before any Deployment Site, but types like SLA and Requirement that do not reference product-specific types can appear at the end:

```js
'Site',                      // before any Deployment Site

// ... all AN types including AN Deployment Site ...
// ... all CR types including CR Deployment Site ...

// ===== SHARED LIBRARY =====
'SLA',
'Requirement',

// ===== CONFIGURATION LIBRARY =====
'Library Item',
```

In the actual enterprise `LOAD_PRIORITY`, Site appears just before the first Deployment Site reference (inside the AN block), because AN Deployment Site is the first Deployment Site type encountered.

### Product block ordering

The enterprise schema imports Shared Services first, then OvocoAnalytics, then OvocoCRM. This order is arbitrary when products do not reference each other. If product B depends on product A (for example, an integration type that references both), product A's block must come first.

## Cross-Product Queries

The prefix strategy makes cross-product queries possible through pattern matching and shared reference traversal.

### Query by prefix pattern

In AQL (Jira Assets Query Language), you can find all deployment sites across products:

```
objectType in ("CR Deployment Site", "AN Deployment Site")
```

Or find all products across the portfolio:

```
objectType in ("CR Product", "AN Product", "SS Product")
```

### Query through shared types

To find all products deployed at a specific customer site, query through the shared Site type:

```
objectType = "CR Deployment Site" AND site = "SITE-001"
objectType = "AN Deployment Site" AND site = "SITE-001"
```

Or traverse from Organization through Deployment Site:

```
objectType = "CR Deployment Site" AND customerOrganization = "Acme Corp"
```

### Cross-product impact analysis

When a change affects shared infrastructure (an SS Server), you can trace impact to both products by following the reference chains from each product's deployment types back through shared Location and Organization records.

The shared Directory types serve as the join point. A Location like "US-East-1 Data Center" appears in both CR Server and AN Server records through their `location` reference. Querying Location gives you the full picture across products without needing direct cross-product references.

## Adding a Third Product - Walkthrough

Suppose Ovoco launches a third product, OvocoConnect (a messaging platform), and you need to add it to the schema. The prefix will be CO.

### Create the hierarchy branches

Add two container types to `schema-structure.json`:

```json
{ "name": "OvocoConnect CMDB", "parent": "Ovoco Portfolio CMDB", "description": "OvocoConnect product engineering and operations" },
{ "name": "OvocoConnect Library", "parent": "Ovoco Library", "description": "OvocoConnect released artifacts and deployment records" }
```

### Add prefixed types

Clone each product-specific type with the CO prefix. Start with the CMDB branch types:

```json
{ "name": "CO Product", "parent": "OvocoConnect CMDB", "description": "OvocoConnect products and modules" },
{ "name": "CO Feature", "parent": "OvocoConnect CMDB", "description": "OvocoConnect product features" },
{ "name": "CO Feature Implementation", "parent": "OvocoConnect CMDB", "description": "Audit records linking features to OvocoConnect releases" },
{ "name": "CO Server", "parent": "OvocoConnect CMDB", "description": "Deployed OvocoConnect server infrastructure" },
{ "name": "CO Hardware Model", "parent": "OvocoConnect CMDB", "description": "Approved hardware models for OvocoConnect deployments" },
{ "name": "CO Network Segment", "parent": "OvocoConnect CMDB", "description": "Network segments at OvocoConnect deployment sites" },
{ "name": "CO Product Component", "parent": "OvocoConnect CMDB", "description": "OvocoConnect software components" },
{ "name": "CO Component Instance", "parent": "OvocoConnect CMDB", "description": "Built and released OvocoConnect component instances" },
{ "name": "CO Assessment", "parent": "OvocoConnect CMDB", "description": "Security assessments for OvocoConnect" },
{ "name": "CO License", "parent": "OvocoConnect CMDB", "description": "OvocoConnect license allocations" }
```

Then the Library branch:

```json
{ "name": "CO Product Version", "parent": "OvocoConnect Library", "description": "OvocoConnect software releases" },
{ "name": "CO Baseline", "parent": "OvocoConnect Library", "description": "OvocoConnect configuration baselines" },
{ "name": "CO Document", "parent": "OvocoConnect Library", "description": "OvocoConnect controlled documentation" },
{ "name": "CO Documentation Suite", "parent": "OvocoConnect Library", "description": "Versioned documentation packages for OvocoConnect releases" },
{ "name": "CO Product Media", "parent": "OvocoConnect Library", "description": "OvocoConnect DML software files" },
{ "name": "CO Product Suite", "parent": "OvocoConnect Library", "description": "Versioned software packages for OvocoConnect" },
{ "name": "CO Certification", "parent": "OvocoConnect Library", "description": "OvocoConnect product certifications" },
{ "name": "CO Deployment Site", "parent": "OvocoConnect Library", "description": "OvocoConnect customer deployment sites" },
{ "name": "CO Site Location Assignment", "parent": "OvocoConnect Library", "description": "Location assignments for OvocoConnect sites" },
{ "name": "CO Site Org Relationship", "parent": "OvocoConnect Library", "description": "Organization relationships for OvocoConnect sites" },
{ "name": "CO Site Personnel Assignment", "parent": "OvocoConnect Library", "description": "Personnel assignments at OvocoConnect sites" },
{ "name": "CO Distribution Log", "parent": "OvocoConnect Library", "description": "OvocoConnect software distribution tracking" }
```

### Add attributes

In `schema-attributes.json`, add entries for each CO type. Copy the CR or AN version and replace all prefix-specific `referenceType` values:

```json
{
  "CO Product": {
    "description": { "type": 0 },
    "productType": { "type": 0 },
    "currentVersion": { "type": 0 },
    "previousVersions": { "type": 0 },
    "releaseDate": { "type": 0, "defaultTypeId": 4 },
    "versionStatus": { "type": 1, "referenceType": "Product Status" },
    "vendor": { "type": 0 },
    "supportContact": { "type": 0 },
    "distributionMethod": { "type": 0 },
    "parentProduct": { "type": 1, "referenceType": "CO Product" }
  },
  "CO Deployment Site": {
    "description": { "type": 0 },
    "siteCode": { "type": 0 },
    "product": { "type": 1, "referenceType": "CO Product" },
    "productVersion": { "type": 1, "referenceType": "CO Product Version" },
    "previousVersion": { "type": 1, "referenceType": "CO Product Version" },
    "targetVersion": { "type": 1, "referenceType": "CO Product Version" },
    "location": { "type": 1, "referenceType": "Location" },
    "customerOrganization": { "type": 1, "referenceType": "Organization" },
    "siteStatus": { "type": 1, "referenceType": "Site Status" },
    "site": { "type": 1, "referenceType": "Site" }
  }
}
```

Notice that `Product Status`, `Location`, `Organization`, `Site Status`, and `Site` remain unprefixed because they are shared types. Only references to product-specific types (CO Product, CO Product Version) carry the prefix.

### Add to LOAD_PRIORITY

Insert the CO block in `tools/lib/constants.js`. Place it after the shared types and either before or after the existing product blocks:

```js
// ===== OVOCOCONNECT (interleaved: types before their dependents) =====
'CO Product',
'CO Feature',
'CO Hardware Model',
'CO Product Component',
'CO Product Version',        // refs CO Product, CO Product Component
'CO Feature Implementation', // refs CO Feature, CO Product Version
'CO Component Instance',     // refs CO Product Component, CO Product Version
'CO Document',               // refs CO Product, CO Product Version
'CO Documentation Suite',    // refs CO Product Version, CO Document (circular)
'CO Product Media',          // refs CO Product
'CO Product Suite',          // refs CO Product Version, CO Product Media (circular)
'CO Certification',          // refs CO Product, CO Document
'CO Baseline',               // refs CO Product Version, CO Component Instance, CO Certification
'CO Deployment Site',        // refs CO Product, CO Product Version, Site
'CO Network Segment',        // refs CO Deployment Site
'CO Server',                 // refs CO Hardware Model, CO Deployment Site, CO Network Segment
'CO Assessment',             // refs CO Product, CO Product Version, CO Deployment Site
'CO License',                // refs CO Product, CO Deployment Site
'CO Site Location Assignment',
'CO Site Org Relationship',
'CO Site Personnel Assignment',
'CO Distribution Log',
```

The dependency comments serve as documentation and make it easy to verify correctness.

### Create data files

Create one JSON file per CO type in the data directory:

```
data/co-product.json
data/co-feature.json
data/co-hardware-model.json
data/co-product-component.json
data/co-product-version.json
data/co-feature-implementation.json
data/co-component-instance.json
data/co-document.json
data/co-documentation-suite.json
data/co-product-media.json
data/co-product-suite.json
data/co-certification.json
data/co-baseline.json
data/co-deployment-site.json
data/co-network-segment.json
data/co-server.json
data/co-assessment.json
data/co-license.json
data/co-site-location-assignment.json
data/co-site-org-relationship.json
data/co-site-personnel-assignment.json
data/co-distribution-log.json
```

### Validate

Run the validation tool to confirm all types, attributes, and references are consistent:

```bash
node tools/validate.js --schema schema/enterprise
```

### Deciding which types to include

Not every product needs every type. OvocoAnalytics omits Virtual Machine (no AN Virtual Machine exists in the enterprise schema), while OvocoCRM includes it. If OvocoConnect is a cloud-only SaaS product with no on-premises deployments, you might omit Server, Hardware Model, Network Segment, and Virtual Machine entirely. Only create prefixed types for the CI categories your product actually uses.

### Checklist

- [ ] Prefix chosen (two or three uppercase letters, unique)
- [ ] Container types added to `schema-structure.json` (CMDB branch and Library branch)
- [ ] All product-specific types added with correct `parent` references
- [ ] Attributes added to `schema-attributes.json` with correct `referenceType` values
- [ ] `LOAD_PRIORITY` updated with dependency-ordered entries
- [ ] Data files created with kebab-case names
- [ ] Validation passes: `node tools/validate.js --schema schema/enterprise`
- [ ] No cross-product references in `referenceType` values (CR types never reference AN types)
