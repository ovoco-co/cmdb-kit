# Designing Site Deployments

Deployment sites are where your product meets the real world. Every customer location, every regional instance, every tenant running your software is a deployment site in the CMDB. This chapter covers how CMDB-Kit models deployment sites, the two-record pattern that enables multi-product tracking at a single customer, the related record types that connect sites to locations, organizations, and personnel, and the operational patterns for tracking what version is deployed where.


# The Two Record Types

## Site: The Shared Identity Record

A Site is the simplest possible record: just a Name. It represents a customer location as a shared identity that all products recognize. When Acme Corp deploys both OvocoCRM and OvocoAnalytics, there is one Site record called "Acme Corp" that both products reference.

The Site type does not exist in CMDB-Kit's current extended schema. It is a pattern recommended for multi-product deployments. Adding it is straightforward: a type with no attributes beyond the implicit Name, placed in the Directory branch or at the root level so all product libraries can reference it.

## Deployment Site: The Product-specific Record

A Deployment Site is the product-specific record that tracks everything about a particular product's deployment at a customer location. It carries the version installed, the environment type, the site status, the go-live date, and a reference to the shared Location.

The Deployment Site attributes in the extended schema:

```json
"Deployment Site": {
  "description": { "type": 0 },
  "location": { "type": 1, "referenceType": "Location" },
  "status": { "type": 1, "referenceType": "Site Status" },
  "environment": { "type": 1, "referenceType": "Environment Type" },
  "goLiveDate": { "type": 0, "defaultTypeId": 4 }
}
```

The OvocoCRM example has three deployment sites:

```json
[
  {
    "Name": "US East (Virginia)",
    "description": "Primary US production region",
    "status": "Active",
    "environment": "Production",
    "goLiveDate": "2025-06-15"
  },
  {
    "Name": "US West (Oregon)",
    "description": "Secondary US production region",
    "status": "Active",
    "environment": "Production",
    "goLiveDate": "2025-09-01"
  },
  {
    "Name": "EU West (Frankfurt)",
    "description": "European production region",
    "status": "Provisioning",
    "environment": "Production",
    "goLiveDate": "2026-06-01"
  }
]
```

## Why the Split Matters

Without the two-record pattern, a multi-product deployment creates a naming problem. If Acme Corp deploys both OvocoCRM and OvocoAnalytics, do you create one Deployment Site called "Acme Corp" and somehow track two products in it? Or do you create two unrelated records ("Acme Corp CRM" and "Acme Corp Analytics") that have no formal connection?

The two-record pattern solves this cleanly:

```
Site: "Acme Corp"
  ├── CR Deployment Site: "CR Acme Corp"  (OvocoCRM, v2.3.1, Active)
  └── AN Deployment Site: "AN Acme Corp"  (OvocoAnalytics, v1.0.0, Provisioning)
```

Each Deployment Site has its own version, status, environment, and go-live date. The shared Site record ties them together. When you need a cross-product view ("show me everything deployed at Acme Corp"), you query all Deployment Sites that reference the "Acme Corp" Site.


# Site as a Shared Identity

## A Site Has Only a Name

The Site type is intentionally minimal. It carries only a Name attribute. No version, no status, no environment. Those product-specific details belong on the Deployment Site records.

This minimalism is the point. A Site record says: "This customer location exists." Nothing more. Every product-specific fact lives on that product's Deployment Site record.

## Sites Live in the Shared Library

In a multi-product schema, Site records live outside any product-specific branch. They belong in the Directory branch or in a shared root-level area. This makes them visible to all product libraries without duplication.

## All Product Libraries Reference the Same Site Records

When you add a Deployment Site for a new product at an existing customer, you reference the same Site record. Adding OvocoAnalytics to Acme Corp does not create a new Site. It creates a new AN Deployment Site that references the existing "Acme Corp" Site.

## Adding a New Customer Means Adding One Site Record

When a new customer comes on board, you add one Site record. Then you add a Deployment Site record for each product they are deploying. If they start with OvocoCRM and add OvocoAnalytics later, the second Deployment Site references the same Site created during the first onboarding.

The decision tree:

- New customer, new product: create both Site and Deployment Site
- Existing customer, new product: create only the Deployment Site, reference the existing Site
- Existing customer, version upgrade: update the existing Deployment Site (do not create a new one)


# Deployment Site as a Product Record

## Each Product Library Has Its Own Deployment Sites

In a multi-product schema with product prefixes, each product library has its own Deployment Site type:

- CR Deployment Site (under CR Library, for OvocoCRM)
- AN Deployment Site (under AN Library, for OvocoAnalytics)

These are separate types in schema-structure.json, each with their own attribute set. This allows products to track different attributes. OvocoCRM might track seat count. OvocoAnalytics might track data ingestion volume. Both share the common fields (status, environment, go-live date) but can diverge where needed.

In the base CMDB-Kit schema (without product prefixes), there is a single Deployment Site type. This works well for single-product deployments or when all products share the same attributes.

## Deployment Site References a Site

Each Deployment Site record carries a reference to its parent Site record. In schema-attributes.json for a multi-product deployment, this looks like:

```json
"CR Deployment Site": {
  "site": { "type": 1, "referenceType": "Site" },
  "productVersion": { "type": 1, "referenceType": "CR Product Version" },
  "status": { "type": 1, "referenceType": "Site Status" },
  "environment": { "type": 1, "referenceType": "Environment Type" },
  "goLiveDate": { "type": 0, "defaultTypeId": 4 }
}
```

The site attribute is the link back to the shared identity. The productVersion attribute (not in the base schema but recommended for multi-product deployments) tracks which version is installed.

## Product-specific Attributes: Version, Classification, Network Domains, Seats

Beyond the base attributes, production deployments often need additional fields. Common extensions:

- productVersion: reference to the currently installed Product Version
- targetVersion: reference to the version being deployed next (used during upgrades)
- previousVersion: reference to the version installed before the current one
- classification: security classification of the site (for classified environments)
- networkDomains: text listing the network domains the site connects to
- seatCount: integer tracking the number of licensed seats
- upgradeStatus: text or lookup tracking upgrade campaign progress

These are extensions you would add to schema-attributes.json for your specific deployment. The base schema keeps Deployment Site simple. Your organization adds what it needs.

## Deployment Site Status and Workflow Progress

The Site Status lookup tracks operational availability:

| Status | Meaning |
|--------|---------|
| Active | Site is operational |
| Provisioning | Site is being set up |
| Maintenance | Site is under maintenance |
| Decommissioned | Site has been shut down |

For organizations with complex deployment lifecycles, a separate workflowStatus attribute can track finer-grained progress. Production environments often use 10-20 workflow states covering everything from procurement through engineering to go-live and sustainment. These extended states are best modeled as a custom lookup type (e.g., "Site Workflow Status") rather than overloading the shared Site Status.

## Teams and Dates per Deployment Site

Each Deployment Site can reference the teams responsible for it:

- installerTeam: reference to the Team that handles installation
- supportTeam: reference to the Team that handles ongoing support

And date fields track the deployment timeline:

- goLiveDate: when the site became operational
- installDate: when installation was completed
- lastUpgradeDate: when the most recent upgrade was applied


# Related Record Types

The base Deployment Site attributes cover the essentials, but production deployments need to track relationships between sites and locations, organizations, and people. CMDB-Kit recommends extending the schema with relationship types for these connections.

## Site Location Assignment

### Linking a Deployment Site to Physical Locations

A Site Location Assignment links a Deployment Site to a Location record, with a qualifier that explains the nature of the link.

This is a proposed extension type with attributes like:

```json
"Site Location Assignment": {
  "deploymentSite": { "type": 1, "referenceType": "Deployment Site" },
  "location": { "type": 1, "referenceType": "Location" },
  "locationType": { "type": 0 },
  "status": { "type": 0 }
}
```

### Location Type: Primary, Alternate

The locationType attribute classifies the relationship. "Primary" means this is where the site's main infrastructure lives. "Alternate" means this is a secondary or backup location.

### When a Deployment Spans Multiple Buildings or Facilities

Some deployments span multiple physical locations. A military deployment might have servers in one building, workstations in another, and a disaster recovery site in a third. Site Location Assignment records capture this: one Deployment Site with three location assignments, each with its own type (Primary, Operations, DR).

## Site Org Relationship

### Linking a Deployment Site to Organizations

A Site Org Relationship links a Deployment Site to an Organization record, qualifying who the organization is in relation to the site.

```json
"Site Org Relationship": {
  "deploymentSite": { "type": 1, "referenceType": "Deployment Site" },
  "organization": { "type": 1, "referenceType": "Organization" },
  "relationshipType": { "type": 0 }
}
```

### Relationship Type: Host, Customer

"Host" means the organization provides the infrastructure. "Customer" means the organization uses the deployed product. These are often different: a managed service provider (host) runs the servers that a client organization (customer) uses.

### Host Organization vs Customer Organization

Understanding this distinction matters for support routing. When a hardware issue occurs at a site, you contact the host organization. When a user has a product question, you contact the customer organization. The Site Org Relationship makes this routing explicit.

## Site Personnel Assignment

### Linking a Person to a Deployment Site With a Deployment Role

A Site Personnel Assignment links a Person to a Deployment Site with a role qualifier from the Deployment Role lookup.

```json
"Site Personnel Assignment": {
  "deploymentSite": { "type": 1, "referenceType": "Deployment Site" },
  "person": { "type": 1, "referenceType": "Person" },
  "role": { "type": 1, "referenceType": "Deployment Role" }
}
```

### Standard Roles: Site Lead, Alternate POC, Field Engineer, Site Administrator

The Deployment Role lookup in the extended schema provides five values (Developer, Operator, Manager, Architect, SRE). For site-specific assignments, you would extend this lookup or create a dedicated "Site Role" lookup with values like:

- Site Lead: primary point of contact at the customer site
- Alternate POC: backup contact when the Site Lead is unavailable
- Field Engineer: on-site engineer responsible for installation and maintenance
- Site Administrator: the person who manages the deployed system day-to-day

### Additional Roles: System Administrator, Installer, Support Engineer

Larger deployments might also track:

- System Administrator: manages the underlying infrastructure (OS, network, storage)
- Installer: the person who performed the initial installation
- Support Engineer: the person assigned for ongoing support calls

These role assignments answer a critical operational question: "Who do I call about the OvocoCRM deployment at Acme Corp?" The answer is in the Site Personnel Assignment records.

## Support Team

### installerTeam and supportTeam Attributes on Deployment Site

In addition to individual personnel assignments, the Deployment Site can reference teams:

The installerTeam attribute references the Team responsible for initial installation and upgrades. When a new version needs to be deployed, this is the team that does the work.

The supportTeam attribute references the Team that handles day-to-day support requests. When a customer at this site reports a problem, this is the team that responds.

### Tracking Which Team Handles Installation

The installerTeam reference is especially important during upgrade campaigns. When you need to upgrade 50 sites to a new version, the installer team assignment tells you which team is responsible for each site. This enables workload balancing and scheduling.

### Tracking Which Team Handles Ongoing Support

The supportTeam reference enables routing. When a support ticket comes in from a specific site, the system can look up the site's support team and route the ticket accordingly.


# Designing Your Site Model

## One Site Per Customer vs Per Region vs Per Environment

The most important design decision is what a "site" represents in your context:

One site per customer. Each customer organization gets one Site record. Deployment Sites represent their regional or product-specific instances. This is the OvocoCRM model: "US East (Virginia)" and "US West (Oregon)" are both deployment sites under an implied customer identity.

One site per region. Each geographic region gets one Site record. This works when geography is the primary organizing principle and customers may share regional infrastructure.

One site per environment. Each environment (production, staging, DR) gets its own site record. This works for internal deployments where the same team manages all environments.

The right choice depends on how your organization thinks about deployments. If support calls come in as "there is a problem at Acme Corp," then one site per customer is natural. If support calls come in as "there is a problem in US-East," then one site per region makes more sense.

## Matching Sites to Your Actual Infrastructure Topology

Your site model should mirror how your operations team actually thinks about deployments. If they have a spreadsheet tracking "customer sites," each row in that spreadsheet is a candidate Deployment Site record.

Do not model theoretical topology. Model what you actually manage. If you have three production regions and one staging environment, you have four deployment sites, not a complex hierarchy of abstract zones.

## When a Site Is a Deployment Site vs a Location vs a Facility

Three types in the Directory branch can cause confusion:

A Location is a geographic entity: a city, an address, a coordinate. "Virginia" or "123 Main St, Portland, OR" is a Location.

A Facility is a physical structure: a building, a data center, a server room. "AWS US-East-1" or "Building 42" is a Facility.

A Deployment Site is an operational deployment: a running instance of your product. "OvocoCRM US East (Virginia)" is a Deployment Site.

A Deployment Site is located at a Location and might be housed in a Facility, but it is not the same thing as either. The Location exists whether or not your product is deployed there. The Facility exists whether or not your product runs in it. The Deployment Site exists only because your product is running there.


# Site Status Lifecycle

## Planned, Active, Decommissioned

The basic lifecycle has four states (from the Site Status lookup):

Provisioning. The site has been approved and setup is underway. Infrastructure is being prepared, access is being configured, media is being shipped. This is the state a site enters when a Site Registration request is approved.

Active. The site is operational. Users are using the product. Support is being provided. This is the steady state for most of a site's lifetime.

Maintenance. The site is temporarily offline for maintenance, upgrades, or infrastructure work. This is a transient state that returns to Active.

Decommissioned. The site has been permanently shut down. Media has been recalled, access has been revoked, the infrastructure has been released. This is a terminal state.

## Tracking Go-live Dates

The goLiveDate attribute records when a site transitioned from Provisioning to Active. This date matters for SLA calculations (when did the support clock start?), compliance reporting (how long has this site been operational?), and lifecycle planning (which sites are approaching their end-of-life?).

In the OvocoCRM data, US East went live on 2025-06-15, US West on 2025-09-01, and EU West has a planned go-live of 2026-06-01. EU West's status is "Provisioning" because it has not gone live yet.


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

The OvocoCRM example shows a typical deployment sequence for v2.3.1:

```json
{
  "Name": "v2.3.1 Staging Deploy",
  "description": "Staging validation of contact import hotfix",
  "version": "OvocoCRM 2.3.1",
  "environment": "Staging",
  "deployDate": "2026-02-08",
  "status": "Completed",
  "deployedBy": "Casey Morgan"
}
```

Staging first (2026-02-08), then production (2026-02-10). Two days between staging validation and production rollout.

## Deployment Status Lifecycle

Deployments progress through five states:

| Status | Meaning |
|--------|---------|
| Planned | Deployment is scheduled but not started |
| In Progress | Deployment is actively running |
| Completed | Deployment finished successfully |
| Rolled Back | Deployment was intentionally reverted |
| Failed | Deployment did not complete |

## The Relationship Chain: Product Version to Deployment to Environment Type

The Deployment type sits at the intersection of what (Product Version) and where (Environment Type):

```
Product Version "OvocoCRM 2.3.1"
  ├── Deployment "v2.3.1 Staging Deploy" (Staging, Completed)
  └── Deployment "v2.3.1 Production Deploy" (Production, Completed)
```

This lets you answer questions like: "Is v2.3.1 deployed to production?" (yes, completed on 2026-02-10) and "Who deployed it?" (Casey Morgan).


# Linking Sites to Deployments

## Distribution Log as the Bridge

The Distribution Log connects versions to sites. While the Deployment type tracks the act of deploying to an environment, the Distribution Log tracks the delivery of media to a specific site.

```
Product Version "OvocoCRM 2.3.1"
  ├── Deployment "v2.3.1 Production Deploy" (to Production environment)
  ├── Distribution Log "v2.3.1 US-East" (to US East site)
  └── Distribution Log "v2.3.1 US-West" (to US West site)
```

Deployments are environment-scoped. Distribution Logs are site-scoped. Both reference the same Product Version.

## Tracking Which Sites Have Which Version

To find which version a site is running, query the Distribution Log for the most recent distribution to that site. To find which sites have a specific version, query all Distribution Log records for that version.

In AQL terms:

```
objectType = "Distribution Log" AND "site" = "US East (Virginia)"
```

Returns all distributions to US East, sorted by date. The most recent one tells you the current version.

## Identifying Sites Behind on Updates

When a new version ships, comparing the Distribution Log against the active site list reveals which sites have not been updated:

- Active sites: all Deployment Sites with status "Active"
- Sites with the new version: all sites referenced in Distribution Log records for that version
- Sites behind: the difference between these two sets

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

Both Deployment and Deployment Site reference this lookup, but with different semantics. A Deployment's environment tells you which environment tier the deployment targeted. A Deployment Site's environment tells you what role the site plays in the infrastructure.

## Designing Your Environment Hierarchy

Most organizations have three to five environment types. Keep the list short and well-defined. Every environment type you add is a layer in your deployment pipeline.

If your organization uses blue-green deployments, you might add "Blue" and "Green" as environment types. If you have a performance testing environment separate from QA, add "Performance." But only add types for environments that are formally managed and tracked.

## How Environments Relate to Sites and Deployments

A Deployment Site has one environment type (its primary purpose). A Deployment also has one environment type (the target of that specific deployment action). A single version might be deployed to multiple environments at different times, generating separate Deployment records for each.


# Multi-product Patterns

## Multiple Product Libraries Sharing the Same Site Records

The core multi-product pattern: one shared Site type, multiple product-specific Deployment Site types. Each product library has its own Deployment Site type with a product prefix.

In schema-structure.json for a two-product deployment:

```json
{
  "name": "CR Deployment Site",
  "parent": "CR Library",
  "description": "OvocoCRM deployment at a customer site"
},
{
  "name": "AN Deployment Site",
  "parent": "AN Library",
  "description": "OvocoAnalytics deployment at a customer site"
}
```

Both types reference the shared Site type. Both use the shared Site Status and Environment Type lookups. But each has its own version reference pointing to its own product's Product Version type.

## Per-product Deployment Sites With Different Attributes

Because each product's Deployment Site is a separate type, it can have different attributes:

CR Deployment Site might include: seatCount, crmEdition (Standard/Enterprise/Professional).

AN Deployment Site might include: dataIngestionVolume, retentionPeriod, analyticsModules.

The shared attributes (status, environment, goLiveDate) are defined identically on both types. The product-specific attributes diverge.

## Cross-product Deployment Views for a Single Customer

The power of the two-record pattern shows in cross-product queries. To see everything deployed at Acme Corp:

```
objectType IN ("CR Deployment Site", "AN Deployment Site") AND "site"."Name" = "Acme Corp"
```

This returns both the CRM and Analytics deployment sites for Acme Corp in a single result set. A dashboard can show a customer's complete deployment footprint across all products.

## Tracking Per-tenant Version Status

In a multi-tenant SaaS deployment like OvocoCRM, each tenant may be on a different version. The Deployment Site records make this visible:

- Acme Corp US-East: v2.3.1 (Current)
- Acme Corp US-West: v2.3.1 (Current)
- Acme Corp EU-West: v2.3.0 (Previous, upgrade planned)

A version compliance query reveals which sites are behind:

```
objectType = "CR Deployment Site" AND "status" = "Active"
  AND "productVersion" IN (objectType = "CR Product Version" AND "status" = "Deprecated")
```

## The OvocoCRM Example: Regional Deployments

The OvocoCRM data models a SaaS product deployed across three regions:

US East (Virginia) is the primary region, live since June 2025. It was the first region to launch and has been through multiple version upgrades.

US West (Oregon) is the secondary region, live since September 2025. It launched three months after US East, giving the team time to stabilize the primary region first.

EU West (Frankfurt) is still in provisioning, with a planned go-live of June 2026. It represents the European expansion, and its "Provisioning" status reflects that infrastructure setup is underway but the product is not yet serving customers there.

Distribution Log records show that both active regions received v2.3.1 on the same day (2026-02-10), distributed by Jordan Lee. EU West has no distribution records yet because it is still being provisioned.

This three-region model demonstrates the common pattern of staggered regional rollouts: launch in one region, stabilize, expand to a second, stabilize again, then expand further. The CMDB captures each region's independent status and version while maintaining the unified view through the shared Product Version and Distribution Log references.
