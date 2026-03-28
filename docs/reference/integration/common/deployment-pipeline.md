# Pre-deployment Pipeline

Before a site reaches the production CMDB, it passes through a qualification process that may span months. Business development identifies prospects, gathers requirements, secures funding, and coordinates site surveys. This section covers the operational setup and daily management of the pipeline tracker that supports these early lifecycle phases.

The pipeline tracker combines structured asset records (CR Deployment Site, Organization, Person) with issue-based workflows (Site Registration, Site Survey, Security Authorization, Funding Request). The asset records hold the data. The issues drive the work. Together they give the business development team both a CRM-like pipeline view and a task management system for each site.


# Pipeline Tracker Setup

## Issue Types

The pipeline tracker uses four issue types, each representing a distinct category of pre-deployment work:

| Issue Type | Purpose |
|------------|---------|
| Site Registration | New customer intake, tracks from Prospecting through handoff |
| Site Survey | Physical and network site assessment task |
| Security Authorization | Security review and authorization tracking |
| Funding Request | Budget and contract tracking |

Site Registration is the primary issue type. Every prospective site gets one. The other issue types are created as needed and linked to the Site Registration issue, forming a cluster of related work items around each site.

## Workflows

The Site Registration workflow drives the pipeline:

```
Open -> In Review -> Approved -> In Planning -> Ready for Handoff -> Closed
```

As the Site Registration issue progresses, the business development team updates the corresponding CR Deployment Site record's workflowStatus to match the current lifecycle phase. Automation rules (described below) can synchronize this automatically.

Supporting issue types use simpler workflows:

Site Survey: Open, In Progress, Complete.

Security Authorization: Submitted, Under Review, Approved, Denied.

Funding Request: Submitted, Under Review, Approved, Deferred.

## Task Checklists

Use task checklists on each issue type to standardize the intake process. A checklist template ensures the team captures all required information before advancing the workflow.

Site Registration checklist:
- Customer organization confirmed
- Primary point of contact identified
- Product selected
- Deployment tier determined
- Seat count estimated

Site Survey checklist:
- Facility access arranged
- Network diagram received
- Rack space confirmed

Security Authorization checklist:
- Security package submitted
- Security officer identified
- Timeline established

Funding Request checklist:
- Estimate provided
- Funding vehicle identified
- Contract reference captured

## Templated Responses

Configure templated responses for standard customer communications at each workflow stage:

- Acknowledgment of interest (sent when Site Registration is created)
- Requirements questionnaire (sent when site enters Requirements phase)
- Funding status update (sent periodically during the Funding phase)
- Handoff notification (sent when the site is ready for deployment)

Templates reduce response time and ensure consistent messaging across the business development team.

## Board View

Use a Kanban board with columns matching the pre-planning and planning workflow statuses: Prospecting, Requirements, Funding, On Hold, Procurement, Site Survey, Engineering, Security Review, Ready for Handoff. This gives the team a visual pipeline of all sites in progress.

Add grouping or swimlanes by product, customer organization, or region for portfolio-level views. A board grouped by product shows immediately which products have the deepest pipeline. A board grouped by organization shows which customers have multiple sites in progress.

## Dashboards

Configure dashboards for pipeline management:

- Pipeline summary by product, showing count and seat total at each stage
- Sites by workflow status, identifying where sites are concentrating
- Sites awaiting funding, with time-in-stage to flag stalls
- Stalled sites (no status change in 30 or more days)
- Estimated seat counts by stage, giving a forward-looking view of deployment volume
- Funding pipeline by fiscal quarter, supporting budget planning
- Time-in-stage analysis showing average days per workflow status


# Managing the Pipeline

## Creating Records on First Contact

When a new customer expresses interest, the team creates a set of linked records:

1. Search the pipeline tracker to check if the customer organization already exists. If not, create an Organization record with available information (name, type, parent organization if known).
2. Create a Person record for the primary contact: name, email, phone, job title, and organization reference.
3. Create a CR Deployment Site record with workflowStatus set to "Prospecting" and the product field set to the product of interest. Link the customerOrganization and point of contact.
4. Create a Site Registration issue. If automation is configured, the issue auto-links to the CR Deployment Site record. The checklist template populates with intake items. Send the initial outreach using the acknowledgment template.

This four-record pattern (Organization, Person, CR Deployment Site, Site Registration issue) gives the team both the structured data and the workflow tracking from day one.

## Advancing Workflow Status

As the site progresses, the business development representative updates the CR Deployment Site workflowStatus to reflect the current phase. Each status change should be accompanied by a comment on the Site Registration issue explaining the transition (for example, "Requirements confirmed, moving to Funding" or "Security package submitted, waiting on customer security office").

The workflow status values for the pipeline are: Prospecting, Requirements, Funding, On Hold, Procurement, Site Survey, Engineering, and Security Review. Each value corresponds to a pre-planning or planning phase described in [Site Lifecycle and Pipeline](site-lifecycle.md).

## Linking Issues to Asset Records

Every Site Registration issue should be linked to its corresponding CR Deployment Site record. This link enables two capabilities: navigating from the issue to the asset record (to see the site's current data) and navigating from the asset record to the issue (to see the workflow history and communications).

Supporting issues (Site Survey, Security Authorization, Funding Request) are linked to the parent Site Registration issue. This creates a hierarchy: the CR Deployment Site record is the data anchor, the Site Registration issue is the workflow anchor, and the supporting issues are subtasks under the workflow.


# Prospecting and Qualification

## Initial Contact

When the team identifies a potential customer:

1. Search the pipeline tracker to check if the organization already exists. Organizations that have previously been contacted for other products may already have records.
2. Create a Person record for the primary contact with available information: name, email, phone, job title, and organization reference.
3. Create a CR Deployment Site record with workflowStatus "Prospecting" and the product set to the product of interest. Link the customerOrganization and point of contact.
4. Create a Site Registration issue. Automation auto-links it to the CR Deployment Site record. The checklist template populates with intake items. Send the initial outreach using the acknowledgment template.

For organizations that already exist (perhaps from a prior engagement with a different product), skip the Organization creation step. Link the new CR Deployment Site to the existing Organization record. This maintains the portfolio view: one organization, multiple potential deployment sites across products.

## Qualifying the Prospect

As the team works the prospect through the pipeline:

Track all communications using comments on the Site Registration issue. Use threaded comments to keep conversation topics organized (requirements discussion, funding timeline, technical questions). This creates an audit trail that carries through to handoff.

Advance the CR Deployment Site workflowStatus as milestones are reached. Moving from Prospecting to Requirements signals that the customer has confirmed interest and the team is gathering detailed needs. Moving from Requirements to Funding signals that the team has a clear picture of what the customer needs and is waiting for financial commitment.

Update the checklist items as information is gathered. Checking off "deployment tier determined" and "seat count estimated" gives the team and management visibility into how complete each prospect's qualification is.

If the prospect stalls, set workflowStatus to "On Hold." Stalled prospects are not lost opportunities but paused ones. Record the reason for the hold in a comment on the Site Registration issue. Automation can flag issues that have not been updated in 30 or more days and notify the team lead for follow-up.

Log deployment risks identified during the qualification process. Facility readiness concerns, uncertain funding timelines, complex security review requirements, and other risks should be captured early so engineering can plan accordingly.

## Handling Stalls

Sites stall for many reasons: customer budget cycles, organizational changes, security review delays, or shifting priorities. The pipeline tracker should make stalls visible rather than letting them disappear into the backlog.

Configure a filter or dashboard widget that highlights sites with no status change in 30 or more days. The team lead reviews these weekly and either re-engages the customer, escalates within the organization, or formally places the site on hold with a documented reason.

Sites that remain on hold for an extended period (90 or more days, depending on organizational policy) may be candidates for closure. Closing a stalled prospect does not delete the records. It sets the Site Registration issue to Closed with a resolution of "Deferred" and preserves the Deployment Site record in case the opportunity resurfaces.


# Site Survey and Engineering

When a prospect reaches the Planning phase, the focus shifts from business development to technical preparation.

## Facility Assessment

Create a Site Survey issue linked to the Site Registration. The field engineer (or a remote assessment team) captures facility details:

- Physical environment: rack space, power, cooling, physical security
- Network topology: connectivity, bandwidth, firewall rules, VPN requirements
- Infrastructure readiness: existing hardware, virtualization platform, storage capacity
- Personnel: local technical contacts, availability for installation support

The Site Survey issue tracks the assessment through completion. Its checklist ensures all required information is gathered before the engineering team begins their design work.

## Network Diagrams and Documents

Upload site survey documents and network diagrams to the team's documentation space. Use an editable diagramming tool for network and facility layout diagrams so they can be updated as the design evolves.

Share relevant documents with the customer through a secure file sharing service when needed (site survey questionnaires, requirements documents, preliminary estimates). Track what has been shared using comments on the Site Registration issue.

## Engineering Handoff

When the site survey is complete, engineering takes over for the technical design. The transition happens naturally through the workflow: the Site Survey issue closes, and the Deployment Site workflowStatus advances to "Engineering." The engineering team works from the survey results and customer requirements to produce the deployment design.

Engineering may create additional issues for specific design tasks (network configuration, security hardening, performance sizing) linked to the parent Site Registration.


# Handoff Preparation

When the prospect is funded and ready for deployment, the business development team prepares the site for migration to the production CMDB.

## Checklist Verification

Before handoff, verify all checklist items on the Site Registration issue are complete. Incomplete checklists signal that the site is not ready for deployment, even if funding is approved. Common gaps: missing seat count, unconfirmed deployment tier, incomplete security authorization.

## Field Validation

Confirm the CR Deployment Site record has all required fields populated:

- siteType (Site Type reference)
- seatCount (estimated or confirmed)
- environment (Environment Type reference)
- customerOrganization (Organization reference)
- location (Location reference, if known)
- product (CR Product Version reference identifying the target product)
- installerTeam and supportTeam (Team references)
- site (reference to the shared Site record)

Missing fields delay the handoff because the CM team cannot create a complete production record without them.

## CM Notification

Set the Site Registration issue to "Ready for Handoff." If automation is configured, this triggers a notification to the CM team distribution list. The notification should include:

- The CR Deployment Site record identifier
- The target product
- The customer organization name
- The assigned point of contact
- Any special deployment considerations noted during qualification

The CM team acknowledges the notification and begins the migration process described in [Deployment Handoff](deployment-handoff.md).

## Closing the Pipeline Issue

After the CM team confirms the production records are created, the business development representative closes the Site Registration issue with a templated response summarizing the handoff: what was handed off, to whom, and the expected next steps. The pipeline CR Deployment Site record is marked as "Handed Off" or retained according to the organization's data retention policy.


# Pipeline Reporting

## Pipeline by Product

A product-level summary shows how many sites are at each workflow stage for each product. This view tells management which products have the most active pipelines and where the bottlenecks are.

For a two-product portfolio (OvocoCRM and OvocoAnalytics), this might show 15 OvocoCRM sites distributed across the pipeline stages and 8 OvocoAnalytics sites in earlier stages, reflecting that the analytics product is newer with a developing customer base.

## Stalled Sites

Filter for sites with no workflow status change in 30 or more days. Group by product and assigned representative. This dashboard drives the weekly pipeline review meeting where the team lead assigns follow-up actions for each stalled site.

## Seat Counts

Roll up estimated seat counts by pipeline stage to forecast deployment volume. Sites in Funding represent near-term deployments. Sites in Prospecting represent longer-term potential. The seat count pipeline helps capacity planning: if 500 seats are in the Funding stage, the engineering and O&M teams can anticipate the workload.

## Time-in-stage Analysis

Track the average number of days sites spend at each workflow status. If sites consistently stall at Security Review (60-day average) but move quickly through Procurement (10-day average), the team knows where to focus process improvement efforts. Time-in-stage data also helps set realistic expectations with customers about deployment timelines.


# Automation Rules

Configure these automation rules to keep the pipeline running smoothly:

| Trigger | Action |
|---------|--------|
| Site Registration created | Auto-link to CR Deployment Site record, assign to representative by product |
| Workflow status changes | Update the linked CR Deployment Site workflowStatus to match |
| Issue idle 30 or more days | Email team lead, add "Stalled" label |
| Issue reaches "Ready for Handoff" | Notify CM team distribution list |
| Checklist 100% complete | Transition issue to "Ready for Handoff" |
| Funding Request approved | Transition linked Site Registration to "In Planning" |

The auto-link rule is the most important. Without it, representatives must manually link every new issue to its CR Deployment Site record, which creates a gap in tracking when forgotten. The idle-issue rule catches stalls before they become forgotten prospects.

Automation rules vary by platform. The trigger-action patterns described here are capabilities most issue tracking systems support, whether through built-in automation, workflow extensions, or scripted integrations.
