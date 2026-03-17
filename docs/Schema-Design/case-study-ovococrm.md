# Case Study: How CMDB-Kit's Taxonomy Was Designed

This case study tells the story of how CMDB-Kit's schema evolved through real production use. Every design decision was forced by a problem that the previous design couldn't solve. The schema didn't arrive as a finished blueprint. It was built iteratively, and the iterations are the most useful part.


## The Starting Point

The original CMDB was a flat schema. All products lived in one object type hierarchy. Tags and category fields were used to differentiate which product a CI belonged to. The thinking was: a server is a server, a component is a component, why would you need separate types for each product?

This worked for about a month.


## Iteration 1: Products Don't Share a Taxonomy

The first product was a platform with firmware components, hardware models, and physical gateways. The second product was a software suite with virtual machines, disk image templates, and content filters. The third was a media gateway with codecs and session controllers.

Their component types had nothing in common. A single Component Type lookup with values like "Firmware," "Codec," "Hypervisor," "Content Filter," and "Session Controller" was meaningless noise. Every query returned a mix of unrelated items from different products. Filtering by tag helped, but every dashboard, every report, and every automation rule needed the tag filter added manually. Miss it once and you're looking at cross-product garbage.

The fix was product-prefixed types. Each product gets its own branch in the schema: its own Server type, its own Component type, its own Feature type. The prefix (like CR, AN, SS in the OvocoCRM example data) scopes every query automatically. "Show me all CR Servers in Production" is a single query with no filter tricks.

This multiplied the number of types in the schema, but it eliminated an entire class of data quality problems. The schema got larger, but the data got cleaner.


## Iteration 2: Sites Are Not Simple

A deployment site seemed straightforward: a customer location running a version of the product. One record per site, track the version and status, done.

Then reality hit. The same customer site was running multiple products, each at a different version, with different support teams, different upgrade schedules, and different contractual obligations. A single "Deployment" record couldn't represent "Site A has Product 1 at version 3.2 supported by Team Alpha, and Product 2 at version 1.1 supported by Team Bravo, and Product 3 is in the planning phase."

The fix was splitting the concept into two records. A Site is a shared identity record: just a name representing a customer or location. A Deployment Site is a product-specific record that tracks everything about deploying that specific product to that specific customer. One Site can have zero, one, two, or three Deployment Site records, one per product.

This also handled sub-locations. Some sites had deployments in multiple buildings, or mobile units, or forward operating locations. Site Location Assignment records link a Deployment Site to multiple physical locations with a location type (Primary, Alternate) and status. The deployment isn't tied to one building.


## Iteration 3: Cross-Domain and Custom Feature Sets

Not every site gets the same product configuration. Some sites run the product on a single network. Others run it across multiple classification domains with different feature sets on each side. A site might get features 1 through 5 on one network and only features 1 and 3 on a more restricted network due to security requirements or contract scope.

The Deployment Site record needed attributes for classification scheme, network domains, and which features are active at that site. Feature Implementation records link a Feature to a Product Version, but the per-site customization is tracked at the Deployment Site level. The CMDB can answer "which sites have Feature X active?" and "which sites are running a restricted feature set?"

This is the problem that no process-centric, infrastructure-centric, or asset-centric CMDB schema handles. They can tell you what servers exist. They can't tell you which features are deployed where, on which networks, with which restrictions.


## Iteration 4: Requirements Traceability

An auditor asked: "prove that every requirement allocated to this release was actually implemented and tested."

The existing schema had Feature records and Product Version records, but no connection between them that said "this feature was implemented in this release and here's the evidence." You could see that a feature existed and that a version existed, but not that the feature was delivered in that specific version.

Feature Implementation was added as an immutable audit record. It links a Feature to a Product Version with an implementation status. Once marked as implemented, the record is frozen. This creates an auditable chain: Requirement to Feature to Feature Implementation to Product Version. You can trace from a customer need through to what was actually shipped in a specific release.

This became the most-queried type in the schema. Engineers and program managers asked the same question daily: "is this feature in this release?" The answer was always one query away.

The enterprise schema extends this further with a Requirement type that connects to Features, closing the loop from requirements capture through to delivered capability.


## Iteration 5: Baselines Are Not Bureaucratic Overhead

Baselines were initially seen as unnecessary process overhead. The schema tracked current state. Why freeze a snapshot?

The answer came when someone asked "what was the approved design at the time of the review six months ago?" Without baselines, answering that question required archaeology: digging through email, meeting notes, and version control history to reconstruct what the configuration looked like at a point in time.

With baselines, it's a single query. A Functional Baseline (FBL) captures the approved design. An Allocated Baseline (ABL) captures the approved allocation of requirements to components. A Product Baseline (PBL) captures the approved build that was released. Each baseline type freezes a different aspect of the configuration at a point in time.

Baselines also solved the "as-deployed vs as-released" problem. The Product Library tracks what was released (the approved configuration). The Product CMDB tracks what exists now (the current state). A server's current configuration might differ from its baselined state. The schema must represent both so you can detect drift.


## Iteration 6: The Definitive Media Library

Controlled software artifacts - ISOs, install packages, checksums - needed their own tracking. The release wasn't just a version number. It was a set of physical media files that had to be built, verified, stored, and distributed to deployment sites.

Product Media tracks individual files with checksums. Product Suite bundles files into a versioned package. Distribution Log tracks the full lifecycle of getting media to a site: request, preparation, shipment, receipt, installation, verification. This is a pattern from formal configuration management practice that no commercial CMDB framework includes.

For air-gapped deployments where you're burning DVDs and physically shipping them to secure facilities, this tracking is not optional. You need to know which media was sent where, who received it, and whether it was verified on installation.


## Iteration 7: Shared Services

The three products shared infrastructure: CI/CD pipelines, monitoring systems, development tools, build servers. This infrastructure didn't belong to any single product. Putting it under one product's prefix made it look like that product owned it. Leaving it unscoped meant it had no home.

The fix was a Shared Services branch with its own prefix (SS in the open-source version, TS in the production system). Shared services get their own Server, Application, Network Segment, and other infrastructure types. They serve all products equally and don't appear to belong to any single one.


## What the Schema Looks Like Now

The production schema has a comprehensive type hierarchy across four branches:

- **Product CMDB** - one branch per product, each with its own Features, Components, Servers, Hardware Models, Assessments, and Licenses
- **Product Library** - one branch per product, each with Versions, Baselines, Documents, Documentation Suites, Media, Certifications, Deployment Sites, and Distribution Logs
- **Directory** - shared across all products: Organizations, Locations, Facilities, People, Teams, Clearances, Training
- **Lookup Types** - 60+ controlled vocabulary types shared across all products

CMDB-Kit's open-source schema is a sanitized, generalized version of this production system. The OvocoCRM example data replaces the real products with a fictional SaaS CRM, but the structure, the type relationships, and the design patterns are the same.


## Product-Centric, Not Infrastructure-Centric

Every iteration reinforced the same principle: the schema should be organized around what you deliver, not what you operate.

When a change advisory board reviews a change, they ask "what product does this affect?" not "what server is this on?" When an incident takes down a server, the first question is "which products are impacted and which customer sites are affected?" When an auditor asks about a release, they want to see the chain from requirement to feature to version to deployment site.

The product is the organizing concept. Infrastructure exists to support it. Deployment sites exist to track where it goes. Baselines exist to freeze its approved state. Features exist to define what it does. Requirements exist to define what it should do. Everything in the schema connects back to a product.

This is what makes CMDB-Kit different from process-centric schemas (built around ITIL workflows), infrastructure-centric schemas (built around what discovery tools find), and asset-centric schemas (built around procurement and lifecycle). Those approaches answer useful questions, but not the questions product delivery teams ask every day.


## Where CMDB-Kit Fits

CMDB-Kit fits best when the organization develops products, when configuration management is a formal discipline, when release management and baselines matter, and when the CMDB needs to answer "what version is deployed where?"

It fits less well when the organization is purely an IT operations shop with no product development, when discovery-driven infrastructure inventory is the primary goal, or when the CMDB is mainly for IT asset management and procurement. For those scenarios, start from the platform's built-in model and use CMDB-Kit's patterns selectively where they add value.


## Standards Alignment

The schema wasn't designed in a vacuum. It draws on established frameworks, but the frameworks informed the design rather than dictating it.

The four-branch structure (Product CMDB, Product Library, Directory, Lookup Types) maps to ITIL's Service Asset and Configuration Management practice: things you build, things you release, people who do the work, and controlled vocabulary. The extended and enterprise layers add ITIL service modeling concepts (Service, Capability, Business Process) for organizations that need them.

Configuration management standards define four functions: identification, change control, status accounting, and audits. Every type in the schema traces back to at least one of these functions. Products, Servers, and Components support identification. Baselines and change records support change control. Status and lifecycle lookups support status accounting. Certifications and Assessments support audits. If a type doesn't serve at least one CM function, it doesn't belong.

The baseline model (Functional, Allocated, Product baselines) comes from formal CM discipline. The Definitive Media Library pattern comes from treating controlled software artifacts as configuration items. The separation of Product Component (what it is) from Component Instance (what was built and released) comes from the distinction between a CI's design identity and its deployed reality.

These connections matter if you need to justify the schema to a standards body, map it to an existing CM plan, or explain to an auditor why the CMDB is structured the way it is. They don't matter for getting started.
