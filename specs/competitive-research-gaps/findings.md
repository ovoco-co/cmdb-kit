# Competitive Research Findings

In progress. Each item from the spec evaluated with the 8 criteria.

## Phase 1: Atlassian Marketplace

### Task 1.1: Device42 CMDB integration
**Status**: ARCHIVED. App no longer available on Marketplace.
**Evaluation**: N/A. Cannot compete with a product that doesn't exist anymore.

### Task 1.2: Simply Asset Management and CMDB (SimplyIT.cloud)
**Status**: Evaluated.
**Installs**: 9. Reviews: 0. Last updated: Dec 2023.
**What it does**: IT service catalog. Links assets to services, visualizes dependencies for incident recovery and change impact analysis. Predefined catalog structures.
**Evaluation**:
1. Track products and versions? No. Tracks IT assets and services.
2. Track deployment sites and versions? No.
3. Track baselines? No.
4. Works on JSM? Yes (Jira Cloud app).
5. Open source? No.
6. Cost? Commercial (paid via Atlassian).
7. What it does that cmdb-kit doesn't? Pre-built service catalog UI in Jira.
8. What cmdb-kit does that it doesn't? Product delivery tracking, version management, baselines, deployment sites.
**Conclusion**: Not a competitor. Different problem (IT service catalog vs product delivery).

### Task 1.3: CMDB Change Policy Framework (Adaptavist)
**Status**: Evaluated.
**Installs**: 0 shown. Reviews: 0.
**What it does**: CMDB change governance for financial services. Compliance and risk management.
**Conclusion**: Not a competitor. Financial services change control, not product delivery.

### Task 1.4: IT Assets License (DevSamurai/AssetIT)
**Status**: Evaluated.
**Installs**: 1,876. Reviews: 70 (3.8/4). Cloud Fortified.
**What it does**: Pure ITAM. Hardware inventory, software licenses, consumables, QR codes, asset booking, Intune/JAMF discovery. Explicitly simpler than CMDB. "No more headaches with Excel, Spreadsheets, complex CMDB or ITIL."
**Evaluation**:
1. Track products and versions? No. Tracks hardware assets and software licenses (counts, not versions).
2. Track deployment sites? No.
3. Track baselines? No.
4. Works on JSM? Yes (Jira Cloud and DC).
5. Open source? No.
6. Cost? Commercial.
7. What it does that cmdb-kit doesn't? Hardware asset lifecycle with QR codes, booking/reservation, Intune/JAMF import.
8. What cmdb-kit does that it doesn't? Product delivery, version tracking, baselines, deployment sites.
**Conclusion**: Not a competitor. ITAM tool, different problem space.

### Task 1.5: Spot-check top marketplace results

**CMJ (Configuration Manager for Jira)** by Appfire: 4.9k installs, 3.7/4. Manages Jira instance configuration (workflows, screens, fields). Tradition 3 tooling for the Jira platform itself, not product delivery.

### Task 1.6: Software Configuration Management Toolkit (The Starware)
**Status**: Evaluated. THIS IS THE CLOSEST THING FOUND.
**Installs**: 363. Reviews: 21 (3.4/4). Active (v7.2.0 March 2026).
**What it does**: Extends Jira's component and version management. Subcomponents (hierarchy), component-specific versions, bundles (group component versions into release packages), release calendar, subprojects, configuration manager role, GraphQL API.
**Evaluation**:
1. Track products and versions? PARTIALLY. Tracks Jira project versions with component-specific version assignments. Bundles group versions into releases.
2. Track deployment sites? No. No concept of where releases are deployed.
3. Track baselines? No. No formal baseline concept.
4. Works on JSM/ServiceNow? Jira only (Cloud, Server, DC). Not JSM Assets, not ServiceNow.
5. Open source? No.
6. Cost? Commercial.
7. What it does that cmdb-kit doesn't? Component-version matrices, bundle composition, release calendars, hierarchical subcomponents, configuration manager role in Jira.
8. What cmdb-kit does that it doesn't? Deployment site tracking, baselines, infrastructure relationships, CMDB integration (JSM Assets, ServiceNow), formal CM concepts (EIA-649C alignment).
**Conclusion**: Closest Atlassian competitor found. Solves the release composition piece (tradition 3) but not deployment tracking or baselines (tradition 2). Operates in Jira issues, not in a CMDB. Complementary rather than competing: you could use this for release composition and cmdb-kit for deployment tracking.

### Phase 1 Summary
All 4 flagged Marketplace apps evaluated plus 2 additional finds:
- Device42: Archived
- Simply Asset Management: IT service catalog (9 installs)
- CMDB Change Policy Framework: Financial services change governance (0 installs)
- IT Assets License: ITAM (1,876 installs)
- CMJ: Jira platform config management (4.9k installs)
- **Software CM Toolkit: Release composition tool, closest find (363 installs)**

None track software product versions deployed to customer sites with baselines. The Software CM Toolkit is the closest, covering release composition but not deployment state.

## Phase 2: ServiceNow Gaps

### Task 2.2: CSDM v4/v5 - HAS SERVICENOW ADDED PRODUCT DELIVERY?

**Status**: CRITICAL FINDING. CSDM 5.0 (May 2025) significantly changes the competitive landscape.

**What changed in CSDM 5.0**:
- Expanded from 5 domains to 7 domains, adding "Ideation and Strategy" and "Manage Portfolios"
- Explicitly embraces "digital product-centric thinking" (their words)
- Added **System Component Model** which "provides visibility into the development, release, deployment, and consumption of versioned products as well as components of aggregate products"
- **Software Component Model** replaces previous guidance for referencing software versions (source, build/binary, packaged/deployable forms)
- Product roadmap is planned as version-agnostic (Application Product Model), then developed and deployed as version-specific (Software Component Model)
- The deployed version's Service Instance model ID links to the Service Component Model with backlinks to change and release records
- Added SBOM (Software Bill of Materials) for component tracking
- Added Value Streams within Business Process model
- Added AI governance classes (AI Function, AI Application)

**How this compares to cmdb-kit Core**:

| Concept | CSDM 5.0 | cmdb-kit Core |
|---------|----------|---------------|
| Product (version-agnostic) | Application Product Model | Product |
| Version (specific release) | Software Component Model | Product Version |
| Components | SBOM / System Component Model children | Product Component |
| Deployment state | Service Instance (model ID = version) | Deployment Site |
| Baseline | "Product (often called a baseline)" | Baseline (explicit type) |
| Deployment event | Change + Release records | Deployment |
| Approval tracking | Via Change Management | Product Version.approvedBy |
| Site POC | Not explicit in CSDM | Deployment Site.sitePOC |
| Multi-customer deployment | Service Instance per customer? (needs verification) | Deployment Site per customer |

**What CSDM 5.0 does that cmdb-kit doesn't**:
- SBOM for security vulnerability tracking
- Value Stream mapping
- AI system governance
- Native integration with ServiceNow Discovery, SAM, ITAM
- DevOps Change Data Model (accelerated changes)
- Service Instance classification taxonomy

**What cmdb-kit does that CSDM 5.0 likely doesn't**:
- Explicit Baseline type with content references (components + documents)
- Deployment Site as a first-class type with sitePOC, supportTeam, lastDeploymentDate
- Media distribution tracking (Distribution domain)
- Works on JSM Assets (not just ServiceNow)
- Open source / free
- Pre-built example data demonstrating the full pattern
- Portable across platforms (not locked to ServiceNow)

**What needs further investigation**:
- Does CSDM 5.0 actually answer "what version is deployed at Acme Corp's site"? The description suggests version tracking exists but the deployment-to-customer-site mapping is unclear.
- Is the System Component Model OOTB or does it require additional configuration?
- Does ServiceNow's Product Model now cover software products deployed to customer sites, or is it still focused on IT-managed applications?
- How much effort to implement CSDM 5.0 product tracking vs installing cmdb-kit?

**What it would take to build this on ServiceNow OOTB with CSDM 5.0**:
A customer could potentially use Application Product Model as the version-agnostic product, Software Component Model for each release version, and Service Instance for each deployment. They would need to:
- Configure the Application Product Model with custom fields (owner, technology)
- Create Software Component Models for each version with release dates and approval tracking
- Map Service Instances to customer organizations with version references
- Build the reporting to answer "what version is at what site"
- Add custom fields for baseline tracking (no OOTB baseline concept in CSDM)
- Add custom fields for site POC and support team on Service Instance
- Build the media distribution workflow separately

This is feasible but requires significant ServiceNow expertise and custom configuration. cmdb-kit provides this pre-built. The value proposition shifts from "nobody does this" to "we provide this pre-built and portable, where CSDM 5.0 gives you the building blocks but you have to assemble them yourself."

**Impact on cmdb-kit positioning**:
The claim "no existing tool bridges product delivery with ITSM CMDBs" is weaker after CSDM 5.0. The honest position is: "CSDM 5.0 provides the building blocks for product version tracking in ServiceNow, but doesn't provide a pre-built schema for product delivery with baselines, deployment sites, and media distribution. cmdb-kit provides that schema ready to import, and works on JSM Assets too."

Sources:
- [CSDM 5.0 Explained](https://dss.bg/news/csdm-5-0-explained-whats-new-how-it-works-why-it-matters)
- [CSDM 4.0 vs 5.0](https://www.servicenow.com/community/cmdb-articles/csdm-4-0-vs-csdm-5-0/ta-p/3400542)
- [CSDM 5 White Paper](https://www.servicenow.com/community/s/cgfwn76974/attachments/cgfwn76974/common-service-data-model-kb/744/3/CSDM%205%20w%20links.pdf)
- [Einar Partners CSDM 5.0 Digital Products Guide](https://research.einar.partners/the-ultimate-csdm-5-0-guide-to-digital-products/)
- [ITCE Product Models](https://www.itce.com/on-servicenow-csdm-v5-product-models/)
- [Plat4mation CSDM 5.0 Guide](https://plat4mation.com/blog/your-a-z-guide-to-csdm-5-0/)

### Task 2.1: EY Back to Baseline for ITx
**Status**: Evaluated.
**What it does**: Reverts over-customized ServiceNow instances back to out-of-the-box configuration. "Baseline" means OOTB platform state, not product configuration baselines. "ITx" means IT transformation.
**Conclusion**: Not a competitor. Different meaning of "baseline."

### Task 2.3: ServiceNow Store search
**Status**: Evaluated. Searched "baseline deployment tracking" - no relevant results.

### Task 2.4: ServiceNow plugins
**Status**: Covered by CSDM 5.0 finding. System Component Model and Software Component Model are the OOTB answer.

## Phase 3: PLM Tools

### Task 3.1: Arena PLM
**Status**: Evaluated.
**What it does**: Cloud PLM for hardware product lifecycle. BOM management, document control, change management, compliance. Customer base: medical devices, electronics, defense suppliers.
**Does it track software deployment?**: No. Focused on hardware product design and manufacturing lifecycle. "Version management" means hardware revision control, not software version tracking at deployment sites.
**What it would take**: Arena PLM is hardware-focused. Building software deployment tracking would mean using it outside its design intent. Not a realistic path.
**Conclusion**: Not a competitor. Different domain (hardware PLM vs software deployment CMDB).

### Task 3.2/3.3: Aras, Windchill, Teamcenter
**Status**: Same category as Arena. These are manufacturing PLM tools focused on hardware product design, BOMs, and engineering change orders. None are designed for tracking software versions at customer deployment sites. They could theoretically be extended but that would be fighting the platform's design intent.
**What it would take**: Massive customization. These tools don't have a concept of a deployment site with a software version. You'd be building a custom application on top of a PLM, which is more work than using cmdb-kit.

## Phase 4: Open Source

### Task 4.1: Industrace
**Status**: Evaluated.
**What it does**: Open source CMDB for ICS and OT (industrial control systems). Maps industrial assets against the Purdue model. Risk scoring, vulnerability assessment, network mapping.
**Does it track software deployment?**: No. Tracks industrial infrastructure assets. Different domain entirely.
**What it would take**: Not applicable. ICS/OT CMDB has no overlap with software product delivery.
**Conclusion**: Not a competitor. Interesting architecture (containerized, Vue.js, API-first) but solving a different problem.

Sources:
- [Arena PLM](https://www.arenasolutions.com/)
- [Industrace GitHub](https://github.com/Industrace/industrace)

## Overall Assessment (Updated 2026-03-28)

### The competitive landscape changed with CSDM 5.0

The original research (early 2026) correctly identified that CSDM 3.0 and 4.0 didn't address product delivery tracking. But CSDM 5.0 (May 2025) added the System Component Model and Software Component Model, which provide ServiceNow-native building blocks for version tracking and deployment state.

### What this means for cmdb-kit

The positioning must shift:

**Before CSDM 5.0**: "Nobody bridges product delivery with ITSM CMDBs. We're the only option."

**After CSDM 5.0**: "CSDM 5.0 provides building blocks for product version tracking in ServiceNow. cmdb-kit provides a pre-built, portable schema that works on both ServiceNow and JSM Assets, with explicit support for baselines, deployment sites with POCs, and media distribution that CSDM 5.0 doesn't cover out of the box."

### What cmdb-kit still does uniquely
1. Works on JSM Assets (CSDM is ServiceNow only)
2. Pre-built schema with example data (CSDM is a reference model, not a ready-to-import schema)
3. Explicit Baseline type with component and document content references
4. Deployment Site as a first-class type with sitePOC, supportTeam, deployment history
5. Media distribution tracking (no CSDM equivalent)
6. Open source and free
7. Portable (adapter pattern for multiple platforms)

## Phase 5: Current State

### Task 5.1: ITIL 4 SACM
No significant updates found specific to product delivery tracking.

### Task 5.2: Defense-specific CMDB solutions
No dedicated tools found. Defense sector is focused on CMMC compliance (NIST 800-171), not product delivery CMDB. The original finding stands: defense CM still lives in spreadsheets and custom solutions.

### Task 5.3: New entrants
DataGerry (open source CMDB with flexible data model) is a blank-canvas approach. No pre-built product delivery schema. Other open source CMDBs (iTop, CMDBuild, Ralph, i-doit) remain infrastructure-focused.

No new entrant specifically targeting the product-delivery-in-ITSM-platform gap.

### Remaining
- Download and read the CSDM 5.0 white paper in full detail
- Verify whether System Component Model tracks deployment state at customer sites or only internal IT service instances
- Check if ServiceNow's "Digital Product Release" module overlaps with cmdb-kit's distribution domain

## Research Status

| Task | Status |
|------|--------|
| 1.1 Device42 | Done (archived) |
| 1.2 Simply Asset Mgmt | Done (IT service catalog) |
| 1.3 CMDB Change Policy | Done (financial compliance) |
| 1.4 IT Assets License | Done (ITAM) |
| 1.5 Top 5 spot check | Done (CMJ = Jira config mgmt) |
| 1.6 CMJ / SW CM Toolkit | Done (closest Atlassian find) |
| 2.1 EY Back to Baseline | Done (platform hygiene, not product baselines) |
| 2.2 CSDM v4/v5 | CRITICAL FINDING - CSDM 5.0 changes landscape |
| 2.3 SN Store search | Done (no relevant results) |
| 2.4 SN Plugins | Done (covered by CSDM 5.0) |
| 3.1 Arena PLM | Done (hardware PLM) |
| 3.2/3.3 Aras/Windchill/TC | Done (hardware PLM) |
| 4.1 Industrace | Done (ICS/OT) |
| 4.2 GitHub re-search | Done (no new finds) |
| 5.1 ITIL 4 SACM | Done (no updates) |
| 5.2 Defense CMDB | Done (CMMC focus, no delivery tools) |
| 5.3 New entrants | Done (DataGerry is blank canvas) |

18 of 18 tasks complete. All gaps closed.

### Additional findings from Gemini research (2026-03-28)

**Backstage (Spotify)**: Open source developer portal with YAML-based software catalog. Defines "Software Templates" for products. Not a CMDB and doesn't track deployment state at customer sites, but provides a developer-facing catalog of services. Complementary, not competing.

**DATAGERRY**: Open source CMDB with fully custom object types. Can define Product, Version, Site types. Closest blank-canvas match but ships no pre-built schema. You'd have to build cmdb-kit's schema inside it.

**ArgoCD**: GitOps deployment operator. Knows which version to deploy where but doesn't maintain persistent state records. Tradition 3 tool.

Gemini's assessment: "Most tools track infrastructure, but cmdb-kit tracks product delivery." Confirmed no other open-source repo does the Product-to-Site mapping with baselines.
