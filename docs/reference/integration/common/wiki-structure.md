# Wiki Structure

A CMDB tracks structured data: CI types, attributes, relationships, and statuses. But structured data alone does not tell the full story. Teams need narrative documentation, architecture decisions that explain why the schema looks the way it does, runbooks that describe how to perform operational tasks, meeting minutes that record governance decisions, and release notes that summarize what changed. A wiki provides the knowledge layer that sits alongside the CMDB and gives context to the structured CI data.

This section covers how to organize wiki documentation so that it mirrors the CMDB taxonomy, how to link pages to CI records for bidirectional traceability, how to track controlled documents as library items, and how to maintain documentation quality over time. Platform-specific implementation details for Confluence (both Cloud and Data Center) are covered in the Atlassian Data Center and Atlassian Cloud sections in the Setup section. This section focuses on the conceptual model and platform-agnostic patterns.


# The Three-tier Documentation Model

A wiki and a CMDB complement each other because they serve different tiers of the configuration management system:

| Tier | Purpose | Implementation | What Lives Here |
|------|---------|----------------|-----------------|
| Knowledge | Context and narrative | Wiki | Architecture decisions, runbooks, SOPs, meeting minutes, design discussions, training materials |
| Catalog | Structured CI data | CMDB platform | CI records with attributes, states, references, lifecycle tracking |
| Storage | Controlled artifacts | DML (file server) | Approved PDFs, release ISOs, installation media, checksums, baselined artifacts |

A wiki page about the OvocoCRM authentication module explains how it works, why it was designed that way, and what operational procedures exist for maintaining it. The CMDB CI record for "CR Authentication Module" tracks its current version, its dependencies, its deployment sites, and its status. The DML stores the actual compiled binaries, installation packages, and signed documents.

The connection between tiers is explicit. The CI record carries a URL attribute pointing to its wiki page. The wiki page links back to the CI record (and, where the platform supports it, embeds live CI data). The CI record carries a DML path pointing to the controlled artifact on the file server.

Getting the tier boundaries wrong is the most common documentation mistake. When teams store controlled artifacts (versioned PDFs, release packages) in the wiki instead of the DML, those artifacts cannot be properly baselined, checksummed, or audited. When teams put narrative documentation in the CMDB instead of the wiki, the CMDB becomes cluttered with prose that does not fit the structured data model. Each tier has a purpose. Respect the boundaries.

## How the Tiers Connect

A concrete example shows how a single document spans all three tiers:

```
Wiki page                          CMDB CI                          DML file
"OvocoCRM 2.4 Architecture"       "CR System Specification"        /dml/ovococrm/docs/specifications/current/
   |                                |          |                      OVOCOCRM-SS-2.4.0-20260115.pdf
   |                                |          |                         ^
   |  wikiUrl --------------------------+      |  dmlPath ---------------+
   |                                           |
   +-- Links TO the approved artifact ---------+
```

Three key attributes enable this integration:

- `url` on the Document CI points to the wiki page (knowledge context)
- `dmlPath` on the Document CI points to the controlled artifact on the DML (recommended extension)
- `sourceLocation` indicates where the master lives: Wiki, DML, or External (recommended extension)

The wiki links to DML artifacts via `dmlPath` stored on the CMDB CI. CMDB CIs catalog what is in the DML and what is in the wiki. The DML stores the controlled artifact itself.

## What Goes Where

This distinction is fundamental. Getting it wrong leads to controlled artifacts hiding in wiki pages where they cannot be audited, versioned, or baselined.

| Content Type | Where It Goes | Why |
|---|---|---|
| Approved PDF of System Specification | DML (`/dml/{product}/docs/specifications/current/`) | Controlled artifact. Must be immutable after approval. Auditable via CMDB CI. |
| Discussion about specification design choices | Wiki | Knowledge. Living document. Will evolve between releases. |
| Approved Test Report | DML (`/dml/{product}/docs/test/reports/`) | Controlled artifact. Part of the baseline package. |
| Test strategy notes and lessons learned | Wiki | Knowledge. Informal. Helps future testers but is not a deliverable. |
| Release ISO image | DML (`/dml/{product}/releases/{version}/build/`) | Controlled artifact. Must be checksummed and tracked. |
| Build environment setup instructions | Wiki | Knowledge. Changes frequently. Not a formal deliverable. |
| Draft of a controlled document (.docx) | DML (`/dml/{product}/docs/drafts/`) | Even drafts of controlled artifacts live on the DML. Wiki pages can link to them. |

Wiki pages can and should link to DML artifacts. The `dmlPath` attribute on Document CIs provides the canonical path. Embed that path in wiki links so teams can navigate from context to artifact.

For the full DML directory structure and folder organization, see the Definitive Media Library section in the Deployment-Operations section.

## Documentation as Part of the CMS

In ITIL terms, the Configuration Management System (CMS) encompasses everything: the CMDB, the DML, the knowledge base, and the tools that connect them. The wiki is part of the CMS, not a separate system. When auditors ask "where is the documentation for this baseline?", the answer traces through all three tiers: the Baseline CI in the CMDB, the wiki page explaining the baseline's purpose and approval, and the DML artifacts that the baseline controls.


# Page Hierarchy Matching the CMDB Taxonomy

## Dedicated CMDB Documentation Area

Create a dedicated area in your wiki for CMDB documentation. Most wikis have some concept of a workspace, site, or top-level container (Confluence calls them spaces, SharePoint uses site collections, Notion uses workspaces, BookStack uses shelves). This area is the central hub for all documentation related to the configuration management system: the schema, the processes, the governance decisions, and the operational procedures.

In a multi-product portfolio, the workspace structure mirrors the organizational structure:

| Area | Short Key | Owner | Purpose |
|------|-----------|-------|---------|
| Portfolio | PORT | Program Manager | Cross-product roadmap, portfolio governance, strategic delivery body minutes |
| OvocoCRM | CR | Sarah Chen (CRM Platform Team) | Product-specific documentation, architecture decisions, release notes |
| OvocoAnalytics | AN | Michael Torres (Analytics Platform Team) | Product-specific documentation, data pipeline design, release notes |
| Ovoco Engineering | ENG | Ovoco Engineering | Shared standards, interface control documents, cross-product architecture |
| Shared Services | SS | James Wilson (Infrastructure Team) | Shared infrastructure docs, SS Jira/Confluence/Jenkins/Grafana admin guides |
| CM Team | CM | Lisa Kim (Release Engineering) | CM processes, CCB meeting minutes, baseline audits, DML procedures |
| Training | TRAIN | Training Lead | Onboarding materials, tool guides, reference documentation |

Each product gets its own area because product teams own their documentation and need independent page hierarchies, permissions, and workflows. The CM Team area is separate because it contains governance documentation (CCB minutes, audit reports) that belongs to the CM function, not to any single product. The Shared Services area documents the SS-prefixed infrastructure CIs (SS Product, SS Server, SS Virtual Machine, SS Certification, SS License) that the Infrastructure Team manages for the entire portfolio.

Shared types from the Directory branch (Organization, Team, Person, Location) typically do not need their own area. They are documented in the CM Team or Ovoco Engineering area as reference material.

## Child Pages Mirroring the Four-branch Taxonomy

Within each product area, organize pages to mirror the portfolio mode branch structure:

```
OvocoCRM (CR)
+-- OvocoCRM CMDB
|   +-- CR Product (CR Core Platform, CR API Gateway, CR Search Service, CR Authentication Module)
|   +-- CR Server
|   +-- CR Hardware Model
|   +-- CR Product Component
|   +-- CR Component Instance
|   +-- CR Virtual Machine
|   +-- CR Feature
|   +-- CR Feature Implementation
|   +-- CR Assessment
|   +-- CR License
+-- OvocoCRM Library
|   +-- CR Product Version
|   +-- CR Deployment Site
|   +-- CR Baseline (FBL, ABL, PBL)
|   +-- CR Distribution Log
|   +-- CR Documentation Suite
|   +-- CR Document
|   +-- CR Product Media
|   +-- CR Product Suite
|   +-- CR Certification
+-- Architecture Decisions
|   +-- ADR-001: Authentication Module Design
|   +-- ADR-002: Export Performance Strategy
+-- Runbooks
|   +-- Deployment Procedure
|   +-- Rollback Procedure
|   +-- Media Preparation
+-- Release Notes
|   +-- OvocoCRM 2.4.0
|   +-- OvocoCRM 2.3.1
|   +-- OvocoCRM 2.3.0
+-- Meeting Notes
    +-- CR CCB 2025-07-15
    +-- CR CCB 2025-07-01
```

The OvocoCRM CMDB and OvocoCRM Library sections contain documentation pages for each CI type. The other sections contain operational documentation that references CIs but is organized by function rather than by type.

## Top-level Pages for Each Branch

Each branch of the CMDB taxonomy gets a top-level page in the product area. The page serves as an index that lists all CI types in that branch with brief descriptions and links to the type-level documentation pages.

The OvocoCRM CMDB index page might read: "This section documents the infrastructure CIs that make up OvocoCRM's runtime environment: CR Products (CR Core Platform, CR API Gateway, CR Search Service, CR Authentication Module), CR Servers, CR Virtual Machines, CR Product Components, CR Features, and CR Assessments."

The OvocoCRM Library index page might read: "This section documents the release management CIs that track OvocoCRM's versions, deployments, baselines (FBL, ABL, PBL), certifications, and media."

These index pages are the entry point for anyone exploring the CMDB documentation. They should be concise and link-heavy, pointing readers to the specific type pages they need.

## Sub-pages for Each CI Type

Each CI type gets its own page documenting:

What the type represents and why it exists in the schema. For CR Deployment Site: "A Deployment Site tracks a specific installation of OvocoCRM at a customer location. It records which version is installed, the site's operational status, and the relationship to the customer organization."

Its attributes and what they mean. List each attribute with a description of its purpose and acceptable values. Reference the Lookup Types section for attributes that reference lookup values.

Its relationships to other types. Which types reference this type (inbound), and which types this type references (outbound). For Deployment Site: references Product Version (outbound), Organization (outbound), Location (outbound). Referenced by Distribution Log (inbound).

Common queries for this type. Include two or three useful queries that operators frequently run against this type. The query syntax depends on your CMDB platform (AQL for JSM Assets, encoded queries or GlideRecord for ServiceNow, SQL for relational databases).

Operational notes. Any special handling, data quality concerns, or process notes specific to this type.

## Per-CI Pages for Critical Infrastructure

Some individual CIs are important enough to warrant their own documentation pages. A critical server, a production database, or a high-profile deployment site might have a dedicated page documenting its specific configuration, its history, and its operational procedures.

For most CIs, the type-level page is sufficient. Per-CI pages should be reserved for infrastructure where the narrative documentation adds significant value beyond what the CI record already provides.

## Separate Sections for Runbooks, SOPs, and Training

Runbooks, SOPs, and training materials deserve their own page hierarchies because they serve different audiences and have different lifecycle patterns:

Runbooks are step-by-step procedures for specific operational tasks. "How to prepare and ship media for a site upgrade" is a runbook. Runbooks link to the CI types they operate on (Product Media, Distribution Log, Deployment Site) but are organized by task, not by type.

SOPs are formal process documents that describe how the organization operates. "Media Distribution Process" and "Site Registration Process" are SOPs. They link to governance documentation (CCB minutes, approval records) and to the CI types involved.

Training materials teach new team members how to use the CMDB and its associated tools. They reference schema documentation, runbooks, and SOPs, but they are organized by learning path rather than by CI type.


# Library Item Tracking

## The Document CI as Catalog Record

The Document CI in CMDB-Kit's portfolio mode schema (CR Document, AN Document, SS Document) tracks structured metadata about controlled documents. It serves as the catalog record (Tier 2) that binds the wiki page (Tier 1) to the controlled artifact on the DML (Tier 3).

The schema defines the following attributes for Document:

| Attribute | Type | Description |
|---|---|---|
| description | Text | Free-text description of the document |
| documentType | Reference to Document Type | Classification: specification, design document, admin guide, test report |
| state | Reference to Document State | Lifecycle state: Draft, In Review, Approved, Superseded, Archived |
| author | Reference to Person | The document's author |
| publishDate | Date | Date the document was published or approved |
| url | Text | URL pointing to the wiki page or external location |

The Documentation Suite CI groups all documents for a specific product version:

| Attribute | Type | Description |
|---|---|---|
| description | Text | Free-text description of the suite |
| version | Reference to Product Version | The release this suite belongs to |
| documents | Multi-reference to Document | All Document CIs included in this suite |
| state | Reference to Document State | Suite-level lifecycle state |

## Structured Metadata on Wiki Pages

Most wikis support some form of structured metadata on pages: key-value properties, front matter, database fields, or custom attributes. Use this to track document metadata directly on wiki pages. A controlled document page can include a metadata block:

```
| Property        | Value                    |
|-----------------|--------------------------|
| Document Number | CR-SDD-AUTH-2.4.0        |
| Type            | Software Design Document |
| Version         | 2.4.0                    |
| State           | Published                |
| Author          | Sarah Chen               |
| Publish Date    | 2025-07-01               |
| Review Date     | 2025-12-01               |
```

If your wiki supports aggregating child page metadata into a parent-level table (Confluence's Page Properties Report, Notion's database views, SharePoint list views), you can create an automatic document register from the page hierarchy.

## Connecting Documents Across All Three Tiers

The workflow connects all three tiers:

The author creates a Document CI in the CMDB with state "Draft" and a `url` attribute pointing to the wiki page. The author writes the document content on the wiki page, including structured metadata. When the document is ready for review, a review task is created in the work tracking system. After the review cycle and approval, the approved PDF is uploaded to the DML. The Document CI's state updates to "Published" and its DML path attribute is set.

The wiki page remains as the living knowledge source, with a link to the approved PDF on the DML. The Document CI in the CMDB is the single source of truth for the document's current state.

## Document Lifecycle with DML Locations

Documents follow an ITIL-aligned lifecycle where each stage has a defined file format, DML location, and CMDB state:

| Stage | Action | File Format | DML Location | CMDB State |
|---|---|---|---|---|
| Author | Engineer creates document from template | .docx | `/dml/shared/templates/` (template source) | n/a |
| Draft | Working draft stored for collaboration | .docx | `/dml/{product}/docs/drafts/` | Draft |
| Review | Document converted to PDF, submitted to CCB | .pdf | `/dml/{product}/docs/drafts/` | In Review |
| Approve | CCB approves. PDF moved to category folder. CMDB CI updated. | .pdf | `/dml/{product}/docs/{category}/current/` | Approved |
| Release | Approved document copied into release snapshot | .pdf | `/dml/{product}/releases/{version}/docs/` | Approved (released) |
| Supersede | New version approved. Old version moved to archive. | .pdf | `/dml/{product}/docs/{category}/archive/` | Superseded |
| Archive | Major version retired. Entire release tree archived. | .pdf | `/dml/archive/{product}/{major-version}/` | Archived |

Key practices:

- Drafts live on the DML, not in the wiki. The wiki page links to the draft, but the draft file itself is on the DML where it can be versioned and eventually promoted.
- When a document is approved, it moves from `/drafts/` to `/docs/{category}/current/`. The CMDB CI's `dmlPath` is updated to the new location.
- When a release is built, the release process copies current documents from their category folders into the immutable release snapshot (`/releases/{version}/docs/`). The Documentation Suite CI references the snapshot copies, preserving an exact record of what shipped with that version.

## Controlled Deliverables and the Documentation Suite

In a product release, the Documentation Suite CI groups all documents for a specific version. Each document in the suite has both a Document CI in the CMDB and a wiki page:

```
Product Version (OvocoCRM 2.4.0)
  |
  +-> Documentation Suite (CR Doc Suite 2.4.0)
  |      |
  |      +-> Document CI: CR System Specification 2.4.0
  |      |      dmlPath: /dml/ovococrm/releases/2.4.0/docs/OVOCOCRM-SS-2.4.0-20260115.pdf
  |      |      url: https://wiki.example.com/cr/specifications/system-spec
  |      |
  |      +-> Document CI: CR Version Description 2.4.0
  |      |      dmlPath: /dml/ovococrm/releases/2.4.0/docs/OVOCOCRM-VD-2.4.0-20260116.pdf
  |      |
  |      +-> Document CI: CR Admin Guide 2.4.0
  |      |      dmlPath: /dml/ovococrm/releases/2.4.0/docs/OVOCOCRM-AG-2.4.0-20260115.pdf
  |      |
  |      +-> (all other documents in the suite)
  |
  +-> CR Baseline (CR-PBL-2.4.0-PCA-20260120)
         dmlPath: /dml/ovococrm/baselines/CR-PBL-2.4.0-PCA-20260120/
```

The Documentation Suite CI links to all its member Documents through the `documents` multi-reference attribute. Each Document CI links to its wiki page (`url` attribute) and its DML artifact (`dmlPath` if the organization tracks it). This structure gives CM analysts a single query to find all documents for a release and trace each one to both its knowledge page and its controlled artifact.


# Templates for CI Documentation Pages

## Standard Page Template

Create a wiki page template for CI type documentation with the following sections:

Overview: one or two paragraphs explaining what this CI type represents and why it exists in the schema.

Attributes: a table listing each attribute with its name, type (text, reference, date, boolean), and description. Pull this from schema-attributes.json.

Relationships: a table showing inbound and outbound references. Which types reference this type, and which types does this type reference.

Common Queries: two or three queries that operators frequently use with this type. Include the query text and a description of what it returns.

Operational Notes: any special handling requirements, data quality considerations, or process references.

Embedded CI List: if your platform supports it, a live view showing a sample of current records for this type.

This template ensures consistency across all CI type documentation pages. Every type page has the same structure, making it easy for readers to find what they need.

## Lookup Type Documentation Template

Lookup types need a different template because they are reference data, not operational CIs:

Purpose: why this lookup exists and which CI types reference it.

Values: a table listing each value with its description. This mirrors the lookup data file content.

Usage Guidance: when to use which value, with examples. This is the narrative that a data file cannot provide.

Adding New Values: the process for requesting a new lookup value (submit to shared services team, review for overlap, approval required).

This template is particularly important for lookup types with nuanced value definitions. The difference between "Maintenance" and "Degraded" in Site Status, for example, needs narrative explanation beyond what a JSON description field can provide.

## Service Documentation Template

For CI types that represent services (if the organization tracks services in the CMDB):

Service Overview: what the service does, who it serves, and its availability targets.

Components: which CIs support this service (products, servers, databases). If your platform supports it, embed a live filtered view of the service's component CIs.

SLAs: service level targets and how they are measured.

Incident Procedures: links to runbooks for common incident types affecting this service.

Dependencies: upstream services this service depends on, and downstream services that depend on it.


# Document Review Workflow

## Connecting the Wiki, Work Tracker, and CMDB

A document review workflow connects three systems: the work tracking tool (Jira, ServiceNow tasks, GitHub issues), the wiki (where the content lives), and the CMDB (where the document metadata lives).

The review task tracks the workflow: created, reviewers assigned, review period open, comment resolution, approval.

The source document lives on a wiki page. Reviewers read the page and submit comments either as inline wiki comments or as comments on the review task.

The Document CI in the CMDB tracks the document's catalog metadata: type, state, author, version. When the review is approved, the Document CI's state updates to "Published."

The workflow step by step:

- A document needs review (new document, major revision, or periodic review)
- A review task is created, linking to both the wiki page and the Document CI
- Reviewers are assigned on the review task
- Reviewers read the wiki page and submit comments
- The author resolves each comment (accept, reject with rationale, or defer)
- The CM Lead verifies all comments are resolved
- The review task is approved
- The Document CI's state updates to "Published"
- If the document requires a controlled artifact, the approved PDF is uploaded to the DML

## Linking Reviews to Document Pages

Each review task carries two references: the wiki page URL (where the content lives) and the Document CI identifier in the CMDB (where the metadata lives). When an analyst opens a review task, they can navigate directly to the document content in the wiki and to the catalog record in the CMDB.

On the wiki page itself, include a note or status indicator linking back to the review task. This gives page readers visibility into the review status without leaving the wiki.

## Comment Resolution Tracking

Every review comment needs a disposition: accepted, rejected, or deferred. Track dispositions on the review task using a structured format:

Comment 1 (Reviewer A): "Section 3.2 references version 2.3.0 but should be 2.4.0." Disposition: Accepted. Updated in wiki page.

Comment 2 (Reviewer B): "Consider adding a failover diagram." Disposition: Deferred to next revision. Logged as action item for 2.5.0 documentation cycle.

Comment 3 (Reviewer C): "Remove the reference to deprecated API endpoint." Disposition: Accepted. Updated in wiki page and verified against API documentation.

This comment trail provides an auditable record of every piece of feedback received during the review and how it was handled.

For platform-specific document review patterns (including Jira-Confluence integration and automation rules), see the Atlassian Data Center and Atlassian Cloud sections in the Setup section.


# Keeping the Wiki in Sync With the Live CMDB

## Review Cadence

Documentation drifts from reality. A deployment procedure written for version 2.2.0 may not be accurate for version 2.4.0. A CI type documentation page may list attributes that were added or removed in a schema change. A runbook may reference a server that was decommissioned.

Establish a review cadence:

Quarterly: review all CI type documentation pages against the current schema. Verify that attribute lists match schema-attributes.json and that relationship descriptions match schema-structure.json.

Per-release: review all runbooks and SOPs that relate to the releasing product. Verify that procedures still work with the new version.

Per-schema-change: when the schema changes (new types, new attributes, removed attributes), update the affected documentation pages immediately. Do not wait for the quarterly review.

## Embedding Live CI Data

Some CMDB-wiki combinations support embedding live CMDB data directly in wiki pages. This is the strongest form of integration because the documentation always reflects current CI state without manual updates.

On a CI type documentation page, embed a filtered list of CI records. For example, display all active deployment sites on the Deployment Site documentation page. When a new site goes active or an existing site changes status, the embedded view updates automatically.

Embedded data eliminates the most common documentation problem: pages that say one thing while the CMDB says another. If your wiki does not support live embedding, use static snapshots updated on a schedule, or simply link to the CMDB record and accept that readers need to click through.

For platform-specific embedding techniques (Assets macros, AQL queries in Confluence, ServiceNow widgets), see the Atlassian Data Center and Atlassian Cloud sections in the Setup section.

## Bidirectional Traceability

The combination of embedded CMDB data in the wiki and URL attributes in the CMDB creates bidirectional traceability:

From wiki to CMDB: embedded data or links on a documentation page show current CI state. A reader sees what the CMDB knows about the CIs that the page documents.

From CMDB to wiki: the `url` attribute on a CI record links to the documentation page. An analyst working in the CMDB can navigate to the narrative documentation for context.

This bidirectional linkage is essential for audits. An auditor reviewing a Baseline CI can follow the URL to the wiki page that documents the baseline's approval history. From that wiki page, the auditor can see the linked CI data showing the baseline's current state and its components.

## Detecting Documentation Drift

Periodically audit the documentation against the CMDB:

Check that every CI type in the schema has a corresponding wiki documentation page. A type without documentation is a gap.

Check that every Documentation Suite CI's member Documents have wiki pages with matching metadata. A Document CI with a URL that leads to a missing or outdated page is a drift.

Check that structured metadata on wiki pages matches the corresponding Document CI in the CMDB. If the page says "Published" but the CI says "Draft," someone did not update the CI after the review approval.

Check that any embedded CMDB views still return results. A stale query referencing a renamed type or a removed status value displays an empty view, which is misleading.

These audits do not need to be expensive. A quarterly check through the CI type pages and a per-release check of the affected documentation catches most drift before it becomes a problem.

## Wiki-DML Boundary Audit

When auditing documentation, verify that the tier boundaries are maintained:

- Wiki pages contain knowledge content only, not approved PDFs or release artifacts
- Controlled artifacts are not stored as wiki attachments
- Wiki pages link to DML artifacts via the `dmlPath` from CMDB CIs
- Every file in `/dml/{product}/docs/*/current/` has a corresponding Document CI in the CMDB
- Every Document CI with state "Approved" has a file at its `dmlPath`
- `dmlPath` values on CMDB CIs match actual file locations on the DML server

## Automation Options

Some synchronization can be automated:

If your wiki supports live CMDB data embedding, those views are always current. A page that shows a filtered list of active deployment sites never goes stale.

Automation rules in your work tracking tool can create wiki pages from templates when certain events occur. When a new Product Version CI is created, an automation could create a release notes page from a template.

Webhook-triggered updates can notify documentation owners when CI records change. If a CI type's attributes change in the schema, a notification to the documentation owner prompts a page update.

## Tagging and Cross-referencing

Most wikis support tags or labels on pages. Tags create cross-cutting views across the page hierarchy, enabling queries like "show me all runbooks for OvocoCRM" or "show me all architecture decisions that are still in draft status."

Use consistent tag categories with standardized naming:

- Product tags: `product-cr`, `product-an`, `product-shared`
- Content type tags: `runbook`, `sop`, `adr`, `meeting-notes`, `release-notes`, `design-discussion`
- Release tags: `release-2-4-0`, `release-2-3-1` (use dashes instead of dots for compatibility)
- Status tags: `status-draft`, `status-review`, `status-current`, `status-archived`
- Audience tags: `audience-dev`, `audience-cm`, `audience-management`, `audience-customer`
- Milestone tags: `milestone-cdr`, `milestone-trr`, `milestone-fca`, `milestone-pca`

All tags are lowercase, dash-separated, with no spaces. Enforce this convention through training and periodic review. Inconsistent tags (mixing `runBook`, `run-book`, and `runbook`) defeat the purpose of the taxonomy.

If your wiki supports filtered views based on tags, create index pages that query by tag combination. An index page for "all OvocoCRM runbooks" filters by `product-cr` and `runbook`. A page for "all current architecture decisions" filters by `adr` and `status-current`. These dynamic indexes eliminate manually maintained lists.

For canonical definitions that appear across multiple pages (product descriptions, compliance statements, standard process steps), use content inclusion features (Confluence's Excerpt Include, Notion's synced blocks, MediaWiki's transclusion). Define the canonical text once, then include it on other pages. When the canonical text changes, all including pages update automatically.


# Platform-specific Patterns

The patterns described in this section are platform-agnostic. Each CMDB platform and wiki combination has specific tools that implement these patterns more effectively.

For Confluence with JSM Assets (both Cloud and Data Center), the platform documentation covers Assets macros for live CMDB data embedding, AQL queries in documentation and runbooks, Page Properties for document tracking, labels for cross-cutting views, Jira integration for document reviews, and automation rules for wiki-CMDB synchronization. See the Atlassian Data Center and Atlassian Cloud sections in the Setup section.

For ServiceNow, use the Service Portal widget framework or UI pages to embed CMDB views in knowledge articles.


# Other Wiki Platforms

The patterns in this section work across wiki platforms. The key requirement is bidirectional linking: the wiki page links to the CI record, and the CI record links back to the wiki page. Here is how the concepts map to other platforms.

**SharePoint** uses site collections and pages instead of spaces and child pages. SharePoint list columns provide structured metadata similar to Page Properties. Power Automate can create pages from templates on CI creation events. The Highlighted Content web part builds tag-filtered indexes.

**Notion** uses databases and linked pages. Notion databases with relations can mirror the CMDB taxonomy directly, and linked databases can embed filtered views on documentation pages. Synced blocks enable content reuse across pages.

**BookStack** organizes content into shelves, books, and sections, which maps naturally to the portfolio, product, and branch-level hierarchy. BookStack supports page tags for cross-cutting views.

**MediaWiki** uses categories and templates for structured content. Semantic MediaWiki extensions add typed properties that can serve a similar role to Page Properties. Transclusion enables content reuse.

If your wiki supports structured metadata on pages (for document tracking) and some form of dynamic content embedding (for live CMDB data), you can replicate the full pattern. If it does not support embedding, URL-based linking alone still provides the essential traceability.
