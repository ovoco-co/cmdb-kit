# Document Outlines: CMDB-Kit 2.0

Each outline specifies the exact content for each document. Claims cite source material. Examples reference actual schema data. Nothing is placeholder.

## Document 1: The Problem

**File**: docs/problem-statement.md
**Goal**: Reader decides in 2 minutes whether to keep reading.

### Section: Three Disciplines, One Lifecycle

State the problem: three disciplines manage different parts of the same product lifecycle using different tools, different vocabulary, and communities that don't overlap.

**Software CM** (Git, CI/CD, build systems): knows what's in a release but not where it's deployed or whether the deployment matches an approved baseline. Community: developers, DevOps engineers.

**ITIL CMDB** (ServiceNow, JSM Assets, BMC, iTop): knows what infrastructure exists and what services run on it. Has no concept of a software product version deployed to a customer site, an approved configuration baseline, or a media distribution chain of custody. Community: IT service managers, CMDB admins, ServiceNow consultants.

**Defense/Manufacturing CM** (EIA-649C, MIL-HDBK-61B, NATO ACMP-2009): defines what needs to be tracked after a product is built - baselines, deployment configurations, change control boards. But lives in spreadsheets and SharePoint. No standard digital tool implements these practices on modern platforms. Community: defense configuration managers, systems engineers, program managers.

Source: problem-statement.md paragraphs 1-3.

### Section: The Evidence

Marketplace search results (specific numbers):
- Atlassian Marketplace: 19 CMDB apps, all infrastructure discovery or IT asset management
- ServiceNow Store: 12 results for deployment/baseline search, zero for product version tracking
- GitHub: 23 open-source CMDB projects, all infrastructure-focused

Book evidence: every CMDB book defines CMDB around infrastructure and IT services. CI categories in the literature: Server, Application, Database, Network. No Product, Version, Baseline, Deployment Site.

The vocabulary collision: "Configuration Management" means baselines to defense people, CMDB/service mapping to IT people, and Git branching to developers.

Community separation: CMDB forums (r/servicenow, itSMF) are tradition 1. Defense CM forums (NDIA CM Division, CMPIC, INCOSE) are tradition 2. These communities don't overlap.

Source: competitive-research-results.md marketplace section, book section, community section.

### Section: Who This Is For

A configuration manager or technical lead on a program that ships software to customer sites. Defense contractor, government agency, or commercial company with on-premises deployments. They use ServiceNow or JSM Assets because that's what their organization runs. They track product versions, baselines, and deployment status in spreadsheets because the CMDB doesn't have these concepts.

Source: problem-statement.md "The User" section.

### Section: What CMDB-Kit Does

One paragraph: puts defense CM concepts (Product, Version, Baseline, Deployment Site) into ITSM platforms where they become native CIs connected to infrastructure data that's already there.

How it bridges: starts where Git/CI/CD ends (product is built and released), tracks what happens next (deployed to sites, baselined, approved), stores that tracking where the infrastructure relationships already exist.

Source: problem-statement.md "What CMDB-Kit Does" section.

### Section: When It Fits and When It Doesn't

**Fits**: organization uses ServiceNow or JSM Assets, needs product-to-infrastructure relationships, ships to multiple customer sites, has formal baseline/change control requirements.

**Doesn't fit**: small programs with fewer than 10 sites (spreadsheets work), no infrastructure tracking needed, doesn't use ServiceNow or JSM, only needs deployment event tracking (ArgoCD/Octopus handle this), problem is source code management not post-release tracking.

Source: problem-statement.md final two sections.

## Document 2: The Core Schema

**File**: docs/core-schema.md
**Goal**: Reader understands exactly what they get and what questions it answers.

### Section: Core Answers One Question

"What do we ship and where does it go?" Everything in Core traces back to this.

### Section: The Seven Question Categories

For each of the 7 categories, list every question, then state which type and attributes answer it. Use the exact questions from core-definition.md.

**Product Identity** (3 questions)
- What products do we manage? -> Product.name, Product.status
- What components make up each product? -> Product Component.name, .componentType
- Who owns each product? -> Product.owner (ref Team)

**Version and Release** (5 questions)
- What is the current version? -> Product Version.status = "Current"
- What versions have been released? -> Query Product Version by status
- What changed between versions? -> Product Version.releaseNotes
- What features are in this version? -> Feature.product + Feature.version
- Who approved this release? -> Product Version.approvedBy, .approvalDate

**Deployment** (7 questions)
- Where is this product deployed? -> Deployment Site.product, .organization
- What version is at each site? -> Deployment Site.version
- What environment? -> Deployment Site.environment
- What infrastructure supports it? -> Server, Database refs via adapter relationships
- When was the last deployment? -> Deployment Site.lastDeploymentDate
- Who performed the deployment? -> Deployment Site.deployedBy
- Is this site current or behind? -> Compare Deployment Site.version to Product Version where status=Current

**Baselines** (5 questions)
- What is the approved configuration? -> Baseline.product, .version, .status
- What's in the baseline? -> Baseline.components (multi-ref), .documents (multi-ref)
- When was it established? -> Baseline.establishedDate
- Who approved it? -> Baseline.approvedBy, .approvalDate
- What changed since the last baseline? -> Compare component/document lists between baselines

**Dependencies** (4 questions)
- Answered through adapter-level relationships (relationships.json for ServiceNow, reference attributes for JSM). Schema defines the types that participate. Adapters express the connections.

**People and Responsibility** (4 questions)
- Who is responsible? -> Product.owner (Team), Team.teamLead (Person)
- POC at each site? -> Deployment Site.sitePOC
- Support team? -> Deployment Site.supportTeam
- Who to call? -> Person.phone, .jobTitle via sitePOC chain

**Documents** (3 questions)
- What documents exist for this product? -> Document.product
- What version does this doc apply to? -> Document.version
- Is it current or superseded? -> Document.state

Source: core-definition.md tables, constitution Core Questions section.

### Section: The Type Hierarchy

Four branches, describe each:
- Product CMDB: the things you build and run (Product, Server, Database, Product Component, Feature)
- Product Library: the lifecycle records (Product Version, Document, Deployment, Deployment Site, Baseline)
- Directory: people and organizations (Organization, Team, Person)
- Lookup Types: reference data (13 lookup types listed)

Source: schema/core/schema-structure.json.

### Section: What Core Excludes

Core deliberately does not include: infrastructure detail (hardware models, VMs, network segments), compliance tracking (assessments, certifications), media distribution, licensing, or requirements traceability. These are domains. Core stays focused on the one question it answers.

Source: core-definition.md "What can stay out of Core" section, domain-definitions.md.

## Document 3: Getting Started

**File**: docs/getting-started.md
**Goal**: Zero to imported in 15 minutes.

### Section: Prerequisites
- Node.js 18+
- git clone the repo
- A JSM Assets instance (Cloud or Data Center) or a ServiceNow instance

### Section: Validate Offline First
```
node tools/validate.js --schema schema/core
```
Expected: 0 errors, 0 warnings, PASS.

Validate with a domain:
```
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
```

### Section: Configure Your Connection
Copy .env.example to .env. Show the variables needed for JSM Cloud, JSM DC, and ServiceNow. Example values (not real credentials).

### Section: Import to JSM Assets
Two commands:
```
node adapters/jsm/import.js schema
node adapters/jsm/import.js data
```
Describe what each does. Schema creates types and attributes. Data creates records. Do NOT use sync mode (explain why: it deletes and recreates reference attributes, causing stale IDs).

Source: core-verification.md "Process Notes" section.

### Section: Import to ServiceNow
Two commands:
```
node adapters/servicenow/import.js schema
node adapters/servicenow/import.js sync
```
Schema creates tables and columns. Sync creates records.

Note: if the instance has a scoped app, tables will be prefixed with x_cmdbk_. The overlay handles this.

Source: core-verification.md ServiceNow section.

### Section: Verify
How to check in each platform that types and data appeared. Expected record counts by type (from core data files).

## Document 4: Verification

**File**: docs/verification.md
**Goal**: Confirm import worked, diagnose if it didn't.

### Section: Post-Import Validation
JSM: `node adapters/jsm/validate-import.js`
ServiceNow: `node adapters/servicenow/validate-import.js`

What each checks. What PASS means. What FAIL means.

### Section: Expected Record Counts
Table of every Core type with the number of example records: Product (6), Server (8), Database (4), Product Component (6), Feature (6), Product Version (5), Document (5), Deployment (4), Deployment Site (6), Baseline (2), Organization (6), Team (5), Person (10), plus all lookup types.

Source: schema/core/data/ file record counts.

### Section: Common Errors
- "Invalid CMDB class" on ServiceNow: identification rule table name doesn't match scoped prefix
- Empty reference fields on JSM: used sync mode instead of schema+data
- "type not found in JSM": type exists in LOAD_PRIORITY but not in the schema you imported (expected when importing Core only)

Source: core-verification.md issues found section.

## Document 5: Your Data

**File**: docs/your-data.md
**Goal**: Replace OvocoCRM example data with real records.

### Section: Data File Format
JSON files in data/ directory. Kebab-case filenames. CamelCase attribute keys. Name field is the primary identifier (exact, case-sensitive matching for references). Multi-references use semicolons.

### Section: Populate in Order
Follow LOAD_PRIORITY: lookups first, then organizations, then people, then teams, then products, then versions, then documents, then deployments, then features, then deployment sites, then baselines.

Explain why order matters: a Deployment Site references a Product, a Product Version, an Organization, a Person, and a Team. All of those must exist first.

### Section: Replace Example Data
Option A: Edit the JSON files directly, replacing OvocoCRM records with your own.
Option B: Delete data files, generate CSV templates, fill in Excel, convert to JSON.
```
node tools/generate-templates.js --schema schema/core --examples
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
```

### Section: Validate Before Importing
Always validate locally before pushing to a live instance.
```
node tools/validate.js --schema schema/core
```

### Section: Round-Trip Workflow
Export current state from live instance, edit locally, validate, reimport.
```
node adapters/jsm/export.js
```

## Document 6: Using the CMDB

**File**: docs/using-the-cmdb.md
**Goal**: Answer real questions using the imported data.

For each Core Question category, show the query on both platforms.

### Section: Is This Site Current or Behind?
The most important query. On JSM: AQL comparing Deployment Site version to Product Version with status=Current. On ServiceNow: encoded query on u_cmdbk_deployment_site joining to u_cmdbk_product_version.

Use the OvocoCRM example: Acme Corp is running 2.3.0 but current is 2.3.1. Show how the query reveals this.

### Section: What Changed Since the Last Baseline?
Compare Baseline.components and Baseline.documents between the 2.3.0 and 2.3.1 baselines.

### Section: Who Do I Call?
Deployment Site.sitePOC -> Person.phone, Person.jobTitle. Show the lookup chain.

### Section: What Version Is at Each Site?
Simple query on Deployment Site grouped by version. Shows the deployment portfolio at a glance.

### Section: Who Approved This Release?
Product Version.approvedBy, .approvalDate. Note that 2.3.1 was approved by Alex Chen (Principal Engineer) instead of Morgan Blake (Product Manager) - the emergency hotfix scenario.

Source: schema/core/data/ actual records for query examples.

## Document 7: Domains

**File**: docs/domains.md
**Goal**: Understand what domains exist and which ones to install.

### Section: What Is a Domain
One paragraph: opt-in package for a specialized team. References Core types but Core never references domain types. Add the ones your team needs.

### Section: Domain Table
| Domain | Team | Questions Answered | Types Added | Replaces |
Infrastructure, Compliance, Distribution, Licensing.

For each: one paragraph with who uses it and what it adds.

### Section: Which Domains Do I Need?
Decision tree: what team are you? What questions do you need to answer? Match to domain.

### Section: Commercial Plugin Comparison
Infrastructure replaces ServiceNow Discovery schema (not the engine). Compliance replaces ServiceNow GRC, Atlassian compliance plugins. Distribution has no competitor (unique). Licensing replaces ServiceNow SAM, Flexera, Snow.

Source: domain-definitions.md, competitive-research-results.md.

## Document 8: Installing a Domain

**File**: docs/installing-a-domain.md
**Goal**: Add a domain to a running instance.

### Section: Validate
```
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
```

### Section: Import
Same adapter commands. The domain data files are in schema/domains/<name>/data/.

### Section: Verify
Check that domain types appear alongside Core types in the platform UI.

## Document 9: Extending CMDB-Kit

**File**: docs/extending.md
**Goal**: Developers understand the architecture and can create domains or adapters.

### Section: Architecture
Three layers: schema (JSON files defining shape), data (JSON files containing records), adapters (scripts that push both to a platform). Each layer is self-contained.

### Section: How Core + Domains Works
Validator merges domain schema-structure.json and schema-attributes.json on top of Core. Domain types reference Core container types as parents. Data files in domain data/ directories are loaded alongside Core data/.

### Section: Creating a New Domain
Directory structure. Rules (reference Core parents, never referenced by Core). Step by step with file examples.

### Section: Writing an Adapter
Required scripts. Overlay pattern. Import modes. Reference resolution via LOAD_PRIORITY.

### Section: Standards Alignment
Brief mapping tables: ITIL 4 SACM, EIA-649C four CM functions, MIL-HDBK-61B, ISO/IEC 20000. Cross-reference table from whitepaper.md appendix (the standards content is still accurate).

Source: constitution principles, whitepaper standards sections.

## Reference: Schema Reference

**File**: docs/schema-reference.md
**Goal**: Look up any type or attribute.

Generated from schema files. Not written by hand.

Core type tree. For each type: attribute table (name, type, reference target). Repeat for each domain. Cross-reference map showing which types reference which.

Source: schema-synthesis.md attribute tables (copy structure, regenerate from files).
