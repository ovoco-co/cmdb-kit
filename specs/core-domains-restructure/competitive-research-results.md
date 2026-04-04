# Competitive Research Results

**Date**: 2026-03-27
**Status**: Incomplete. Shallow results that need deeper investigation.

## What Was Searched

### Atlassian Marketplace
- Searched: "cmdb", "deployment tracking", "version tracking assets", "release management baseline"
- Platform filter: Jira Service Management
- Method: WebFetch on marketplace search pages, read short descriptions only

### GitHub
- Searched: "cmdb schema", "cmdb open source", "deployment site tracking version software"
- Method: GitHub API search, read repo descriptions only

### ServiceNow Store (searched via Playwright 2026-03-27)

**Search 1**: "deployment tracking baseline configuration management" - 12 results:
- AssetTrack (AMI) - hardware asset tracking with barcodes/RFID
- CG4 Asset Tracking - physical asset tracking
- Now Assist for CMDB (ServiceNow) - AI for CMDB data quality (x2 listings)
- Cloud Deployment Automation (ServiceNow) - cloud provisioning
- SysTrack Asset Optimization (Lakeside) - endpoint discovery
- **EY Back to Baseline for ITx** (Ernst and Young) - "simplifies ITx, reduces risk, enables transformation" - NEEDS DEEPER INVESTIGATION, has "baseline" in name
- Sunbird dcTrack DCIM Connector - data center infrastructure
- Experimentation Management (Hackable) - innovation testing
- Segment Management (ServiceNow) - partner management
- Tanium Software Management - software deployment via Tanium
- Microsoft Endpoint Configuration Manager Spoke - SCCM/MECM integration

**Search 2**: "product version release tracking" - ZERO results

**Assessment**: The ServiceNow Store has no apps that track software product versions deployed to customer sites with baselines. The closest match is "EY Back to Baseline for ITx" which needs investigation but appears to be about IT transformation baseline tracking, not product delivery. Everything else is infrastructure discovery, asset tracking, or cloud provisioning.

## Results and Honesty About What We Know

### Atlassian Marketplace (19 apps found)

**Device42 - CMDB with REST APIs for Jira** (57 installs)
- Short description says: DCIM, ITIL, ITAM, ITSM, and IPAM integration
- ASSUMED infrastructure-focused. NOT VERIFIED. Device42 is a large product. It may have product/release tracking features we haven't checked.
- NEEDS: Open the app page, read full feature list, check if it tracks software versions at customer sites.

**Simply Asset Management and CMDB** (SimplyIT.cloud)
- Short description says: "Build asset relations to focus on customer and stakeholder value delivery"
- "Stakeholder value delivery" COULD mean product delivery. Dismissed without reading further.
- NEEDS: Open the app page, read what "value delivery" means in their context.

**CMDB Change Policy Framework for Financial Services** (Adaptavist)
- Short description says: compliance and risk management for financial services
- ASSUMED irrelevant. Could have configuration baseline features.
- NEEDS: Check if it has baseline or configuration status accounting features.

**IT Assets, License - Asset Management for Jira** (DevSamurai)
- Tracks hardware, software licenses, consumables
- ASSUMED pure ITAM. But "software licenses" could include version tracking.
- NEEDS: Check if it tracks software versions deployed to specific locations.

**The other 15 apps**: All appear to be infrastructure discovery connectors (Intune, Azure AD, Lansweeper, Datadog, Dynatrace) or CMDB utilities (cleanup, migration, analytics). None mention product delivery in their short descriptions. But short descriptions are not feature lists.
- NEEDS: Spot-check at least the top 5 by installs to verify they don't have hidden product tracking features.

### GitHub (23 repos found for "cmdb open source")

**Industrace** (52 stars) - "Open-source CMDB for ICS and OT environments"
- Industrial control systems. Different domain but the concept of tracking deployed configurations at sites is similar.
- NEEDS: Read the README. See if their schema has concepts we should learn from.

**iTop utilities, CMDBuild wrappers, i-doit containers**: All wrappers around existing ITIL CMDBs.
- ASSUMED infrastructure-focused because the parent tools are. Probably correct but not verified.

**Everything else**: Under 10 stars, minimal descriptions.
- NEEDS: Nothing. These are abandoned or toy projects.

### ServiceNow Store and Plugins
- NOT SEARCHED. WebFetch can't access the Store.
- NEEDS: Use Playwright to log in and search, or search manually.
- Key searches needed: "product delivery", "release tracking", "deployment tracking", "baseline management", "software distribution", "configuration status"

## Search Terms We Didn't Try

Our problem might be described with different vocabulary by different communities:

- "Release management" (ITIL term)
- "Software distribution management"
- "Configuration status accounting" (EIA-649 term)
- "Deployment inventory"
- "Software asset management" (overlaps but different focus)
- "Product lifecycle management" (PLM term, usually hardware)
- "Application portfolio management" (enterprise architecture term)
- "Release orchestration" or "release automation"
- "Environment management"
- "Software catalog"
- "IT service catalog" (might include deployed versions)

Each of these should be searched on each marketplace.

## The "Build It Yourself" Alternative

The most likely competition isn't a marketplace app. It's someone building their own solution using:

1. **ServiceNow OOTB CMDB + custom fields**: Add fields to cmdb_ci_appl for version, deployment site, baseline. Create custom relationship types. This is what most ServiceNow customers actually do.
   - NEEDS: Document exactly what this takes. How many custom fields, what relationship types, what reports. Is it hard? Is it fragile? Does it scale?

2. **JSM Assets with a hand-built schema**: Create object types for Product, Version, Deployment Site manually. Set up references between them.
   - NEEDS: Document what this takes. How long, how many types, what breaks when you need to change it.

3. **Jira project with custom issue types**: Create issue types for Product, Version, Deployment. Use links between issues. Use custom fields for site, status, baseline.
   - NEEDS: Document when this works and when it breaks down. Probably works for small programs (<10 products, <20 sites) and falls apart at scale.

4. **Spreadsheets**: Version tracking in Excel, shared on SharePoint.
   - NEEDS: Document honestly that this works fine for small programs and many teams use it successfully.

5. **PLM tools** (Arena, Aras, Windchill): These track product configurations through lifecycles.
   - NEEDS: Check if any PLM tool handles software deployed to customer sites, or if they're all focused on hardware BOMs and manufacturing.

## Prompts for Other AI Systems

To get better competitive research, try these with Gemini, Perplexity, or ChatGPT (which have live web access):

### Atlassian Marketplace Deep Dive
```
Search the Atlassian Marketplace for JSM (Jira Service Management) apps that help track:
- What version of a software product is deployed at which customer site
- Configuration baselines (approved configurations at a point in time)
- Software release distribution to multiple deployment locations
- Product delivery tracking across multiple customer environments

For each app found, provide: name, vendor, install count, price, and a summary of what it actually does (not just the tagline). Include apps that might solve this problem even if they don't use the word "CMDB."
```

### ServiceNow Store Deep Dive
```
Search the ServiceNow Store and ServiceNow community for apps, plugins, or solutions that help track:
- Software product versions deployed to customer sites
- Configuration baselines
- Release distribution and deployment status across multiple locations
- Product delivery lifecycle in the CMDB

Include both Store apps and community-shared solutions (update sets, scoped apps on Share). Also check if ServiceNow's OOTB CMDB with CSDM can solve this without any add-ons.
```

### GitHub and Open Source
```
Search GitHub, GitLab, and SourceForge for open-source tools that track software product deployments across multiple customer sites. The tool should be able to answer:
- What version is running at each site
- What the approved configuration baseline is
- What changed since the last baseline
- Who is responsible for each deployment

Don't limit to tools that call themselves "CMDB." Include release managers, deployment trackers, configuration registers, and software distribution tools. For each tool found, explain what it does and whether it could solve this problem.
```

### PLM Crossover
```
Can any Product Lifecycle Management (PLM) tool track software product deployments to customer sites? Specifically:
- Arena PLM
- Aras Innovator
- PTC Windchill

These are normally used for hardware BOMs and manufacturing. But do any of them have features for tracking software versions deployed to remote customer locations with baseline management?
```

### The "Just Use ServiceNow" Question
```
A configuration manager needs to track what version of their software product is deployed at 50+ customer sites, including approved baselines, deployment status, and site points of contact. They already have ServiceNow.

Can they solve this with ServiceNow's OOTB CMDB (no additional apps)? What would they need to customize? How many custom fields and relationship types? Does CSDM help or hurt? What are the limitations? Be specific and technical.
```

### The "Just Use JSM Assets" Question
```
A configuration manager needs to track software product versions deployed to customer sites, with baselines and deployment status. They have Jira Service Management with Assets.

Can they build this schema by hand in JSM Assets? What object types would they create? What attributes? What references between objects? How long would it take? What breaks when requirements change? Be specific about the JSM Assets schema design.
```

## What We Can Conclude So Far

**Tentatively supported**: No Atlassian Marketplace app specifically addresses product delivery tracking with baselines and deployment sites. The apps that exist are infrastructure discovery connectors and IT asset managers.

**Not yet verified**: Whether ServiceNow Store has relevant apps. Whether the "build it yourself" approach is easy enough that CMDB-Kit isn't needed. Whether PLM tools cross over into this space.

**Honest assessment**: We searched with limited terms, read only short descriptions, and didn't open any app detail pages. This research is a starting point, not a conclusion.

**Important caveat**: The Boeing GSEP documents are from 2019-2022. Boeing may have evolved their approach since then. ServiceNow CSDM is now at version 4-5, with potentially new product delivery features. The Atlassian marketplace has grown significantly. Our book research establishes structural and historical context, but live web research (via Gemini/Perplexity prompts provided in the research plan) is needed to check whether the gaps identified still exist in 2026 tools and platforms.

## Book Research (in progress)

### cmdb-systems.md (Hichem Guemiri - CMDB Systems)
Read through Chapter 3. Entirely framed around ITIL service management - infrastructure, service modeling, change impact, incident response. The DML (Definitive Media Library) section is relevant to CMDB-Kit's distribution concept. But the book does not discuss tracking software product versions deployed to external customer sites as a use case.

Key insight: The CMDB literature is almost entirely written from the perspective of internal IT managing infrastructure for their own organization. "I ship software to external customer sites" is outside how the industry thinks about CMDBs.

### Configuration_Management_Theory.md (Quigley and Robertson)
Started reading. This is from the product development CM tradition (defense, manufacturing), not the ITIL tradition. Talks about product lifecycles, product structure, baselines - closer to CMDB-Kit's domain. Need to continue reading for tools referenced and competing approaches.

### Your CMDB Mantra (Guemiri, Thai, Carrier - 2016)
ServiceNow-specific CMDB implementation guide. 50 chapters covering business case, process design, CMDB blueprint model, ServiceNow data model, and implementation. CI categories: Service, Application, Database, Servers, Data Center, Network, Storage, Backup, Hardware, Documentation. No Product, no Version, no Baseline, no Deployment Site. Target audience: IT Executives, Enterprise Architects, Asset Managers, SACM Process Managers, ServiceNow admins. Entirely ITIL service-centric. Defines CMDB as "a database schema that holds all the information, inventories and documentation of both logical and physical components glued together into an IT service centric organization." Zero mention of shipping software to customer sites.

**Book review blurb**: Comprehensive ServiceNow CMDB implementation guide with 187 diagrams. Walks through the full journey from business case through blueprint design to ServiceNow-specific deployment. Best for organizations implementing their first ServiceNow CMDB focused on IT service management. Does not cover product delivery, configuration baselines, or multi-site deployment tracking.

### Boeing Pattern (from private docs)
Boeing operates in both worlds simultaneously. Their defense CM team (BPG/CM) manages product baselines, specification trees, and configuration identification using EIA-649/MIL-HDBK-61B. Their enterprise IT team (GSEP) runs ServiceNow with infrastructure discovery and ITSM. They appear to have built a bridge with "CI Classes and Product Model Remediation (PMR)" - extending ServiceNow CI classes to include a product model. This is the "build it yourself" approach: two disciplines connected through custom ServiceNow development. CMDB-Kit makes this reusable and open source instead of custom.

### Emerging Insight
Two separate traditions exist that don't talk to each other:
1. **ITIL/ServiceNow CMDB**: Infrastructure, services, incidents. Internal IT managing their own environment.
2. **Defense/Manufacturing CM**: Products, baselines, deployments. Programs shipping things to customer sites.

The CMDB books, tools, and marketplace apps all live in tradition 1. The military standards, Boeing CM procedures, and AFRL operational docs live in tradition 2. CMDB-Kit bridges these by putting tradition 2 concepts (Product, Version, Baseline, Deployment Site) into tradition 1 platforms (ServiceNow, JSM Assets).

### Three Traditions, Not Two

After reading more books, there are actually three separate traditions:

1. **ITIL/ServiceNow CMDB** (tradition 1): Infrastructure, services, incidents. Internal IT managing their own environment. Tools: ServiceNow, BMC, iTop. Books: Your CMDB Mantra, CMDB Systems.

2. **Defense/Manufacturing CM** (tradition 2): Products, baselines, deployments to customer sites. Programs shipping things to operational environments. Standards: EIA-649C, MIL-HDBK-61B, NATO ACMP-2009. Books: Quigley and Robertson, Jones Supportability Handbook.

3. **Software CM/SCM** (tradition 3): Source code, branching, builds, releases. Developer tooling. Tools: Git, ClearCase, Perforce. Books: Berczuk and Appleton SCM Patterns (2003).

Git replaced ClearCase for tradition 3. ServiceNow replaced homegrown tools for tradition 1. But tradition 2 still lives in spreadsheets and custom solutions.

SCM (tradition 3) manages the source code and build process. Defense CM (tradition 2) manages the product after it's built: what version, where deployed, what baseline approved. ITIL CMDB (tradition 1) manages the infrastructure it runs on.

CMDB-Kit picks up where Git and CI/CD leave off (product is built and released) and tracks what happens next (deployed to sites, baselined, approved). It stores that tracking in tradition 1 platforms (ServiceNow, JSM Assets). It bridges all three traditions.

The positioning: "Three disciplines manage different parts of the same lifecycle but use different tools that don't talk to each other. CMDB-Kit connects them."

### Boeing GSEP Deep Dive (from converted PDFs)

Read the full "CI Classes and Product Model Remediation (PMR)" presentation (9 slides).

Boeing's GSEP uses CSDM 3.0. Their "Product Model" concept is about normalizing discovered hardware CIs against an authoritative procurement catalog (ESATS). Fields: UNSPSC code, ESATS Product ID, ESATS Lifecycle, ESATS Product Version ID. They have 419,221 hardware CIs not normalized to ESATS. 90.75% of hardware models un-normalized.

This is NOT what CMDB-Kit does. Boeing's "Product Model" answers "what kind of server is this" (Dell PowerEdge R740). CMDB-Kit's "Product" answers "what software did we build and where did we deploy version 4.2." Same word, completely different concept.

The CSDM Foundation layer has "Products (Models)" as templates for CI creation. ServiceNow's product concept is a catalog entry describing what a thing IS, not a software product you BUILT and DEPLOYED. The relationship taxonomy shows Business Capabilities > Business Applications > Servers/Databases. No concept of product versions deployed to customer sites, baselines, or deployment site tracking.

Boeing validates that the problem exists (their defense CM team and their GSEP team are separate) but also shows that ServiceNow's native product model concept doesn't solve it. Even a company the size of Boeing hasn't bridged tradition 2 (product baselines per EIA-649) with tradition 1 (ServiceNow CMDB) in the way CMDB-Kit proposes.

### Configuration Management: Expert Guidance (Lacy, Norfolk - BCS)
"Expert guidance for IT service managers and practitioners." Published by BCS, The Chartered Institute for IT. Tradition 1 - ITIL service management CM, not product delivery CM. Important finding: the title "Configuration Management" means different things in different traditions. Defense CM people hear "baselines, specification trees, deployment tracking." ITIL people hear "CMDB, discovery, service mapping." Same vocabulary, different discipline.

### Software Configuration Management Patterns (Berczuk, Appleton - 2003)
Tradition 3: source code CM. Patterns for branching, merging, releases. Tools of the era: VSS, CVS, Perforce, ClearCase, CM Synergy. Git replaced all of these. This tradition manages code and builds. CMDB-Kit picks up where this tradition ends - after the build is done, tracking what happens to the product.

### Configuration Management: Theory, Practice, and Application (Quigley, Robertson - 2015)
Tradition 2: defense/manufacturing product CM. CRC Press/Auerbach. Covers product structure, product identification, baselines, serialization, traceability, BOMs, supply chain, IP, ITAR. The comprehensive text on CM as practiced in defense programs. Chapter 2 has a section on "Application Deployment" (p.67). This is the tradition CMDB-Kit was built from.

### ServiceNow Cookbook (Srivastava - 2017)
Packt Publishing. 50+ recipes for managing services in enterprise environments. Author background: ITIL/ServiceNow certified, clients in Insurance, Banking, Manufacturing. Tradition 1 - enterprise IT service management. Need to check table of contents for any product/release tracking recipes.

### Books read but not relevant to competitive research
- Service Management: Theory and Practice (Bryson et al - 2020) - Business school textbook on service businesses broadly, not IT-specific
- Service Operations Management (McManus et al - 2020) - Business school textbook, not IT-specific

### Key vocabulary finding
"Configuration Management" means different things to different traditions:
- Tradition 1 (ITIL): managing IT infrastructure configuration items in a CMDB
- Tradition 2 (Defense): managing product baselines, specification trees, and deployment configurations per EIA-649/MIL-HDBK-61B
- Tradition 3 (SCM): managing source code versions, branches, and builds

CMDB-Kit uses the vocabulary of tradition 2 on the platforms of tradition 1. This is both the value proposition and a communication challenge.

### Additional Boeing GSEP Documents Read

**GSEP CMDB Data Sources (2021)**: Multi-source CMDB/IRE deep dive. Shows how Boeing reconciles CIs from ServiceNow Discovery, SCCM, and Tanium through identification and reconciliation rules. Server class has 6 identification entries (serial number, name, MAC address, SIS server ID). Directly validates CMDB-Kit's approach of creating custom CI classes with independent identification rules via the same IRE mechanism. Boeing's sources are automated discovery; CMDB-Kit's source is manual/CI/CD import, but the IRE treats both the same way.

**GSEP Release Management Procedure (2020, 29 pages)**: 10-day SAFe iteration cycle for releasing ServiceNow platform code. Uses TFS/ADO work items, ServiceNow Change Management for approval, PI.Iteration release IDs. This is tradition 3 (SCM) for ServiceNow development, not product delivery to customer sites.

**GSEP License Management Policy (2022)**: Managing ServiceNow platform licenses (ITIL fulfiller, Business Stakeholder roles). Monthly revalidation and harvesting. Not related to software product licensing.

**GSEP CM Slide Deck**: ITIL change management training. Normal, Emergency, Standard change types. Change lifecycle: New > Assess > Authorize > Scheduled > Implement > Review > Closed. Pure tradition 1.

**GSEP CSDM Governance Kickoff (2022)**: CSDM 3.0 governance with architectural board. Explicitly excludes defense CM (PRO-1268) from scope. Configuration Management team's architect was TBD. Validates that Boeing organizationally separates defense CM from CMDB governance.

**OBCM Change Management Tutorial**: Enterprise architecture capability map change control. Change Requests for modifying business capabilities. Governed by FAITs and Chief Architect Steering Team. Managed on SharePoint, not ServiceNow. Another example of tradition 2 concepts (versioned artifacts, change control) managed outside the CMDB.

### NASA PDLM Handbook (NASA-HDBK-0008)
Product Data and Life-Cycle Management. Covers requirements management, configuration management (engineering release and change), parts management, CAD data management, product breakdown structure. Tradition 2 applied to NASA programs. Inactivated 2017 due to MBSE transition, revalidated 2021. Confirms government agencies define the same product delivery CM problem, with no standard digital tool solution.

### Summary of All Boeing GSEP Findings

Every Boeing GSEP document reviewed (9 total) is tradition 1: ITIL service management on ServiceNow. Not a single document connects to tradition 2 (defense product delivery tracking). Boeing explicitly scopes defense CM (PRO-1268) out of CSDM governance. The "product model" in ServiceNow is about normalizing hardware catalogs, not tracking software versions at customer sites. Three separate "deployment" concepts exist at Boeing: ServiceNow platform deployment (GSEP), defense product deployment (AFRL-type), and infrastructure deployment (ITIL change). These are managed by separate teams, separate tools, and separate governance structures.

## Is the CMDB the Right Home?

The honest question: should product delivery tracking live in the CMDB at all?

### Arguments for the CMDB

- The infrastructure data is already there. If you track "OvocoCRM v4.2 runs on crm-app-01 at Acme Corp's SCIF," both the product version and the server need to be in the same system to see that relationship.
- ServiceNow and JSM are already deployed at the organizations that need this. No new tool purchase or deployment required.
- Relationship graph between products and infrastructure is native. Impact analysis ("if this server goes down, what products are affected") works automatically.
- ServiceNow's IRE, identification rules, and CMDB workspace provide mature infrastructure for managing CI data quality, deduplication, and visualization.

### Arguments against the CMDB

- Products aren't discovered on a network. They're manually defined. The CMDB's core value proposition (automated discovery and reconciliation) doesn't apply.
- Baselines aren't infrastructure state. They're approval artifacts with formal governance (CCB, disposition records). The CMDB doesn't have native baseline concepts.
- Deployment sites aren't servers. They're customer locations you ship to. The CMDB's location model assumes facilities you own, not customer facilities.
- Change control for product delivery is CCB-driven with formal disposition (approve, reject, defer, table, escalate). ITIL change management is CAB-driven with risk assessment. Different process, different vocabulary, different governance.
- You're fighting the platform's assumptions about what a CI is, how it's identified, and what processes act on it.

### Alternatives to the CMDB

- **Jira with custom issue types**: Where the development work already happens. Could track versions, deployments, baselines as issue types with links. Works for small programs. Falls apart at scale or when you need infrastructure relationships.
- **PLM tool** (Arena, Aras, Windchill): Designed for product configurations. But oriented toward hardware BOMs and manufacturing, not software deployed to customer sites.
- **Standalone web app**: Purpose-built for product delivery tracking. Integrates with CMDB for infrastructure data, Jira for development data, Git for source data. Most flexible but requires building and maintaining a separate system.
- **Spreadsheets/SharePoint**: What most people actually use today. Works for small programs. No relationships, no automation, no audit trail at scale.
- **Deployment tools** (Octopus Deploy, Harness, ArgoCD): Track deployment events but not product configuration state. They know what was deployed when, but not what the approved baseline is, who the site POC is, or what documents apply.

### Where CMDB-Kit lands

CMDB-Kit chose to be inside the CMDB because the infrastructure relationship is the hardest piece to replicate outside it. A standalone tool would need to sync with the CMDB for servers, databases, and network segments anyway. By being native to ServiceNow and JSM Assets, those relationships come for free.

But this is a design choice, not a universal truth. For organizations that don't need infrastructure relationships (e.g., shipping standalone software packages to customer sites with no infrastructure tracking), a simpler tool might be better. CMDB-Kit should be honest about when it's the right answer and when it isn't.

### Community separation confirms the gap

CMDB forums and communities (ServiceNow Community CMDB Forum, r/servicenow, itSMF, HDI) are tradition 1. Defense CM forums (NDIA CM Division, CMPIC, INCOSE, SAE) are tradition 2. These communities don't overlap. A ServiceNow CMDB person doesn't attend NDIA CM Division meetings. A defense configuration manager doesn't post on r/servicenow. CMDB-Kit's target user lives in both worlds and currently has no community.

## Scholarly Research (Google Scholar, 2018-2026)

Searched: "configuration management database" "product delivery" OR "deployment site" OR "baseline management". 19 results.

**Key finding**: No paper specifically addresses bridging ITIL CMDB with defense CM for product delivery tracking. The papers that mention both "CMDB" and "product delivery" are about ITIL/DevOps tension, not about tracking software versions at customer sites.

**Most relevant results**:

1. **"Management and utilization of industrial automation installed base data"** (Repo, 2024, LUT University thesis) - Closest parallel to CMDB-Kit. About tracking deployed industrial automation equipment. "Installed base data should be stored in a configuration management database and differentiated from operational data." Same problem, different industry (industrial equipment vs software).

2. **"ITIL and DevOps: An Analysis"** (Krishna Kaiser, 2023, Springer) - Acknowledges "product delivery today mostly deals with" different concerns than ITIL CMDB. Confirms the tension between traditions 1 and 3.

3. **"The DevOps Handbook"** (Kim et al, 2021, 1,264 citations) - "keeping the configuration management database" alongside "product delivery cycles continue to move slower." The canonical DevOps text treats CMDB as release management infrastructure, not product delivery tracking.

4. **"Managing requirements, scope and configuration"** (Doloi, 2024, Handbook of Project Management) - Mentions CMDB and "Managing product delivery" in same chapter. Project management perspective.

**What's missing from the literature**: No paper about putting defense CM concepts (baselines, deployment sites, media distribution) into ITIL CMDB platforms (ServiceNow, JSM). No paper about the three traditions gap. No paper about open-source CMDB schemas for product delivery. This is either a genuine gap in the research or our search terms missed it.

**Next steps**: Full text access to the LUT thesis (installed base data management) and the Kaiser ITIL/DevOps books would provide deeper competitive intelligence. U of U Marriott Library access was deactivated.

### Still to read
- configuration-management-and-control.md (private/Books)
- Configuriation_Identification.md (private/Books)
- Service_Management_theory.md (private/Books)
- Service_Operations_Management.md (private/Books)
- Your CMDB Mantra PDF (ovoco/books/Service Management)
- Configuration_Management_Expert_Guidance PDF
- Software_Configuration_Management_Patterns PDF
