# Upgrade and Distribution Operations

Once a site is operational, steady-state management takes over: rolling out new versions, tracking media deliveries, maintaining version parity across the portfolio, and keeping site contacts current. These activities repeat with each release cycle and form the operational backbone of a deployment program.

This section covers the four recurring operations: upgrade campaigns, media distribution, version tracking, and contact management. Each has its own lifecycle, its own records, and its own dashboards, but they work together. An upgrade campaign triggers media distribution, which updates version tracking, which informs the next campaign.


# Upgrade Campaign Management

When a new CR Product Version is released, the CM team runs an upgrade campaign to roll it out across all eligible CR Deployment Sites. Each site progresses through the Upgrade Status lifecycle independently, at its own pace, based on site-specific scheduling, personnel availability, and operational constraints.

## Upgrade Status Lifecycle

The upgradeStatus attribute on the CR Deployment Site references the Upgrade Status lookup type:

```
Not Started              Site identified for upgrade, no action yet
    |
Media Requested          Site has formally requested upgrade media
    |
Media Sent               Media shipped (physical) or transferred (electronic)
    |
Media Received           Site confirmed receipt of media
    |
Installation Scheduled   Install date coordinated with site
    |
Installing               Upgrade installation in progress at site
    |
Installed                Software installed, pending verification
    |
Verified                 Upgrade verified and operational
```

If an upgrade fails, the site may be set to "Rolled Back" and a new campaign entry created for a retry. Rolled Back is a terminal state for that campaign attempt, not a step in the normal progression.

## Running a Campaign

For each target CR Deployment Site in the campaign:

1. Set the site's workflowStatus to "Upgrade Planning" (Site Workflow Status reference).
2. Set targetVersion to the new CR Product Version record.
3. Set upgradeStatus to "Not Started" (Upgrade Status reference).
4. As the site progresses through the upgrade, update upgradeStatus at each stage.
5. When the upgrade is verified:
   - Update productVersion to the new version
   - Move the old version to previousVersion
   - Clear targetVersion
   - Set upgradeStatus to "Verified"
   - Set workflowStatus back to "Sustainment" or "Operational"

Step 5 is important to get right. Updating productVersion before verification creates a false record. The version fields should reflect reality: productVersion is what is actually running, not what was recently installed.

## Campaign Tracking Dashboards

Use CMDB filters to monitor campaign progress:

| Filter | Purpose |
|--------|---------|
| upgradeStatus is not "Verified" and targetVersion equals the campaign version | Sites still in progress for this campaign |
| upgradeStatus equals "Not Started" | Sites that need initial outreach |
| upgradeStatus equals "Installed" and verifiedDate is empty | Sites pending verification |
| workflowStatus equals "Upgrade Planning" | All sites currently in an upgrade cycle |

A campaign summary dashboard shows the distribution of sites across upgrade statuses for a given target version. At a glance, the campaign manager can see how many sites have been contacted, how many have received media, how many are installed and waiting for verification, and how many are complete.

## Cross-system Notification for Air-gapped Environments

When the production CMDB runs on an isolated network that cannot send emails directly to site contacts, a separate system on the external-facing network handles outbound upgrade communications. This creates a two-system coordination pattern: the CMDB tracks the authoritative upgrade status, and the external tracker drives site communications.

### Upgrade Notification Issues

When the CM team kicks off an upgrade campaign, they create a matching Upgrade Notification issue in the external-facing tracker:

| Field | Value |
|-------|-------|
| Issue type | Upgrade Notification |
| Summary | [Product] [Version] Upgrade Campaign |
| Description | Release notes summary, upgrade instructions link, support contact |
| Labels | Product name, version number |

Create sub-tasks under the Upgrade Notification for each site that needs to be contacted. Each sub-task represents one site and tracks that site's communication and response status independently.

### Sub-task Workflow

```
Created -> Notified -> Acknowledged -> Media Sent -> Media Received -> Installed -> Verified -> Closed
```

The CM team updates the sub-task status on the external tracker as they update the corresponding upgradeStatus in the production CMDB. In air-gapped environments, these two systems are kept in sync manually. The external tracker drives the communications; the production CMDB remains the authoritative record.

### Email Sequencing

Use automation on the external tracker to send templated emails at each stage:

| Timing | Email | Content |
|--------|-------|---------|
| Campaign start | Initial notification | New version available, key improvements, action required |
| 7 days if no response | First reminder | Follow-up on upgrade availability, request acknowledgment |
| 14 days if no response | Second reminder | Escalation notice, CC site's parent organization POC |
| Media shipped or transferred | Shipping notification | Delivery method, expected arrival, tracking or transfer ID |
| 14 days after ship, no receipt confirmed | Receipt check | Confirm delivery, report issues |
| 30 days after receipt, not installed | Installation reminder | Scheduled install date request, offer support |

The escalation at 14 days (CC to the parent organization POC) is intentional. Sites that do not respond to direct communication often respond when their chain of command is included.

### Automation Rules for Upgrade Communications

| Trigger | Action |
|---------|--------|
| Upgrade Notification sub-task created | Send initial notification email to site POC |
| Sub-task idle 7 days in "Notified" status | Send first reminder, add "Reminder Sent" label |
| Sub-task idle 14 days in "Notified" status | Send second reminder, CC parent organization POC |
| Site POC replies or sub-task moved to "Acknowledged" | Stop reminder sequence |
| Sub-task moved to "Media Sent" | Send shipping notification with delivery details |
| Sub-task in "Media Sent" 14 or more days | Send receipt confirmation request |
| Sub-task in "Media Received" 30 or more days | Send installation reminder |
| Sub-task moved to "Verified" | Send completion confirmation, close sub-task |

### Campaign Reporting From the External Tracker

The Upgrade Notification issue and its sub-tasks give the team an external-facing view of campaign progress:

- How many sites have been notified, acknowledged, and completed
- Which sites are not responding (candidates for phone call or escalation)
- Average time from notification to installation across the portfolio


# Media Distribution Tracking

Every media delivery to a site is tracked as a Distribution Log record. The Distribution Log creates an audit trail from request through verification, capturing who requested the media, how it was delivered, when the site received it, and when the installation was verified.

In a multi-product environment, each product has its own Distribution Log type. All share the same field structure, but each has a product-specific CR Deployment Site reference:

| Product | Distribution Log Type | Deployment Site Reference |
|---------|----------------------|---------------------------|
| OvocoCRM | CR Distribution Log | CR Deployment Site |
| OvocoAnalytics | AN Distribution Log | AN Deployment Site |

## Distribution Log Workflow

```
Request received     (requestDate, urgency)
    |
Media prepared       (preparedByPerson, preparedDate, mediaType)
    |
Media shipped        (shippedDate, deliveryMethod)
    |
Site confirms receipt (receivedDate, receiptConfirmedBy)
    |
Site installs media  (installedDate)
    |
CM team verifies     (verifiedDate)
```

The status field references the Transfer Status lookup and tracks overall progress through these values: Requested, Approved, Preparing, Shipped, In Transit, Received, Installed, or Verified. Update the status as the record moves through the workflow.

## Creating Distribution Log Records

Use the naming convention: `[CR Prefix] [Site] [Version] [Description]`.

Examples:
- "CR Acme Corp US-East 2.4.0 Media"
- "CR GlobalTech US-West 2.4.0 Tools"

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| Name | text | Record name following the naming convention |
| deploymentSite | reference | Target CR Deployment Site |
| version | text | Product version string (e.g., "2.4.0") |
| requestDate | date | Date the media was requested |
| requestorPerson | reference | Person record for the requestor |
| deliveryMethod | reference | Delivery Method lookup: Network Transfer, Encrypted USB, Secure Download, or Physical Media |
| urgency | reference | Media Urgency lookup: Standard, Expedited, or Emergency |
| preparedByPerson | reference | Person record for the preparer |
| preparedDate | date | Date media package was built |
| mediaType | reference | Media Type lookup |
| fileName | text | File name for electronic transfers |
| fileSize | text | File or media size (e.g., "4.2 GB") |
| checksum | text | Integrity hash for verification |
| encryptionMethod | text | Encryption details (e.g., "AES-256 encrypted archive") |
| shippedDate | date | Date media was sent or file was uploaded |
| carrierTracking | text | Carrier tracking number for physical shipments |
| receivedDate | date | Date site confirmed receipt |
| receiptConfirmedBy | text | Person who confirmed receipt at the site |
| installedDate | date | Date site installed the media |
| verifiedDate | date | Date CM team verified installation |
| status | reference | Transfer Status lookup: Requested, Approved, Preparing, Shipped, In Transit, Received, Installed, or Verified |
| notes | text | Free-text notes (shipping addresses, special instructions, issues) |

Not every field is required for every distribution. At minimum, provide Name, deploymentSite, version, deliveryMethod, and status. Add dates, tracking numbers, and file details as they become available during the workflow.

## Delivery Methods

| Method | When to Use |
|--------|-------------|
| Network Transfer | Standard electronic transfer, most common method |
| Encrypted USB | Sites requiring physical media with encryption |
| Secure Download | Self-service download from an authorized repository |
| Physical Media | Optical discs or other physical media for air-gapped sites |

The delivery method affects what tracking fields are relevant. Network transfers and secure downloads use fileName, fileSize, and checksum. Encrypted USB and physical media use carrierTracking and encryptionMethod. All methods should populate the status field with the appropriate Transfer Status value.

For media intake processes (how artifacts enter the DML before distribution), see [DML Operations](dml-operations.md).

## Risk Flags

Monitor for these conditions that indicate a distribution may be stuck:

| Condition | Action |
|-----------|--------|
| Media shipped more than 14 days ago, no receivedDate | Contact site to confirm delivery |
| receivedDate set more than 30 days ago, no installedDate | Investigate delay (personnel change, security hold, hardware issue) |
| installedDate set more than 14 days ago, no verifiedDate | Schedule verification with site |

Build these conditions into dashboard filters or automation rules. A weekly review of flagged distributions catches problems before they become overdue upgrades. The thresholds (14 days, 30 days) are starting points; adjust them based on your organization's typical delivery and installation timelines.


# Site Version Tracking

Each CR Deployment Site tracks three version references that together provide a complete picture of where the site stands in the release lifecycle.

## Three Version References

| Field | Purpose |
|-------|---------|
| productVersion | Currently installed and operational version |
| targetVersion | Version being deployed or planned next |
| previousVersion | Last version before the current upgrade |

These three fields answer different questions:

productVersion answers "What is running at this site right now?" This is the version that has been installed and verified. It changes only when a new version is verified, not when media is shipped or installation begins.

targetVersion answers "What version is this site moving toward?" This is set when an upgrade campaign begins for the site and cleared when the upgrade is verified. A site with a targetVersion but no upgrade progress (upgradeStatus "Not Started") has a planned upgrade that has not yet begun.

previousVersion answers "What was running before the current version?" This provides a rollback reference. If the current version has problems, the team knows what the site was running before and can plan a rollback to that version.

## Version Update Sequence

When an upgrade campaign completes at a site:

1. Verify the new version is operational at the site
2. Copy productVersion to previousVersion (preserving the rollback reference)
3. Set productVersion to the new version (the verified target)
4. Clear targetVersion (the upgrade is complete)
5. Set upgradeStatus to "Verified"

This sequence matters. Copying productVersion to previousVersion before overwriting it ensures the rollback reference is preserved. Setting productVersion last ensures it always reflects verified reality.

## Version Parity Reporting

Filter all CR Deployment Sites by productVersion to see how many sites are on each version. Sites on older versions that are not in "Upgrade Planning" workflow status may need attention.

| Query | Meaning |
|-------|---------|
| productVersion is not the latest and workflowStatus is not "Upgrade Planning" | Sites behind on upgrades with no plan |
| productVersion equals the latest and upgradeStatus equals "Verified" | Sites confirmed on the current release |
| targetVersion is set and upgradeStatus equals "Not Started" | Upgrade planned but not yet started |

A version parity dashboard shows the distribution of sites across product versions. In a healthy portfolio, most sites cluster on the latest version or one version behind. A long tail of older versions indicates a backlog that may require a focused upgrade push.

For organizations with multiple products, version parity reporting should be product-specific. OvocoCRM sites are compared against the latest OvocoCRM version; OvocoAnalytics sites against the latest OvocoAnalytics version. A portfolio-level view aggregates the per-product reports to show overall upgrade health.


# Contact Management

Each CR Deployment Site has a sitePOC (Person reference) as the primary point of contact. Keeping this contact current is essential for upgrade communications, incident response, and day-to-day coordination. A bounced email or an outdated phone number during an urgent upgrade campaign wastes time that the team does not have.

## Role Types at Deployment Sites

Sites may have multiple contacts in different roles:

| Role | Responsibility |
|------|---------------|
| Customer Project Lead | Customer-side lead for the deployment, executive contact |
| Primary Site Lead | Day-to-day site operations lead |
| Site Technical Lead | Technical configuration and troubleshooting |
| Site Support Admins | System administrators at the site |
| Network Admins | Network configuration and connectivity |
| Security Officer | Security assessments and authorization |
| Help Desk | End-user support |

Only the Primary Site Lead or Customer Project Lead is set as the sitePOC on the CR Deployment Site record. The sitePOC is the person the CM team contacts first for upgrade notifications, media distribution, and operational coordination.

Other contacts are tracked as Person records with appropriate role assignments through the Site Personnel Assignment type described in [Designing Site Deployments](../Schema-Design/designing-site-deployments.md). This allows the team to look up specialized contacts when needed (the Network Admin for a connectivity issue, the Security Officer for a compliance question) without overloading the CR Deployment Site record with multiple contact fields.

## sitePOC Attribute vs Full Personnel Assignments

The sitePOC attribute on the CR Deployment Site record provides a quick-reference contact for the most common interaction: "Who do I contact at this site?" It is a single Person reference, deliberately simple.

For sites with complex organizational structures (multiple administrators, specialized technical roles, separate management chains), the Site Personnel Assignment records provide the full picture. These records link Person records to the CR Deployment Site with a role qualifier, enabling queries like "Show me all Network Admins across all sites" or "Who is the Security Officer at CR Acme Corp US-East?"

Most day-to-day operations use the sitePOC. The full personnel assignments are used for specialized queries, bulk communications by role, and organizational reporting.

## Keeping Contacts Current

Contact information decays. People change jobs, transfer to different departments, or leave the organization. The CM team needs proactive processes to keep contacts current.

When a site reports a personnel change, update the Person record immediately. If the departing contact was the sitePOC, update the CR Deployment Site's sitePOC reference to the replacement. Do not leave a sitePOC pointing to someone who is no longer at the site.

Review contact lists quarterly. During the quarterly review, send a brief confirmation request to each sitePOC asking them to verify their contact information and confirm they are still the appropriate point of contact. Sites that do not respond within two weeks should be flagged for follow-up through an alternate channel.

Flag bounced emails for investigation. A bounced email is a strong signal that a contact has changed. When upgrade notification emails or routine communications bounce, the CM team should immediately investigate through an alternate contact at the site or through the customer organization's general contact.

Consider establishing a community forum or distribution list where site POCs can self-identify when they rotate to a new position, post questions about deployment operations, and share lessons learned. This creates a secondary channel for contact updates and reduces the burden on the CM team for discovery.

For organizations with governance contacts that span multiple communication channels (email, phone, secure messaging), maintain a contact card on the Person record that includes all channels. During incidents or urgent upgrade campaigns, having multiple ways to reach a site POC prevents communication failures when one channel is unavailable.
