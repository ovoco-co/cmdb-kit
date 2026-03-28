# Designing Site Deployments

> This document describes patterns from portfolio mode. The example data references OvocoCRM 2.4.0 and portfolio-mode attributes that differ from the Core schema. See the Core Schema documentation for current Core types and example data.

Deployment sites are where your product meets the real world. Every customer location, every regional instance, every tenant running your software is a deployment site in the CMDB. This section covers how CMDB-Kit models deployment sites, the two-record pattern that enables multi-product tracking at a single customer, the related record types that connect sites to locations, organizations, and personnel, and the operational patterns for tracking what version is deployed where.


# The Two Record Types

## Site: The Shared Identity Record

A Site is the simplest possible record: just a Name and an optional description. It represents a customer location as a shared identity that all products recognize. When Acme Corporation deploys both OvocoCRM and OvocoAnalytics, there is one Site record called "Acme Corp" that both products reference.

The Site type in portfolio mode carries only a description attribute beyond the implicit Name:

```json
"Site": {
  "description": { "type": 0 }
}
```

Portfolio mode places Site under the Ovoco Library branch, making it visible to all product libraries without duplication.

## CR Deployment Site: The Product-specific Record

A CR Deployment Site is the product-specific record that tracks everything about a particular OvocoCRM deployment at a customer location. It carries the site code, product and version references, location, customer organization, team assignments, status fields, and operational metrics.

The CR Deployment Site attributes in portfolio mode:

```json
"CR Deployment Site": {
  "description": { "type": 0 },
  "siteCode": { "type": 0 },
  "product": { "type": 1, "referenceType": "CR Product" },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "previousVersion": { "type": 1, "referenceType": "CR Product Version" },
  "targetVersion": { "type": 1, "referenceType": "CR Product Version" },
  "location": { "type": 1, "referenceType": "Location" },
  "customerOrganization": { "type": 1, "referenceType": "Organization" },
  "installerTeam": { "type": 1, "referenceType": "Team" },
  "supportTeam": { "type": 1, "referenceType": "Team" },
  "siteStatus": { "type": 1, "referenceType": "Site Status" },
  "workflowStatus": { "type": 1, "referenceType": "Site Workflow Status" },
  "siteType": { "type": 1, "referenceType": "Site Type" },
  "serverCount": { "type": 0, "defaultTypeId": 1 },
  "seatCount": { "type": 0, "defaultTypeId": 1 },
  "goLiveDate": { "type": 0, "defaultTypeId": 4 },
  "site": { "type": 1, "referenceType": "Site" },
  "upgradeStatus": { "type": 1, "referenceType": "Upgrade Status" },
  "componentPackage": { "type": 1, "referenceType": "CR Component Instance", "max": -1 },
  "environment": { "type": 1, "referenceType": "Environment Type" }
}
```

The OvocoCRM example has three CR Deployment Sites, each representing a customer-specific deployment:

```json
[
  {
    "Name": "CR Acme Corp US-East",
    "description": "OvocoCRM deployment at Acme Corp US-East datacenter",
    "siteCode": "CR-ACME-USE",
    "product": "CR Core Platform",
    "productVersion": "OvocoCRM 2.4.0",
    "location": "US East (Virginia)",
    "customerOrganization": "Acme Corporation",
    "siteStatus": "Active",
    "workflowStatus": "Active",
    "siteType": "On-Premise",
    "serverCount": 4,
    "seatCount": 500,
    "goLiveDate": "2025-02-01",
    "site": "Acme Corp",
    "upgradeStatus": "Completed",
    "environment": "Production"
  },
  {
    "Name": "CR GlobalTech US-West",
    "description": "OvocoCRM deployment at GlobalTech US-West",
    "siteCode": "CR-GLBT-USW",
    "product": "CR Core Platform",
    "productVersion": "OvocoCRM 2.3.1",
    "targetVersion": "OvocoCRM 2.4.0",
    "location": "US West (Oregon)",
    "customerOrganization": "GlobalTech Industries",
    "siteStatus": "Active",
    "workflowStatus": "Upgrading",
    "siteType": "On-Premise",
    "serverCount": 2,
    "seatCount": 200,
    "goLiveDate": "2025-04-15",
    "site": "GlobalTech Industries",
    "upgradeStatus": "Scheduled",
    "environment": "Production"
  },
  {
    "Name": "CR Meridian EU-West",
    "description": "OvocoCRM deployment at Meridian Healthcare EU-West",
    "siteCode": "CR-MERI-EUW",
    "product": "CR Core Platform",
    "productVersion": "OvocoCRM 2.4.0",
    "location": "EU West (Frankfurt)",
    "customerOrganization": "Meridian Healthcare",
    "siteStatus": "Active",
    "workflowStatus": "Active",
    "siteType": "Cloud Hosted",
    "serverCount": 2,
    "seatCount": 150,
    "goLiveDate": "2025-06-01",
    "site": "Meridian Healthcare",
    "upgradeStatus": "Completed",
    "environment": "Production"
  }
]
```

CR Acme Corp US-East is the largest deployment with 500 seats across four servers, running the latest v2.4.0. CR GlobalTech US-West is mid-upgrade, still on v2.3.1 with v2.4.0 as the target version and an upgrade status of "Scheduled." CR Meridian EU-West is a cloud-hosted deployment in the EU region that has already completed the v2.4.0 upgrade.

## Why the Split Matters

Without the two-record pattern, a multi-product deployment creates a naming problem. If Acme Corporation deploys both OvocoCRM and OvocoAnalytics, do you create one Deployment Site called "Acme Corp" and somehow track two products in it? Or do you create two unrelated records ("CR Acme Corp US-East" and "AN Acme Corp US-East") that have no formal connection?

The two-record pattern solves this cleanly:

```
Site: "Acme Corp"
  ├── CR Deployment Site: "CR Acme Corp US-East"  (OvocoCRM, v2.4.0, Active)
  └── AN Deployment Site: "AN Acme Corp US-East"  (OvocoAnalytics, v1.0.0, Provisioning)
```

Each CR Deployment Site has its own version, status, environment, and go-live date. The shared Site record ties them together. When you need a cross-product view ("show me everything deployed at Acme Corporation"), you query all Deployment Sites that reference the "Acme Corp" Site.


# Site as a Shared Identity

## A Site Has Only a Name and Description

The Site type is intentionally minimal. It carries only a Name and a description attribute. No version, no status, no environment. Those product-specific details belong on the CR Deployment Site records.

This minimalism is the point. A Site record says: "This customer location exists." Nothing more. Every product-specific fact lives on that product's Deployment Site record.

Portfolio mode has six Site records:

```json
[
  { "Name": "Acme Corp", "description": "Acme Corporation - enterprise customer" },
  { "Name": "GlobalTech Industries", "description": "GlobalTech Industries - manufacturing customer" },
  { "Name": "Meridian Healthcare", "description": "Meridian Healthcare Systems - healthcare customer" },
  { "Name": "Pacific Financial", "description": "Pacific Financial Group - financial services customer" },
  { "Name": "Summit Education", "description": "Summit Education Network - education customer" },
  { "Name": "Ovoco Internal", "description": "Internal Ovoco infrastructure" }
]
```

Five sites represent external customers (Acme Corporation, GlobalTech Industries, Meridian Healthcare, Pacific Financial Group, Summit Education Network). The sixth, Ovoco Internal, represents the company's own infrastructure for development and testing.

## Sites Live in the Shared Library

In portfolio mode, Site records live under the Ovoco Library branch, outside any product-specific branch. This makes them visible to all product libraries without duplication.

## All Product Libraries Reference the Same Site Records

When you add a Deployment Site for a new product at an existing customer, you reference the same Site record. Adding OvocoAnalytics to Acme Corporation does not create a new Site. It creates a new AN Deployment Site that references the existing "Acme Corp" Site.

## Adding a New Customer Means Adding One Site Record

When a new customer comes on board, you add one Site record. Then you add a CR Deployment Site record for each product they are deploying. If they start with OvocoCRM and add OvocoAnalytics later, the second Deployment Site references the same Site created during the first onboarding.

The decision tree:

- New customer, new product: create both Site and CR Deployment Site
- Existing customer, new product: create only the CR Deployment Site, reference the existing Site
- Existing customer, version upgrade: update the existing CR Deployment Site (do not create a new one)


# CR Deployment Site as a Product Record

## Each Product Library Has Its Own Deployment Sites

In portfolio mode with product prefixes, each product library has its own Deployment Site type:

- CR Deployment Site (under OvocoCRM Library, for OvocoCRM)
- AN Deployment Site (under OvocoAnalytics Library, for OvocoAnalytics)

These are separate types in schema-structure.json, each with their own attribute set. This allows products to track different attributes. OvocoCRM might track seat count. OvocoAnalytics might track data ingestion volume. Both share the common fields (siteStatus, environment, goLiveDate) but can diverge where needed.

## CR Deployment Site References a Site

Each CR Deployment Site record carries a reference to its parent Site record. In schema-attributes.json for portfolio mode:

```json
"CR Deployment Site": {
  "site": { "type": 1, "referenceType": "Site" },
  "product": { "type": 1, "referenceType": "CR Product" },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "siteStatus": { "type": 1, "referenceType": "Site Status" },
  "environment": { "type": 1, "referenceType": "Environment Type" },
  "goLiveDate": { "type": 0, "defaultTypeId": 4 }
}
```

The site attribute is the link back to the shared identity. The product attribute identifies which CR Product is deployed. The productVersion attribute tracks which version is installed.

## Product-specific Attributes: Version Tracking, Classification, Capacity

Beyond the common attributes, the portfolio mode CR Deployment Site carries a rich set of fields. The version tracking attributes form a trio:

- productVersion: reference to the currently installed CR Product Version
- targetVersion: reference to the version being deployed next (used during upgrades)
- previousVersion: reference to the version installed before the current one

This trio enables upgrade campaign tracking. CR GlobalTech US-West shows this in action: productVersion is "OvocoCRM 2.3.1" (what is running now), targetVersion is "OvocoCRM 2.4.0" (what it will be upgraded to), and upgradeStatus is "Scheduled."

Additional capacity and classification attributes:

- siteCode: a short identifier for the site (e.g., "CR-ACME-USE")
- siteType: reference to Site Type lookup (On-Premise, Cloud Hosted, Hybrid, Development, Staging, Demo)
- serverCount: integer tracking the number of servers at the site
- seatCount: integer tracking the number of licensed seats
- componentPackage: multi-reference to CR Component Instance records, tracking which component builds are installed
- customerOrganization: reference to the Organization that uses the deployed product

## Deployment Site Status and Workflow Progress

Portfolio mode uses two separate status fields to track site state at different levels of granularity.

The siteStatus attribute references the Site Status lookup, which tracks high-level operational availability:

| Status | Meaning |
|--------|---------|
| Active | Site is operational |
| Inactive | Site is temporarily offline |
| Planned | Site is approved but not yet built |
| Decommissioned | Site has been shut down |
| Suspended | Site operations are on hold |

The workflowStatus attribute references the Site Workflow Status lookup, which tracks finer-grained lifecycle progress. Each value carries a category and an isActive flag:

| Status | Category | Is Active |
|--------|----------|-----------|
| Pre-Sales | Pre-deployment | false |
| Prospecting | Pre-deployment | false |
| Engineering Review | Pre-deployment | false |
| Contract Negotiation | Pre-deployment | false |
| Installation Planning | Deployment | true |
| Installing | Deployment | true |
| Operational | Operational | true |
| Upgrade Pending | Operational | true |
| Decommissioning | End of Life | false |
| Decommissioned | End of Life | false |

The two-level approach keeps the siteStatus simple for dashboards and reports while allowing workflowStatus to capture the detailed lifecycle stage. A site with siteStatus "Active" might have workflowStatus "Operational" or "Upgrade Pending," distinguishing between steady-state and sites about to receive a new version.

## Upgrade Status

The upgradeStatus attribute tracks progress through an upgrade campaign using the Upgrade Status lookup:

| Status | Meaning |
|--------|---------|
| Not Applicable | No upgrade planned for this site |
| Scheduled | Upgrade scheduled with the customer |
| In Progress | Upgrade actively underway |
| Complete | Upgrade completed successfully |
| Deferred | Upgrade postponed |
| Blocked | Upgrade blocked by an issue |

In the OvocoCRM data, CR Acme Corp US-East and CR Meridian EU-West both show upgradeStatus "Completed" (they are on v2.4.0). CR GlobalTech US-West shows "Scheduled," indicating the upgrade to v2.4.0 is planned but not yet started.

## Site Type

The siteType attribute classifies the deployment model using the Site Type lookup:

| Type | Meaning |
|------|---------|
| On-Premise | Customer-hosted on-premise deployment |
| Cloud Hosted | Ovoco-managed cloud deployment |
| Hybrid | Mixed on-premise and cloud deployment |
| Development | Internal development environment |
| Staging | Pre-production staging environment |
| Demo | Customer demonstration instance |

CR Acme Corp US-East and CR GlobalTech US-West are On-Premise deployments. CR Meridian EU-West is Cloud Hosted. This distinction affects support routing, upgrade procedures, and SLA terms.

## Teams and Dates per CR Deployment Site

Each CR Deployment Site can reference the teams responsible for it:

- installerTeam: reference to the Team that handles installation and upgrades
- supportTeam: reference to the Team that handles ongoing support

The enterprise data includes six teams: CRM Platform Team, Analytics Platform Team, CRM Operations, Analytics Operations, Infrastructure Team, and Release Engineering. A typical assignment might have installerTeam set to "Release Engineering" (the team that handles deployments) and supportTeam set to "CRM Operations" (the team that handles day-to-day support).

The goLiveDate field tracks when the site became operational. In the OvocoCRM data, CR Acme Corp US-East went live on 2025-02-01, CR GlobalTech US-West on 2025-04-15, and CR Meridian EU-West on 2025-06-01.


# Related Record Types

The CR Deployment Site attributes cover the essentials, but production deployments need to track relationships between sites and locations, organizations, and people. Portfolio mode includes three dedicated assignment types for these connections, all prefixed with "CR" to indicate they belong to the OvocoCRM product library.

## CR Site Location Assignment

### Linking a CR Deployment Site to Physical Locations

A CR Site Location Assignment links a CR Deployment Site to a Location record, with a qualifier that explains the nature of the link.

```json
"CR Site Location Assignment": {
  "description": { "type": 0 },
  "deploymentSite": { "type": 1, "referenceType": "CR Deployment Site" },
  "location": { "type": 1, "referenceType": "Location" },
  "locationType": { "type": 0 },
  "assignmentStatus": { "type": 0 },
  "startDate": { "type": 0, "defaultTypeId": 4 },
  "endDate": { "type": 0, "defaultTypeId": 4 },
  "serverCount": { "type": 0, "defaultTypeId": 1 },
  "localPOC": { "type": 0 },
  "notes": { "type": 0 }
}
```

Portfolio mode extends the basic concept with date tracking (startDate, endDate), a serverCount per location, and a localPOC field for the on-site point of contact.

The OvocoCRM data has one example:

```json
{
  "Name": "CR Acme US-East Location",
  "description": "Primary location for CR Acme US-East deployment",
  "deploymentSite": "CR Acme Corp US-East",
  "location": "US East (Virginia)",
  "locationType": "Primary",
  "assignmentStatus": "Active",
  "startDate": "2025-01-01",
  "serverCount": 4,
  "localPOC": "John Smith"
}
```

### Location Type: Primary, Alternate

The locationType attribute classifies the relationship. "Primary" means this is where the site's main infrastructure lives. "Alternate" means this is a secondary or backup location.

### When a Deployment Spans Multiple Buildings or Facilities

Some deployments span multiple physical locations. A military deployment might have servers in one building, workstations in another, and a disaster recovery site in a third. CR Site Location Assignment records capture this: one CR Deployment Site with three location assignments, each with its own type (Primary, Operations, DR).

## CR Site Org Relationship

### Linking a CR Deployment Site to Organizations

A CR Site Org Relationship links a CR Deployment Site to an Organization record, qualifying who the organization is in relation to the site.

```json
"CR Site Org Relationship": {
  "description": { "type": 0 },
  "deploymentSite": { "type": 1, "referenceType": "CR Deployment Site" },
  "organization": { "type": 1, "referenceType": "Organization" },
  "relationshipType": { "type": 0 },
  "relationshipStatus": { "type": 0 },
  "isPrimary": { "type": 0, "defaultTypeId": 2 },
  "startDate": { "type": 0, "defaultTypeId": 4 },
  "endDate": { "type": 0, "defaultTypeId": 4 },
  "organizationPOC": { "type": 1, "referenceType": "Person" },
  "notes": { "type": 0 }
}
```

Portfolio mode extends the basic concept with relationshipStatus, an isPrimary boolean, date tracking, and an organizationPOC reference to the Person who is the point of contact for that organization.

The enterprise data has organizations structured as Ovoco Inc (parent) with Ovoco Engineering and Ovoco Operations as internal divisions. External customers include Acme Corporation, GlobalTech Industries, Meridian Healthcare, Pacific Financial Group, and Summit Education Network.

The OvocoCRM data has one example:

```json
{
  "Name": "CR Acme Customer Rel",
  "description": "Acme Corp customer relationship for CRM deployment",
  "deploymentSite": "CR Acme Corp US-East",
  "organization": "Acme Corporation",
  "relationshipType": "Customer",
  "relationshipStatus": "Active",
  "isPrimary": true,
  "startDate": "2024-11-01"
}
```

### Relationship Type: Host, Customer

"Host" means the organization provides the infrastructure. "Customer" means the organization uses the deployed product. These are often different: a managed service provider (host) runs the servers that a client organization (customer) uses.

### Host Organization vs Customer Organization

Understanding this distinction matters for support routing. When a hardware issue occurs at a site, you contact the host organization. When a user has a product question, you contact the customer organization. The CR Site Org Relationship makes this routing explicit.

## CR Site Personnel Assignment

### Linking a Person to a CR Deployment Site With a Deployment Role

A CR Site Personnel Assignment links a Person to a CR Deployment Site with a role qualifier from the Deployment Role lookup, and also references the Team the person belongs to.

```json
"CR Site Personnel Assignment": {
  "person": { "type": 1, "referenceType": "Person" },
  "deploymentSite": { "type": 1, "referenceType": "CR Deployment Site" },
  "deploymentRole": { "type": 1, "referenceType": "Deployment Role" },
  "team": { "type": 1, "referenceType": "Team" },
  "startDate": { "type": 0, "defaultTypeId": 4 },
  "endDate": { "type": 0, "defaultTypeId": 4 },
  "notes": { "type": 0 }
}
```

Portfolio mode uses a deploymentRole reference (not a free-text role field) and includes a team reference, date tracking, and notes.

The OvocoCRM data has one example:

```json
{
  "Name": "CR Acme Site Admin",
  "description": "Site administrator for CR Acme US-East",
  "person": "Sarah Chen",
  "deploymentSite": "CR Acme Corp US-East",
  "deploymentRole": "Site Administrator",
  "team": "CRM Operations",
  "startDate": "2025-01-15"
}
```

### Deployment Roles

The Deployment Role lookup in portfolio mode provides eight values:

| Role | Description |
|------|-------------|
| Site Commander | Primary authority at the deployment site |
| Operations Lead | Manages day-to-day operations |
| System Administrator | Manages the deployed system |
| Database Administrator | Manages data and database operations |
| Network Engineer | Manages network infrastructure |
| Security Officer | Oversees site security |
| Training Coordinator | Coordinates user training |
| Help Desk Lead | Manages front-line support |

These role assignments answer a critical operational question: "Who do I call about the OvocoCRM deployment at Acme Corporation?" The answer is in the CR Site Personnel Assignment records. The enterprise data includes persons such as Sarah Chen, Michael Torres, David Park, Emily Rodriguez, James Wilson, and Lisa Kim who can be assigned to these roles.

## Support Team

### installerTeam and supportTeam Attributes on CR Deployment Site

In addition to individual personnel assignments, the CR Deployment Site can reference teams directly:

The installerTeam attribute references the Team responsible for initial installation and upgrades. When a new version needs to be deployed, this is the team that does the work.

The supportTeam attribute references the Team that handles day-to-day support requests. When a customer at this site reports a problem, this is the team that responds.

### Tracking Which Team Handles Installation

The installerTeam reference is especially important during upgrade campaigns. When you need to upgrade all sites to a new version, the installer team assignment tells you which team is responsible for each site. This enables workload balancing and scheduling. Teams like Release Engineering or CRM Platform Team might handle installations, while Infrastructure Team handles infrastructure-level changes.

### Tracking Which Team Handles Ongoing Support

The supportTeam reference enables routing. When a support ticket comes in from a specific site, the system can look up the site's support team and route the ticket accordingly. CRM Operations is a typical support team assignment for OvocoCRM deployment sites.


# Designing Your Site Model

## One Site Per Customer vs Per Region vs Per Environment

The most important design decision is what a "site" represents in your context:

One site per customer. Each customer organization gets one Site record. CR Deployment Sites represent their product-specific instances. This is the OvocoCRM enterprise model: "Acme Corp," "GlobalTech Industries," and "Meridian Healthcare" are customer-level sites, each with a corresponding CR Deployment Site that tracks the OvocoCRM deployment details.

One site per region. Each geographic region gets one Site record. This works when geography is the primary organizing principle and customers may share regional infrastructure.

One site per environment. Each environment (production, staging, DR) gets its own site record. This works for internal deployments where the same team manages all environments.

The right choice depends on how your organization thinks about deployments. If support calls come in as "there is a problem at Acme Corporation," then one site per customer is natural. If support calls come in as "there is a problem in US-East," then one site per region makes more sense.

## Matching Sites to Your Actual Infrastructure Topology

Your site model should mirror how your operations team actually thinks about deployments. If they have a spreadsheet tracking "customer sites," each row in that spreadsheet is a candidate CR Deployment Site record.

Do not model theoretical topology. Model what you actually manage. If you have three customer deployments and one internal environment, you have four CR Deployment Sites, not a complex hierarchy of abstract zones.

## When a Site Is a Deployment Site vs a Location vs a Facility

Three types in the Directory branch can cause confusion:

A Location is a geographic entity: a city, an address, a coordinate. "Virginia" or "123 Main St, Portland, OR" is a Location.

A Facility is a physical structure: a building, a data center, a server room. "AWS US-East-1" or "Building 42" is a Facility.

A CR Deployment Site is an operational deployment: a running instance of your product. "CR Acme Corp US-East" is a CR Deployment Site.

A CR Deployment Site is located at a Location and might be housed in a Facility, but it is not the same thing as either. The Location exists whether or not your product is deployed there. The Facility exists whether or not your product runs in it. The CR Deployment Site exists only because your product is running there.


# Site Status Lifecycle

## Planned, Active, Decommissioned

The basic lifecycle has five states (from the Site Status lookup):

Planned. The site has been approved and setup is forthcoming. Infrastructure requirements are being defined and procurement is underway. This is the state a site enters when a deployment is first authorized.

Active. The site is operational. Users are using the product. Support is being provided. This is the steady state for most of a site's lifetime.

Inactive. The site is temporarily offline. This could be due to maintenance, a customer pause, or an infrastructure issue. The site is expected to return to Active.

Suspended. The site operations are on hold, typically due to contractual or administrative reasons. This differs from Inactive in that the hold is deliberate rather than technical.

Decommissioned. The site has been permanently shut down. Media has been recalled, access has been revoked, the infrastructure has been released. This is a terminal state.

## Workflow Status for Detailed Lifecycle Tracking

The workflowStatus attribute provides finer-grained tracking across four categories:

Pre-deployment covers the stages before a site goes live: Pre-Sales, Prospecting, Engineering Review, and Contract Negotiation. These stages are marked isActive: false because the site is not yet operational.

Deployment covers active setup: Installation Planning and Installing. These are marked isActive: true because work is actively happening.

Operational covers the steady state: Operational and Upgrade Pending. Both are isActive: true.

End of Life covers shutdown: Decommissioning and Decommissioned. Both are isActive: false.

In the OvocoCRM data, CR Acme Corp US-East and CR Meridian EU-West both have workflowStatus "Active" (renamed "Operational" in the lookup). CR GlobalTech US-West has workflowStatus "Upgrading," indicating it is in the process of receiving a new version.

## Tracking Go-live Dates

The goLiveDate attribute records when a site transitioned to Active. This date matters for SLA calculations (when did the support clock start?), compliance reporting (how long has this site been operational?), and lifecycle planning (which sites are approaching their end-of-life?).

In the OvocoCRM data, CR Acme Corp US-East went live on 2025-02-01, CR GlobalTech US-West on 2025-04-15, and CR Meridian EU-West on 2025-06-01.


# Deployments

## Recording Which Version Is Deployed to Which Environment

The Deployment type records a specific act of deploying a version to an environment. It is an event record: it captures what happened, when, and who did it.

```json
"Deployment": {
  "description": { "type": 0 },
  "version": { "type": 1, "referenceType": "Product Version" },
  "environment": { "type": 1, "referenceType": "Environment Type" },
  "deployDate": { "type": 0, "defaultTypeId": 4 },
  "status": { "type": 1, "referenceType": "Deployment Status" },
  "deployedBy": { "type": 1, "referenceType": "Person" }
}
```

The OvocoCRM example has six deployment records covering three versions, each following the staging-then-production pattern:

```json
[
  {
    "Name": "v2.3.0 Staging Deploy",
    "description": "Pre-production deployment of 2.3.0 for validation",
    "version": "OvocoCRM 2.3.0",
    "environment": "Staging",
    "deployDate": "2026-01-18",
    "status": "Completed",
    "deployedBy": "Jordan Lee"
  },
  {
    "Name": "v2.3.0 Production Deploy",
    "description": "Production rollout of 2.3.0",
    "version": "OvocoCRM 2.3.0",
    "environment": "Production",
    "deployDate": "2026-01-20",
    "status": "Completed",
    "deployedBy": "Jordan Lee"
  },
  {
    "Name": "v2.3.1 Staging Deploy",
    "description": "Staging validation of contact import hotfix",
    "version": "OvocoCRM 2.3.1",
    "environment": "Staging",
    "deployDate": "2026-02-08",
    "status": "Completed",
    "deployedBy": "Casey Morgan"
  },
  {
    "Name": "v2.3.1 Production Deploy",
    "description": "Emergency hotfix deployment to production",
    "version": "OvocoCRM 2.3.1",
    "environment": "Production",
    "deployDate": "2026-02-10",
    "status": "Completed",
    "deployedBy": "Casey Morgan"
  },
  {
    "Name": "v2.4.0 Staging Deploy",
    "description": "Pre-production validation of 2.4.0 features",
    "version": "OvocoCRM 2.4.0",
    "environment": "Staging",
    "deployDate": "2026-02-25",
    "status": "Completed",
    "deployedBy": "Jordan Lee"
  },
  {
    "Name": "v2.4.0 Production Deploy",
    "description": "Production rollout of 2.4.0",
    "version": "OvocoCRM 2.4.0",
    "environment": "Production",
    "deployDate": "2026-03-01",
    "status": "Completed",
    "deployedBy": "Jordan Lee"
  }
]
```

The pattern is consistent: staging first, then production two days later. For v2.3.0, staging was January 18 and production was January 20. For v2.3.1 (a hotfix), Casey Morgan handled both the staging deploy on February 8 and the production deploy on February 10. For v2.4.0, Jordan Lee deployed to staging on February 25 and production on March 1.

## Deployment Status Lifecycle

Deployments progress through five states:

| Status | Meaning |
|--------|---------|
| Planned | Deployment is scheduled but not started |
| In Progress | Deployment is actively running |
| Completed | Deployment finished successfully |
| Rolled Back | Deployment was intentionally reverted |
| Failed | Deployment did not complete successfully |

## The Relationship Chain: Product Version to Deployment to Environment Type

The Deployment type sits at the intersection of what (Product Version) and where (Environment Type):

```
Product Version "OvocoCRM 2.3.1"
  ├── Deployment "v2.3.1 Staging Deploy" (Staging, Completed, Casey Morgan)
  └── Deployment "v2.3.1 Production Deploy" (Production, Completed, Casey Morgan)
```

This lets you answer questions like: "Is v2.3.1 deployed to production?" (yes, completed on 2026-02-10) and "Who deployed it?" (Casey Morgan).


# Linking Sites to Deployments

## Distribution Log as the Bridge

The Distribution Log connects versions to sites. While the Deployment type tracks the act of deploying to an environment, the Distribution Log tracks the delivery of media to a specific site.

```
Product Version "OvocoCRM 2.4.0"
  ├── Deployment "v2.4.0 Production Deploy" (to Production environment)
  ├── Distribution Log "v2.4.0 Acme Distribution" (to CR Acme Corp US-East)
  ├── Distribution Log "v2.4.0 GlobalTech Distribution" (to CR GlobalTech US-West)
  └── Distribution Log "v2.4.0 Meridian Distribution" (to CR Meridian EU-West)
```

Deployments are environment-scoped. Distribution Logs are site-scoped. Both reference the same Product Version.

## Tracking Which Sites Have Which Version

To find which version a site is running, query the Distribution Log for the most recent distribution to that site. To find which sites have a specific version, query all Distribution Log records for that version.

In AQL terms:

```
objectType = "CR Distribution Log" AND "deploymentSite" = "CR Acme Corp US-East"
```

Returns all distributions to CR Acme Corp US-East, sorted by date. The most recent one tells you the current version. Alternatively, the productVersion attribute on the CR Deployment Site itself shows the currently installed version directly.

## Identifying Sites Behind on Updates

When a new version ships, comparing the Distribution Log against the active site list reveals which sites have not been updated:

- Active sites: all CR Deployment Sites with siteStatus "Active"
- Sites with the new version: all sites referenced in Distribution Log records for that version
- Sites behind: the difference between these two sets

In the OvocoCRM data, after the v2.4.0 rollout, CR Acme Corp US-East and CR Meridian EU-West show productVersion "OvocoCRM 2.4.0" with upgradeStatus "Completed." CR GlobalTech US-West still shows productVersion "OvocoCRM 2.3.1" with upgradeStatus "Scheduled," identifying it as the site that still needs the update.

This gap analysis is the starting point for an upgrade campaign.


# Environment Types

## Development, Staging, Production, DR

The Environment Type lookup classifies the purpose of an environment:

| Type | Purpose |
|------|---------|
| Production | Live, customer-facing |
| Staging | Pre-production validation |
| Development | Developer sandbox |
| QA | Quality assurance testing |
| DR | Disaster recovery |

Both Deployment and CR Deployment Site reference this lookup, but with different semantics. A Deployment's environment tells you which environment tier the deployment targeted. A CR Deployment Site's environment tells you what role the site plays in the infrastructure.

## Designing Your Environment Hierarchy

Most organizations have three to five environment types. Keep the list short and well-defined. Every environment type you add is a layer in your deployment pipeline.

If your organization uses blue-green deployments, you might add "Blue" and "Green" as environment types. If you have a performance testing environment separate from QA, add "Performance." But only add types for environments that are formally managed and tracked.

## How Environments Relate to Sites and Deployments

A CR Deployment Site has one environment type (its primary purpose). A Deployment also has one environment type (the target of that specific deployment action). A single version might be deployed to multiple environments at different times, generating separate Deployment records for each.


# Multi-product Patterns

## Multiple Product Libraries Sharing the Same Site Records

The core multi-product pattern: one shared Site type, multiple product-specific Deployment Site types. Each product library has its own Deployment Site type with a product prefix.

In schema-structure.json for a two-product deployment:

```json
{
  "name": "CR Deployment Site",
  "parent": "OvocoCRM Library",
  "description": "OvocoCRM customer deployment sites"
},
{
  "name": "AN Deployment Site",
  "parent": "OvocoAnalytics Library",
  "description": "OvocoAnalytics customer deployment sites"
}
```

Both types reference the shared Site type. Both use the shared Site Status, Site Workflow Status, Site Type, Upgrade Status, and Environment Type lookups. But each has its own version reference pointing to its own product's Product Version type.

## Per-product Deployment Sites With Different Attributes

Because each product's Deployment Site is a separate type, it can have different attributes:

CR Deployment Site includes: seatCount, siteCode, serverCount, componentPackage, customerOrganization.

AN Deployment Site might include: dataIngestionVolume, retentionPeriod, analyticsModules.

The shared attributes (siteStatus, workflowStatus, siteType, environment, goLiveDate, upgradeStatus) are defined identically on both types. The product-specific attributes diverge.

## Cross-product Deployment Views for a Single Customer

The power of the two-record pattern shows in cross-product queries. To see everything deployed at Acme Corporation:

```
objectType IN ("CR Deployment Site", "AN Deployment Site") AND "site"."Name" = "Acme Corp"
```

This returns both the CRM and Analytics deployment sites for Acme Corporation in a single result set. A dashboard can show a customer's complete deployment footprint across all products.

## Tracking Per-tenant Version Status

In a multi-tenant SaaS deployment like OvocoCRM, each tenant may be on a different version. The productVersion attribute on each CR Deployment Site makes this visible directly:

- CR Acme Corp US-East: OvocoCRM 2.4.0 (upgradeStatus: Completed)
- CR GlobalTech US-West: OvocoCRM 2.3.1 (upgradeStatus: Scheduled, targetVersion: OvocoCRM 2.4.0)
- CR Meridian EU-West: OvocoCRM 2.4.0 (upgradeStatus: Completed)

A version compliance query reveals which sites are behind:

```
objectType = "CR Deployment Site" AND "siteStatus" = "Active"
  AND "upgradeStatus" IN ("Scheduled", "In Progress", "Blocked")
```

## The OvocoCRM Example: Customer Deployments

The OvocoCRM enterprise data models a SaaS product deployed across three customer sites, each with distinct characteristics.

CR Acme Corp US-East is the flagship deployment, live since February 2025. It is an on-premise deployment with 500 seats across four servers, running the latest v2.4.0. It references the "Acme Corp" Site, is linked to Acme Corporation as the customer organization, and has Sarah Chen assigned as Site Administrator on the CRM Operations team.

CR GlobalTech US-West went live in April 2025. It is a smaller on-premise deployment with 200 seats across two servers. It is the only site still on v2.3.1, with v2.4.0 as the target version and an upgrade status of "Scheduled." Its workflowStatus of "Upgrading" indicates the upgrade process has begun.

CR Meridian EU-West is the newest deployment, live since June 2025. Unlike the other two, it is a cloud-hosted deployment with 150 seats across two servers. It has already been upgraded to v2.4.0.

Three additional Sites exist in the enterprise data (Pacific Financial, Summit Education, Ovoco Internal) that do not yet have CR Deployment Site records, representing future deployment candidates or sites that only use other products in the Ovoco portfolio.

This three-site model demonstrates portfolio mode's ability to track distinct deployment characteristics (on-premise vs cloud, different seat counts, staggered upgrade status) while maintaining the unified view through the shared Site records, Site Status and Site Workflow Status lookups, and the version tracking trio of productVersion, targetVersion, and previousVersion.
