# Site Deployment Guide

Sanitized extract from operational source documentation. Covers the lifecycle of deployment sites in a multi-product portfolio, from initial customer contact through ongoing operations and upgrades.

These patterns are organized around four themes: cross-system lifecycle management (when O&M uses a different system), handoff patterns between systems and teams, multi-team integration, and the enterprise PMO model.


## Content Integration Plan

The bulk of this WIP content has been integrated into **Part 6: Deployment Lifecycle** as four chapters:

| Chapter | Content Integrated |
|---------|-------------------|
| 06-01 Site Lifecycle and Enterprise Model | Full lifecycle, three-status data model, phase ownership, pipeline schema design, enterprise model |
| 06-02 Pre-deployment Pipeline | Pipeline tracker setup, prospecting and qualification, pipeline management, reporting, automation |
| 06-03 Deployment Handoff | Migration triggers, export/import steps, data mapping, cross-team coordination, go-live |
| 06-04 Upgrade and Distribution Operations | Upgrade campaigns, cross-system notifications, media distribution, version tracking, contact management |

Files: `docs/User-Guide/Part-6-Deployment-Lifecycle/06-01-*.md` through `06-04-*.md`

### Content NOT integrated (remains available for future chapters)

- **05-03 Scaling and Governance extensions** - Cross-team integration patterns and cross-system synchronization patterns were partially covered in Part 6 from the operational perspective. The governance perspective (governance bodies, audit patterns, formal sync policies) could extend 05-03 in a future pass.
- **Air-gapped deployment technical mechanics** - The organizational and process aspects of cross-network operations are in Part 6. The technical mechanics (how to physically transfer data across air gaps) remain proposed as a separate chapter. See `docs/wip/02-03-Air-Gapped-Deployment-PROPOSED.md`.

### Relationship to Existing Chapters

- **02-03 Designing Site Deployments** stays in Part 2. It covers the schema design decisions (two-record pattern, attributes, environment types). Part 6 cross-references it for schema details.
- **04-05 DML Operations** stays in Part 4. It covers media intake (receiving artifacts into the DML). Part 6 covers media distribution (sending artifacts out to sites). Complementary, not overlapping.
- **05-01 Portfolio and Shared Services** stays in Part 5. It covers governance of a multi-product schema. Part 6 chapter 1 covers who owns which lifecycle phase, which is operational, not governance.


---


# Sanitized Source Extract

The content below is the sanitized operational material organized by topic. Section headers correspond to the content integration plan above.


# Site Lifecycle

Every deployment site progresses through these phases. The first two phases may be managed in a separate pipeline tracker by the sales and business development team. The remaining phases are managed in the production CMDB by the CM and engineering teams.

```
Pipeline Tracker
------------------------------------------------------

PRE-PLANNING
  Prospecting        Initial contact and interest assessment
  Requirements       Gathering requirements, estimate development
  Funding            Awaiting budget approval
  On Hold            Blocked by external dependency

PLANNING
  Procurement        Hardware and software being ordered
  Site Survey        Physical and network site assessment
  Engineering        Configuration and design work
  Security Review    Security authorization process

                -- migration to production CMDB --

Production CMDB
------------------------------------------------------

DEPLOYMENT
  Ready to Install   All prerequisites complete
  Installation       Active installation in progress
  Testing            Security assessment and functional testing
  Go Live            Cutover to production

OPERATIONAL
  Operational        Normal operations
  Sustainment        Ongoing maintenance and support
  Upgrade Planning   Planning next version upgrade

CLOSED
  Decommissioned     Site no longer active
```

## Site Status vs Workflow Status vs Upgrade Status

These three attributes track different things:

| Attribute | Purpose | Example Values |
|-----------|---------|----------------|
| Site Status | Operational availability of the site | Planning, Installing, Operational, Suspended, Retired |
| Workflow Status | Current phase in the deployment lifecycle | Prospecting through Decommissioned (17 values) |
| Upgrade Status | Per-release campaign progress at the site | Not Started through Verified (9 values) |

Example combinations:

| Scenario | Site Status | Workflow Status | Upgrade Status |
|----------|-------------|-----------------|----------------|
| New site, ordering hardware | Planning | Procurement | (empty) |
| Installation in progress | Installing | Installation | (empty) |
| Running normally | Operational | Sustainment | Verified |
| Upgrade media shipped | Operational | Upgrade Planning | Media Sent |
| Upgrade installed, not yet verified | Operational | Upgrade Planning | Installed |
| Upgrade complete | Operational | Sustainment | Verified |
| Temporary outage | Operational | Sustainment | (unchanged) |
| Site shutting down | Operational | Decommissioned | (unchanged) |


# Pre-deployment Pipeline

In organizations where sites progress through a lengthy qualification process before deployment, a separate pipeline tracking system manages the early stages. This system may live in a different environment than the production CMDB, with different access controls appropriate for business development staff and customer-facing personnel.

## Pipeline Tracker Setup

The pipeline tracker manages the sales and business development pipeline alongside structured asset records.

Issue types for tracking pipeline work:

| Issue Type | Purpose |
|------------|---------|
| Site Registration | New customer intake, tracks from Prospecting to handoff |
| Site Survey | Physical and network assessment task |
| Security Authorization | Security review and authorization tracking |
| Funding Request | Budget and contract tracking |

Workflow for Site Registration issues:

```
Open -> In Review -> Approved -> In Planning -> Ready for Handoff -> Closed
```

Each Site Registration issue links to the corresponding Deployment Site record in the CMDB. As the issue progresses, the business development team updates the Deployment Site's workflowStatus to match. Use automation rules to auto-link issues to their Deployment Site record on creation and to notify the CM team when an issue reaches "Ready for Handoff."

Use task checklists on Site Registration issues to standardize the intake process. A checklist template for each issue type ensures the team captures all required information before advancing the workflow:

- Site Registration: customer org confirmed, POC identified, product selected, deployment tier determined, seat count estimated
- Site Survey: facility access arranged, network diagram received, rack space confirmed
- Security Authorization: security package submitted, security officer identified, timeline established
- Funding Request: estimate provided, funding vehicle identified, contract reference captured

Use templated responses for standard replies to customers at each workflow stage (acknowledgment of interest, requirements questionnaire, funding status update, handoff notification).

Board view: use a Kanban board with columns matching the pre-planning and planning workflow statuses. This gives the sales team a visual pipeline of all sites in progress. Add a hierarchy overlay that groups sites by product, customer organization, or region for portfolio-level views.

Dashboards for pipeline management:

- Pipeline summary by product
- Sites by workflow status
- Sites awaiting funding
- Stalled sites (no status change in 30+ days)
- Estimated seat counts by stage
- Funding pipeline by fiscal quarter
- Time-in-stage analysis (average days per workflow status)

## Managing the Pipeline

When a new customer expresses interest:

1. Create a Site Registration issue. The checklist template auto-populates the required intake items.
2. Create a Deployment Site record with workflowStatus "Prospecting"
3. Create Organization and Person records if the customer and contact are new
4. Link the issue to the Deployment Site record. Automation can auto-create the link or prompt the rep to select an existing record.
5. Update workflowStatus as the site progresses through pre-planning and planning

When a site reaches "Ready to Install" or the team determines it is ready for deployment handoff, the site is migrated to the production CMDB.

## Prospecting Workflow

The pipeline tracker functions as a lightweight CRM for the portfolio, using structured asset records for data and issues for workflow.

### Initial Contact

When the team identifies a potential customer:

1. Search the CMDB to check if the organization already exists. If not, create an Organization record.
2. Create a Person record for the primary contact with available info (name, email, phone, job title, org reference).
3. Create a Deployment Site record with workflowStatus "Prospecting" and product set to the product of interest. Link the customer org and POC.
4. Create a Site Registration issue. Automation auto-links it to the Deployment Site record. The checklist template populates with intake items. Send the initial outreach response using a templated response.

### Qualifying the Prospect

As the team works the prospect:

- Track all communications using comments on the Site Registration issue. Use threaded comments to keep conversation threads organized by topic (requirements, funding, timeline).
- Advance the Deployment Site workflowStatus as milestones are reached (Prospecting, Requirements, Funding).
- Update the checklist items as information is gathered (deployment tier confirmed, seat count estimated, facility identified).
- If the prospect stalls, set workflowStatus to "On Hold." Automation can flag issues that have not been updated in 30+ days and notify the team lead.
- Log deployment risks identified during the qualification process (facility readiness, funding timeline, security review complexity).

### Pipeline Management

The team lead uses these views to manage the portfolio pipeline:

- Kanban board: all Site Registration issues in columns by workflow status, filtered by product or viewed across the full portfolio
- Hierarchy view: grouping sites by product, then by customer organization. This gives a portfolio roll-up that shows where the effort is concentrated.
- Dashboards: seat count rollups by stage, pipeline value by fiscal quarter, aging analysis for stalled prospects, conversion rates between stages

### Site Survey and Engineering

When a prospect reaches the Planning phase:

- Create a Site Survey issue linked to the Site Registration. The field engineer captures facility details, network topology, and rack space.
- Upload site survey documents and network diagrams to the wiki, using a diagramming tool for editable network and facility layout diagrams.
- Share documents with the customer via a secure file sharing service (site survey questionnaires, requirements documents, estimates).

### Handoff Preparation

When the prospect is funded and ready for deployment:

1. Verify all checklist items on the Site Registration issue are complete
2. Confirm the Deployment Site record has all required fields populated (deployment tier, seat count, implementation type, POC, org, location)
3. Set the Site Registration issue to "Ready for Handoff." Automation notifies the CM team.
4. Export the site data for migration to the production CMDB (see Pipeline to Production Migration below)
5. Close the Site Registration issue with a templated response summarizing the handoff

### Automation Rules

Configure these automation rules to keep the pipeline healthy:

| Trigger | Action |
|---------|--------|
| Site Registration created | Auto-link to Deployment Site record, assign to rep by product |
| Workflow status changes | Update the linked Deployment Site workflowStatus to match |
| Issue idle 30+ days | Email team lead, add "Stalled" label |
| Issue reaches "Ready for Handoff" | Notify CM team distribution list |
| Checklist 100% complete | Transition issue to "Ready for Handoff" |
| Funding Request approved | Transition linked Site Registration to "In Planning" |


# Pipeline to Production Migration

When a site completes the planning phase in the pipeline tracker and is ready for deployment, the record is migrated to the production CMDB.

## Migration Trigger

A site is ready for migration when:

- Funding is approved
- Hardware is ordered or delivered
- Security authorization is complete (or in parallel with installation)
- The team sets the Site Registration issue to "Ready for Handoff"

## Migration Steps

Export from the pipeline tracker:

1. Export the Deployment Site record as JSON. Use a script to extract the record and its linked Organization, Location, and Person records in one operation.
2. Export any new Organization, Location, or Person records that do not yet exist in the production CMDB
3. Package as JSON files matching the production import format

Import to the production CMDB:

1. Import new Organization, Location, and Person records first (dependencies)
2. Route the Deployment Site record to the correct product-specific type (CR/AN Deployment Site) based on the product field, and set workflowStatus to "Ready to Install"
3. Set siteStatus to "Installing"
4. Add production-only fields: productVersion (target version reference), engineering details
5. Run the import tool to push to the production CMDB

Post-migration:

1. The business development team closes the Site Registration issue with a templated response summarizing the handoff
2. The pipeline Deployment Site record is marked as "Handed Off" (or removed, depending on retention policy)
3. The CM team picks up the site in the production CMDB at "Ready to Install" and manages it through the deployment and operational phases

## Data Mapping

Most fields transfer directly. These require attention during migration:

| Pipeline Field | Production Field | Notes |
|----------------|-----------------|-------|
| product (text) | product (reference) | Routes the record to the correct type: CR/AN Deployment Site |
| sitePOC (Person) | sitePOC (Person) | Verify Person record exists in production |
| customerOrganization | customerOrganization | Verify Org exists in production |
| workflowStatus | workflowStatus | Set to "Ready to Install" on import |
| siteStatus | siteStatus | Set to "Installing" on import |
| (not in pipeline) | productVersion | Set to target version in production |
| (not in pipeline) | targetVersion | Set if upgrade is planned |
| deploymentNotes | deploymentNotes | Carry over sales notes for engineering context |


# Upgrade Campaign Management

When a new product version is released, the CM team runs an upgrade campaign to roll it out across all eligible sites. Each site progresses through the Upgrade Status lifecycle independently.

## Upgrade Status Lifecycle

```
Not Started         Site identified for upgrade, no action yet
    |
Media Requested     Site has formally requested upgrade media
    |
Media Sent          Media shipped (physical) or transferred (electronic)
    |
Media Received      Site confirmed receipt of media
    |
Installation        Install date coordinated with site
Scheduled
    |
Installing          Upgrade installation in progress at site
    |
Installed           Software installed, pending verification
    |
Verified            Upgrade verified and operational
```

If an upgrade fails, the site may be set to "Rolled Back" and a new campaign entry created.

## Running an Upgrade Campaign

For each target site:

1. Set the site's Workflow Status to "Upgrade Planning"
2. Set targetVersion to the new product version
3. Set upgradeStatus to "Not Started"
4. As the site progresses, update upgradeStatus at each stage
5. When verified, update productVersion to the new version, clear targetVersion, move previousVersion to the old version, and set Workflow Status back to "Sustainment" or "Operational"

## Tracking Campaign Progress

Use CMDB filters to get a campaign dashboard:

| Filter | Purpose |
|--------|---------|
| upgradeStatus != Verified, targetVersion = X | Sites still in progress for version X |
| upgradeStatus = Not Started | Sites that need initial outreach |
| upgradeStatus = Installed, verifiedDate is empty | Sites pending verification |
| workflowStatus = Upgrade Planning | All sites in upgrade cycle |

## Upgrade Notifications via External System

When the production CMDB is on an isolated network and cannot send emails directly to site contacts, a separate system on the external-facing network handles outbound upgrade communications.

### Upgrade Notification Issue

When the CM team kicks off an upgrade campaign, they create a matching Upgrade Notification issue in the external-facing tracker. This issue drives all site communications for the campaign.

| Field | Value |
|-------|-------|
| Issue type | Upgrade Notification |
| Summary | [Product] [Version] Upgrade Campaign |
| Description | Release notes summary, upgrade instructions link, support contact |
| Labels | Product name, version number |

Create sub-tasks under the Upgrade Notification for each site that needs to be contacted. This gives per-site tracking of who has been notified, who has responded, and who needs follow-up.

### Email Sequence

Use automation to send templated emails at each stage:

| Timing | Email | Template Content |
|--------|-------|------------------|
| Campaign start | Initial notification | New version available, key improvements, action required |
| +7 days if no response | First reminder | Follow-up on upgrade availability, request acknowledgment |
| +14 days if no response | Second reminder | Escalation notice, CC site's parent org POC |
| Media shipped or transferred | Shipping notification | Delivery method, expected arrival, tracking or transfer ID |
| +14 days after ship, no receipt confirmed | Receipt check | Confirm delivery, report issues |
| +30 days after receipt, not installed | Installation reminder | Scheduled install date request, offer support |

### Automation Rules

| Trigger | Action |
|---------|--------|
| Upgrade Notification sub-task created | Send initial notification email to site POC |
| Sub-task idle 7 days in "Notified" status | Send first reminder, add "Reminder Sent" label |
| Sub-task idle 14 days in "Notified" status | Send second reminder, CC parent org POC |
| Site POC replies or sub-task moved to "Acknowledged" | Stop reminder sequence |
| Sub-task moved to "Media Sent" | Send shipping notification with delivery details |
| Sub-task in "Media Sent" 14+ days | Send receipt confirmation request |
| Sub-task in "Media Received" 30+ days | Send installation reminder |
| Sub-task moved to "Verified" | Send completion confirmation, close sub-task |

### Sub-task Workflow

```
Created -> Notified -> Acknowledged -> Media Sent -> Media Received -> Installed -> Verified -> Closed
```

The CM team updates the sub-task status on the external tracker as they update the corresponding upgradeStatus in the production CMDB. In air-gapped environments, these two systems are kept in sync manually.

### Campaign Reporting

The Upgrade Notification issue and its sub-tasks give the team an external-facing view of campaign progress:

- How many sites have been notified vs acknowledged vs completed
- Which sites are not responding (need phone call or escalation)
- Average time from notification to installation across the portfolio


# Media Distribution Lifecycle

Every media delivery to a site is tracked as a distribution log record. In a multi-product environment, each product has its own Distribution Log type. All share the same field structure, but each has a product-specific deploymentSite reference.

## Choosing the Correct Type

Use the type that matches the product being delivered:

| Product | Distribution Log Type | Deployment Site Reference |
|---------|----------------------|---------------------------|
| OvocoCRM | CR Distribution Log | CR Deployment Site |
| OvocoAnalytics | AN Distribution Log | AN Deployment Site |

## Distribution Log Workflow

```
Request received (requestDate, urgency)
    |
Media prepared (preparedBy, preparedDate, mediaType)
    |
Media shipped or transferred (shippedDate, deliveryMethod)
    |
Site confirms receipt (receivedDate, receiptConfirmedBy)
    |
Site installs media (installedDate)
    |
CM team verifies installation (verifiedDate)
```

The status field tracks overall progress. Update it as the record moves through the workflow: Requested, Preparing, In Transit, Pending, Downloaded, Received, Verified, Completed.

## Creating a Distribution Log Record

Naming convention: `[Site] [Product] [Version] [Description]`. Examples: "Acme Corp US-East CR 2.4.0 Media", "Globex West AN 1.2.0 Tools".

| Field | Type | Source |
|-------|------|--------|
| Name | text | Record name following the naming convention above |
| deploymentSite | reference | Target deployment site (e.g., "Acme Corp US-East") |
| version | text | Product version string (e.g., "2.4.0") |
| requestDate | date | Date the media was requested |
| requestor | text | Name of the person who requested the media |
| requestorPerson | reference | Person record for the requestor (optional, for cross-referencing) |
| requestorOrg | text | Requesting organization name |
| urgency | reference | Media Urgency lookup: Routine, Priority, or Emergency |
| deliveryMethod | reference | Delivery Method lookup: Secure File Transfer, Encrypted Physical Media, or Direct Download |
| preparedBy | text | Name of the person who prepared the media |
| preparedByPerson | reference | Person record for the preparer (optional) |
| preparedDate | date | Date media package was built |
| mediaType | reference | Media Type lookup: Physical Disc Set, ISO, Encrypted USB, OVA, etc. |
| mediaCount | integer | Number of media items in the shipment |
| fileName | text | File name for electronic transfers |
| fileSize | text | File or media size (e.g., "4.2 GB") |
| checksum | text | Integrity hash for verification |
| checksumSHA256 | text | SHA-256 hash for verification |
| encryptionMethod | text | Encryption details (e.g., "AES-256 encrypted archive") |
| passwordSentSeparately | boolean | true if password sent via separate channel |
| shippedDate | date | Date media was sent or file was uploaded |
| carrierTracking | text | Carrier tracking number for physical shipments |
| tamperSealId | text | Tamper-evident seal identifier for physical shipments |
| transferId | text | Transfer service claim or reference ID for electronic transfers |
| receivedDate | date | Date site confirmed receipt |
| receiptConfirmedBy | text | Person who confirmed receipt at the site |
| installedDate | date | Date site installed the media |
| verifiedDate | date | Date CM team verified installation |
| status | reference | Transfer Status lookup: Requested, Preparing, In Transit, Pending, Downloaded, Verified, Received, Completed, Archived, or Failed |
| notes | text | Free-text notes (shipping addresses, special instructions, issues) |

Not every field is required. At minimum, provide Name, deploymentSite, version, deliveryMethod, and status. Add dates, tracking numbers, and file details as they become available during the workflow.

## Delivery Methods

| Method | When to Use |
|--------|-------------|
| Secure File Transfer | Standard electronic transfer, most common |
| Encrypted Physical Media | Sites without electronic transfer access, large media sets, or per-site security requirements |
| Direct Download | Self-service download from an authorized repository |

## Media Risk Flags

Monitor for these conditions:

| Condition | Action |
|-----------|--------|
| Media shipped > 14 days ago, no receivedDate | Contact site to confirm delivery |
| receivedDate set > 30 days ago, no installedDate | Investigate delay (personnel change, security hold, hardware issue) |
| installedDate set > 14 days ago, no verifiedDate | Schedule verification with site |


# Site Version Tracking

Each deployment site tracks three version references:

| Field | Purpose |
|-------|---------|
| productVersion | Currently installed and operational version |
| targetVersion | Version being deployed or planned next |
| previousVersion | Last version before current upgrade |

## Version Parity Report

Filter all deployment sites by productVersion to see how many sites are on each version. Sites on older versions that are not in "Upgrade Planning" workflow may need attention.

| Query | Meaning |
|-------|---------|
| productVersion != latest, workflowStatus != Upgrade Planning | Sites behind on upgrades with no plan |
| productVersion = latest, upgradeStatus = Verified | Sites confirmed on latest |
| targetVersion is set, upgradeStatus = Not Started | Upgrade planned but not started |


# Contact Management

Each deployment site has a sitePOC (Person reference) as the primary point of contact.

## Role Types

Sites may have multiple contacts in different roles:

| Role | Responsibility |
|------|---------------|
| Customer Project Lead | Customer-side lead for the deployment |
| Primary Site Lead | Day-to-day site operations lead |
| Site Technical Lead | Technical configuration and troubleshooting |
| Site Support Admins | System administrators at the site |
| Network Admins | Network configuration and connectivity |
| Security Officer | Security assessments and authorization |
| Help Desk | End-user support |

Only the Primary Site Lead or Customer Project Lead is set as the sitePOC on the Deployment Site record. Other contacts are tracked as Person records with appropriate roles.

## Keeping Contacts Current

- When a site reports a personnel change, update the Person record and sitePOC reference
- Review governance contact lists quarterly for contact changes
- Flag bounced emails for investigation (personnel may have transferred or departed)
- Governance contacts may have contact info across multiple communication channels
- A community forum where site POCs can self-identify when they rotate to a new position, post questions, and share deployment lessons learned helps maintain current contacts


# Pipeline Schema Reference

Complete reference for the pipeline tracker schema. The pipeline tracker runs a subset of the production CMDB schema focused on the sales pipeline.

## Object Type Hierarchy

```
Pipeline (Root)
+-- Directory
|   +-- Organization                 - Customer orgs, departments, divisions
|   +-- Location                     - Offices, data centers, buildings
|   +-- Person                       - Site POCs with full contact info
+-- Deployment Site                  - Portfolio pipeline (all products in one type)
+-- Lookup Types
    +-- Site Status
    +-- Site Workflow Status
    +-- Site Type
    +-- Deployment Tier
    +-- Implementation Type
    +-- Product Line
    +-- Organization Type
    +-- Department
    +-- Location Type
```

## Reference Data

### Deployment Reference Data

| Object Type | Values |
|-------------|--------|
| Site Status | Planning, Requested, Provisioning |
| Site Type | Operational, Administrative, PMO, Development, Test, Training, Lab, Partner |
| Deployment Tier | Enterprise, Standard, Basic |
| Implementation Type | Full Deployment, Partial Deployment, Hosted |
| Product Line | OvocoCRM, OvocoAnalytics |

### Site Workflow Status

The pipeline tracker uses only the pre-planning and planning values:

| Name | Sort | Category | Description |
|------|------|----------|-------------|
| Prospecting | 10 | Pre-Planning | Initial customer contact and interest assessment |
| Requirements | 20 | Pre-Planning | Gathering requirements and estimate development |
| Funding | 30 | Pre-Planning | Awaiting budget approval and allocation |
| On Hold | 35 | Pre-Planning | Paused due to funding, priority, or other blockers |
| Procurement | 40 | Planning | Hardware and software procurement in progress |
| Site Survey | 50 | Planning | Site survey and facility assessment |
| Engineering | 60 | Planning | Technical design and engineering documentation |
| Security Review | 70 | Planning | Security authorization process |

### Directory Reference Data

| Object Type | Values |
|-------------|--------|
| Organization Type | Enterprise, Division, Department, Subsidiary, Partner, Vendor |
| Department | Engineering, Operations, Sales, Finance, Support, Security, Executive |
| Location Type | Headquarters, Office, Data Center, Branch Office, Remote Site, Lab |

## Deployment Site Attributes

Portfolio-level pipeline type covering all products. During migration to the production CMDB, records are routed to the product-specific type (CR/AN Deployment Site).

| Display Name | Field Name | Type |
|---|---|---|
| Description | description | Text |
| Product | product | Text |
| Site Status | siteStatus | Reference (Site Status) |
| Workflow Status | workflowStatus | Reference (Site Workflow Status) |
| Site Type | siteType | Reference (Site Type) |
| Deployment Tier | deploymentTier | Reference (Deployment Tier) |
| Implementation Type | implementationType | Reference (Implementation Type) |
| Product Line | productLine | Reference (Product Line) |
| Customer Organization | customerOrganization | Reference (Organization) |
| Primary Location | primaryLocation | Reference (Location) |
| Site POC | sitePOC | Reference (Person) |
| Site Name | siteName | Text |
| Seat Count | seatCount | Integer |
| Address | address | Text |
| Deployment Notes | deploymentNotes | Text |

## Pipeline to Production Data Mapping

| Pipeline Field | Production Field | Migration Notes |
|----------------|-----------------|-----------------|
| product (text) | product (reference) | Routes to CR/AN Deployment Site |
| siteStatus | siteStatus | Set to "Installing" |
| workflowStatus | workflowStatus | Set to "Ready to Install" |
| sitePOC (Person) | sitePOC (Person) | Verify Person exists in production |
| customerOrganization | customerOrganization | Verify Org exists in production |
| (not in pipeline) | productVersion | Set to target version in production |
| (not in pipeline) | targetVersion | Set if upgrade is planned |
| All other fields | Same name | Transfer directly |
