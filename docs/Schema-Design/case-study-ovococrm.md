# Case Study: How CMDB-Kit's Taxonomy Was Designed

This case study explains the decisions behind CMDB-Kit's three-layer schema, serves as a worked example of the process described in the [Taxonomy Playbook](taxonomy-playbook.md), and provides a rationale document for anyone extending or adapting the schema for their own organization.


## The Design Problem

Existing CMDB schemas fall into three categories: process-centric (built around ITIL workflows), infrastructure-centric (built around what discovery tools find), and asset-centric (built around procurement and lifecycle). None of them start from product delivery.

CMDB-Kit needed a schema for teams that ship software to customer sites and need to answer: what version is deployed where, what infrastructure supports each deployment, who is responsible at each location, and what changed since the last baseline. It also needed to work as a teaching tool, scale from a proof of concept to a multi-product enterprise without redesign, and run on platforms with no built-in CI class hierarchy (JSM Assets) and platforms with one (ServiceNow).

The question was not "what can we scan?" or "what ITIL process does this support?" but "what does a product delivery team need to track?"

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

## Standards Alignment

The schema wasn't designed in a vacuum. It draws on established frameworks, but the frameworks informed the design rather than dictating it.

The four-branch structure (Product CMDB, Product Library, Directory, Lookup Types) maps to ITIL's Service Asset and Configuration Management practice: things you build, things you release, people who do the work, and controlled vocabulary. The extended and enterprise layers add ITIL service modeling concepts (Service, Capability, Business Process) for organizations that need them.

Configuration management standards define four functions: identification, change control, status accounting, and audits. Every type in the schema traces back to at least one of these functions. Products, Servers, and Components support identification. Baselines and change records support change control. Status and lifecycle lookups support status accounting. Certifications and Assessments support audits. If a type doesn't serve at least one CM function, it doesn't belong.

The baseline model (Functional, Allocated, Product baselines) influenced the Baseline type and its lookup values. The Definitive Media Library pattern influenced the Product Media, Product Suite, and Distribution Log types in the enterprise schema, treating controlled software artifacts as configuration items. The separation of Product Component (what it is) from Component Instance (what was built and released) comes from the CM distinction between a CI's design identity and its deployed reality.

These connections matter if you need to justify the schema to a standards body, map it to an existing CM plan, or explain to an auditor why the CMDB is structured the way it is. They don't matter for getting started.
