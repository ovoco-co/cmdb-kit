# Definitive Media Library

The Definitive Media Library (DML) is the controlled store of authorized software and documentation artifacts. It is where approved releases live after they pass through the Product Library's approval gates. While the Product Library section covered what was approved (versions, baselines, certifications), this section covers what was produced, how it is stored, and where it was sent. Three CMDB-Kit types model the DML: CR Product Media tracks individual artifacts, CR Product Suite bundles them into distribution packages, and CR Distribution Log records every delivery to a customer site.


# What the DML Is

## ITIL Concept: The Secure Store of Authorized Software

ITIL defines the Definitive Media Library as the single logical storage area for authorized versions of all media configuration items. "Media" here means anything deliverable: software packages, installation ISOs, database migration scripts, configuration files, approved documentation PDFs. The DML is not a CMDB type. It is a physical or logical storage location (a file server, a cloud bucket, an artifact repository) where controlled files live.

The key word is "authorized." Not every build artifact belongs in the DML. Only artifacts that have been verified, approved, and are ready for distribution earn a place there. A nightly build sitting in a CI/CD pipeline is not DML content. The same build, after it passes integration testing and receives release approval, becomes DML content.

## How CMDB-Kit Models This

CMDB-Kit does not model the storage location itself. It models what is stored there and what happened to it:

- CR Product Media: a record for each deliverable artifact (the container image, the Helm chart, the migration script)
- CR Product Suite: a record that bundles multiple media items into a distribution package
- CR Distribution Log: a record for each delivery of a version to a deployment site

The actual files live wherever your organization stores them: a shared drive, an S3 bucket, a Nexus repository, a classified file server. The CMDB records point to those files (via file names and checksums) and track their lifecycle.

Portfolio mode also introduces four lookup types that support these DML records:

- Media Type: classifies the format of each artifact (Container Image, Installation ISO, Helm Chart, Documentation Archive, Patch Bundle, Database Migration)
- Transfer Status: tracks each delivery through its lifecycle (Requested, Approved, Preparing, Shipped, In Transit, Received, Installed, Verified)
- Delivery Method: records how media reaches a site (Network Transfer, Encrypted USB, Secure Download, Physical Media)
- Media Urgency: captures priority of distribution requests (Standard, Expedited, Emergency)


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

> **Note:** In portfolio mode, the `dmlPath` attribute is defined on CR Document, CR Product Media, and CR Product Suite. The `url` attribute on CR Document can point to a wiki page or artifact location.

### What Goes Where

Getting the tier boundaries wrong leads to controlled artifacts hiding in wiki pages where they cannot be audited, versioned, or baselined.

| Content Type | Where It Goes | Why |
|---|---|---|
| Approved PDF of System Specification | DML (`/dml/{product}/docs/specifications/current/`) | Controlled artifact. Must be immutable after approval. Auditable via CMDB CI. |
| Discussion about specification design choices | Wiki | Knowledge. Living document. Will evolve between releases. |
| Approved Test Report | DML (`/dml/{product}/docs/test/reports/`) | Controlled artifact. Part of the baseline package. |
| Test strategy notes and lessons learned | Wiki | Knowledge. Informal. Helps future testers but is not a deliverable. |
| Release container image | DML (`/dml/{product}/releases/{version}/build/`) | Controlled artifact. Must be checksummed and tracked. |
| Build environment setup instructions | Wiki | Knowledge. Changes frequently. Not a formal deliverable. |
| Required controlled documents (specifications, design docs, ICDs) | DML | Controlled artifact. Certification or audit requirement. |
| Draft of a controlled document (.docx) | DML (`/dml/{product}/docs/drafts/`) | Even drafts of controlled artifacts live on the DML. Wiki pages can link to them. |

Wiki pages can and should **link to** DML artifacts. The `dmlPath` attribute on CR Document CIs provides the canonical path. Embed that path in wiki links so teams can navigate from context to artifact.

## Drive Structure and Shared Storage Layout

In a production DML, the storage is typically organized by product at the top level. Each product has its own directory tree containing documentation and software artifacts. A typical layout:

```
DML/
+-- OvocoCRM/
|   +-- Documentation/
|   |   +-- v2.4.0/
|   |   +-- v2.3.1/
|   |   +-- v2.3.0/
|   |   +-- Standard_Practice/
|   +-- Software/
|       +-- v2.4.0/
|       +-- v2.3.1/
|       +-- v2.3.0/
|       +-- Archive/
+-- OvocoAnalytics/
    +-- Documentation/
    +-- Software/
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
+-- v2.4.0/
|   +-- ovococrm-2.4.0-server.tar.gz
|   +-- ovococrm-2.4.0-frontend.tar.gz
|   +-- ovococrm-2.4.0-db-migrations.tar.gz
|   +-- SHA256SUMS.txt
+-- v2.3.1/
|   +-- ovococrm-2.3.1-server.tar.gz
|   +-- ovococrm-2.3.1-frontend.tar.gz
|   +-- ovococrm-2.3.1-db-migrations.tar.gz
|   +-- SHA256SUMS.txt
+-- v2.3.0/
|   +-- ovococrm-2.3.0-server.tar.gz
|   +-- ovococrm-2.3.0-frontend.tar.gz
|   +-- ovococrm-2.3.0-db-migrations.tar.gz
|   +-- SHA256SUMS.txt
+-- Archive/
    +-- v2.2.0/
```

Each version folder is self-contained. Everything needed to install that version lives in its folder. Checksums are stored alongside the artifacts they verify.

## Component Folders Within Each Version

For products with many components, you may subdivide each version folder by component:

```
v2.3.1/
+-- server/
|   +-- ovococrm-2.3.1-server.tar.gz
+-- frontend/
|   +-- ovococrm-2.3.1-frontend.tar.gz
+-- db-migrations/
|   +-- ovococrm-2.3.1-db-migrations.tar.gz
+-- SHA256SUMS.txt
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


# CR Product Media

## Recording Downloadable Artifacts and Binaries

CR Product Media is the CI type that represents a single deliverable artifact. One file, one record. Portfolio mode adds a mediaType reference and a relatedProduct reference that the Core schema does not have, enabling richer classification and traceability. The dmlPath attribute records where the artifact lives on the DML file server.

```json
{
  "Name": "CR Platform 2.4.0 Container",
  "description": "Container image for OvocoCRM Core Platform 2.4.0",
  "mediaType": "Container Image",
  "relatedProduct": "CR Core Platform",
  "filename": "ovococrm-platform-2.4.0.tar.gz",
  "fileSize": "512 MB",
  "fileDate": "2026-01-20",
  "version": "2.4.0",
  "checksum": "sha256:abc123...",
  "dmlPath": "/releases/crm/2.4.0/"
}
```

## Attributes

The CR Product Media attributes in portfolio mode:

```json
"CR Product Media": {
  "description": { "type": 0 },
  "mediaType": { "type": 1, "referenceType": "Media Type" },
  "relatedProduct": { "type": 1, "referenceType": "CR Product" },
  "filename": { "type": 0 },
  "fileSize": { "type": 0 },
  "fileDate": { "type": 0, "defaultTypeId": 4 },
  "version": { "type": 0 },
  "checksum": { "type": 0 },
  "dmlPath": { "type": 0 }
}
```

| Attribute | Type | Description |
|---|---|---|
| description | Text | Brief description of the artifact |
| mediaType | Reference to Media Type | Format classification (Container Image, Installation ISO, Helm Chart, etc.) |
| relatedProduct | Reference to CR Product | The product this artifact belongs to |
| filename | Text | Exact filename as it appears on the DML |
| fileSize | Text | Human-readable file size (e.g., "512 MB") |
| fileDate | Date | Date the artifact was produced or registered |
| version | Text | Version string for the artifact |
| checksum | Text | Hash algorithm and value (e.g., "sha256:abc123...") |
| dmlPath | Text | Path to the artifact on the DML file server |

The mediaType reference links to the Media Type lookup, which classifies the artifact format. The relatedProduct reference links to a CR Product record, establishing which product this artifact belongs to. The version attribute is a text field (not a reference) that stores the version string directly.

## One Media Record Per Deliverable Artifact

The rule is one artifact, one record. If a release produces three artifacts (a container image, a Helm chart, and a database migration bundle), it has three CR Product Media records. This granularity matters because:

Different sites may need different artifacts. A site doing a frontend-only update does not need the server package.

Checksums are per-artifact. You verify each file independently.

Distribution logs track the delivery at the site level while media records track the artifact level, so the granularity does not create extra work in tracking deliveries.

## Media Type Lookup

The Media Type lookup classifies the format of each artifact. Portfolio mode includes these values:

| Name | Description |
|---|---|
| Container Image | Docker or OCI container image |
| Installation ISO | Bootable installation media |
| Helm Chart | Kubernetes deployment chart |
| Documentation Archive | Bundled documentation package |
| Patch Bundle | Incremental update package |
| Database Migration | Database schema migration scripts |

## Integrity Verification With Checksums

Every binary artifact on the DML should have a checksum. The checksum attribute stores the hash so that anyone receiving the artifact can verify it was not corrupted or tampered with in transit.

SHA-256 is the standard choice. The checksum value in the CMDB record should match the checksum file stored alongside the artifact on the DML. Verification is straightforward:

```bash
sha256sum ovococrm-platform-2.4.0.tar.gz
# Compare output against the checksum in the CR Product Media record
```

For classified or high-assurance environments, SHA-512 may be required. The checksum field is a text field, so it accommodates any algorithm prefix.

## Digest Files: SHA-256 and SHA-512 Checksum Management

A digest file (typically SHA256SUMS.txt or similar) lists checksums for all artifacts in a version folder. This file lives on the DML alongside the artifacts:

```
a1b2c3d4...  ovococrm-2.3.1-server.tar.gz
e5f6a7b8...  ovococrm-2.3.1-frontend.tar.gz
c9d0e1f2...  ovococrm-2.3.1-db-migrations.tar.gz
```

The digest file enables batch verification of an entire release. Recipients can run `sha256sum -c SHA256SUMS.txt` to verify all artifacts at once. The CR Product Media records in the CMDB mirror these values, providing a second source of truth that is independent of the DML file server.


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

Software artifacts should include enough information to identify the exact build. The version number plus the component descriptor is usually sufficient. If your build system produces artifacts with build numbers or commit hashes, include those in the filename attribute of the CR Product Media record even if the file on the DML uses a simplified name.


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


# CR Product Suite

## Bundling Multiple Media Items Into a Distribution Package

A CR Product Suite groups multiple CR Product Media records into a single distribution package. It represents "everything you need to install this version." Portfolio mode adds attributes for product ownership, release metadata, and suite lifecycle state.

The CR Product Suite attributes:

```json
"CR Product Suite": {
  "description": { "type": 0 },
  "product": { "type": 1, "referenceType": "CR Product" },
  "suiteVersion": { "type": 0 },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "productMedia": { "type": 1, "referenceType": "CR Product Media", "max": -1 },
  "releaseDate": { "type": 0, "defaultTypeId": 4 },
  "releaseNotes": { "type": 0 },
  "suiteStatus": { "type": 1, "referenceType": "Document State" },
  "dmlPath": { "type": 0 }
}
```

| Attribute | Type | Description |
|---|---|---|
| description | Text | Brief description of the suite |
| product | Reference to CR Product | The product this suite belongs to |
| suiteVersion | Text | Version identifier for the suite itself |
| productVersion | Reference to CR Product Version | The product version this suite delivers |
| productMedia | Multi-Reference to CR Product Media | All media artifacts included in this suite |
| releaseDate | Date | Date the suite was released |
| releaseNotes | Text | Summary of changes in this release |
| suiteStatus | Reference to Document State | Lifecycle state (Draft, Review, Published, Archived) |
| dmlPath | Text | Directory path on the DML for this suite's artifacts |

The OvocoCRM example data:

```json
{
  "Name": "CR Release Suite 2.4.0",
  "description": "Complete distribution bundle for OvocoCRM 2.4.0",
  "product": "CR Core Platform",
  "suiteVersion": "2.4.0",
  "productVersion": "OvocoCRM 2.4.0",
  "productMedia": "CR Platform 2.4.0 Container",
  "releaseDate": "2026-01-20",
  "releaseNotes": "Major release with analytics dashboard and API improvements",
  "suiteStatus": "Published",
  "dmlPath": "/releases/crm/2.4.0/"
}
```

## When to Use a Suite vs Individual Media Records

Always create both. CR Product Media records exist for every artifact regardless. A CR Product Suite groups them for distribution convenience.

Create a suite when you distribute a set of artifacts together as a unit. If sites always receive all components (container image, Helm chart, database migration) together, bundle them in one suite.

Create multiple suites when different distribution scenarios exist. If some sites only need the frontend update, create a separate suite containing just the frontend media record. The full suite and the partial suite can coexist, each serving a different distribution need.

## Linking Suites to the Version They Deliver

The productVersion reference on CR Product Suite links to a CR Product Version record. The product reference establishes which product the suite belongs to. This creates a multi-level traceability chain:

```
CR Product Version "OvocoCRM 2.4.0"
  +-- CR Product Suite "CR Release Suite 2.4.0"
        product: CR Core Platform
        suiteStatus: Published
        dmlPath: /releases/crm/2.4.0/
        +-- CR Product Media "CR Platform 2.4.0 Container"
              mediaType: Container Image
              checksum: sha256:abc123...
```

Given a version, you can find all its suites. Given a suite, you can find all its media items. Given a media item, you can find the product and verify the checksum.


# Document Tracking

## CI Relationship Web

The CMDB ties releases to their documentation and DML locations:

```
CR Product Version (OvocoCRM 2.4.0)
  |
  +-> CR Documentation Suite (OvocoCRM 2.4 Documentation)
  |      |
  |      +-> CR Document: OvocoCRM System Design Description
  |      |      documentState: Published
  |      |      url: https://wiki.example.com/cr/specifications/system-spec
  |      |      dmlPath: /dml/ovococrm/docs/specifications/current/
  |      |
  |      +-> CR Document: OvocoCRM 2.4.0 Version Description
  |      |
  |      +-> CR Document: v2.4.0 Release Notes
  |      |
  |      +-> (all other documents in the suite)
  |
  +-> Baseline (CR-PBL-2.4.0-PCA-20260120)
```

Each CR Document CI has a `url` attribute (for linking to the wiki page or artifact location), a `dmlPath` attribute (for the controlled artifact path on the DML), and a `documentState` reference (for tracking its lifecycle stage). The CR Documentation Suite CI groups all documents for a release using its `documents` multi-reference and `suiteStatus` reference.

## CR Document Attributes

The CR Document type in portfolio mode has these attributes defined in `schema-attributes.json`:

| Attribute | Type | Description |
|---|---|---|
| Name | Text | Human-readable name (e.g., "CRM Deployment Runbook") |
| description | Text | Brief description of the document |
| documentType | Reference to Document Type | Specification, Design, Admin Guide, Runbook, etc. |
| documentState | Reference to Document State | Draft, Review, Published, Archived |
| relatedProduct | Reference to CR Product | Links the document to its product |
| productVersion | Reference to CR Product Version | The product version this document applies to |
| filename | Text | Standardized filename on the DML |
| documentDate | Date | Date the document was finalized |
| version | Text | Document version string |
| url | Text | URL to the document (wiki page, artifact location, etc.) |
| dmlPath | Text | Full path to the controlled artifact on the DML |
| documentationSuites | Multi-Reference to CR Documentation Suite | Suites this document belongs to |

## CR Documentation Suite Attributes

The CR Documentation Suite type groups documents for a release:

| Attribute | Type | Description |
|---|---|---|
| Name | Text | Suite identifier (e.g., "OvocoCRM 2.4 Documentation") |
| description | Text | Brief description of the suite |
| suiteVersion | Text | Version identifier for the documentation suite |
| productVersion | Reference to CR Product Version | The release this suite belongs to |
| documents | Multi-Reference to CR Document | All CR Document CIs included in this suite |
| approvalDate | Date | Date the suite was approved for release |
| approvedBy | Text | Person or body that approved the suite |
| releaseNotes | Text | Summary of documentation changes |
| suiteStatus | Reference to Document State | Draft, Review, Published, Archived |
| dmlPath | Text | Directory path on DML for the release docs |

## Document Lifecycle

Documents follow an ITIL-aligned lifecycle where each stage has a defined file format, DML location, and CMDB state. The Document State lookup values in CMDB-Kit are: Draft, Review, Published, Archived.

| Stage | Action | File Format | DML Location | CMDB State |
|---|---|---|---|---|
| Author | Engineer creates document from template | .docx | `/dml/shared/templates/` (template source) | n/a |
| Draft | Working draft stored for collaboration | .docx | `/dml/{product}/docs/drafts/` | Draft |
| Review | Document converted to PDF, submitted to CCB | .pdf | `/dml/{product}/docs/drafts/` | Review |
| Approve | CCB approves, PDF moved to category folder, CMDB CI updated | .pdf | `/dml/{product}/docs/{category}/current/` | Published |
| Release | Approved document copied into release snapshot | .pdf | `/dml/{product}/releases/{version}/docs/` | Published |
| Supersede | New version approved, old version moved to archive | .pdf | `/dml/{product}/docs/{category}/archive/` | Archived |
| Archive | Major version retired, entire release tree archived | .pdf | `/dml/archive/{product}/{major-version}/` | Archived |

```
Template
  +-> DRAFT (.docx in /drafts/)
        +-> Peer Review (updated .docx, same location)
              +-> REVIEW (.pdf in /drafts/)
                    |
                    +- Rejected -> back to DRAFT
                    |
                    +- Approved -> PUBLISHED (.pdf in /current/)
                          |
                          +-> RELEASED (copied to /releases/{version}/docs/)
                          |
                          +-> ARCHIVED (moved to /archive/ when superseded or retired)
```

Key practices:

- Drafts live on the DML, not in the wiki. The wiki page links to the draft, but the draft file itself is on the DML where it can be versioned and eventually promoted.
- When a document is approved, it moves from `/drafts/` to `/docs/{category}/current/`. Update the `dmlPath` attribute on the CR Document CI to the new location.
- When a release is built, the release process copies current documents from their category folders into the immutable release snapshot (`/releases/{version}/docs/`). The CR Documentation Suite CI references the snapshot copies, preserving an exact record of what shipped with that version.


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

For the complete intake SOP, including the artifact type taxonomy, per-type requirements, intake form template, processing steps, and email templates, see [DML Operations](../integration/common/dml-operations.md#intake-processing).


# File Verification Workflow

## Renaming to Standard Conventions

When an artifact arrives in the drop folder, the CM team renames it to match the organization's naming standard. A submission named `build-4521-output.tar.gz` becomes `ovococrm-2.3.1-server.tar.gz`. The original name and the new name are logged for traceability.

## Moving to Controlled Storage

After renaming, the artifact moves from the drop folder to its version directory on the DML. The drop folder is a staging area, not a permanent home. Artifacts left in the drop folder are not controlled and should not be distributed.

## Tracking on the DML

Once the artifact is in its final location, the CM team creates or updates the CR Product Media record in the CMDB. The filename attribute matches the renamed file. The checksum attribute stores the verified hash. The relatedProduct reference links to the correct CR Product, and the mediaType reference classifies the artifact format.


# Media Delivery Workflow

## From Build Artifact to CR Product Media Record

The lifecycle of a deliverable artifact:

1. Development team builds the artifact
2. QA verifies the build passes acceptance tests
3. Release manager approves the artifact for the DML
4. Developer submits the artifact to the DML drop folder with required metadata
5. CM team verifies checksum, renames to standard, moves to version directory
6. CM team creates a CR Product Media record in the CMDB

## Packaging Media Into a CR Product Suite

Once all artifacts for a version are on the DML and registered in the CMDB:

1. CM team creates a CR Product Suite record
2. The suite's productMedia attribute lists all CR Product Media records for this version
3. The suite's productVersion attribute links to the CR Product Version
4. The suite's product attribute links to the CR Product
5. The suiteStatus is set to Published once distribution is authorized

The suite now represents a complete, distributable package.

## Recording the Delivery With a CR Distribution Log Entry

When a suite is sent to a deployment site:

1. A CR Distribution Log record is created with status Requested and the appropriate urgency
2. CM team prepares the media (copies, encrypts if required, packages), updating status to Preparing
3. CM team ships or transfers the media using the specified delivery method, updating status to Shipped
4. The receiving site confirms receipt, updating status to Received
5. After installation and verification, the status progresses through Installed and finally Verified

The CR Distribution Log is the audit trail. It answers: who requested what version for which site, how it was delivered, and when it was verified?


# CR Distribution Log

## The Audit Trail

The CR Distribution Log is the most operationally important type in the DML section. It connects the Product Library (what was released) to the deployment landscape (where it went). Portfolio mode significantly expands this type beyond the Core schema, adding a full lifecycle workflow with request tracking, delivery method classification, media details, and installation verification.

The CR Distribution Log attributes:

```json
"CR Distribution Log": {
  "description": { "type": 0 },
  "deploymentSite": { "type": 1, "referenceType": "CR Deployment Site" },
  "version": { "type": 0 },
  "requestDate": { "type": 0, "defaultTypeId": 4 },
  "requestorPerson": { "type": 1, "referenceType": "Person" },
  "deliveryMethod": { "type": 1, "referenceType": "Delivery Method" },
  "urgency": { "type": 1, "referenceType": "Media Urgency" },
  "preparedByPerson": { "type": 1, "referenceType": "Person" },
  "preparedDate": { "type": 0, "defaultTypeId": 4 },
  "shippedDate": { "type": 0, "defaultTypeId": 4 },
  "receivedDate": { "type": 0, "defaultTypeId": 4 },
  "receiptConfirmedBy": { "type": 0 },
  "mediaType": { "type": 1, "referenceType": "Media Type" },
  "fileName": { "type": 0 },
  "fileSize": { "type": 0 },
  "checksum": { "type": 0 },
  "encryptionMethod": { "type": 0 },
  "carrierTracking": { "type": 0 },
  "status": { "type": 1, "referenceType": "Transfer Status" },
  "installedDate": { "type": 0, "defaultTypeId": 4 },
  "verifiedDate": { "type": 0, "defaultTypeId": 4 },
  "notes": { "type": 0 }
}
```

| Attribute | Type | Description |
|---|---|---|
| description | Text | Brief description of the distribution |
| deploymentSite | Reference to CR Deployment Site | Where the media was sent |
| version | Text | Version string being distributed |
| requestDate | Date | Date the distribution was requested |
| requestorPerson | Reference to Person | Who requested the distribution |
| deliveryMethod | Reference to Delivery Method | How the media was delivered (Network Transfer, Encrypted USB, etc.) |
| urgency | Reference to Media Urgency | Priority of the request (Standard, Expedited, Emergency) |
| preparedByPerson | Reference to Person | Who prepared the media for distribution |
| preparedDate | Date | Date the media was prepared |
| shippedDate | Date | Date the media was shipped or transferred |
| receivedDate | Date | Date the media was received at the site |
| receiptConfirmedBy | Text | Name of the person who confirmed receipt |
| mediaType | Reference to Media Type | Format of the media being distributed |
| fileName | Text | Name of the file or package distributed |
| fileSize | Text | Size of the distributed media |
| checksum | Text | Hash for integrity verification on receipt |
| encryptionMethod | Text | Encryption applied to the media in transit |
| carrierTracking | Text | Tracking number for physical shipments |
| status | Reference to Transfer Status | Current lifecycle state of the transfer |
| installedDate | Date | Date the media was installed at the site |
| verifiedDate | Date | Date installation was verified |
| notes | Text | Additional context or instructions |

The OvocoCRM example data:

```json
{
  "Name": "CR Dist OvocoCRM 2.4.0 to Acme",
  "description": "Distribution of OvocoCRM 2.4.0 to Acme Corp US-East",
  "deploymentSite": "CR Acme Corp US-East",
  "version": "2.4.0",
  "deliveryMethod": "Network Transfer",
  "urgency": "Standard",
  "mediaType": "Container Image",
  "status": "Verified"
}
```

## Transfer Status Lifecycle

The Transfer Status lookup defines the lifecycle stages for each distribution:

| Name | Description |
|---|---|
| Requested | Distribution has been formally requested |
| Approved | Request has been approved for processing |
| Preparing | CM team is preparing media for shipment |
| Shipped | Media has been shipped or transfer initiated |
| In Transit | Media is en route to the destination |
| Received | Site has confirmed receipt of the media |
| Installed | Media has been installed at the site |
| Verified | Installation has been verified and confirmed working |

This lifecycle replaces the simple distributionDate and distributedBy pattern from the Core schema with a full audit trail. Each date attribute (requestDate, preparedDate, shippedDate, receivedDate, installedDate, verifiedDate) captures a specific transition in the lifecycle.

## Delivery Method and Media Urgency

The Delivery Method lookup classifies how media reaches a site:

| Name | Description |
|---|---|
| Network Transfer | Transfer over secure network connection |
| Encrypted USB | Physical USB drive with encryption |
| Secure Download | Authenticated download from secure portal |
| Physical Media | Optical disc or other physical distribution |

The Media Urgency lookup captures the priority of a distribution request:

| Name | Description |
|---|---|
| Standard | Normal processing timeline |
| Expedited | Faster than standard, prioritized handling |
| Emergency | Critical, requires immediate processing |

These lookups provide structured classification where the Core schema relied on free-text fields.

## Why This Record Matters for Compliance and Rollback

CR Distribution Log records answer questions that no other CI type can:

"Which sites have received version 2.4.0?" Query all CR Distribution Log records where version = "2.4.0" and status = "Verified."

"When was the last distribution to CR Acme Corp US-East?" Query CR Distribution Log records where deploymentSite = "CR Acme Corp US-East," sorted by requestDate.

"Which distributions are still in transit?" Query by status = "In Transit" or status = "Shipped."

"Who requested media for sites last month?" Query by requestDate range and requestorPerson.

For rollback planning, CR Distribution Log records tell you which version was previously at a site. If v2.4.0 needs to be rolled back, the log shows that v2.3.1 was distributed before it, and the checksum for that earlier delivery is still on record.

For compliance audits, the log provides a complete chain: from the approved baseline, through the CR Product Suite that was assembled, to the CR Distribution Log that proves delivery, receipt, installation, and verification. Every link in this chain is a CI record in the CMDB.


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

1. Inventory all files against CR Product Media records. Any file without a corresponding CMDB record is uncontrolled.
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

Create the CR Product Media record at the same time the file is placed on the DML. If the record does not exist, the file is uncontrolled.

## Content Classification for Migration

When migrating from legacy systems, classify every item before moving it:

| Content Type | Disposition |
|---|---|
| Controlled artifact (approved document, test report, certification package) | Migrate to DML, rename per naming convention, register as CR Document CI in CMDB |
| Knowledge content (how-to guide, architecture decision, meeting notes) | Migrate to wiki |
| Stale or orphaned content (outdated drafts, duplicates, retired versions) | Archive or delete; do not migrate |

Do not migrate stale content into a new environment. The migration is an opportunity to establish clean tier boundaries.


# End-to-end Example

## OvocoCRM v2.4.0: Build, Package, Distribute, Verify

Here is the complete lifecycle of the OvocoCRM 2.4.0 release in portfolio mode, from build artifact through verified distribution:

Development builds the container image for OvocoCRM Core Platform 2.4.0. SHA-256 checksums are generated.

The release manager approves the build after staging validation. The Release Baseline is approved.

The developer submits the artifact to the DML drop folder with metadata: product CR Core Platform, version 2.4.0, media type Container Image, checksums attached.

The CM team verifies the checksum, renames to standard convention, and moves the artifact to `/releases/crm/2.4.0/`.

A CR Product Media record is created:

```json
{
  "Name": "CR Platform 2.4.0 Container",
  "mediaType": "Container Image",
  "relatedProduct": "CR Core Platform",
  "version": "2.4.0",
  "checksum": "sha256:abc123...",
  "dmlPath": "/releases/crm/2.4.0/"
}
```

A CR Product Suite record is created:

```json
{
  "Name": "CR Release Suite 2.4.0",
  "product": "CR Core Platform",
  "suiteVersion": "2.4.0",
  "productVersion": "OvocoCRM 2.4.0",
  "productMedia": "CR Platform 2.4.0 Container",
  "suiteStatus": "Published",
  "dmlPath": "/releases/crm/2.4.0/"
}
```

Distribution to Acme Corp is initiated:

```json
{
  "Name": "CR Dist OvocoCRM 2.4.0 to Acme",
  "deploymentSite": "CR Acme Corp US-East",
  "version": "2.4.0",
  "deliveryMethod": "Network Transfer",
  "urgency": "Standard",
  "mediaType": "Container Image",
  "status": "Verified"
}
```

The complete record chain:

```
CR Product Version "OvocoCRM 2.4.0"
  +-- CR Product Suite "CR Release Suite 2.4.0"
  |     product: CR Core Platform
  |     suiteStatus: Published
  |     +-- CR Product Media "CR Platform 2.4.0 Container"
  |           mediaType: Container Image
  |           checksum: sha256:abc123...
  |           dmlPath: /releases/crm/2.4.0/
  +-- CR Distribution Log "CR Dist OvocoCRM 2.4.0 to Acme"
        deploymentSite: CR Acme Corp US-East
        deliveryMethod: Network Transfer
        status: Verified
```

Every artifact, every bundle, and every delivery is a queryable CI record. An auditor can trace from the version approval through the media integrity check to the distribution verification. A site operator can verify that the media they received matches the checksum in the CMDB. A CM lead can see at a glance which sites have the release and which distributions are still in transit.
