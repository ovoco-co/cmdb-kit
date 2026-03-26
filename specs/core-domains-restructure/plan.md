# Core + Domains Restructure Plan

## Architecture Decisions

### Replace three-tier model with Core + Domains

The current schema uses three tiers: base (20 types), extended (55 types), and enterprise (78 types), organized by size. This forces users to pick a tier and adopt everything in it. A team that only needs compliance tracking has to jump from base to extended and accept 35 additional types they do not need.

The new model separates concerns:

- **Core** is a single schema containing the product-delivery essentials every deployment needs. It replaces both base and extended as the starting point.
- **Domains** are opt-in packages, each addressing a specialized concern (compliance, licensing, distribution, etc.).
- **Portfolio mode** is a structural pattern (not a domain) that reorganizes Core and loaded domains into product-prefixed types for multi-product organizations. It replaces the current enterprise tier.

### Core composition

Core absorbs everything directly related to "what did we build, what version is it, and where is it deployed." Types that address specialized concerns (licensing, compliance, SLAs, media distribution) move to domains.

Core includes:

- Product CMDB: Product, Server, Database, Product Component, Hardware Model, Network Segment, Virtual Machine, Feature
- Product Library: Product Version, Document, Deployment, Deployment Site, Baseline
- Directory: Organization, Team, Person, Location, Facility, Vendor
- Lookup Types: Product Status, Version Status, Deployment Status, Environment Type, Document Type, Document State, Component Type, Priority, Organization Type, Network Type, Baseline Type, Baseline Status, Site Status, Vendor Status, Deployment Role

### Types extracted to domains

| Type | Target Domain |
|------|--------------|
| License, License Type, License Status | licensing |
| Assessment, Assessment Type, Assessment Status | compliance |
| Certification, Certification Type, Certification Status | compliance |
| SLA, SLA Status | sla |
| Documentation Suite, Product Media, Product Suite | distribution |
| Distribution Log | distribution |

### UAF viewpoint alignment

Each domain maps to a UAF (Unified Architecture Framework) viewpoint, giving defense and government customers a familiar vocabulary:

| Domain | UAF Viewpoint |
|--------|--------------|
| Core | Resources (Rs), Projects (Pj), Personnel (Pr), Standards (St) |
| Compliance | Security (Se) |
| Licensing | Acquisition (Aq) |
| Distribution | Operational (Op) |
| EA | Services (Sv), Capability (Cv) |
| Financial | Acquisition (Aq) |
| Requirements | Information (If) |
| SCCM | Security (Se) |
| SLA | Services (Sv) |

### Domain dependency map

```
Core (always required)
+-- Compliance (Core)
|   +-- SCCM (Core + Compliance)
+-- Licensing (Core)
+-- Distribution (Core)
+-- SLA (Core)
+-- EA (Core)
+-- Financial (Core)
+-- Requirements (Core)
```

SCCM is the only domain depending on another domain (Compliance). All others depend only on Core.

### Schema fixes folded into the restructure

These fixes from the code review and schema critique land during the restructure rather than as separate changes:

- Person type: add phone, jobTitle, manager (self-ref) to Core
- Feature type: add product reference so features trace to products
- Populate missing lookup data files for every Core lookup type
- Add dataSource and lastVerifiedDate to Server, Database, Virtual Machine
- Add securityClassification text attribute to Product, Server, Database, Network Segment
- Service type in EA domain: add supportedBy multi-reference to Product
- SLA: add rto and rpo attributes
- Cost Category in Financial domain: add costCategory reference to Product or create CostAllocation association type
- Distribution domain: populate all enterprise lookup data files (Distribution Status, Delivery Method, Media Urgency, Transfer Status, Media Type, Library Item Type)

## Implementation Approach

### File structure after restructure

```
schema/
+-- core/
|   +-- schema-structure.json
|   +-- schema-attributes.json
|   +-- data/
|   +-- README.md
+-- portfolio/
|   +-- schema-structure.json
|   +-- schema-attributes.json
|   +-- data/
|   +-- README.md
+-- domains/
    +-- README.md
    +-- compliance/
    |   +-- schema-structure.json
    |   +-- schema-attributes.json
    |   +-- data/
    |   +-- README.md
    +-- licensing/
    +-- distribution/
    +-- sla/
    +-- sccm/       (already exists)
    +-- ea/
    +-- financial/
    +-- requirements/
```

### Tooling changes

- `tools/validate.js` must learn to load Core plus overlay domains and check cross-schema references
- Adapters (JSM and ServiceNow) must accept multiple schema/data directory paths
- `overlay.json` files in both adapters need updating for Core + domain type organization
- LOAD_PRIORITY in `tools/lib/constants.js` needs restructuring for domain-aware ordering

### Migration path for existing users

- Users on **base**: Core is a superset. All existing types are in Core. No data loss.
- Users on **extended**: Core plus chosen domains covers everything. Data maps directly.
- Users on **enterprise**: Portfolio mode plus domains. Product-prefixed types stay the same.

## Phases

### Phase 1: Core schema creation

Extract Core types from current base and extended schemas. Create `schema/core/` with schema-structure.json, schema-attributes.json, and data files. Apply the Core schema fixes listed above. Run validation.

### Phase 2: Domain extraction

Create each domain directory under `schema/domains/`. Extract types and data files from extended and enterprise schemas. Write schema-structure.json, schema-attributes.json, data files, and README for each domain. The SCCM domain already exists and needs updating for Core references.

### Phase 3: Portfolio mode

Restructure `schema/enterprise/` into `schema/portfolio/`. Update product-prefixed types to reference Core and loaded domains. Update portfolio-specific types (Component Instance, Feature Implementation, site assignment types).

### Phase 4: Tooling updates

Update `tools/validate.js` to understand domain loading. Update both adapters to accept domain paths. Update overlay.json files. Update LOAD_PRIORITY for domain-aware ordering.

### Phase 5: Validation

Run full validation across Core, each domain individually, Core plus each domain combination, and portfolio mode. Test imports on both JSM Assets and ServiceNow.

## Dependencies

- Nothing blocks this work
- This blocks: ServiceNow adapter schema propagation, documentation rewrite, Forge app, drift detection, all future domains

## File Paths

| File | Purpose |
|------|---------|
| `schema/base/` | Current base schema (to be retired, replaced by `schema/core/`) |
| `schema/extended/` | Current extended schema (to be retired, split into Core + domains) |
| `schema/enterprise/` | Current enterprise schema (to be restructured into `schema/portfolio/`) |
| `schema/domains/sccm/` | Existing SCCM domain (proof of concept) |
| `schema/domains/README.md` | Existing domains overview |
| `tools/validate.js` | Validation tool (needs domain-awareness) |
| `tools/lib/constants.js` | LOAD_PRIORITY definitions (needs restructuring) |
| `adapters/jsm/overlay.json` | JSM platform overlay (needs updating) |
| `adapters/servicenow/overlay.json` | ServiceNow platform overlay (needs updating) |
| `adapters/jsm/import.js` | JSM import orchestrator (needs domain path support) |
| `adapters/servicenow/import.js` | ServiceNow import orchestrator (needs domain path support) |
