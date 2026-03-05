# Wiki Structure

A CMDB tracks the structured data: CI types, attributes, relationships, and statuses. But structured data alone does not tell the full story. Teams need narrative documentation: architecture decisions that explain why the schema looks the way it does, runbooks that describe how to perform operational tasks, meeting minutes that record governance decisions, and release notes that summarize what changed. A wiki provides the knowledge layer that sits alongside the CMDB and gives context to the structured CI data.

This chapter covers how to organize wiki documentation so that it mirrors the CMDB taxonomy, how to link pages to CI records for bidirectional traceability, how to track controlled documents as library items, and how to maintain documentation quality over time.


# The Three-tier Documentation Model

## Why a Wiki Pairs With the CMDB

A wiki and a CMDB complement each other because they serve different tiers of the configuration management system:

| Tier | Purpose | Implementation | What Lives Here |
|------|---------|---------------|-----------------|
| Knowledge | Context and narrative | Wiki | Architecture decisions, runbooks, SOPs, meeting minutes, design discussions, training materials |
| Catalog | Structured CI data | CMDB platform | CI records with attributes, states, references, lifecycle tracking |
| Storage | Controlled artifacts | File server or DML | Approved PDFs, release ISOs, installation media, checksums, baselined artifacts |

A wiki page about the OvocoCRM authentication module explains how it works, why it was designed that way, and what operational procedures exist for maintaining it. The CMDB CI record for "CR Authentication Module" tracks its current version, its dependencies, its deployment sites, and its status. The DML stores the actual compiled binaries, installation packages, and signed documents.

The connection between tiers is explicit. The CI record carries a URL attribute pointing to its wiki page. The wiki page links back to the CI record (and, where the platform supports it, embeds live CI data). The CI record carries a DML path pointing to the controlled artifact on the file server.

Getting the tier boundaries wrong is the most common documentation mistake. When teams store controlled artifacts (versioned PDFs, release packages) in the wiki instead of the DML, those artifacts cannot be properly baselined, checksummed, or audited. When teams put narrative documentation in the CMDB instead of the wiki, the CMDB becomes cluttered with prose that does not fit the structured data model. Each tier has a purpose. Respect the boundaries.

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

For the full boundary table showing which content types belong in which tier, see [Definitive Media Library, What Goes Where](../Part-2-Schema-Design/02-02-Definitive-Media-Library.md#what-goes-where).

## Documentation as Part of the CMS

In ITIL terms, the Configuration Management System (CMS) encompasses everything: the CMDB, the DML, the knowledge base, and the tools that connect them. The wiki is part of the CMS, not a separate system. When auditors ask "where is the documentation for this baseline?", the answer traces through all three tiers: the Baseline CI in the CMDB, the wiki page explaining the baseline's purpose and approval, and the DML artifacts that the baseline controls.


# Recommended Workspace Structure

## Dedicated CMDB Documentation Area

Create a dedicated area in your wiki for CMDB documentation. Most wikis have some concept of a workspace, site, or top-level container (Confluence calls them spaces, SharePoint uses site collections, Notion uses workspaces, BookStack uses shelves). This area is the central hub for all documentation related to the configuration management system: the schema, the processes, the governance decisions, and the operational procedures.

In a multi-product portfolio, the workspace structure mirrors the organizational structure:

| Area | Short Key | Owner | Purpose |
|------|-----------|-------|---------|
| Portfolio | PORT | Program Manager | Cross-product roadmap, portfolio governance, strategic delivery body minutes |
| OvocoCRM | CR | CRM Team Lead | Product-specific documentation, architecture decisions, release notes |
| OvocoAnalytics | AN | Analytics Team Lead | Product-specific documentation, data pipeline design, release notes |
| Engineering | ENG | Chief Engineer | Shared standards, interface control documents, cross-product architecture |
| CM Team | CM | CM Lead | CM processes, CCB meeting minutes, baseline audits, DML procedures |
| Training | TRAIN | Training Lead | Onboarding materials, tool guides, reference documentation |

Each product gets its own area because product teams own their documentation and need independent page hierarchies, permissions, and workflows. The CM Team area is separate because it contains governance documentation (CCB minutes, audit reports) that belongs to the CM function, not to any single product.

Shared types from the Directory branch (Organization, Team, Person, Location) typically do not need their own area. They are documented in the CM Team or Engineering area as reference material.

## Child Pages Mirroring the Four-branch Taxonomy

Within each product area, organize pages to mirror CMDB-Kit's four-branch taxonomy:

```
OvocoCRM (CR)
├── Product CMDB
│   ├── CR Application
│   ├── CR Server
│   ├── CR Database
│   └── CR Product Component
├── Product Library
│   ├── CR Product Version
│   ├── CR Deployment Site
│   ├── CR Distribution Log
│   ├── CR Baseline
│   ├── CR Documentation Suite
│   └── CR Document
├── Architecture Decisions
│   ├── ADR-001: Authentication Module Design
│   └── ADR-002: Export Performance Strategy
├── Runbooks
│   ├── Deployment Procedure
│   ├── Rollback Procedure
│   └── Media Preparation
├── Release Notes
│   ├── OvocoCRM 2.4.0
│   ├── OvocoCRM 2.3.1
│   └── OvocoCRM 2.3.0
└── Meeting Notes
    ├── CR CCB 2025-07-15
    └── CR CCB 2025-07-01
```

The Product CMDB and Product Library sections contain documentation pages for each CI type. The other sections contain operational documentation that references CIs but is organized by function rather than by type.

## Separate Sections for Runbooks, SOPs, and Training

Runbooks, SOPs, and training materials deserve their own page hierarchies because they serve different audiences and have different lifecycle patterns:

Runbooks are step-by-step procedures for specific operational tasks. "How to prepare and ship media for a site upgrade" is a runbook. Runbooks link to the CI types they operate on (Product Media, Distribution Log, Deployment Site) but are organized by task, not by type.

SOPs are formal process documents that describe how the organization operates. "Media Distribution Process" and "Site Registration Process" are SOPs. They link to governance documentation (CCB minutes, approval records) and to the CI types involved.

Training materials teach new team members how to use the CMDB and its associated tools. They reference schema documentation, runbooks, and SOPs, but they are organized by learning path rather than by CI type.


# Page Hierarchy Matching the CMDB Taxonomy

## Top-level Pages for Each Branch

Each branch of the CMDB taxonomy gets a top-level page in the product area. The page serves as an index that lists all CI types in that branch with brief descriptions and links to the type-level documentation pages.

The Product CMDB index page for OvocoCRM might read: "This section documents the infrastructure CIs that make up OvocoCRM's runtime environment: applications, servers, databases, and product components."

The Product Library index page might read: "This section documents the release management CIs that track OvocoCRM's versions, deployments, baselines, and media."

These index pages are the entry point for anyone exploring the CMDB documentation. They should be concise and link-heavy, pointing readers to the specific type pages they need.

## Sub-pages for Each CI Type

Each CI type gets its own page documenting:

What the type represents and why it exists in the schema. For CR Deployment Site: "A Deployment Site tracks a specific installation of OvocoCRM at a customer location. It records which version is installed, the site's operational status, and the relationship to the customer organization."

Its attributes and what they mean. List each attribute with a description of its purpose and acceptable values. Reference the Lookup Types chapter for attributes that reference lookup values.

Its relationships to other types. Which types reference this type (inbound), and which types this type references (outbound). For Deployment Site: references Product Version (outbound), Organization (outbound), Location (outbound). Referenced by Distribution Log (inbound).

Common queries for this type. Include two or three useful queries that operators frequently run against this type. The query syntax depends on your CMDB platform (AQL for JSM Assets, encoded queries or GlideRecord for ServiceNow, SQL for relational databases).

Operational notes. Any special handling, data quality concerns, or process notes specific to this type.

## Per-CI Pages for Critical Infrastructure

Some individual CIs are important enough to warrant their own documentation pages. A critical server, a production database, or a high-profile deployment site might have a dedicated page documenting its specific configuration, its history, and its operational procedures.

For most CIs, the type-level page is sufficient. Per-CI pages should be reserved for infrastructure where the narrative documentation adds significant value beyond what the CI record already provides.


# Library Item Tracking

## Structured Metadata on Wiki Pages

Most wikis support some form of structured metadata on pages: key-value properties, front matter, database fields, or custom attributes. Use this to track document metadata directly on wiki pages. A controlled document page can include a metadata block:

```
| Property       | Value                    |
|----------------|--------------------------|
| Document Number| CR-SDD-AUTH-2.4.0        |
| Type           | Software Design Document |
| Version        | 2.4.0                    |
| State          | Published                |
| Author         | Jane Chen                |
| Publish Date   | 2025-07-01               |
| Review Date    | 2025-12-01               |
```

If your wiki supports aggregating child page metadata into a parent-level table (Confluence's Page Properties Report, Notion's database views, SharePoint list views), you can create an automatic document register from the page hierarchy.

## Tracking Controlled Documents as Library Items

The Document CI in CMDB-Kit's schema tracks structured metadata about controlled documents: document type, state, author, publish date, and URL. The Document CI is the catalog record (Tier 2). The wiki page is the knowledge content (Tier 1). The approved PDF on the DML is the controlled artifact (Tier 3).

The workflow connects all three tiers:

1. Author creates a Document CI in the CMDB with status "Draft" and a URL pointing to the wiki page
2. Author writes the document content on the wiki page, including structured metadata
3. When the document is ready for review, a review task is created in the work tracking system
4. Reviewers comment on the wiki page or the review task
5. After comment resolution, the review is approved
6. The approved PDF is uploaded to the DML
7. The Document CI's state updates to "Published" and its DML path attribute is set
8. The wiki page remains as the living knowledge source, with a link to the approved PDF on the DML

The Document CI in the CMDB is the single source of truth for the document's current state. The wiki page provides the narrative content. The DML stores the controlled artifact.

Three key attributes enable this integration: `wikiUrl` (pointing to the wiki page), `dmlPath` (pointing to the controlled artifact on the DML), and `sourceLocation` (indicating where the master lives). These are recommended extensions to the Document CI. For the full attribute tables covering Document CIs and Documentation Suite CIs, see [Definitive Media Library, Document CI Attributes](../Part-2-Schema-Design/02-02-Definitive-Media-Library.md#document-ci-attributes).

## Controlled Deliverables and Their Wiki Pages

In a product release, the Documentation Suite CI groups all documents for a specific version. Each document in the suite has both a Document CI in the CMDB and a wiki page:

```
CR Documentation Suite: OvocoCRM 2.4.0 Documentation
├── CR Document: System Design Description (wiki + DML)
├── CR Document: Version Description (wiki + DML)
├── CR Document: Installation Guide (wiki + DML)
├── CR Document: Release Notes (wiki + DML)
└── CR Document: User Manual (wiki + DML)
```

The Documentation Suite CI links to all its member Documents. Each Document CI links to its wiki page (URL attribute) and its DML artifact (DML path attribute if the organization tracks it). This structure gives CM analysts a single query to find all documents for a release and trace each one to both its knowledge page and its controlled artifact.


# Linking Wiki Pages to CMDB Records

## Embedding Live CI Data

Some CMDB-wiki combinations support embedding live CMDB data directly in wiki pages. This is the strongest form of integration because the documentation always reflects current CI state without manual updates.

On a CI type documentation page, embed a filtered list of CI records. For example, display all active deployment sites on the Deployment Site documentation page. When a new site goes active or an existing site changes status, the embedded view updates automatically.

On a specific server's documentation page, embed that server's CI record attributes (name, IP address, environment, applications hosted) so the page always shows current data.

Embedded data eliminates the most common documentation problem: pages that say one thing while the CMDB says another.

How to embed depends on your platform:

- **Confluence with JSM Assets**: Use the Assets Object and Assets Object List macros with AQL queries
- **ServiceNow**: Use the Service Portal widget framework or UI pages to embed CMDB views in knowledge articles
- **Other platforms**: Use API calls, iframes, or scheduled exports to pull CI data into wiki pages

If your wiki does not support live embedding, use static snapshots updated on a schedule, or simply link to the CMDB record and accept that readers need to click through.

## Linking From a CI Record to Its Wiki Page

The reverse direction uses the URL attribute on CI records. CMDB-Kit's Document type includes a `url` attribute. Extend this pattern to other CI types by adding a URL attribute (or using the description field) to store the wiki page link.

When an analyst opens a CI record in the CMDB and sees a wiki URL, they can navigate directly to the operational documentation: its deployment history, its specific configuration notes, and its runbook links.

## Bidirectional Traceability

The combination of embedded CMDB data in the wiki and URL attributes in the CMDB creates bidirectional traceability:

From wiki to CMDB: embedded data or links on a documentation page show current CI state. A reader sees what the CMDB knows about the CIs that the page documents.

From CMDB to wiki: the URL attribute on a CI record links to the documentation page. An analyst working in the CMDB can navigate to the narrative documentation for context.

This bidirectional linkage is essential for audits. An auditor reviewing a Baseline CI can follow the URL to the wiki page that documents the baseline's approval history. From that wiki page, the auditor can see the linked CI data showing the baseline's current state and its components.


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

Components: which CIs support this service (applications, servers, databases). If your platform supports it, embed a live filtered view of the service's component CIs.

SLAs: service level targets and how they are measured.

Incident Procedures: links to runbooks for common incident types affecting this service.

Dependencies: upstream services this service depends on, and downstream services that depend on it.


# Document Review Workflow

## Connecting the Wiki, Work Tracker, and CMDB

A document review workflow connects three systems: the work tracking tool (Jira, ServiceNow tasks, GitHub issues), the wiki (where the content lives), and the CMDB (where the document metadata lives).

The review task tracks the workflow: created, reviewers assigned, review period open, comment resolution, approval.

The source document lives on a wiki page. Reviewers read the page and submit comments either as inline wiki comments or as comments on the review task.

The Document CI in the CMDB tracks the document's catalog metadata: type, state, author, version. When the review approves, the Document CI's state updates to "Published."

The workflow step by step:

1. A document needs review (new document, major revision, or periodic review)
2. A review task is created, linking to both the wiki page and the Document CI
3. Reviewers are assigned on the review task
4. Reviewers read the wiki page and submit comments
5. The author resolves each comment (accept, reject with rationale, or defer)
6. The CM Lead verifies all comments are resolved
7. The review task is approved
8. The Document CI's state updates to "Published"
9. If the document requires a controlled artifact, the approved PDF is uploaded to the DML

## Linking Reviews to Document Pages

Each review task carries two references: the wiki page URL (where the content lives) and the Document CI identifier in the CMDB (where the metadata lives). When an analyst opens a review task, they can navigate directly to the document content in the wiki and to the catalog record in the CMDB.

On the wiki page itself, include a note or status indicator linking back to the review task. This gives page readers visibility into the review status without leaving the wiki.

## Comment Resolution Tracking

Every review comment needs a disposition: accepted, rejected, or deferred. Track dispositions on the review task using a structured format:

Comment 1 (Reviewer A): "Section 3.2 references version 2.3.0 but should be 2.4.0." Disposition: Accepted. Updated in wiki page.

Comment 2 (Reviewer B): "Consider adding a failover diagram." Disposition: Deferred to next revision. Logged as action item for 2.5.0 documentation cycle.

Comment 3 (Reviewer C): "Remove the reference to deprecated API endpoint." Disposition: Accepted. Updated in wiki page and verified against API documentation.

This comment trail provides an auditable record of every piece of feedback received during the review and how it was handled.


# Runbook and SOP Page Structure

## Operational Runbooks Linked to CIs

Runbooks describe how to perform specific operational tasks. Each runbook should reference the CI types and specific CIs it operates on:

"Media Preparation Runbook" references: Product Media (type), Product Suite (type), Distribution Log (type), and the DML file server (specific CI).

"Site Upgrade Runbook" references: Deployment Site (type), Product Version (type), Distribution Log (type), and the specific upgrade procedure steps.

Include CMDB queries in runbooks where appropriate. A media preparation runbook might include the query to find all Product Media records for a given version. This gives the operator the exact query to run when performing the procedure, eliminating guesswork.

## Standard Operating Procedures for CMDB Tasks

SOPs are higher-level than runbooks. They describe the process, not just the steps. A "Media Distribution SOP" covers the end-to-end process: who submits the request, who approves it, what checks are performed, how the media is prepared, how it is shipped, and how receipt is confirmed.

SOPs link to runbooks for the detailed steps and to governance documentation (CCB approvals, CM Lead sign-offs) for the authority chain.

Organize SOPs by function in the CM Team area:

```
CM Team
├── SOPs
│   ├── Media Distribution Process
│   ├── Site Registration Process
│   ├── Change Request Process
│   ├── Baseline Management Process
│   └── DML Intake Process
├── CCB Meeting Minutes
│   ├── CR CCB
│   └── SDB
└── Audit Reports
    ├── Q1 2025 Baseline Audit
    └── Q4 2024 Site Verification
```

## Incident Response Pages Linked to Affected Applications

For critical applications, create incident response pages that reference the Application CI and its dependencies. An incident response page for the OvocoCRM authentication module might include:

The Application CI and its current status (embedded from the CMDB if your platform supports it, or linked).

Known failure modes and their symptoms.

Diagnostic queries (queries to check the component's deployment sites, current version, and recent distribution logs).

Escalation contacts (linked to Person CIs in the CMDB).

Runbook links for common remediation steps.

When an incident occurs, the responder navigates to the affected application's incident response page and has all the context they need: current state from the CMDB, known issues from the knowledge base, and procedures from the runbooks.


# Tagging and Cross-referencing

## Tag Conventions

Most wikis support tags or labels on pages. Tags create cross-cutting views across the page hierarchy, enabling queries like "show me all runbooks for OvocoCRM" or "show me all architecture decisions that are still in draft status."

Use six tag categories with consistent naming:

Product tags: `product-cr`, `product-an`, `product-shared`. Applied to every page to indicate which product it relates to.

Content type tags: `runbook`, `sop`, `adr`, `meeting-notes`, `release-notes`, `design-discussion`. Applied based on the type of content.

Release tags: `release-2-4-0`, `release-2-3-1`. Applied to pages that relate to a specific release. Use dashes instead of dots for compatibility across platforms.

Status tags: `status-draft`, `status-review`, `status-current`, `status-archived`. Applied to controlled knowledge pages to track their lifecycle.

Audience tags: `audience-dev`, `audience-cm`, `audience-management`, `audience-customer`. Applied to pages with specific target audiences.

Milestone tags: `milestone-cdr`, `milestone-trr`, `milestone-fca`, `milestone-pca`. Applied to pages that relate to specific program milestones.

All tags are lowercase, dash-separated, with no spaces. Enforce this convention through training and periodic review. Inconsistent tags (mixing `runBook`, `run-book`, and `runbook`) defeat the purpose of the taxonomy.

## Using Tags to Create Cross-cutting Views

If your wiki supports filtered views based on tags, create index pages that query by tag combination. An index page for "all OvocoCRM runbooks" filters by `product-cr` and `runbook`. A page for "all current architecture decisions" filters by `adr` and `status-current`. A page for "all documentation related to OvocoCRM 2.4.0" filters by `product-cr` and `release-2-4-0`.

These dynamic indexes eliminate manually maintained lists. When someone adds a new runbook page and applies the correct tags, it automatically appears on the runbook index. No one needs to remember to update a parent page.

How to build these views depends on your platform:

- **Confluence**: Content by Label macro with label queries
- **Notion**: Linked database views filtered by tags or properties
- **SharePoint**: Highlighted Content web part filtered by managed metadata
- **BookStack**: Tag-based search and filtered views
- **MediaWiki**: Category intersection queries or Semantic MediaWiki ask queries

For canonical definitions that appear across multiple pages (product descriptions, compliance statements, standard process steps), use content inclusion features (Confluence's Excerpt Include, Notion's synced blocks, MediaWiki's transclusion). Define the canonical text once, then include it on other pages. When the canonical text changes, all including pages update automatically.


# Keeping the Wiki in Sync With the Live CMDB

## Review Cadence

Documentation drifts from reality. A deployment procedure written for version 2.2.0 may not be accurate for version 2.4.0. A CI type documentation page may list attributes that were added or removed in a schema change. A runbook may reference a server that was decommissioned.

Establish a review cadence:

Quarterly: review all CI type documentation pages against the current schema. Verify that attribute lists match schema-attributes.json and that relationship descriptions match schema-structure.json.

Per-release: review all runbooks and SOPs that relate to the releasing product. Verify that procedures still work with the new version.

Per-schema-change: when the schema changes (new types, new attributes, removed attributes), update the affected documentation pages immediately. Do not wait for the quarterly review.

## Automation Options

Some synchronization can be automated:

If your wiki supports live CMDB data embedding, those views are always current. A page that shows a filtered list of active deployment sites never goes stale.

Automation rules in your work tracking tool can create wiki pages from templates when certain events occur. When a new Product Version CI is created, an automation could create a release notes page from a template.

Webhook-triggered updates can notify documentation owners when CI records change. If a CI type's attributes change in the schema, a notification to the documentation owner prompts a page update.

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

For the full DML-CMDB consistency checklist and operational checklists, see [DML Operations, Operational Checklists](../Part-4-Day-to-Day/04-05-DML-Operations.md#operational-checklists).


# Confluence with JSM Assets

If you use Atlassian's stack, Confluence has the deepest integration with the CMDB. This section covers the Confluence-specific features that implement the patterns described above.

## Assets Macros for Live CMDB Data

JSM provides Confluence macros that embed live CMDB data directly in Confluence pages, implementing the embedding pattern from the "Linking Wiki Pages to CMDB Records" section.

The **Assets Object** macro displays a specific CI record's attributes on a page. On a server's documentation page, embed an Assets Object macro pointing to that server's CI record. The page shows the server's current attributes (name, IP address, environment, applications hosted) without manual updates.

The **Assets Object List** macro displays a filtered list of CI records based on an AQL query. On a CI type documentation page for CR Deployment Site, embed an Assets Object List macro with the query:

```
objectType = "CR Deployment Site" AND "Site Status" = "Active"
```

This displays a live table of all active OvocoCRM deployment sites directly on the documentation page. When a new site goes active or an existing site changes status, the table updates automatically.

These macros eliminate stale documentation. The embedded data is always current because it reads directly from Assets.

## AQL Queries in Documentation and Runbooks

AQL (Assets Query Language) is JSM Assets' query syntax. Include AQL queries in CI type documentation pages and runbooks so operators can copy-paste them directly.

A media preparation runbook might include:

```
objectType = "CR Product Media" AND "Product Version" = "OvocoCRM 2.4.0"
```

A deployment site status page might include:

```
objectType = "CR Deployment Site" AND "Site Status" IN ("Active", "Maintenance")
```

Including the exact query text eliminates guesswork and ensures consistency across operators.

## Page Properties for Document Tracking

Confluence's **Page Properties** macro implements the structured metadata pattern. Wrap a metadata table in a Page Properties macro on each controlled document page:

```
| Property       | Value                    |
|----------------|--------------------------|
| Document Number| CR-SDD-AUTH-2.4.0        |
| Type           | Software Design Document |
| Version        | 2.4.0                    |
| State          | Published                |
| Author         | Jane Chen                |
| Publish Date   | 2025-07-01               |
| Review Date    | 2025-12-01               |
```

The **Page Properties Report** macro on a parent page aggregates these properties into a table, creating an automatic document register. Every child page with a Page Properties macro appears in the report. This turns a Confluence page hierarchy into a lightweight document management system.

## Labels for Cross-cutting Views

Confluence labels implement the tagging conventions described earlier. The **Content by Label** macro creates dynamic index pages from label queries:

```
label = "product-cr" AND label = "runbook"
```

This query on an index page automatically lists all OvocoCRM runbooks. When someone adds a new runbook page and applies the correct labels, it appears on the index automatically.

The **Excerpt** and **Excerpt Include** macros enable content reuse. Define a canonical definition (product description, compliance statement, standard process step) once on a source page using the Excerpt macro, then include it on other pages with Excerpt Include. When the canonical text changes, all including pages update automatically.

## Jira Integration for Document Reviews

The Confluence-Jira integration implements the document review workflow described earlier with a three-way connection between Jira, Confluence, and Assets.

A Document Review Report (DRR) is a Jira issue type that tracks the review lifecycle. The DRR links to both the Confluence page (where reviewers read and comment) and the Document CI in Assets (where the metadata lives).

The workflow:

1. A DRR issue is created in Jira, linking to the Confluence page and the Document CI in Assets
2. Reviewers are assigned on the DRR issue
3. Reviewers read the Confluence page and submit comments as Confluence inline comments or DRR issue comments
4. The author resolves each comment (accept, reject with rationale, or defer)
5. The CM Lead verifies all comments are resolved
6. The DRR is approved
7. The Document CI's state in Assets updates to "Published"
8. If the document requires a controlled artifact, the approved PDF is uploaded to the DML

On the Confluence page, use **Jira Issue** macros to embed the DRR status. This gives page readers visibility into the review state without leaving Confluence.

Each DRR issue carries two references: the Confluence page URL and the Document CI key in Assets. From any one of the three systems (Jira, Confluence, Assets), an analyst can navigate to the other two.

Comment dispositions are tracked on the DRR issue in a structured format, providing an auditable record of every piece of feedback and how it was handled.

## Automation Rules

Jira automation rules can create Confluence pages from templates when CMDB events occur. When a new Product Version CI is created in Assets, an automation rule creates a release notes page in the product space from a standard template. When a Document CI's state changes to "Published," an automation updates the Page Properties on the corresponding Confluence page.

These automations reduce manual steps and keep the three tiers synchronized.


# Other Wiki Platforms

The patterns in this chapter work across wiki platforms. The key requirement is bidirectional linking: the wiki page links to the CI record, and the CI record links back to the wiki page. Here is how the concepts map to other platforms.

**SharePoint** uses site collections and pages instead of spaces and child pages. SharePoint list columns provide structured metadata similar to Page Properties. Power Automate can create pages from templates on CI creation events. The Highlighted Content web part builds tag-filtered indexes.

**Notion** uses databases and linked pages. Notion databases with relations can mirror the CMDB taxonomy directly, and linked databases can embed filtered views on documentation pages. Synced blocks enable content reuse across pages.

**BookStack** organizes content into shelves, books, and chapters, which maps naturally to the portfolio, product, and branch-level hierarchy. BookStack supports page tags for cross-cutting views.

**MediaWiki** uses categories and templates for structured content. Semantic MediaWiki extensions add typed properties that can serve a similar role to Page Properties. Transclusion enables content reuse.

If your wiki supports structured metadata on pages (for document tracking) and some form of dynamic content embedding (for live CMDB data), you can replicate the full pattern. If it does not support embedding, URL-based linking alone still provides the essential traceability.
