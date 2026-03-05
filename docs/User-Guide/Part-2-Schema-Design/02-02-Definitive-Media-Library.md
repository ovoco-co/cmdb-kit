# Definitive Media Library

The Definitive Media Library (DML) is the controlled store of authorized software and documentation artifacts. It is where approved releases live after they pass through the Product Library's approval gates. While the Product Library chapter covered what was approved (versions, baselines, certifications), this chapter covers what was produced, how it is stored, and where it was sent. Three CMDB-Kit types model the DML: Product Media tracks individual artifacts, Product Suite bundles them into distribution packages, and Distribution Log records every delivery to a customer site.


# What the DML Is

## ITIL Concept: The Secure Store of Authorized Software

ITIL defines the Definitive Media Library as the single logical storage area for authorized versions of all media configuration items. "Media" here means anything deliverable: software packages, installation ISOs, database migration scripts, configuration files, approved documentation PDFs. The DML is not a CMDB type. It is a physical or logical storage location (a file server, a cloud bucket, an artifact repository) where controlled files live.

The key word is "authorized." Not every build artifact belongs in the DML. Only artifacts that have been verified, approved, and are ready for distribution earn a place there. A nightly build sitting in a CI/CD pipeline is not DML content. The same build, after it passes integration testing and receives release approval, becomes DML content.

## How CMDB-Kit Models This

CMDB-Kit does not model the storage location itself. It models what is stored there and what happened to it:

- Product Media: a record for each deliverable artifact (the ISO, the tarball, the migration script)
- Product Suite: a record that bundles multiple media items into a distribution package
- Distribution Log: a record for each delivery of a version to a deployment site

The actual files live wherever your organization stores them: a shared drive, an S3 bucket, a Nexus repository, a classified file server. The CMDB records point to those files (via file names and checksums) and track their lifecycle.


# DML Architecture

## Three-tier Model: Knowledge (Confluence), Catalog (JSM Assets), Storage (DML)

The DML fits into a three-tier library architecture that separates concerns:

The knowledge tier (Confluence or equivalent) holds narrative documentation: how-to guides, architecture decisions, runbooks, design discussions. This is where people write and read about the product.

The catalog tier (JSM Assets or equivalent CMDB) holds structured metadata: CI records for documents, media, suites, versions, and baselines. Every artifact registered in the DML has a corresponding CI record in the catalog. This is where you query, filter, and report on what exists.

The storage tier (the DML file server or artifact repository) holds the actual files: ISOs, tarballs, PDFs, checksums. This is where authorized artifacts live in their final, controlled form.

The three tiers are complementary, not interchangeable. A document's narrative content lives in Confluence. Its metadata (type, state, author, version) lives in JSM Assets. Its approved PDF lives on the DML. Changing one tier does not automatically update the others, which is why the catalog tier matters: it is the single source of truth for what exists and where.

### How the Tiers Connect

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

- The wiki links **to** DML artifacts (via `dmlPath` stored on the CMDB CI)
- CMDB CIs **catalog** what is in the DML and what is in the wiki
- The DML **stores** the controlled artifact itself

### What Goes Where

Getting the tier boundaries wrong leads to controlled artifacts hiding in wiki pages where they cannot be audited, versioned, or baselined.

| Content Type | Where It Goes | Why |
|---|---|---|
| Approved PDF of System Specification | DML (`/dml/{product}/docs/specifications/current/`) | Controlled artifact. Must be immutable after approval. Auditable via CMDB CI. |
| Discussion about specification design choices | Wiki | Knowledge. Living document. Will evolve between releases. |
| Approved Test Report | DML (`/dml/{product}/docs/test/reports/`) | Controlled artifact. Part of the baseline package. |
| Test strategy notes and lessons learned | Wiki | Knowledge. Informal. Helps future testers but is not a deliverable. |
| Release ISO image | DML (`/dml/{product}/releases/{version}/build/`) | Controlled artifact. Must be checksummed and tracked. |
| Build environment setup instructions | Wiki | Knowledge. Changes frequently. Not a formal deliverable. |
| Required controlled documents (specifications, design docs, ICDs) | DML | Controlled artifact. Certification or audit requirement. |
| Draft of a controlled document (.docx) | DML (`/dml/{product}/docs/drafts/`) | Even drafts of controlled artifacts live on the DML. Wiki pages can link to them. |

Wiki pages can and should **link to** DML artifacts. The `dmlPath` attribute on Document CIs provides the canonical path. Embed that path in wiki links so teams can navigate from context to artifact.

## Drive Structure and Shared Storage Layout

In a production DML, the storage is typically organized by product at the top level. Each product has its own directory tree containing documentation and software artifacts. A typical layout:

```
DML/
├── OvocoCRM/
│   ├── Documentation/
│   │   ├── v2.3.1/
│   │   ├── v2.3.0/
│   │   └── Standard_Practice/
│   └── Software/
│       ├── v2.3.1/
│       ├── v2.3.0/
│       └── Archive/
└── OvocoAnalytics/
    ├── Documentation/
    └── Software/
```

In a multi-product environment, each product gets its own top-level directory. Shared artifacts (like cross-product tools or common libraries) get their own directory at the DML root.

## Product-specific Shares and Folder Organization

Within each product's software directory, versions are the primary organizing principle. Each version gets its own folder containing all deliverable artifacts for that release. Superseded versions can be moved to an archive directory when they are no longer in active distribution but need to be retained for rollback or audit purposes.

Documentation follows a similar version-based structure, with an additional folder for documents that span versions (standard operating procedures, standing reference material).


# Folder Organization

## Version-based Directory Structure

Every released version gets its own folder. The folder name matches the version number:

```
OvocoCRM/Software/
├── v2.3.1/
│   ├── ovococrm-2.3.1-server.tar.gz
│   ├── ovococrm-2.3.1-frontend.tar.gz
│   ├── ovococrm-2.3.1-db-migrations.tar.gz
│   └── SHA256SUMS.txt
├── v2.3.0/
│   ├── ovococrm-2.3.0-server.tar.gz
│   ├── ovococrm-2.3.0-frontend.tar.gz
│   ├── ovococrm-2.3.0-db-migrations.tar.gz
│   └── SHA256SUMS.txt
└── Archive/
    └── v2.2.0/
```

Each version folder is self-contained. Everything needed to install that version lives in its folder. Checksums are stored alongside the artifacts they verify.

## Component Folders Within Each Version

For products with many components, you may subdivide each version folder by component:

```
v2.3.1/
├── server/
│   └── ovococrm-2.3.1-server.tar.gz
├── frontend/
│   └── ovococrm-2.3.1-frontend.tar.gz
├── db-migrations/
│   └── ovococrm-2.3.1-db-migrations.tar.gz
└── SHA256SUMS.txt
```

This pattern becomes valuable when different teams or sites need different subsets of the release. A site upgrading only the frontend does not need to download the server package.

## Archive Patterns for Superseded Releases

When a version is superseded, its folder moves to the archive directory. The archive preserves the full release for rollback and audit purposes. Archived versions should not be distributed to new sites, but they remain available if a site needs to roll back.

A retention policy determines how long archived versions stay on the DML. Common policies keep the previous two major versions and remove anything older. Whatever the policy, it must be documented and applied consistently.

## Category-based Directory Structure

For organizations with formal document management requirements, an alternative layout organizes files by document category rather than by version. Each category has `current/` and `archive/` subdirectories, and release snapshots collect immutable copies of what shipped:

```
/dml/{product}/
  docs/
    drafts/                        <- Working drafts (.docx)
    specifications/
      current/                     <- Current approved specs
      archive/                     <- Superseded specs
    design/
      current/
      archive/
    configuration/
      current/
      archive/
    test/
      plans/
      reports/
    operations/
      current/
      archive/
    security/
      current/
      archive/
  releases/
    2.4.0/
      build/                       <- Release binaries, ISOs
      docs/                        <- Immutable doc snapshot
      checksums/                   <- SHA-256 digests
    2.3.1/
      build/
      docs/
      checksums/
  baselines/
    CR-PBL-2.4.0-PCA-20260120/    <- Baseline snapshot
  templates/                       <- Document templates
```

Key organizational principles:
- Documents are organized by category (specifications, design, test, etc.), not by version
- Each category has `current/` and `archive/` subdirectories
- Release snapshots under `/releases/{version}/docs/` are immutable copies of what shipped
- Baselines reference the release snapshot plus any additional controlled items

This pattern works alongside the version-based layout described above. Choose the version-based layout when software artifacts dominate and documentation is light. Choose the category-based layout when the organization produces many controlled documents that need lifecycle tracking independent of software releases.


# Product Media

## Recording Downloadable Artifacts and Binaries

Product Media is the CI type that represents a single deliverable artifact. One file, one record. The OvocoCRM example data includes six media records:

```json
{
  "Name": "ovococrm-2.3.1-server.tar.gz",
  "description": "Server package for OvocoCRM 2.3.1",
  "version": "OvocoCRM 2.3.1",
  "fileName": "ovococrm-2.3.1-server.tar.gz",
  "fileSize": "245 MB",
  "checksum": "sha256:a1b2c3d4e5f6..."
}
```

## Attributes: Version, File Name, File Size, Checksum

The Product Media attributes:

```json
"Product Media": {
  "description": { "type": 0 },
  "version": { "type": 1, "referenceType": "Product Version" },
  "fileName": { "type": 0 },
  "fileSize": { "type": 0 },
  "checksum": { "type": 0 }
}
```

The version reference links the artifact to its Product Version record. The fileName stores the exact filename as it appears on the DML. The fileSize is a human-readable string (not bytes). The checksum stores the hash algorithm and value together (e.g., "sha256:a1b2c3...").

## One Media Record Per Deliverable Artifact

The rule is one artifact, one record. The OvocoCRM 2.3.1 release has three artifacts (server, frontend, db-migrations), so it has three Product Media records. This granularity matters because:

Different sites may need different artifacts. A site doing a frontend-only update does not need the server package.

Checksums are per-artifact. You verify each file independently.

Distribution logs reference the version, not individual media items, so the granularity does not create extra work in tracking deliveries.

## Integrity Verification With Checksums

Every binary artifact on the DML should have a checksum. The checksum attribute stores the hash so that anyone receiving the artifact can verify it was not corrupted or tampered with in transit.

SHA-256 is the standard choice. The checksum value in the CMDB record should match the checksum file stored alongside the artifact on the DML. Verification is straightforward:

```bash
sha256sum ovococrm-2.3.1-server.tar.gz
# Compare output against the checksum in the Product Media record
```

For classified or high-assurance environments, SHA-512 may be required. The checksum field is a text field, so it accommodates any algorithm prefix.

## Digest Files: SHA-256 and SHA-512 Checksum Management

A digest file (typically SHA256SUMS.txt or similar) lists checksums for all artifacts in a version folder. This file lives on the DML alongside the artifacts:

```
a1b2c3d4...  ovococrm-2.3.1-server.tar.gz
e5f6a7b8...  ovococrm-2.3.1-frontend.tar.gz
c9d0e1f2...  ovococrm-2.3.1-db-migrations.tar.gz
```

The digest file enables batch verification of an entire release. Recipients can run `sha256sum -c SHA256SUMS.txt` to verify all artifacts at once. The Product Media records in the CMDB mirror these values, providing a second source of truth that is independent of the DML file server.


# File Naming Standards

## Standard Format: PRODUCT-DOCTYPE-DESCRIPTOR-VERSION-DATE.ext

Consistent file naming makes artifacts findable and self-describing. A recommended pattern:

```
{product}-{descriptor}-{version}.{ext}
```

The OvocoCRM example follows this: `ovococrm-2.3.1-server.tar.gz` is product `ovococrm`, version `2.3.1`, descriptor `server`, extension `tar.gz`.

For documentation artifacts, a common pattern includes the document type:

```
{product}-{doctype}-{descriptor}-{version}-{date}.{ext}
```

For example: `ovococrm-runbook-deployment-2.3.1-20260210.pdf`.

## Document Type Codes and Their Meanings

Organizations with formal documentation standards often use short codes for document types. Common codes:

| Code | Document Type |
|------|--------------|
| RB | Runbook |
| SOP | Standard Operating Procedure |
| ARCH | Architecture Document |
| API | API Reference |
| RN | Release Notes |
| PM | Post-Mortem |

These codes appear in file names to make documents identifiable at a glance without opening them.

## Version Format Rules

Use the full version number in every file name. Do not collapse versions: `ovococrm-2.3.1-server.tar.gz`, not `ovococrm-231-server.tar.gz`. The dots and dashes make the version unambiguous.

For products using four-part version numbers (X.X.X.X), include all four parts. Consistency matters more than brevity.

## Software Media Naming and Build Identifiers

Software artifacts should include enough information to identify the exact build. The version number plus the component descriptor is usually sufficient. If your build system produces artifacts with build numbers or commit hashes, include those in the fileName attribute of the Product Media record even if the file on the DML uses a simplified name.


# Release Designation System

## GOLD Releases

A GOLD release is the initial authorized version of a software product. It is the first release that passes all testing and receives formal approval for distribution. The term comes from the manufacturing practice of creating a "gold master" disc.

In the Product Version lifecycle, the GOLD release is typically the x.0.0 version. OvocoCRM 2.0.0 is the GOLD release for the 2.x series.

## General Corrections (GC1, GC2)

General Corrections are planned maintenance releases that bundle multiple fixes and improvements. They correspond to minor version increments (x.1.0, x.2.0). GC1 is the first general correction, GC2 is the second, and so on.

OvocoCRM 2.1.0 (added email integration) and 2.2.0 (added analytics) are general corrections to the 2.0.0 GOLD release.

## Temporary Releases (TR1 Through TR9)

Temporary Releases are unplanned hotfix releases that address a specific critical issue. They correspond to patch version increments (x.y.1, x.y.2). Temporary releases have a narrower scope than general corrections: they fix one problem and ship quickly.

OvocoCRM 2.3.1 (hotfix for contact import race condition) is a temporary release against 2.3.0.

The numbering convention (TR1 through TR9) assumes a maximum of nine temporary releases between general corrections. If you reach TR9, the next planned release should be a general correction that consolidates all temporary fixes.


# Product Suite

## Bundling Multiple Media Items Into a Distribution Package

A Product Suite groups multiple Product Media records into a single distribution package. It represents "everything you need to install this version."

The Product Suite attributes:

```json
"Product Suite": {
  "description": { "type": 0 },
  "version": { "type": 1, "referenceType": "Product Version" },
  "media": { "type": 1, "referenceType": "Product Media", "max": -1 }
}
```

The OvocoCRM example has two suites:

```json
{
  "Name": "OvocoCRM 2.3.1 Release Package",
  "description": "Complete release package for OvocoCRM 2.3.1",
  "version": "OvocoCRM 2.3.1",
  "media": "ovococrm-2.3.1-server.tar.gz;ovococrm-2.3.1-frontend.tar.gz;ovococrm-2.3.1-db-migrations.tar.gz"
}
```

## When to Use a Suite vs Individual Media Records

Always create both. Product Media records exist for every artifact regardless. A Product Suite groups them for distribution convenience.

Create a suite when you distribute a set of artifacts together as a unit. If sites always receive all three components (server, frontend, db-migrations) together, bundle them in one suite.

Create multiple suites when different distribution scenarios exist. If some sites only need the frontend update, create a "OvocoCRM 2.3.1 Frontend-Only Package" suite containing just the frontend media record. The full suite and the partial suite can coexist, each serving a different distribution need.

## Linking Suites to the Version They Deliver

The version reference on Product Suite links to the same Product Version record that the individual media items reference. This creates a two-level traceability:

```
Product Version "OvocoCRM 2.3.1"
  └── Product Suite "OvocoCRM 2.3.1 Release Package"
        ├── Product Media "ovococrm-2.3.1-server.tar.gz"
        ├── Product Media "ovococrm-2.3.1-frontend.tar.gz"
        └── Product Media "ovococrm-2.3.1-db-migrations.tar.gz"
```

Given a version, you can find all its suites. Given a suite, you can find all its media items. Given a media item, you can find the version and verify the checksum.


# Document Tracking

## CI Relationship Web

The CMDB ties releases to their documentation and DML locations:

```
Product Version (OvocoCRM 2.4.0)
  |
  +-> Documentation Suite (CR Doc Suite 2.4.0)
  |      |
  |      +-> Document CI: CR System Specification 2.4.0
  |      |      dmlPath: /dml/ovococrm/releases/2.4.0/docs/OVOCOCRM-SS-2.4.0-20260115.pdf
  |      |      wikiUrl: https://wiki.example.com/cr/specifications/system-spec
  |      |
  |      +-> Document CI: CR Version Description 2.4.0
  |      |      dmlPath: /dml/ovococrm/releases/2.4.0/docs/OVOCOCRM-VD-2.4.0-20260116.pdf
  |      |
  |      +-> Document CI: CR Admin Guide 2.4.0
  |      |      dmlPath: /dml/ovococrm/releases/2.4.0/docs/OVOCOCRM-AG-2.4.0-20260115.pdf
  |      |
  |      +-> (all other documents in the suite)
  |
  +-> Baseline (CR-PBL-2.4.0-PCA-20260120)
         dmlPath: /dml/ovococrm/baselines/CR-PBL-2.4.0-PCA-20260120/
```

Each Document CI has both a `dmlPath` (pointing to the controlled artifact) and optionally a `wikiUrl` (pointing to the wiki page with context, architecture decisions, and operational notes). The Documentation Suite CI groups all documents for a release. The Baseline CI snapshots the entire configuration at a milestone.

## Document CI Attributes

The Document CI in the CMDB tracks both the wiki and DML locations:

| Attribute | Type | Description |
|---|---|---|
| Name | Text | Human-readable name (e.g., "CR System Specification 2.4.0") |
| documentType | Reference | Specification, Design, Admin Guide, Test Report, etc. |
| documentState | Reference | Draft, In Review, Approved, Superseded, Archived |
| relatedProduct | Reference | Links document to its product |
| filename | Text | Standardized filename on DML |
| documentDate | Date | Date the document was finalized |
| version | Text | Product version the document covers |
| wikiUrl | Text | URL to the wiki page (knowledge context) |
| dmlPath | Text | Full path on the DML (controlled artifact) |
| sourceLocation | Text | Where the master lives: Wiki, DML, or External |

The `dmlPath`, `wikiUrl`, and `sourceLocation` attributes are recommended extensions beyond the current CMDB-Kit schema. They enable the three-tier integration pattern described in this chapter.

The Documentation Suite CI groups documents for a release:

| Attribute | Type | Description |
|---|---|---|
| Name | Text | Suite identifier (e.g., "CR Documentation Suite 2.4.0") |
| suiteVersion | Text | Version of the suite |
| productVersion | Reference | The release this suite belongs to |
| documents | Multi-Reference | All Document CIs included in this suite |
| approvalDate | Date | Date the suite was approved for release |
| suiteStatus | Reference | Draft, In Review, Published, Archived |
| dmlPath | Text | Directory path on DML for the release docs |

## Document Lifecycle

Documents follow an ITIL-aligned lifecycle where each stage has a defined file format, DML location, and CMDB state.

| Stage | Action | File Format | DML Location | CMDB State |
|---|---|---|---|---|
| Author | Engineer creates document from template | .docx | `/dml/shared/templates/` (template source) | n/a |
| Draft | Working draft stored for collaboration | .docx | `/dml/{product}/docs/drafts/` | Draft |
| Review | Document converted to PDF, submitted to CCB | .pdf | `/dml/{product}/docs/drafts/` | In Review |
| Approve | CCB approves, PDF moved to category folder, CMDB CI updated | .pdf | `/dml/{product}/docs/{category}/current/` | Approved |
| Release | Approved document copied into release snapshot | .pdf | `/dml/{product}/releases/{version}/docs/` | Approved (released) |
| Supersede | New version approved, old version moved to archive | .pdf | `/dml/{product}/docs/{category}/archive/` | Superseded |
| Archive | Major version retired, entire release tree archived | .pdf | `/dml/archive/{product}/{major-version}/` | Archived |

```
Template
  +-> DRAFT (.docx in /drafts/)
        +-> Peer Review (updated .docx, same location)
              +-> IN REVIEW (.pdf in /drafts/)
                    |
                    +- Rejected -> back to DRAFT
                    |
                    +- Approved -> APPROVED (.pdf in /current/)
                          |
                          +-> RELEASED (copied to /releases/{version}/docs/)
                          |
                          +-> SUPERSEDED (moved to /archive/ when new version approved)
                                +-> ARCHIVED (when major version retired)
```

Key practices:

- Drafts live on the DML, not in the wiki. The wiki page links to the draft, but the draft file itself is on the DML where it can be versioned and eventually promoted.
- When a document is approved, it moves from `/drafts/` to `/docs/{category}/current/`. The CMDB CI's `dmlPath` is updated to the new location.
- When a release is built, the release process copies current documents from their category folders into the immutable release snapshot (`/releases/{version}/docs/`). The Documentation Suite CI references the snapshot copies, preserving an exact record of what shipped with that version.


# Media Intake Process

## Required Metadata Per Submission

When an artifact is submitted to the DML, the submitter must provide enough metadata for the CM team to verify, classify, and file it. At minimum:

- Product name
- Component (if applicable)
- Version number (full format)
- Artifact type (software package, documentation, configuration)
- File manifest with descriptions
- Submitter name
- Submission date
- Associated Jira ticket or approval reference
- Verification hashes (SHA-256)

Without this metadata, the CM team cannot determine where to file the artifact, cannot verify its integrity, and cannot trace it back to the approval that authorized it.

Different artifact types (software packages, documentation, configuration files, test artifacts) have specific additional requirements beyond the base metadata. Submission methods include direct DML drop folders, physical media for air-gapped environments, and secure file transfer across network boundaries. Every binary submission must include SHA-256 checksums for integrity verification. In environments with classification requirements, appropriate markings must be applied to all files and media.

For the complete intake SOP, including the artifact type taxonomy, per-type requirements, intake form template, processing steps, and email templates, see [DML Operations](../Part-4-Day-to-Day/04-05-DML-Operations.md#intake-processing).


# File Verification Workflow

## Renaming to Standard Conventions

When an artifact arrives in the drop folder, the CM team renames it to match the organization's naming standard. A submission named `build-4521-output.tar.gz` becomes `ovococrm-2.3.1-server.tar.gz`. The original name and the new name are logged for traceability.

## Moving to Controlled Storage

After renaming, the artifact moves from the drop folder to its version directory on the DML. The drop folder is a staging area, not a permanent home. Artifacts left in the drop folder are not controlled and should not be distributed.

## Tracking on the DML

Once the artifact is in its final location, the CM team creates or updates the Product Media record in the CMDB. The fileName attribute matches the renamed file. The checksum attribute stores the verified hash. The version reference links to the correct Product Version.


# Media Delivery Workflow

## From Build Artifact to Product Media Record

The lifecycle of a deliverable artifact:

1. Development team builds the artifact
2. QA verifies the build passes acceptance tests
3. Release manager approves the artifact for the DML
4. Developer submits the artifact to the DML drop folder with required metadata
5. CM team verifies checksum, renames to standard, moves to version directory
6. CM team creates a Product Media record in the CMDB

## Packaging Media Into a Product Suite

Once all artifacts for a version are on the DML and registered in the CMDB:

1. CM team creates a Product Suite record
2. The suite's media attribute lists all Product Media records for this version
3. The suite's version attribute links to the Product Version

The suite now represents a complete, distributable package.

## Recording the Delivery With a Distribution Log Entry

When a suite is sent to a deployment site:

1. CM team prepares the media (copies, encrypts if required, packages)
2. CM team ships or transfers the media to the site
3. CM team creates a Distribution Log record with the version, site, date, and person

The Distribution Log is the audit trail. It answers: who sent what version to which site, and when?


# Distribution Log

## The Audit Trail

The Distribution Log is the most operationally important type in the DML chapter. It connects the Product Library (what was released) to the deployment landscape (where it went).

The Distribution Log attributes:

```json
"Distribution Log": {
  "description": { "type": 0 },
  "version": { "type": 1, "referenceType": "Product Version" },
  "site": { "type": 1, "referenceType": "Deployment Site" },
  "distributionDate": { "type": 0, "defaultTypeId": 4 },
  "distributedBy": { "type": 1, "referenceType": "Person" }
}
```

The OvocoCRM example data has two distribution records:

```json
[
  {
    "Name": "v2.3.1 US-East Distribution",
    "description": "Production hotfix distribution to US-East region",
    "version": "OvocoCRM 2.3.1",
    "site": "Acme Corp US-East",
    "distributionDate": "2026-02-10",
    "distributedBy": "Jordan Lee"
  },
  {
    "Name": "v2.3.1 US-West Distribution",
    "description": "Production hotfix distribution to US-West region",
    "version": "OvocoCRM 2.3.1",
    "site": "Acme Corp US-West",
    "distributionDate": "2026-02-10",
    "distributedBy": "Jordan Lee"
  }
]
```

## Attributes: Version, Site, Distribution Date, Distributed By

Each attribute serves a specific audit purpose:

The version reference tells you exactly what was sent. Not just "the latest" but the specific Product Version record with its components, baseline, and documentation suite.

The site reference tells you where it went. This is a reference to a Deployment Site record, which carries the site's environment, status, and installed version.

The distributionDate tells you when it was sent. This is the date the media left CM control, not the date it was installed.

The distributedBy reference tells you who sent it. This creates personal accountability and a contact point if questions arise about the delivery.

## Why This Record Matters for Compliance and Rollback

Distribution Log records answer questions that no other CI type can:

"Which sites have received version 2.3.1?" Query all Distribution Log records where version = "OvocoCRM 2.3.1."

"When was the last distribution to Acme Corp US-East?" Query Distribution Log records where site = "Acme Corp US-East," sorted by date.

"Who distributed media to sites last month?" Query by distributionDate range and distributedBy.

For rollback planning, Distribution Log records tell you which version was previously at a site. If v2.3.1 needs to be rolled back, the log shows that v2.3.0 was distributed before it.

For compliance audits, the log provides a complete chain: from the approved baseline, through the Product Suite that was assembled, to the Distribution Log that proves delivery. Every link in this chain is a CI record in the CMDB.


# DML Hygiene and Auditing

## Common Data Quality Issues: Abandoned Files, Corrupted Artifacts, Duplicates

DML file servers accumulate problems over time. Common issues include:

Abandoned files in drop folders. Artifacts submitted but never processed, left in staging indefinitely.

Corrupted artifacts. Files whose checksums no longer match, caused by storage errors or incomplete transfers.

Duplicate files. Multiple copies of the same artifact, sometimes with slightly different names, scattered across directories.

Orphaned versions. Version folders for releases that were never approved or distributed, consuming storage without purpose.

## Naming Violations and Misplaced Files

Without enforcement, file naming standards drift. Common violations:

Files with non-standard names that do not follow the product-version-descriptor pattern.

Files stored in the wrong version folder, making them appear to belong to a different release.

Documentation mixed into software directories and software mixed into documentation directories.

Cross-product contamination: artifacts from one product appearing on another product's DML share.

## Cleanup Process: Archival, Deletion, Reorganization

A DML hygiene audit should be conducted periodically (quarterly is common). The process:

1. Inventory all files against Product Media records. Any file without a corresponding CMDB record is uncontrolled.
2. Verify checksums for all registered artifacts. Any mismatch indicates corruption.
3. Check naming compliance. Any file not matching the standard gets renamed.
4. Identify and remove duplicates, keeping the copy in the correct location.
5. Archive or delete abandoned files after confirming they are not needed.
6. Document all changes made during the audit.

## Preventive Controls: Intake Rigor, Validation on Upload

The best way to keep a DML clean is to prevent problems at intake:

Reject submissions without complete metadata. If there is no version number, no checksum, and no submitter identification, do not accept the artifact.

Verify checksums immediately on receipt. Do not defer verification.

Rename files to standard convention before moving to controlled storage. Never store files with their submitted names.

Create the Product Media record at the same time the file is placed on the DML. If the record does not exist, the file is uncontrolled.

## Content Classification for Migration

When migrating from legacy systems, classify every item before moving it:

| Content Type | Disposition |
|---|---|
| Controlled artifact (approved document, test report, certification package) | Migrate to DML, rename per naming convention, register as Document CI in CMDB |
| Knowledge content (how-to guide, architecture decision, meeting notes) | Migrate to wiki |
| Stale or orphaned content (outdated drafts, duplicates, retired versions) | Archive or delete; do not migrate |

Do not migrate stale content into a new environment. The migration is an opportunity to establish clean tier boundaries.


# End-to-end Example

## OvocoCRM v2.3.1: Build, Package, Distribute, Log

Here is the complete lifecycle of the OvocoCRM 2.3.1 hotfix, from build artifact through distribution:

Development builds the hotfix for the contact import race condition. Three artifacts are produced: the server package (245 MB), the frontend assets (82 MB), and the database migration scripts (1.2 MB). SHA-256 checksums are generated for each.

The release manager approves the build after staging validation (v2.3.1 Staging Deploy, completed 2026-02-08). The Release Baseline is approved on 2026-02-09.

The developer submits the three artifacts to the DML drop folder with metadata: product OvocoCRM, version 2.3.1, artifact type software package, checksums attached.

The CM team verifies checksums, renames files to standard convention (ovococrm-2.3.1-server.tar.gz, ovococrm-2.3.1-frontend.tar.gz, ovococrm-2.3.1-db-migrations.tar.gz), and moves them to `DML/OvocoCRM/Software/v2.3.1/`.

Three Product Media records are created in the CMDB, each linking to "OvocoCRM 2.3.1" with the verified checksum.

A Product Suite record "OvocoCRM 2.3.1 Release Package" is created, bundling all three media items.

Distribution to two sites on the same day:
- "v2.3.1 US-East Distribution" (2026-02-10, Jordan Lee)
- "v2.3.1 US-West Distribution" (2026-02-10, Jordan Lee)

The complete record chain:

```
OvocoCRM 2.3.1 (Product Version)
  ├── Release Baseline (Approved 2026-02-09)
  ├── Product Suite "OvocoCRM 2.3.1 Release Package"
  │     ├── ovococrm-2.3.1-server.tar.gz (245 MB, sha256:a1b2...)
  │     ├── ovococrm-2.3.1-frontend.tar.gz (82 MB, sha256:e5f6...)
  │     └── ovococrm-2.3.1-db-migrations.tar.gz (1.2 MB, sha256:c9d0...)
  ├── Distribution: US-East (2026-02-10, Jordan Lee)
  └── Distribution: US-West (2026-02-10, Jordan Lee)
```

Every artifact, every bundle, and every delivery is a queryable CI record. An auditor can trace from the version approval through the media integrity check to the distribution confirmation. A site operator can verify that the media they received matches the checksum in the CMDB. A CM lead can see at a glance which sites have the hotfix and which are still waiting.
