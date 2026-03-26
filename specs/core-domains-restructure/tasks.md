# Core + Domains Restructure Tasks

## Phase 1: Core Schema Creation

- [ ] Create `schema/core/` directory
- [ ] Build `schema/core/schema-structure.json` with Core type hierarchy (Product CMDB, Product Library, Directory, Lookup Types branches)
- [ ] Build `schema/core/schema-attributes.json` with all Core type attributes
- [ ] Add Person attributes: phone, jobTitle, manager (self-ref)
- [ ] Add Feature attribute: product reference to Product
- [ ] Add Server, Database, Virtual Machine attributes: dataSource, lastVerifiedDate
- [ ] Add Product, Server, Database, Network Segment attribute: securityClassification
- [ ] Copy and verify data files from base/extended into `schema/core/data/`
- [ ] Create missing lookup data files for all Core lookup types
- [ ] Write `schema/core/README.md` with Core pitch and type listing
- [ ] Run `node tools/validate.js --schema schema/core` and fix any errors

## Phase 2: Domain Extraction

### Compliance domain
- [ ] Create `schema/domains/compliance/` directory
- [ ] Build schema-structure.json with Assessment, Certification and their lookups
- [ ] Build schema-attributes.json
- [ ] Copy and adapt data files from extended schema
- [ ] Write README.md with pitch, UAF alignment, and platform plugin comparison

### Licensing domain
- [ ] Create `schema/domains/licensing/` directory
- [ ] Build schema-structure.json with License, License Type, License Status
- [ ] Build schema-attributes.json (add annualCost attribute)
- [ ] Copy and adapt data files from extended schema
- [ ] Write README.md

### Distribution domain
- [ ] Create `schema/domains/distribution/` directory
- [ ] Build schema-structure.json with Documentation Suite, Product Media, Product Suite, Distribution Log
- [ ] Build schema-attributes.json
- [ ] Copy data files from extended schema
- [ ] Create data files for enterprise lookups: Distribution Status, Delivery Method, Media Urgency, Transfer Status, Media Type, Library Item Type
- [ ] Write README.md

### SLA domain
- [ ] Create `schema/domains/sla/` directory
- [ ] Build schema-structure.json with SLA, SLA Status
- [ ] Build schema-attributes.json (add rto, rpo attributes)
- [ ] Copy and adapt data files from extended schema
- [ ] Write README.md

### EA domain
- [ ] Create `schema/domains/ea/` directory
- [ ] Build schema-structure.json with Service, Service Type, Capability, Capability Status, Business Process, Information Object, Disposition
- [ ] Build schema-attributes.json (add supportedBy multi-reference on Service)
- [ ] Copy and adapt data files from enterprise schema
- [ ] Write README.md

### Financial domain
- [ ] Create `schema/domains/financial/` directory
- [ ] Build schema-structure.json with Contract, Contract Status, Cost Category, Disposal Method
- [ ] Build schema-attributes.json (add costCategory reference to resolve orphaned Cost Category)
- [ ] Copy and adapt data files from enterprise schema
- [ ] Write README.md

### Requirements domain
- [ ] Create `schema/domains/requirements/` directory
- [ ] Build schema-structure.json with Requirement, Requirement Type, Requirement Status, Requirement Priority, Verification Method
- [ ] Build schema-attributes.json
- [ ] Create example data files
- [ ] Write README.md

### SCCM domain (existing, update)
- [x] Schema files exist at `schema/domains/sccm/`
- [x] 7 CI types, 3 lookup types, example data present
- [x] README.md written
- [ ] Update type references to use Core naming conventions instead of extended
- [ ] Validate SCCM domain loads cleanly alongside Core (not dependent on full extended schema)

## Phase 3: Portfolio Mode

- [ ] Create `schema/portfolio/` directory (or restructure `schema/enterprise/`)
- [ ] Build schema-structure.json with product-prefixed types referencing Core and domains
- [ ] Build schema-attributes.json for portfolio-specific types (Component Instance, Feature Implementation, Site Location Assignment, Site Org Relationship, Site Personnel Assignment)
- [ ] Update portfolio-specific lookup data (Baseline Milestone, Build Status, Sunset Reason, Implementation Status, Site Type, Site Workflow Status, Upgrade Status)
- [ ] Write README.md explaining portfolio mode
- [ ] Define pattern for how Portfolio mode consumes domain types (auto-prefix or manual)

## Phase 4: Tooling Updates

- [ ] Update `tools/validate.js` to accept `--domains` flag for loading Core + specified domains
- [ ] Update `tools/validate.js` to check cross-schema references between Core and domains
- [ ] Update `tools/lib/constants.js` LOAD_PRIORITY for domain-aware ordering
- [ ] Update `adapters/jsm/import.js` to accept domain paths alongside schema path
- [ ] Update `adapters/servicenow/import.js` to accept domain paths
- [ ] Update `adapters/jsm/overlay.json` for Core + domain type organization
- [ ] Update `adapters/servicenow/overlay.json` for Core + domain type organization
- [ ] Update `adapters/jsm/lib/` loader to merge domain schema files with Core
- [ ] Update `adapters/servicenow/lib/overlay-loader.js` for domain-aware overlay loading

## Phase 5: Validation and Cleanup

- [ ] Validate Core schema standalone (import into JSM Assets)
- [ ] Validate Core schema standalone (import into ServiceNow)
- [ ] Validate Core + each domain combination (JSM)
- [ ] Validate Core + each domain combination (ServiceNow)
- [ ] Validate Portfolio mode (JSM)
- [ ] Validate Portfolio mode (ServiceNow)
- [ ] Verify no references break when a domain is not loaded
- [ ] Update `package.json` npm scripts for new schema paths (replace validate:base, validate:extended)
- [ ] Add validate:core, validate:sccm, validate:enterprise npm scripts
- [ ] Archive or remove `schema/base/` and `schema/extended/` directories
- [ ] Update README.md for Core + Domains pitch
- [ ] Update CLAUDE.md for new file structure and commands

## Completed Prior Work

- [x] Design complete: Core + Domains architecture documented
- [x] Constitution ratified (2026-03-24) with 13 principles
- [x] Spec Kit installed (v0.4.1)
- [x] SCCM domain built as proof of concept
- [x] UAF viewpoint alignment documented
- [x] Domain dependency map defined
- [x] Schema fixes cataloged from code review and schema critique
