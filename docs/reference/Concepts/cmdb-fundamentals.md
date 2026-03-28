# CMDB Fundamentals

A Configuration Management Database is a structured repository of configuration items and their relationships. It answers questions that spreadsheets and tribal knowledge cannot: what do we have, how does it connect, what state is it in, and who is responsible for it?

Most CMDB schemas are designed around IT service processes, infrastructure discovery, or asset procurement. CMDB-Kit takes a different approach: it's designed around product delivery. If you ship software to customer sites and need to track what version is deployed where, what infrastructure supports it, and what changed since the last baseline, that's the problem CMDB-Kit solves.

This section introduces the concepts that the rest of the guide builds on: what a CMDB is, how it fits into service management, and when you actually need one.


# What a CMDB Is and Why It Matters

A spreadsheet lists things. A CMDB models them.

A spreadsheet row says: "Server CRM-DB-PROD-01, Dell PowerEdge R750, 512GB RAM, US-East datacenter." It is a flat list of attributes with no connections to anything else. You cannot ask "what products run on this server?" because the spreadsheet does not encode relationships. You cannot ask "what version of OvocoCRM is deployed at Acme Corp?" because the deployment site, the version, and the customer are in different spreadsheets, or different tabs, or different people's heads.

A CMDB encodes relationships as first-class data. A Deployment Site references a Location and tracks its environment type and status. A Distribution Log connects a Product Version to a Deployment Site, recording who delivered it and when. A Product Version references its Product Components and its previous version. From any single record, you can navigate the relationship graph to answer cross-cutting questions.

The practical difference: when an incident takes down a server, the CMDB tells you which products are affected, which customers use those products, what SLAs apply, and who to notify. A spreadsheet tells you the server's RAM.

## The Schema Design Problem

Building a CMDB from scratch means deciding what types to create, what attributes each type needs, how types relate to each other, what lookup values to define, and in what order to import everything. For a medium-complexity CMDB (50 or more types), this design work takes weeks or months. Teams debate naming conventions, rediscover the need for lookup types, and build the same patterns that every other CMDB implementation has already solved.

CMDB-Kit provides a ready-made schema using a Core + Domains architecture, complete with attributes, reference types, lookup values, and example data. You start from a working schema and customize it rather than starting from a blank canvas. The schema encodes patterns learned from production CMDB operations: the four-branch taxonomy (Product CMDB, Product Library, Directory, Lookup Types), the version chain pattern (previousVersion linking each release to its predecessor), and the product decomposition model (Product to Product Component to Product Version).

## The Guidance Gap

Platform vendors acknowledge that CMDB design is hard, but their guidance stops at principles. Atlassian's official best practice for JSM Assets says: "Take a top-down approach to build your service model architecture. Focus on pulling in data from only the key services you plan to manage. Take a lean approach by starting with one or two of your most critical business services." ServiceNow publishes CSDM (Common Service Data Model) as a reference architecture. iTop ships with a default ITIL-aligned class hierarchy.

This advice is correct. Starting from services, keeping scope narrow, and growing incrementally are all sound principles. But none of it tells you what to actually build. The person sitting down on Monday morning to create an object schema in JSM Assets still faces the same questions:

What object types should I create? A schema needs more than "Server" and "Application." It needs Product Versions to track releases, Deployment Sites to track where products run, Baselines to freeze approved configurations, Distribution Logs to record what was shipped where, and lookup types for every status, category, and classification value. The platform vendor does not tell you this. You discover it through weeks of iteration.

What attributes does each type need? A Product Version is not just a name. It needs a version number, a release date, a status, a reference to the Product it belongs to, a reference to its predecessor version, and references to the Product Components it contains. Each attribute has a type (text, date, single reference, multi-reference) and each reference must point to a type that already exists. Getting this wrong means re-importing the entire schema.

How do types relate to each other? The Atlassian guidance says "CIs and dependencies" without explaining that dependencies are reference attributes with specific cardinality, that cascading filters require AQL expressions scoped to parent selections, and that the import order must respect these references (you cannot import a Product Version before the Product it references exists). The relationship model is where CMDB value lives, and it is the part that receives the least vendor guidance.

What vocabulary constrains the data? Every dropdown, every status field, every category picker needs a defined set of values. "Active" means one thing for a Deployment Site and another for a Product. Without explicit lookup types (separate object types with names and descriptions), teams end up with free-text fields that cannot be queried, filtered, or reported on consistently.

How do you scale from one product to many? A single-product schema is straightforward. When a second product arrives with shared infrastructure and shared customers, the schema must handle product-scoped queries without cross-product noise. No vendor documentation covers the multi-product prefixing pattern, the shared services branch, or the Site-vs-Deployment-Site split that distinguishes a customer location from a product-specific deployment record at that location.

JSM Assets ships three schema templates (ITAM, People, Facilities) that cover hardware inventory, employee directories, and physical locations. These are useful starting points for IT asset management, but they contain no types for software products, release management, baselines, change control, deployments, documentation, or any CM-discipline concept. ServiceNow's CSDM is more complete for service modeling and infrastructure, but it does not cover product engineering, release baselines, feature traceability, or controlled document management. iTop's default classes handle traditional IT operations but not product development lifecycle.

CMDB-Kit fills this gap. Instead of principles, it provides a working schema with a Core that tracks products, versions, deployment sites, baselines, and the people responsible for them, plus opt-in domains that add infrastructure detail, compliance tracking, media distribution, and licensing. The schema ships complete with attributes, reference types, lookup values, example data, and tooling that validates everything before it touches the target database. The schema encodes patterns learned from production operations: the four-branch taxonomy, the version chain, product decomposition, the baseline model, and the deployment site pattern. You start from a working system and customize it, rather than discovering these patterns through months of trial and error.

The vendor guidance and CMDB-Kit are complementary. The vendor tells you the principles ("start with critical services, keep it lean, grow incrementally"). CMDB-Kit gives you the implementation: the types, the attributes, the relationships, and the import order that make those principles concrete.

## Database-agnostic, Version-controlled

The schema is defined in JSON files, not in a database-specific format. `schema-structure.json` defines the type hierarchy. `schema-attributes.json` defines the fields for each type. Adapters translate this structure to specific target databases like JSM Assets or ServiceNow. If you migrate from one CMDB platform to another, the schema files come with you. Only the adapter changes.

Because the schema and data live in a git repository, every change is a tracked commit with a message, an author, and a timestamp. You can see the full history of the schema: when types were added, when attributes changed, when lookup values were updated. Schema changes can be developed on a feature branch, validated with `node tools/validate.js`, reviewed by peers, and merged when ready. The git workflow also enables promotion across environments: develop changes in a staging schema, validate them, then merge to the production branch and re-import. No more "someone added a field in the UI and nobody knows why."


# Configuration Items vs Assets

In ITIL terminology, a configuration item (CI) is any component that needs to be managed in order to deliver an IT service. CIs include software (products, modules, versions), infrastructure (servers, databases, network segments), documentation (design documents, release notes), organizations (teams, vendors), and people (points of contact, administrators).

An asset is a broader term: anything of value to the organization. A desk, a building, a software license. All CIs are assets, but not all assets are CIs. A desk is an asset but does not need to be tracked in the CMDB because it does not affect IT service delivery. A server license is both an asset and a CI because its expiration could disrupt service.

CMDB-Kit focuses on CIs: the components that matter for configuration management, service delivery, and operational decisions. The distinction matters when scoping your CMDB. Tracking office furniture in the same schema as production servers adds noise without adding operational value. Every CI you add is a record you must maintain, so the scope should be deliberate.

In the Core schema, the Product type tracks software products with their type, technology stack, owning team, and lifecycle status:

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

The `owner` attribute is a reference to a Team CI. The `status` attribute is a reference to a Product Status lookup. The `companionProducts` attribute references other Product CIs, with `"max": -1` allowing multiple references. Every attribute either stores a value or points to another record. The CI Selection section covers how to decide what belongs in the CMDB and what does not.


# Relationships as First-class Data

The defining feature of a CMDB is its relationship model. Without relationships, a CMDB is just a more structured spreadsheet. With them, it becomes a navigable graph that supports impact analysis, dependency mapping, and change planning.

In CMDB-Kit, relationships are reference attributes: one CI's attribute points to another CI's record. The schema defines these references declaratively. An attribute with `"type": 1` is a reference. The `referenceType` field specifies which CI type it points to. An optional `"max": -1` allows multiple references.

A Deployment references a Product Version, an Environment Type, and the Person who deployed it. A Product Version references its Components and its Previous Version. A Team references its Organization and its Team Lead (a Person).

These references create a navigable graph:

```
Deployment Site: CR Acme Corp US-East
  -> Location: US-East Datacenter

Distribution Log: OvocoCRM 2.4.0 to CR Acme Corp US-East
  -> Product Version: OvocoCRM 2.4.0
     -> Product Component: CR Core Platform
     -> Product Component: CR Authentication Module
  -> Deployment Site: CR Acme Corp US-East

Product: CRM Core
  -> Team: CRM Platform Team (owner)
```

From a Deployment Site, you can find the Location. From the Distribution Log, you can find which Product Version was delivered to which site. From a Product Version, you can find every component it contains. These cross-type references let you answer questions that span the entire CMDB.

With the service management domain added, an SLA record has a `product` reference that points to a Product CI. A Baseline references a Product Version and lists the Component Instances it contains. These references let you trace from an SLA to the product it covers, then to every deployment site running that product, then to every customer at those sites. When an incident is reported in Jira, the Assets custom fields reference the affected Product and Deployment Site, connecting the work management tool back to the CMDB's relationship graph. Without relationships, you have a database of isolated records. With them, you have the navigable graph that makes impact analysis, change management, and incident response practical.


# ITIL 4 Service Configuration Management

## The CMS and Where a CMDB Fits

ITIL 4 places configuration management under the Service Value System. The practice is called "service configuration management," and its purpose is to ensure that accurate and reliable information about the configuration of services and the CIs that support them is available when and where it is needed.

ITIL defines a layered model for this information. The Configuration Management System (CMS) is the comprehensive system of tools, data, and information used to support service configuration management. It includes the CMDB, the Definitive Media Library (DML), knowledge management tools, and the processes that maintain them.

The CMDB is the structured database of CI records and relationships within the CMS. It is the authoritative source for "what exists and how it connects." The DML stores the controlled artifacts: release packages, approved documents, installation media. The CMDB catalogs what is in the DML. The DML stores the actual files. Knowledge management tools (Confluence, wikis, documentation systems) provide the narrative context: why decisions were made, how processes work, what the architecture looks like.

In the OvocoCRM example data, the CMDB records the Product CIs, their versions, and their deployment topology. The DML would store the actual installation packages for each OvocoCRM release. A wiki would document the architecture decisions and runbook procedures. Each tool has a distinct role, and the CMDB is the structured spine that connects them.

CMDB-Kit occupies the CMDB layer. It defines the CI types, attributes, and relationships. The adapters push this data to a target database. The DML and knowledge tools are separate systems that integrate with the CMDB through references (URL attributes, DML path attributes).

## Configuration Management Activities

ITIL defines four core configuration management activities. Understanding them helps you see where CMDB-Kit fits in the broader process and where your organization's own workflows take over.

Identification: deciding what to track, defining the schema types and attributes, establishing naming conventions. In CMDB-Kit terms, this means editing schema-structure.json and schema-attributes.json.

Control: governing changes to CIs through approval workflows. In CMDB-Kit terms, this means change requests reviewed by configuration control boards, schema changes committed separately from data changes, and LOAD_PRIORITY ensuring correct import order.

Status accounting: maintaining the current state of all CIs and reporting on it. In CMDB-Kit terms, this means the data files, the import process, AQL queries, and dashboard gadgets that show deployment status, version adoption, and site inventory.

Verification and audit: checking that the CMDB accurately reflects reality. In CMDB-Kit terms, this means running validate.js to check schema and data consistency before import, running validate-import.js to compare the target database against the source files after import, comparing CMDB records against discovery data, and running periodic data hygiene audits to catch drift between the CMDB and the real world.


# When You Need a CMDB vs When a Spreadsheet Is Fine

## Indicators That You Have Outgrown Spreadsheets

You need a CMDB when multiple teams ask different versions of the same question ("what version is running at site X?") and nobody has a consistent answer. You need one when a change in one system affects other systems, and you cannot reliably identify the blast radius. You need one when you manage more than one product with shared infrastructure, or when you have compliance or audit requirements that mandate a formal CI inventory.

Other signs: you spend significant time reconciling spreadsheets, emails, and tribal knowledge to answer operational questions. You manage deployments across multiple sites and need to track which version is where. An incident takes down a component and your responders spend thirty minutes identifying affected systems because there is no relationship map.

In the OvocoCRM scenario, the company reached this tipping point when it expanded from one product to a family of companion products (CRM Core, API Gateway, Search Service) deployed across multiple customer sites. The single-spreadsheet approach collapsed as soon as an API Gateway outage required tracing which customer deployments depended on it. Nobody could answer the question quickly, and the answer changed with every new deployment.

If any of these scenarios sound familiar, the next section on CI Selection will help you decide exactly which components to track.

## When a Spreadsheet Is Enough

Not every organization needs a CMDB. If you run a single product with a small team, deploy to one environment, and can hold the entire system model in your head, a spreadsheet may serve you well. A team of five people running a single web application behind one load balancer does not need a formal CI inventory. The knowledge of what connects to what fits comfortably in the team's collective memory.

The overhead of maintaining CI records and relationships is only justified when the cost of not having them, in time, risk, and compliance exposure, exceeds the cost of maintaining them. The tipping point usually arrives when you add a second product, a second deployment site, or a second team that needs the same operational answers.

## The Cost of Not Having One

Without a CMDB, operational questions take hours instead of seconds. Impact analysis is guesswork. Changes are approved without knowing what they affect. Incidents escalate because responders do not know which products depend on the failing component. Auditors ask for documentation that does not exist.

The cost is not just time, it is risk. A change deployed without proper impact analysis breaks a product at a customer site. An incident responder wastes thirty minutes identifying affected systems because there is no relationship map. A compliance audit finds that the organization cannot produce an inventory of its deployed software. Each of these scenarios has a direct cost in downtime, customer trust, or audit findings.

CMDB-Kit reduces this cost by providing the schema, the tooling, and the patterns to stand up a working CMDB in days rather than months. You do not have to design the type hierarchy from scratch, discover the need for lookup types through trial and error, or figure out the correct import order by reading API error messages. The rest of this guide covers how to populate the CMDB, maintain it, and integrate it with your operational processes.
