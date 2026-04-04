# Questions a CMDB Should Answer - Source Set 2

Extracted from AFRL private documentation. Each question is tagged with the source document(s) it derives from.

---

## Product Identity

- What is the unique name and identifier of this configuration item? [CI-selection-guide]
- What CI category does this item belong to (software, hardware, document, location, organization, person)? [CI-selection-guide]
- Does this item satisfy an independent end-use function? [CI-selection-guide]
- Does this item require independent change control, or does it always change in lockstep with its parent? [CI-selection-guide]
- Is this item separately delivered, tested, or maintained? [CI-selection-guide]
- Does the customer or accreditor require distinct visibility of this item? [CI-selection-guide]
- What product does this CI belong to (SecureView, X-ARBITOR, V2CDS, Shared Services)? [CI-selection-guide, A017_SSS]
- What is the parent CI of this item in the product decomposition tree? [CI-selection-guide, A017_SSS]
- Is this a CI or merely an attribute of a parent CI? [CI-selection-guide]
- What lookup types (enumerations, status values) does this CI use, and are those reference data items or CIs themselves? [CI-selection-guide]
- Is this item a product, a product component, a component instance, or a product version? [CI-selection-guide]
- What program does this CI belong to, and what is the program acronym? [A017_SSS]
- Is this a lead program or a sub-program, and what is its parent? [A017_SSS]
- What is the functional and technical description of this program? [A017_SSS]

## Version and Release

- What is the current version of this software product? [CI-selection-guide, RMSIS-integration, JSM-usage-guide]
- What component instances (specific builds with checksums and build dates) are included in this product version? [CI-selection-guide]
- What is the version status of this release (Development, Released, Legacy, Sunset)? [CI-selection-guide, JSM-usage-guide]
- Which product version is currently fielded at a given deployment site? [A017_SSS, JSM-usage-guide]
- Which sites are running a deprecated or legacy version? [JSM-usage-guide]
- What is the release type (Full, Partial, Patch)? [A017_SSS]
- What is the target release date versus the actual release date? [A017_SSS]
- What Jira Fix Version corresponds to this CMDB product version? [A017_SSS, RMSIS-integration]
- What RMSIS baseline corresponds to this product version? [RMSIS-integration, A017_SSS]
- What patches have been applied at a given site for a given version? [A017_SSS]
- What are the supported operating systems and COTS/GOTS dependencies for this release? [A017_SSS]
- What documentation suite ships with this product version? [ITIL-documentation-library]
- What is the checksum (SHA-256) of this component instance or release package? [CI-selection-guide, CM-003_Library_Intake_Process]
- What is the build status of this component instance? [CI-selection-guide]
- What VM templates are associated with this product version? [CI-selection-guide]

## Deployment

- What deployment sites exist for each product, and what is each site's operational status? [CI-selection-guide, JSM-usage-guide, A017_SSS]
- What is the workflow status of a deployment site (Planning, Engineering, Ready to Install, Installing, Operational, Decommissioning)? [JSM-usage-guide]
- What servers, workstations, and gateways are deployed at each site? [CI-selection-guide, JSM-usage-guide]
- What is the serial number, hostname, IP address, and MAC address of each deployed hardware unit? [A017_SSS]
- What hardware model is approved for deployment at each site? [CI-selection-guide]
- What network segments and classification levels exist at each site? [CI-selection-guide, A017_SSS]
- What is the security classification level of a deployment site (Unclassified, Secret, TS-SCI)? [A017_SSS]
- Which organizations are tenants at a given site, and what are their roles? [CI-selection-guide]
- What licenses are allocated to each site? [CI-selection-guide]
- When did a site go live, and what is its active-since date? [JSM-usage-guide]
- What is the server count, workstation count, and seat count at each site? [JSM-usage-guide]
- What content filters are deployed, and what are their current rule sets? [CI-selection-guide]
- What virtual machines (GuestVM, VPNVM) are deployed at each site, and what are their configurations? [CI-selection-guide]
- What is the site type (Operational, Development, Test, Lab, Administrative, PMO, Testbed)? [A017_SSS, JSM-usage-guide]
- What is the ADPE (property) number for each deployed computer? [A017_SSS]
- What is the operational status of each deployed hardware unit (Operational, Training, Stock, Decommissioned)? [A017_SSS]

## Baselines

- What is the current functional baseline (FBL), allocated baseline (ABL), and product baseline (PBL) for each product? [CI-selection-guide, RMSIS-integration, RMSIS-user-procedures-guide]
- At what milestone (SRR, PDR, CDR, TRR, FCA, PCA) was each baseline established? [CI-selection-guide, RMSIS-integration]
- What CIs are included in a given baseline? [CI-selection-guide, RMSIS-integration]
- What requirements are frozen in a given RMSIS baseline? [RMSIS-integration, RMSIS-user-procedures-guide]
- What changed between two successive baselines (added, removed, modified requirements)? [RMSIS-user-procedures-guide]
- What is the status of each baseline (Draft, Pending, Approved, Locked, Superseded)? [RMSIS-integration, RMSIS-user-procedures-guide]
- Who approved each baseline, and when? [RMSIS-user-procedures-guide]
- Has any baselined CI been changed without CCB approval? [Configuration_Management_Theory, RMSIS-integration]
- What is the baseline naming convention, and does each baseline follow it ([Project]-[Version]-[Type]-[Date])? [RMSIS-integration, RMSIS-user-procedures-guide]
- Which baselines have been superseded by newer ones? [RMSIS-user-procedures-guide]
- What RMSIS baseline corresponds to each JSM Assets Product Version and each Jira Fix Version? [RMSIS-integration]

## Dependencies

- What are the formal interface boundaries between CIs? [CI-selection-guide]
- What shared infrastructure (CD2N) is used across multiple products? [CI-selection-guide]
- What external sources (standards, regulations, specifications) drive each requirement? [RMSIS-integration, CM-004_Requirements_Mapping]
- Which requirements trace to DISA STIG, FIPS 140-2, DoD Zero Trust, DoD 8500.01, or NCDSMO CP? [RMSIS-integration]
- What requirements does a given requirement depend on (Depends On links)? [RMSIS-integration, RMSIS-user-procedures-guide]
- What cross-cutting requirements exist that belong to multiple parent capabilities? [RMSIS-integration]
- What Jira Feature or Capability implements a given requirement? [RMSIS-integration]
- What CIs are affected if a given CI changes? [CMDB_vs_Jira_Decision_Framework, CM-002_Change_Request]
- What contract, task order, and CDRLs are associated with each program? [A017_SSS]
- What is the period of performance for each contract and task order? [A017_SSS]
- What software components satisfy a given requirement? [CM-004_Requirements_Mapping]
- What COTS/GOTS dependencies exist for each product version? [A017_SSS]

## People and Responsibility

- Who is the POC for each deployment site, and what are their contact details (commercial phone, DSN, email across NIPR/SIPR/JWICS)? [A017_SSS, JSM-usage-guide]
- What clearance level and status does each person hold? [CI-selection-guide, A017_SSS]
- What training records exist for each person, and are they current? [CI-selection-guide]
- Who is the owner and who is the operator of each deployed hardware unit? [A017_SSS]
- What roles does each POC hold (PMO, User, Admin, Distribution Recipient)? [A017_SSS]
- Who is the CM Lead, and who are the CM Analysts responsible for each product? [CM-003_Library_Intake_Process]
- Who is the CCB chair, and who are the voting members for each CCB (Program and Portfolio)? [CM-002_Change_Request]
- Who approved each change request, and when was the decision made? [CM-002_Change_Request]
- Who processed each library intake, and who confirmed the developer sign-off and PMO acceptance? [CM-003_Library_Intake_Process]
- What competencies are required for each CM role (Librarian, Submitter, Developer POC, PMO POC, CM Lead)? [CM-003_Library_Intake_Process]
- Who is the property custodian for each asset (DoD ID)? [ITAM_Executive_Summary, ITAM_Lifecycle_Data_Attributes]
- What Atlassian user account corresponds to each POC? [A017_SSS]
- Who is the contracting officer and contracting officer representative for each contract? [ITAM_Lifecycle_Data_Attributes]
- What organization does each person belong to, and what is their office symbol? [A017_SSS]

## Documents

- What controlled documents exist for each product, and what is each document's current state (Draft, CCB Review, Approved, Superseded, Archived)? [ITIL-documentation-library, JSM-usage-guide]
- What document type is each document (SS, SVD, SDD, SAD, ICD, TP, TR, SAG, UG, etc.)? [ITIL-documentation-library]
- What is the DML path where the approved artifact is stored? [ITIL-documentation-library]
- What Confluence page provides context for a given controlled document? [ITIL-documentation-library]
- What documents are included in each documentation suite for a given release? [ITIL-documentation-library]
- What is the naming convention for each document, and does it follow the standard pattern ([PROGRAM]-[DOCTYPE]-[VERSION]-[DATE].ext)? [ITIL-documentation-library]
- What classification marking does each document carry? [ITIL-documentation-library, CM-003_Library_Intake_Process]
- When was each document approved, and by whom? [ITIL-documentation-library]
- What document supersedes or is superseded by another document? [ITIL-documentation-library, CM-003_Library_Intake_Process]
- What is the library location and distribution status of each library item? [CM-003_Library_Intake_Process]
- What known issues or distribution restrictions exist for a given library item? [CM-003_Library_Intake_Process]

## Distribution and Media

- What media distributions have been shipped or transferred to each site? [CI-selection-guide, DoDAF_FutureState, JSM-usage-guide]
- What is the status of each distribution (Preparing, Shipped, Delivered, Received, Decrypted)? [DoDAF_FutureState, JSM-usage-guide, A017_SSS]
- Which distributions have been shipped but not yet confirmed as received? [JSM-usage-guide]
- What delivery method was used (Physical Media, DOD SAFE, Secure File Transfer)? [DoDAF_FutureState, CM-001_Media_Request]
- What is the tracking number for each physical shipment? [DoDAF_FutureState, A017_SSS]
- When were passwords sent, and to whom? [DoDAF_FutureState, CM-001_Media_Request]
- Has the site confirmed receipt of the serial number on the package? [DoDAF_FutureState]
- Has the site confirmed successful decryption? [DoDAF_FutureState]
- What encryption was applied (site password, transport password), and what are the encryption parameters? [CM-001_Media_Request]
- What SLA applies to each media request (Standard 5-day, Expedited 2-day, Emergency)? [DoDAF_FutureState, JSM-usage-guide]
- Has the SLA been breached for any open media request? [JSM-usage-guide]
- What media request triggered this distribution record? [DoDAF_FutureState, A017_SSS]
- What companion products and versions were included in this media kit? [JSM-usage-guide]
- What package type was distributed (Full Kit, VLE Only, Upgrade Kit, Patch Kit, Documentation Only)? [CM-001_Media_Request]

## Change Control

- What change requests (CRs) and problem reports (PRs) are currently open for each product? [CMDB_vs_Jira_Decision_Framework, CM-002_Change_Request]
- What is the classification of each change (Class I affecting form/fit/function, or Class II internal)? [RMSIS-integration, CM-002_Change_Request]
- What is the impact code for each CR/PR (1-Critical through 5-Minimal), and who assigned it? [CM-002_Change_Request]
- Which sites are affected by a given change? [CM-002_Change_Request, A017_SSS]
- What baselines are impacted by a given change? [CM-002_Change_Request]
- What is the CCB disposition for each change (Approved, Rejected, Deferred, Tabled)? [CM-002_Change_Request]
- What work plan was created for an approved change, and what is its estimated effort? [CM-002_Change_Request, A017_SSS]
- Has closed-loop verification been completed for each approved change (code matches scope, tests pass, requirements updated, docs updated, CM Lead sign-off)? [RMSIS-integration, CM-002_Change_Request]
- What is the routing path for each CR/PR (Portfolio CCB, Program CCB, PM Approval, Hold, Reject)? [CM-002_Change_Request]
- What is the triage decision and rationale for each change? [CM-002_Change_Request]
- How long did each change take from submission to resolution? [CM-002_Change_Request, Configuration_Management_Theory]
- What duplicate or related CRs/PRs exist for a given issue? [CM-002_Change_Request]

## Assessments and Certifications

- What security assessments (LBSA, SBSA, GAT, VSA, Code Review, Fortify) have been conducted for each product version? [RMSIS-integration, CI-selection-guide]
- What is the status and finding count (CAT I, CAT II, CAT III) for each assessment? [RMSIS-integration]
- What is the NCDSMO baseline status for each product version (Baselined, Pending, Expired)? [RMSIS-integration]
- What is the baseline date and CP version for each NCDSMO certification? [RMSIS-integration]
- What certifications are approaching expiration? [JSM-usage-guide]
- What ATO (Authority to Operate) has been granted for each deployment site, and who is the certifying authority? [RMSIS-integration]
- What is the remediation status for each assessment (findings resolved vs. outstanding)? [RMSIS-integration, CMDB_vs_Jira_Decision_Framework]
- What DISA STIG compliance status applies to each product component? [RMSIS-integration]
- What eMASS ID is associated with each system or security boundary? [ITAM_Executive_Summary, ITAM_Lifecycle_Data_Attributes]

## Requirements Traceability

- What requirements exist for each product, and what is each requirement's current status (Open, Assigned, Review, Approved, Completed, Closed)? [RMSIS-integration, RMSIS-user-procedures-guide, CM-004_Requirements_Mapping]
- What is the version history of each requirement? [RMSIS-integration, RMSIS-user-procedures-guide]
- Which requirements have no linked test cases (untested requirements)? [RMSIS-integration, RMSIS-user-procedures-guide]
- Which requirements have no linked Jira implementation work (unimplemented requirements)? [RMSIS-integration, RMSIS-user-procedures-guide]
- What is the test coverage percentage for each product (requirements with tests / total requirements)? [RMSIS-integration]
- What is the implementation progress for each requirement (Red/Yellow/Green based on linked Jira issue resolution)? [RMSIS-integration]
- What Feature Implementation freeze records exist, and what is each one's frozen RMSIS version, baseline, and date? [RMSIS-integration]
- Has a Feature Implementation record been modified after its freeze date? [RMSIS-integration]
- What requirement type is each requirement (Functional, Non-Functional/Security)? [RMSIS-integration, RMSIS-user-procedures-guide]
- What is the decomposition hierarchy for requirements (Product Goal to Product Function to Derived Requirement)? [RMSIS-integration, RMSIS-user-procedures-guide]
- What verification method is specified for each requirement (Inspection, Analysis, Demonstration, Test)? [CM-004_Requirements_Mapping]
- Which requirements are derived, and what are their parent requirements? [CM-004_Requirements_Mapping]

## IT Asset Lifecycle

- What lifecycle phase is each IT asset in (Request/Initiation, Requirements/Design, Acquisition, Fielding, Monitor, Sunset/Disposal)? [ITAM_Executive_Summary, ITAM_Lifecycle_Data_Attributes]
- What is the acquisition cost, depreciation method, and current valuation of each asset? [ITAM_Executive_Summary, ITAM_Lifecycle_Data_Attributes]
- What is the expected useful life and end-of-life/end-of-service/end-of-support date for each asset? [ITAM_Executive_Summary, ITAM_Lifecycle_Data_Attributes]
- What fund code, WBS element, and program code are associated with each asset? [ITAM_Lifecycle_Data_Attributes]
- What DoDAAC identifies each unit or activity? [ITAM_Lifecycle_Data_Attributes]
- What license type, quantity, metric, and term apply to each software asset? [ITAM_Executive_Summary, ITAM_Lifecycle_Data_Attributes]
- What is the install count and patch level for each software deployment? [ITAM_Lifecycle_Data_Attributes]
- What is the retirement or disposal date and destruction certification for decommissioned assets? [ITAM_Lifecycle_Data_Attributes]
- What is the physical location of each asset (building, floor, room, cabinet, rack position)? [ITAM_Lifecycle_Data_Attributes]
- What is the IUID (Item Unique Identification) for each tracked hardware asset? [ITAM_Lifecycle_Data_Attributes]

## Service Management and Workflows

- What service requests are open, and what queue is each assigned to? [JSM-usage-guide, CMDB_Service_Management_Test_Plan]
- What SLA timers are active on each request, and are any at risk of breach? [JSM-usage-guide, DoDAF_FutureState]
- What request types are available through the service portal (Media Distribution, Change Request, Problem Report, Site Registration, Site Upgrade, Document Request, etc.)? [JSM-usage-guide]
- What permissions does each role have across Jira, JSM Assets, Zephyr, RMsis, and Configuration Manager? [CMDB_Service_Management_Test_Plan]
- What is the first-time acceptance rate for library intake submissions? [CM-003_Library_Intake_Process]
- What is the average intake processing time compared to the 2-business-day target? [CM-003_Library_Intake_Process]
- What quality gates must each library intake pass (Receipt Verified, Content Verified, Developer Confirmed, PMO Accepted)? [CM-003_Library_Intake_Process]
- What automation rules fire on status transitions (media-received-confirmation, change-approval-implementation, etc.)? [JSM-usage-guide]
- What is the confirmation timeout escalation path for media distributions (7-day reminder, 14-day reminder, 21-day escalation)? [DoDAF_FutureState]

## Air-Gapped Operations

- What import method is used for each deployment environment (ScriptRunner, Portable Node.js, cURL/PowerShell, JSM native)? [air-gapped-guide]
- What is the change management flow from Development to Staging (NIPR) to Air-Gapped (SIPR/JWICS)? [air-gapped-guide]
- What cross-domain transfer procedures were followed for each schema/data import? [air-gapped-guide]
- What checksums were verified for transferred files? [air-gapped-guide]
- What credentials and permissions were used for each import operation? [air-gapped-guide]
- What is the load priority order for importing object types and data to maintain referential integrity? [air-gapped-guide]

## Organizational Structure

- What organizations (military units, agencies, contractors) are involved in each program? [CI-selection-guide, A017_SSS]
- What locations and facilities exist, and which sites are at each location? [CI-selection-guide, A017_SSS]
- What is the hierarchy of locations (Installation to Building to Room)? [A017_SSS, ITAM_Lifecycle_Data_Attributes]
- What support teams exist, and what products or services does each team support? [CI-selection-guide]
- What Confluence spaces exist for each product team and cross-product function? [ITIL-documentation-library]
- What is the relationship between the DML (Definitive Media Library), CMS (Configuration Management System), and SKMS (Service Knowledge Management System)? [ITIL-documentation-library]

## Audit and Compliance

- Does the as-built configuration match the as-designed configuration for each CI? [CI-selection-guide, Configuration_Management_Theory]
- Can we produce a complete audit trail showing when each CI was created, modified, baselined, and by whom? [RMSIS-integration, CM-003_Library_Intake_Process]
- What evidence exists that each requirement was verified (test results, inspection records)? [RMSIS-integration]
- What Feature Implementation freeze records prove which specification version was built into which release? [RMSIS-integration]
- Has every controlled document been properly versioned, approved by CCB, and stored on the DML? [ITIL-documentation-library]
- What items were delivered with unknown or undocumented configuration? [Configuration_Management_Theory]
- Have all changes been implemented after CCB approval (no approved-but-unimplemented changes)? [Configuration_Management_Theory]
- What is the BSF (Baseline Submission Form) evidence chain proving complete requirement coverage for certification? [RMSIS-integration]
- How long do engineering change orders take to be approved and released? [Configuration_Management_Theory]
- What percentage of deliverables pass checksum verification on first attempt? [CM-003_Library_Intake_Process]
- What training has each person performing CM functions completed? [Configuration_Management_Theory, CM-003_Library_Intake_Process]
- What EVM baseline maintenance has been performed (Baseline Change Requests, Management Reserve distribution)? [RMSIS-user-procedures-guide]
