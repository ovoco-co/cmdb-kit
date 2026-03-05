# Site Lifecycle and Enterprise Model

The previous parts of this guide covered how to design your CMDB schema, set it up on a platform, enter data, and govern changes. This part covers what you do with the CMDB in the field: manage customers through the deployment pipeline, hand sites off between teams, roll out upgrades, and track media distribution. It is the operational lifecycle that the CMDB serves.

This chapter establishes the conceptual foundation. It maps the full lifecycle from prospect to decommission, introduces the three-status data model that tracks site progress from multiple angles, and defines which teams own which phases. It also covers when and why a separate pipeline system makes sense and how its schema differs from the production CMDB.


# The Full Lifecycle

Every deployment site progresses through a sequence of phases, from initial customer contact through steady-state operations to eventual retirement. In organizations with a pre-deployment qualification process, the early phases may be managed in a separate pipeline tracker by the sales and business development team. The remaining phases are managed in the production CMDB by the CM and engineering teams.

```
Pipeline Tracker                         Production CMDB
---------------------------------        ---------------------------------

PRE-PLANNING                             DEPLOYMENT
  Prospecting                              Ready to Install
  Requirements                             Installation
  Funding                                  Testing
  On Hold                                  Go Live

PLANNING                                 OPERATIONAL
  Procurement                              Operational
  Site Survey                              Sustainment
  Engineering                              Upgrade Planning
  Security Review
                                         CLOSED
        --- migration to production --->   Decommissioned
```

The boundary between the pipeline tracker and the production CMDB is not fixed. Some organizations run all phases in a single system. Others split at the planning-to-deployment boundary because the two sides have different access controls, different audiences, and different schema needs. The migration step in the middle is covered in [Deployment Handoff](06-03-Deployment-Handoff.md).

## Pre-planning Phases

Pre-planning covers the earliest stages of a customer relationship. The business development team owns these phases.

Prospecting. Initial contact and interest assessment. The team identifies a potential customer, creates a pipeline record, and begins tracking communications.

Requirements. Gathering requirements and developing estimates. The team works with the customer to understand their deployment needs, seat count, timeline, and technical environment.

Funding. Awaiting budget approval and allocation. The site has qualified as a real opportunity and is waiting for contractual or financial commitment.

On Hold. Blocked by an external dependency. Funding stalled, customer reorganization, security review delay, or other factors outside the team's control. The site remains in the pipeline but is not actively progressing.

## Planning Phases

Planning covers preparation for deployment. Responsibility shifts from business development to engineering during this period.

Procurement. Hardware and software being ordered. The funding is approved and the team is acquiring the infrastructure needed for the deployment.

Site Survey. Physical and network site assessment. A field engineer visits the customer facility (or conducts a remote assessment) to document the environment: rack space, network topology, power, cooling, and connectivity.

Engineering. Configuration and design work. The engineering team produces the technical design for this specific deployment based on the site survey results and customer requirements.

Security Review. Security authorization process. The customer's security team (or a regulatory body) reviews the deployment for compliance with applicable security requirements.

## Deployment Phases

Deployment covers the transition from planned to operational. Engineering owns these phases, with CM maintaining the records.

Ready to Install. All prerequisites are complete. Hardware is in place, security authorization is granted, engineering documents are approved, and the site is waiting for the installation team.

Installation. Active installation in progress at the customer site.

Testing. Security assessment and functional testing after installation. The deployment must pass acceptance criteria before going live.

Go Live. Cutover to production. The site transitions from installation status to operational status, the go-live date is recorded, and support responsibilities activate.

## Operational Phases

Operations covers the steady state. The O&M (Operations and Maintenance) team owns these phases.

Operational. Normal operations. Users are active, support is being provided, and the site is meeting its service level commitments.

Sustainment. Ongoing maintenance and support. This is the default long-term state for a healthy site. The site receives patches, configuration updates, and periodic health checks.

Upgrade Planning. Planning the next version upgrade. The site has been identified for an upgrade campaign and work is underway to schedule, deliver, and install the new version.

## Closed Phase

Decommissioned. The site is no longer active. Media has been recalled (if applicable), access has been revoked, and the infrastructure has been released. This is a terminal state. Decommissioned records are retained for audit and historical reporting.


# The Three-status Data Model

A deployment site needs three separate status attributes because a single status field cannot capture the full picture. A site can be operationally available, in a specific lifecycle phase, and partway through an upgrade campaign, all at the same time. Collapsing these into one attribute forces you to choose which dimension matters, losing visibility into the others.

## Site Status

Site Status tracks operational availability. It answers the question: "Can users access the system at this site right now?"

| Value | Meaning |
|-------|---------|
| Planning | Site approved, setup underway |
| Installing | Installation in progress |
| Operational | Site is live and serving users |
| Suspended | Temporarily offline (maintenance, incident) |
| Retired | Permanently shut down |

This attribute changes infrequently. A site spends most of its life as "Operational." It changes to "Suspended" during maintenance windows or incidents, and to "Retired" at end of life.

## Workflow Status

Workflow Status tracks the current phase in the deployment lifecycle. It answers the question: "Where is this site in its journey from prospect to retirement?"

The 17 workflow status values correspond to the lifecycle phases described above: Prospecting, Requirements, Funding, On Hold, Procurement, Site Survey, Engineering, Security Review, Ready to Install, Installation, Testing, Go Live, Operational, Sustainment, Upgrade Planning, and Decommissioned.

This attribute changes as the site progresses through the lifecycle. It provides fine-grained tracking that Site Status cannot. A site with Site Status "Operational" might have Workflow Status "Sustainment" (steady state) or "Upgrade Planning" (active upgrade campaign). Both are operationally available, but they are in different lifecycle phases.

## Upgrade Status

Upgrade Status tracks per-release campaign progress. It answers the question: "How far along is this site in the current upgrade?"

| Value | Meaning |
|-------|---------|
| Not Started | Site identified for upgrade, no action yet |
| Media Requested | Site has formally requested upgrade media |
| Media Sent | Media shipped or transferred |
| Media Received | Site confirmed receipt |
| Installation Scheduled | Install date coordinated with site |
| Installing | Upgrade installation in progress |
| Installed | Software installed, pending verification |
| Verified | Upgrade verified and operational |
| Rolled Back | Upgrade failed, reverted to previous version |

This attribute resets with each upgrade campaign. When a new version ships, eligible sites start at "Not Started" and progress through to "Verified." Once verified, the attribute remains at "Verified" until the next campaign begins.

## How the Three Statuses Interact

The three attributes are independent dimensions. Any valid combination is possible, though some combinations are more common than others.

| Scenario | Site Status | Workflow Status | Upgrade Status |
|----------|-------------|-----------------|----------------|
| New site, ordering hardware | Planning | Procurement | (empty) |
| Installation in progress | Installing | Installation | (empty) |
| Running normally | Operational | Sustainment | Verified |
| Upgrade media shipped | Operational | Upgrade Planning | Media Sent |
| Upgrade installed, not yet verified | Operational | Upgrade Planning | Installed |
| Upgrade complete, back to steady state | Operational | Sustainment | Verified |
| Temporary outage during operations | Suspended | Sustainment | (unchanged) |
| Site shutting down | Operational | Decommissioned | (unchanged) |

The combination table reveals patterns that a single status field would hide. A site with Site Status "Operational" and Upgrade Status "Media Sent" tells you that users are still working while upgrade media is in transit. A site with Site Status "Suspended" and Workflow Status "Sustainment" tells you this is a temporary outage during normal operations, not a planned maintenance window during an upgrade.

For the schema design decisions behind these attributes (which types to use, how to model them in schema-attributes.json), see [Designing Site Deployments](../Part-2-Schema-Design/02-03-Designing-Site-Deployments.md).


# Phase Ownership Across the Enterprise

The deployment lifecycle spans multiple departments. No single team owns the entire journey from prospect to decommission. Understanding who owns which phases prevents gaps in accountability and ensures clean handoffs.

## Business Development

Business development owns the pre-planning phases: Prospecting, Requirements, Funding, and On Hold. They identify potential customers, qualify opportunities, track communications, and manage the pipeline through to funding approval.

In a separate pipeline tracker, business development has primary access to the pipeline records. They create Deployment Site records when prospects are identified, update workflow status as sites progress, and prepare handoff packages when sites are ready for deployment.

Business development's involvement does not end at handoff. They remain the relationship owner for the customer organization and may be called back in if a deployed site needs to be expanded, contracted, or if a new product is being considered for an existing customer.

## Engineering

Engineering owns the planning and deployment phases: Procurement through Go Live. They design the deployment, manage the installation, conduct testing, and oversee the cutover to production.

During planning, engineering works from site survey results and customer requirements to produce the technical design. During deployment, the installation team executes the design at the customer site. Engineering signs off on the deployment when testing passes acceptance criteria.

## Operations and Maintenance

O&M owns the operational phases: Operational, Sustainment, and Upgrade Planning. They provide day-to-day support, manage upgrade campaigns, coordinate media distribution, and maintain the site through its operational life.

O&M also owns the Decommissioned phase. When a site reaches end of life, O&M coordinates the shutdown: revoking access, recalling media, releasing infrastructure, and updating the CMDB records.

## Configuration Management

CM bridges all phases as the data steward. CM does not own any lifecycle phase, but maintains the records that track every phase. When a site moves from the pipeline tracker to the production CMDB, CM ensures the migration is clean. When engineering completes a deployment, CM verifies the records are accurate. When O&M runs an upgrade campaign, CM tracks the per-site progress.

CM's cross-phase role is especially important in organizations with system boundaries. When the pipeline tracker and the production CMDB are on different networks, CM maintains continuity across the boundary. The pipeline team creates records in their system; CM migrates those records to the production system and ensures nothing is lost in translation.

## PMO

The PMO (Program Management Office) oversees the portfolio view. They do not own individual sites but need visibility across all sites, all products, and all lifecycle phases.

PMO uses cross-product dashboards to track the portfolio: how many sites are in the pipeline, how many are deploying, how many are operational, how many are in upgrade campaigns. These dashboards pull from both the pipeline tracker (for pre-deployment sites) and the production CMDB (for deployed sites).

The PMO also coordinates between departments when lifecycle transitions require it. When business development hands off to engineering, the PMO ensures the handoff criteria are met. When engineering hands off to O&M, the PMO verifies the site is ready for sustainment.


# When to Use a Separate Pipeline System

Not every organization needs a separate system for the pre-deployment pipeline. A single CMDB can track the full lifecycle if the user base is small, the access control requirements are simple, and the schema can accommodate both pipeline and production needs.

A separate pipeline system makes sense when:

Different access controls are needed. Business development staff and customer-facing personnel need write access to pipeline records but should not have access to the production CMDB's operational data. Conversely, engineering and O&M staff need production CMDB access but do not need to see sales pipeline details.

Different schema needs exist. The pipeline tracks a portfolio-level view where all products share a single Deployment Site type. The production CMDB uses product-specific types (CR Deployment Site, AN Deployment Site) with different attribute sets. Maintaining both structures in a single schema adds complexity without benefit.

Different audiences use the data. The pipeline tracker serves as a lightweight CRM for the business development team. The production CMDB serves engineering and operations teams. These audiences have different workflows, different dashboards, and different reporting needs.

The CMDB is on an isolated network. If the production CMDB runs on a classified or air-gapped network, customer-facing personnel cannot access it directly. The pipeline tracker runs on the accessible network where business development can work with customer contacts.

When a separate system is used, the production CMDB remains the authoritative system of record. The pipeline tracker is a feeder. Records migrate from the pipeline to the production CMDB at the handoff point, and the production CMDB is the single source of truth for deployed sites.


# Pipeline Schema Design

The pipeline tracker runs a simplified version of the CMDB schema. It has fewer types, fewer attributes, and a flatter hierarchy. The simplification is intentional: the pipeline needs to be lightweight enough for business development staff to use without CMDB training.

## Object Type Hierarchy

```
Pipeline (Root)
+-- Directory
|   +-- Organization          Customer orgs, departments, divisions
|   +-- Location              Offices, data centers, buildings
|   +-- Person                Site POCs with full contact info
+-- Deployment Site           Portfolio pipeline (all products in one type)
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

The key difference from the production CMDB: the pipeline has a single Deployment Site type that covers all products. A text field called "product" identifies which product the site is for. During migration to the production CMDB, this text field routes the record to the correct product-specific type (CR Deployment Site or AN Deployment Site).

The Directory types (Organization, Location, Person) mirror the production schema. Records created in the pipeline can migrate to the production CMDB with minimal translation because the types and attributes match.

## Pipeline Lookup Types

The pipeline tracker uses a subset of the production CMDB's workflow status values, covering only the pre-planning and planning phases:

| Name | Sort Order | Category | Description |
|------|------------|----------|-------------|
| Prospecting | 10 | Pre-Planning | Initial customer contact and interest assessment |
| Requirements | 20 | Pre-Planning | Gathering requirements and estimate development |
| Funding | 30 | Pre-Planning | Awaiting budget approval and allocation |
| On Hold | 35 | Pre-Planning | Paused due to funding, priority, or other blockers |
| Procurement | 40 | Planning | Hardware and software procurement in progress |
| Site Survey | 50 | Planning | Site survey and facility assessment |
| Engineering | 60 | Planning | Technical design and engineering documentation |
| Security Review | 70 | Planning | Security authorization process |

Other pipeline lookups (Site Status, Site Type, Deployment Tier, Implementation Type, Product Line) use simplified value sets appropriate for the pipeline context. For example, the pipeline Site Status only needs Planning, Requested, and Provisioning, not the full operational set.

## Deployment Site Attributes in the Pipeline

The pipeline Deployment Site type is portfolio-level, covering all products in a single type:

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

Notice what is missing compared to the production schema: no productVersion, no targetVersion, no previousVersion, no upgradeStatus. These fields exist only in the production CMDB because they track operational state that does not apply to sites still in the pipeline.

For the full data mapping between pipeline and production schemas, see [Deployment Handoff](06-03-Deployment-Handoff.md).
