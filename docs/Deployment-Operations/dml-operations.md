# DML Operations

The Definitive Media Library section covered what the DML is, how it is structured, and how CMDB-Kit models media, suites, and distribution. This section covers the operational processes that keep the DML accurate: document review cycles, intake processing, and the workflows that move artifacts from draft through approval to controlled storage.


# Document Review Reporting

## DRR Workflow

A Document Review Report (DRR) is the formal record of a document review cycle. When a controlled document needs review (new document, major revision, or periodic review), a DRR issue is created to track the review through completion.

The DRR workflow:

1. DRR created: links to the Document CI and the wiki page containing the document
2. Reviewers assigned: subject matter experts, technical leads, and the CM Lead
3. Review period opens: reviewers submit comments (typically tracked as comment threads on the DRR issue or in the wiki page)
4. Comment resolution: the document author addresses each comment (accepted, rejected with rationale, or deferred to next revision)
5. Final review: the CM Lead or document owner verifies all comments are resolved
6. Approval: the DRR is approved, the Document CI's state updates to "Published," and the approved artifact moves to the DML

The DRR creates traceability between the review process and the document's lifecycle in the CMDB. An auditor reviewing a document's history can follow the chain: DRR issue, reviewer comments, dispositions, approval, and the resulting state change on the Document CI.

## Review Cycle Management

Most organizations run document reviews on a time-boxed cycle: two weeks for standard reviews, one week for expedited reviews (minor revisions or urgent documents).

Managing the review cycle means:

- Sending review notifications when the cycle opens
- Tracking which reviewers have submitted comments
- Following up with reviewers who have not responded by the midpoint
- Extending the deadline if critical reviewers need more time
- Closing the review cycle and entering comment resolution

Automation helps here. If your issue tracker supports it, set up notifications when the DRR is created (to alert reviewers), at the midpoint (to remind stragglers), and at close (to trigger comment resolution). The DRR issue's status field tracks where the cycle stands: Open, In Review, Comment Resolution, Approved, or Rejected.

## Comment Resolution Tracking

Every review comment must have a disposition: accepted, rejected, or deferred.

Accepted comments are incorporated into the document. The author updates the document and marks the comment as resolved.

Rejected comments include a rationale explaining why the feedback was not incorporated. The reviewer is notified so they can escalate if they disagree.

Deferred comments are acknowledged as valid but postponed to the next revision cycle. The deferral is documented so the comment is not lost.

Comment resolution tracking matters for audit. An auditor reviewing a document's history should be able to see every review cycle, every comment raised, and every disposition. This trail demonstrates that the document was reviewed by qualified personnel and that feedback was properly handled.

A simple resolution summary table in the DRR issue works well:

| Comment | Reviewer | Disposition | Notes |
|---------|----------|-------------|-------|
| Section 3.2 missing error handling | S. Chen | Accepted | Added in rev 2 |
| Rename API field per naming standard | M. Torres | Accepted | Updated throughout |
| Add performance benchmarks | D. Park | Deferred | Scheduled for next revision cycle |
| Change auth flow to OAuth | E. Rodriguez | Rejected | Out of scope, LDAP required by policy |


# Document Lifecycle on the DML

Documents follow a lifecycle where each stage has a defined location and CMDB state. The DRR process is the gate between "In Review" and "Approved."

| Stage | DML Location | CMDB State |
|-------|-------------|------------|
| Draft | Working directory or drafts folder | Draft |
| In Review | Same location, PDF generated for reviewers | In Review |
| Approved | Moved to controlled category folder | Approved |
| Released | Copied into release snapshot | Approved (released) |
| Superseded | Previous version moved to archive | Superseded |

When a DRR approves a document:

1. The approved PDF moves from the drafts area to its category folder on the DML (e.g., `/dml/{product}/docs/specifications/current/`)
2. The Document CI's state updates to "Approved"
3. The Document CI's `dmlPath` attribute updates to the new location
4. The superseded version (if any) moves to the archive subfolder, and its CI state updates to "Superseded"

When a release is built, the release process copies current documents into an immutable release snapshot. The Documentation Suite CI references these snapshot copies, preserving an exact record of what shipped with that version.

For the full 7-stage document lifecycle model (Author through Archive) with file formats and DML locations at each stage, see [Definitive Media Library, Document Lifecycle](../Schema-Design/definitive-media-library.md#document-lifecycle).


# Intake Processing

## Required Metadata

All submissions to the DML must include required metadata so the CM team can verify, classify, and file artifacts. Incomplete submissions delay processing and risk misclassification of controlled artifacts. This process applies to all deliverables from development teams, vendors, subcontractors, and testers.

CM cannot process a submission without the following:

- **Product** - Which product the artifact belongs to
- **Component** - If applicable, which component
- **Version** - Full version identifier (e.g., X.X.X format)
- **Release designation** - Release label (e.g., GA, RC1, RC2, Patch 1)
- **Artifact type** - What kind of file (see taxonomy below)
- **File manifest** - List of every file being submitted with a brief description
- **Submitter name and role** - Who is submitting and their team
- **Date of submission**
- **Associated work item** - Jira ticket, CCB action item, or change request
- **Verification hashes** - SHA-256 checksums for all binary files (ISOs, ZIPs, JARs, OVAs, MSIs)
- **Classification marking** - If applicable to your organization's data handling policy

## Artifact Type Taxonomy

| Artifact Type | Description |
|---|---|
| Documentation | Controlled documents (PDFs, DOCX) |
| Installation ISO | Full install media |
| Update ISO | Patch or update media |
| Source Code | Source code archives (ZIP, TAR.GZ, Git exports) |
| User Tools | End-user utilities |
| Install Tools | Installation utilities and configuration scripts |
| Test Data | Test input files, sample data sets |
| Test Report | Test execution results and reports |
| SBOM Report | Software Bill of Materials |
| Security Scan Report | Static analysis, SCAP, or vulnerability scan results |
| VM Image | Virtual machine images (OVA, VMDK, OVF) |
| Digest File | Checksum digest files |

## Additional Requirements by Artifact Type

**Documentation:**
- Document type code (e.g., SS, SDD, AG, UG, VD, TR)
- Draft or final status
- Approval date (if final)
- Which previous version this supersedes, if any

**Software ISOs:**
- Installation type (full install or update/patch)
- Target platform or hardware
- Accompanying digest file (required for every ISO)

**Source Code:**
- Repository name
- Branch or tag reference
- Whether build instructions are included

**Test Data and Reports:**
- Test type (functional, security, integration, etc.)
- Test execution date
- Pass/fail summary
- Associated test plan version

**VM Images:**
- Target deployment or customer
- Base product version
- VM format (OVA, VMDK, OVF)
- Network configuration notes

## Submission Methods

### Preferred: Direct DML Drop

For personnel with DML file server access:

- Place files in the designated intake folder for the appropriate product
- Send a notification to the CM team with the completed intake form
- CM will verify checksums, rename files per the naming standard, and move them to the appropriate folder
- Do not create your own folder structure inside the drop folder; CM will organize files according to DML conventions

### Alternative: Physical Media

For removable media (USB drives, optical discs, external drives):

- Label the media with: product, version, date, classification, and submitter name
- Include a printed file manifest inside the media case or attached to the drive
- Deliver to the CM workspace during business hours
- CM will verify checksums and ingest files to the DML
- Media will be returned after successful ingestion or retained per facility procedures

### Alternative: Secure Transfer

For transfers across network boundaries:

- Use the approved secure file transfer mechanism
- Send the manifest and checksums via a separate channel
- CM will verify file integrity upon receipt by comparing checksums
- Notify CM before initiating the transfer so they can prepare the receiving side

## Intake Form Template

```
DML Media Intake Form
======================

Submitter: _______________
Role/Team: _______________
Date: _______________
Work Item Reference: _______________

Product:     _______________
Component:   _______________
Version:     _______________
Release:     [ ] GA  [ ] RC1  [ ] RC2  [ ] Patch___  [ ] Other: ___

Artifact Type(s):
  [ ] Documentation (draft / final)
  [ ] Installation ISO
  [ ] Update ISO
  [ ] Source Code
  [ ] User Tools
  [ ] Install Tools
  [ ] Test Data
  [ ] Test Report
  [ ] SBOM Report
  [ ] Security Scan Report
  [ ] VM Image
  [ ] Digest File
  [ ] Other: _______________

File Manifest:
  Filename                            | Type          | SHA-256 Hash
  ____________________________________|_______________|________________________________
  ____________________________________|_______________|________________________________
  ____________________________________|_______________|________________________________

For Documentation:
  Doc Type Code: ___
  Draft or Final: ___
  Approval Date (if final): ___
  Supersedes Version: ___

For Software ISOs:
  Install Type: [ ] Full  [ ] Update
  Target Platform: ___
  Digest file included: [ ] Yes  [ ] No

For Source Code:
  Repository: ___
  Branch/Tag: ___
  Build instructions included: [ ] Yes  [ ] No

For Test Data/Reports:
  Test Type: ___
  Execution Date: ___
  Pass/Fail Summary: ___
  Test Plan Version: ___

For VM Images:
  Target Deployment: ___
  Base Version: ___
  Format: [ ] OVA  [ ] VMDK  [ ] OVF
  Network Config Notes: ___

Additional Notes:
_______________________________________________
```

## Processing Steps

After receiving a complete submission:

1. **Verify checksums** - Compare all binary file hashes against the provided SHA-256 values. If any checksum fails, stop and contact the submitter.
2. **Validate metadata** - Confirm all required intake form fields are present and consistent with files received.
3. **Rename files** - Apply the organization's naming standard based on product, version, document type, and date.
4. **Create version folder** - If the version folder does not already exist on the DML, create it following the directory structure conventions.
5. **Place files** - Move renamed files to the appropriate version or component folder.
6. **Update the document register** - Add entries for all new or updated artifacts (this may be a master spreadsheet, a CMDB import, or both).
7. **Archive superseded versions** - If the submission replaces an existing file, move the previous version to the archive subfolder. Do not delete superseded files.
8. **Send completion notification** - Email the submitter with the final DML filenames and locations.
9. **Log the intake** - Record in the CM tracking system: submitter, date, product, version, file count.

## Rejection Criteria

CM will not accept submissions that:

- Have **no version number** - Files cannot be filed without a version to determine the correct DML folder
- Have **no classification marking** (if required by policy) - Unmarked submissions will be returned
- Are **missing checksums for binary files** - ISOs, ZIPs, and other binaries require SHA-256 hashes for integrity verification
- Have **no submitter identification** - Anonymous submissions cannot be processed
- **Cannot be associated with a product and version** - Files without a valid DML destination are rejected
- Are **missing digest files for ISOs** - Software ISOs require an accompanying digest file

Rejected submissions are returned with a notification identifying the specific deficiencies. Files are held in the intake folder for 30 days before removal.

## Email Templates

### Acknowledgment (on receipt)

```
Subject: [CM] Media Intake Received - {Product} {Version}

{Submitter},

CM has received the following items for {Product} {Version}
({Release Designation}):

  - {filename 1}
  - {filename 2}

We will verify checksums, apply naming standards, and file these
on the DML. You will receive a confirmation once processing is
complete.

Expected turnaround: 1-2 business days.

Regards,
Configuration Management
```

### Incomplete submission

```
Subject: [CM] Action Required - Incomplete Media Submission

{Submitter},

We received files from you on {date} but cannot process them
without the following:

  - {Missing item, e.g., "Version number"}
  - {Missing item, e.g., "SHA-256 checksums for binary files"}

Please reply with the missing information or complete the
attached intake form.

Files will remain in the intake folder for 30 days.

Regards,
Configuration Management
```

### Processing complete

```
Subject: [CM] DML Update Complete - {Product} {Version}

{Submitter},

The following items have been verified, renamed, and placed
on the DML:

  Original Filename    | DML Filename           | Location
  ---------------------|------------------------|------------------
  {original_1}         | {dml_name_1}           | {dml_path_1}

All checksums verified. The document register has been updated.

Regards,
Configuration Management
```

## Common Mistakes

| Mistake | Impact | Prevention |
|---|---|---|
| No version number | Cannot file on DML | Always include full version identifier |
| No checksums | Cannot verify integrity | Run `sha256sum` on all binaries before submitting |
| Wrong component name | Filed in wrong folder | Use official component names |
| No document type code | Cannot apply naming standard | Include the doc type code |
| No classification marking | Submission rejected | Mark every file and label every piece of media |
| Missing digest for ISO | ISO held until provided | Always generate and include the digest file |
| No work item reference | Harder to trace | Link to the originating ticket or CCB action |


# Operational Checklists

## DML-CMDB Consistency

Run this check periodically (quarterly or after major releases):

- Every file in a controlled folder on the DML has a corresponding Product Media or Document CI in the CMDB
- Every Product Media CI with an active status has a file at its expected location
- Checksums stored on CMDB records match the actual files on the DML
- No orphaned files exist in drop folders or staging areas

## Document Review Compliance

- Every document with state "Approved" has a completed DRR with all comments resolved
- No document has been in "In Review" state for longer than the organization's review cycle limit
- Deferred comments from previous review cycles are tracked for the next cycle
- The DRR issue links to the correct Document CI and wiki page

## Wiki-DML Boundary

- Wiki pages contain knowledge content only, not approved PDFs or release artifacts
- Controlled artifacts are not stored as wiki attachments
- Wiki pages link to DML artifacts via the `dmlPath` from CMDB CIs

For additional wiki-DML integration patterns and the full boundary table, see [Definitive Media Library, What Goes Where](../Schema-Design/definitive-media-library.md#what-goes-where).

## Naming and Organization

- All files on the DML follow the organization's naming convention
- Document type codes in filenames match the `documentType` attribute on the CMDB CI
- Files are stored in the correct version and category folders
- No cross-product contamination (artifacts from one product in another's directory)
- Archive folders contain only properly superseded versions
