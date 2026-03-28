# System Integration Patterns

A CMDB does not live in isolation. It holds the persistent state of your infrastructure, but work happens elsewhere: in issue trackers, service desks, and project management tools. The power of a CMDB comes from connecting it to those tools so that work items reference the CIs they affect, CI state informs how work is routed, and completed work automatically updates CI records. This section covers the vendor-neutral integration patterns that apply regardless of your platform choice. For Atlassian-specific implementation (JSM Assets, Jira, Confluence), see the Atlassian Implementation Patterns section.


# Assets vs Issues: The Core Principle

## Assets Track What Is (Persistent State)

An asset record, in CMDB terms a configuration item, answers the question: what is the current state of this thing? A Deployment Site record tells you which product version is installed at which customer location, when it went live, and what its current operational status is. A Product Version record tells you the version number, its release date, which components it includes, and whether it is current, deprecated, or retired.

Asset records persist. A Deployment Site record exists from the moment the site is provisioned until long after it is decommissioned. A Product Version record exists forever as part of the release history. A Baseline record captures a point-in-time configuration snapshot that never changes.

In CMDB-Kit's schema, these are the types that live in the four branches: Product CMDB types (Application, Server, Database, Product Component, Hardware Model, Network Segment, Virtual Machine), Product Library types (Product Version, Document, Deployment, Baseline, Documentation Suite, Product Media, Product Suite, Certification, Deployment Site, Distribution Log), Directory types (Organization, Team, Person, Location, Facility, Vendor), and Lookup Types (all status and classification enumerations).

## Issues Track What Needs to Happen (Temporary Work)

An issue, whether it is a service request, a change request, or a problem report, answers the question: what work needs to happen? A media distribution request says "ship version 2.3.1 to Acme Corp." A change request says "modify the authentication module to support SSO." A problem report says "the export function fails when the dataset exceeds 10,000 rows."

Issues are temporary. They open when work begins and close when work finishes. A media distribution request opens, moves through preparation and shipping, and resolves when the media is delivered. The request disappears from active queues. But the Distribution Log record it created in the CMDB persists as a permanent audit record of what was shipped, when, and to whom.

## Decision Matrix: Where Each Item Type Belongs

A single test separates assets from issues: does the item survive after the work is done? If a site registration request closes and the deployment site continues to exist, the site is an asset and the registration is an issue. If a change request closes and the modification persists in the codebase, the modification is an asset (tracked as a new Product Version or updated Product Component) and the change request is an issue.

| Item | System | Why |
|------|--------|-----|
| Deployment Site | CMDB (Asset) | Persists for years, tracks current state |
| Product Version | CMDB (Asset) | Permanent release record |
| Baseline | CMDB (Asset) | Immutable point-in-time snapshot |
| Distribution Log | CMDB (Asset) | Permanent audit trail of deliveries |
| Document | CMDB (Asset) | Controlled artifact with lifecycle |
| Organization | CMDB (Asset) | Reference data used by many records |
| Media Distribution Request | Issue Tracker | Temporary work, closes when media is shipped |
| Change Request | Issue Tracker | Temporary work, closes when change is implemented |
| Problem Report | Issue Tracker | Temporary work, closes when defect is fixed |
| Site Registration | Issue Tracker | Temporary work, closes when site is provisioned |
| Site Upgrade | Issue Tracker | Temporary work, closes when upgrade is verified |
| Document Review Report | Issue Tracker | Temporary work, closes when document is approved |

When you are unsure, six diagnostic questions help:

1. Does it have an assignee? Probably an issue.
2. Does it have a due date or SLA? Probably an issue.
3. Does it close when work is done? Definitely an issue.
4. Is it reference data that other items point to? Probably an asset.
5. Do you need to query its current state independently of any work? Probably an asset.
6. Does it exist independent of any work request? Definitely an asset.


# Common Integration Scenarios

The four integration patterns between assets and issues appear in every CMDB deployment. Each pattern has a direction (issue to asset, or asset to issue), a trigger, and a CMDB effect.

## New Site Deployment: CI Persists After Epic Closes

A customer signs a contract for OvocoCRM. The deployment team creates a site registration request. While the request is open, the team provisions infrastructure, configures the application, runs acceptance tests, and trains users. When all work is complete, the request resolves.

But the site does not disappear when the request closes. The Deployment Site CI in the CMDB persists with its current version, its status (now "Active"), its location, and its organization reference. The site registration request was temporary work. The Deployment Site is permanent state.

In the CMDB, the request creates or updates these assets:

```json
{
  "Name": "CR Acme Corp US-East",
  "product": "OvocoCRM",
  "productVersion": "OvocoCRM 2.3.1",
  "siteStatus": "Active",
  "organization": "Acme Corp",
  "primaryLocation": "US-East",
  "goLiveDate": "2025-06-15"
}
```

The site registration request is an issue. The Deployment Site is an asset. The request's completion triggers the asset's creation or status update.

## Media Distribution: Request Closes, Distribution Log Persists

A CM analyst receives a request to ship OvocoCRM 2.4.0 to a deployment site. The analyst prepares the media (selecting the correct Product Media records), packages it with the documentation (from the Documentation Suite), and ships it. When the site confirms receipt, the request resolves.

The Distribution Log CI persists as an audit record:

```json
{
  "Name": "DIST-2025-0147",
  "deploymentSite": "CR Acme Corp US-East",
  "productVersion": "OvocoCRM 2.4.0",
  "distributionDate": "2025-07-10",
  "distributionStatus": "Completed",
  "deliveryMethod": "Secure Transfer"
}
```

The media distribution request is gone from active queues. The Distribution Log remains, answering the question "what was shipped to this site, and when?" for years to come.

## Software Release: Version CI With Multi-site Deployments

A new product version moves through its lifecycle: Development, Testing, Staging, Current. At each stage, the Product Version CI's status updates. When the version reaches "Current," the release team creates upgrade work items for each deployment site that needs it.

The version CI exists before, during, and after the upgrade work:

```json
{
  "Name": "OvocoCRM 2.4.0",
  "versionNumber": "2.4.0",
  "versionStatus": "Current",
  "releaseDate": "2025-07-01",
  "previousVersion": "OvocoCRM 2.3.1"
}
```

Multiple site upgrade requests reference this single version CI. Each request is independent work (upgrading one site), but they all point to the same asset. When all upgrade requests complete, the version CI still exists, and the previous version's status changes to "Deprecated."

## Incident to CI Linkage

When an incident occurs, the issue links to the affected CI. A problem report about the OvocoCRM export function references the CR Application asset. This linkage serves two purposes: it gives the incident responder immediate context about the affected system (what version, what components, what deployment sites run it), and it builds a history on the CI record showing all incidents that have affected it.

Over time, querying "all incidents linked to this application" reveals patterns. If the export module generates more incidents than other components, that signals a design or testing gap.

## Change Request to Affected CI Mapping

A change request does not just describe what to change. It references the specific CIs that will be affected: the Application, the Product Components being modified, the Deployment Sites that will need upgrades, the Baselines that may need updating, and the Documents that may need revision.

These references make impact assessment concrete. Instead of "this change affects the authentication module," the change request links to "CR Product Component: Authentication Module" and the reviewer can query "which deployment sites run versions that include this component?" The CMDB answers the impact question with data, not guesswork.


# Linking Patterns

## Asset Fields in Jira Issues

The most common linking pattern is an asset reference field on a Jira issue. The field presents a picker that searches the CMDB and lets the user select one or more CI records. When the user selects a Deployment Site on a media distribution request, the issue carries a direct reference to that CI's record in the CMDB.

These fields can cascade. The user selects a Product first, then the Product Version field filters to show only versions belonging to that product, and the Deployment Site field filters to show only sites running that product. This cascade prevents data entry errors and guides the user through a logical selection sequence.

In CMDB-Kit terms, the cascade works through reference traversal. The Product Version field filters by `"Product" = selected_product`. The Deployment Site field filters by `"Product" = selected_product AND "Site Status" = "Active"`. Each downstream field narrows its options based on upstream selections.

The Atlassian Implementation Patterns section covers the exact field configuration, AQL syntax, and tiered dependency model for implementing cascading fields in JSM.

## Jira Issue References in Asset Records

The reverse pattern is less common but equally useful: a reference from a CI record to a Jira issue. Some CMDB platforms support a "connected tickets" concept where you can query which issues are linked to a given asset.

This enables questions like "does this deployment site have any open issues?" or "has this product version been the subject of any problem reports?" The CMDB becomes an aggregation point: the CI record shows not just its current state, but also what work is happening around it.

## Bidirectional Traceability

The combination of both directions creates bidirectional traceability. From any issue, you can see which CIs it affects. From any CI, you can see which issues reference it. This is essential for configuration management because it answers audit questions in both directions:

Forward: "What did change request CR-1047 affect?" Navigate from the issue to its linked CIs: the Product Component that was modified, the Product Version that includes the change, the Deployment Sites that received the update, and the Distribution Logs recording the delivery.

Backward: "What is the history of this deployment site?" Navigate from the CI to its linked issues: the site registration that created it, the upgrade requests that updated it, the problem reports filed against it, and the distribution logs for every media delivery.


# AQL Fundamentals

AQL (Assets Query Language) is the query language for JSM Assets. While this is an Atlassian-specific technology, the concepts it implements are universal to any CMDB query system. The patterns described here apply whether your platform uses AQL, a GraphQL API, a REST query endpoint, or a proprietary query language.

## Operators: Equals, Not Equals, IN, LIKE, IS EMPTY

Every CMDB query language needs basic comparison operators. In AQL:

The equals operator `=` performs case-insensitive matching. `"Version Status" = "current"` matches records where the status is "Current." Use the double-equals `==` operator for case-sensitive matching when precision matters.

The `!=` operator excludes values. `"Site Status" != "Decommissioned"` returns all sites that are not decommissioned.

The `IN` operator matches any value in a list. `"Version Status" IN ("Current", "Beta")` returns versions that are either current or in beta. `NOT IN` does the opposite.

The `LIKE` operator performs substring matching. `"Name" LIKE "Acme"` matches "Acme Corp", "Acme Industries", and any other name containing "Acme."

The `IS EMPTY` and `IS NOT EMPTY` operators check for null values. `"Product Version" IS EMPTY` finds deployment sites that have no assigned version, a data quality concern.

## Comparison Operators for Dates and Numbers

Date and numeric comparisons use the standard `>`, `<`, `>=`, `<=` operators. `"Release Date" >= "2025-01-01"` returns versions released this year or later. `"Seat Count" > 100` returns sites with more than 100 seats.

## Functions: startOfDay, now, currentUser

Built-in functions make date-relative queries possible without hard-coding dates.

`startOfDay()` returns the beginning of the current day. Add an offset for relative ranges: `startOfDay(-30d)` is 30 days ago, `startOfDay(-90d)` is 90 days ago.

`now()` returns the current timestamp with optional offset: `now("+30d")` is 30 days from now.

These functions enable queries like "sites that went live in the last 90 days":

```
"Go Live Date" >= startOfDay(-90d) AND "Site Status" = "Active"
```

Or "certifications expiring within 30 days":

```
"Expiration Date" <= now("+30d") AND "Certification Status" = "Active"
```

`currentUser()` returns the logged-in user, useful for personalized views: "show me CIs assigned to my team."

## Relationship Functions: inboundReferences, outboundReferences

Reference traversal functions let you query based on relationships between CI types.

`inboundReferences()` finds objects that are referenced by other objects. If Deployment Site records have a "Product Version" reference field pointing to Product Version records, then from the Product Version's perspective, those Deployment Sites are inbound references.

`outboundReferences()` goes the other direction: from an object to the objects it references.

These functions enable queries like "find all product versions that have at least one active deployment site":

```
objectType = "CR Product Version"
AND object IN inboundReferences(
  objectType = "CR Deployment Site" AND "Site Status" = "Active"
)
```

This returns only versions that are actually deployed somewhere, filtering out versions that exist in the library but have no live installations.

## HAVING Clause for Relationship Counting

The `HAVING` clause filters objects based on the count of their relationships, not just the existence of relationships.

```
objectType = "CR Product Version"
HAVING inboundReferences(objectType = "CR Deployment Site") > 10
```

This returns versions deployed to more than 10 sites. Compare with the `IN inboundReferences()` pattern: `IN` asks "does any matching reference exist?" while `HAVING` asks "how many matching references exist?"

The most powerful use of `HAVING` is gap detection:

```
objectType = "CR Product Component"
HAVING inboundReferences(objectType = "CR Product Version") = 0
```

This finds components that are not included in any product version, an orphan that may indicate a data entry gap or a deprecated component that was never cleaned up.

When to use each pattern:

Use `IN inboundReferences()` when you need to filter by the referenced object's attributes (find versions referenced by active sites). Use `HAVING` when you need to count relationships (find versions deployed to more than 10 sites, or find components with zero references).

## Dot Notation for Traversal

Dot notation navigates through reference chains without subqueries. If a Deployment Site has a "Product Version" reference, and that Product Version has a "Version Status" attribute, you can query:

```
objectType = "CR Deployment Site"
AND "Product Version"."Version Status" = "Deprecated"
```

This finds deployment sites running deprecated versions without writing a nested query. The dot notation traverses the reference: start at Deployment Site, follow the Product Version reference, read that version's status.

Dot notation chains can go multiple levels deep. To find deployment sites where the product version's product has a specific name:

```
"Product Version"."Product"."Name" = "OvocoCRM"
```

This is particularly useful in cascading field configurations where a downstream field needs to filter based on an attribute several references away from the current object.


# AQL Query Patterns

## Finding Objects by Status

The most basic operational query: find all objects of a type in a specific state.

```
objectType = "CR Deployment Site" AND "Site Status" = "Active"
```

Combine with `IN` for multiple statuses:

```
objectType = "CR Deployment Site"
AND "Site Status" IN ("Provisioning", "Installing")
```

These queries power operational dashboards: "how many sites are active?", "how many are in the provisioning pipeline?"

## Finding Objects by Relationship

Find objects based on what they reference or what references them.

Deployment sites for a specific organization:

```
objectType = "CR Deployment Site"
AND "Organization" = "Acme Corp"
```

Product versions that include a specific component:

```
objectType = "CR Product Version"
AND "Components" = "CR Authentication Module"
```

Distribution logs for a specific deployment site:

```
objectType = "CR Distribution Log"
AND "Deployment Site" = "CR Acme Corp US-East"
```

## Component Hierarchy Queries

Navigate the product decomposition hierarchy. Components belong to versions, versions belong to products:

```
objectType = "CR Product Component"
AND "Product" = "OvocoCRM"
```

Find all versions that include a specific component (useful for impact analysis):

```
objectType = "CR Product Version"
AND object IN inboundReferences(
  objectType = "CR Product Component" AND "Name" = "CR Export Module"
)
```

## Gap Detection Queries

Gap detection queries find data quality issues: records missing required relationships.

Deployment sites with no assigned version:

```
objectType = "CR Deployment Site"
AND "Site Status" = "Active"
AND "Product Version" IS EMPTY
```

Product versions with no components listed:

```
objectType = "CR Product Version"
AND "Components" IS EMPTY
```

Documents not linked to any documentation suite:

```
objectType = "CR Document"
HAVING inboundReferences(objectType = "CR Documentation Suite") = 0
```

Organizations with no personnel records:

```
objectType = "Organization"
HAVING inboundReferences(objectType = "Person") = 0
```

Active deployment sites that have never received a distribution:

```
objectType = "CR Deployment Site"
AND "Site Status" = "Active"
HAVING inboundReferences(objectType = "CR Distribution Log") = 0
```

Run these queries regularly. They are the CMDB equivalent of unit tests: they catch problems before those problems affect operational decisions.

## Capacity and Coverage Reporting

Deployment count per status:

```
objectType = "CR Deployment Site" AND "Site Status" = "Active"
```

Run once per status value (Active, Provisioning, Maintenance, Decommissioned) to build a status distribution chart.

Version adoption across the deployment base:

```
objectType = "CR Deployment Site"
AND "Site Status" = "Active"
AND "Product Version" = "OvocoCRM 2.4.0"
```

Compare the count against the total active sites to get a version adoption percentage.

Certification coverage:

```
objectType = "CR Certification"
AND "Certification Status" = "Active"
AND "Expiration Date" <= now("+60d")
```

Returns certifications that are still active but approaching expiration, so the organization can plan renewals.

## Multi-product Views

When multiple products share a schema, cross-product queries combine type names with `IN`:

```
objectType IN ("CR Deployment Site", "AN Deployment Site")
AND "Site Status" = "Active"
```

This returns a portfolio-wide view of all active deployment sites across products. For a single customer across products:

```
objectType IN ("CR Deployment Site", "AN Deployment Site")
AND "Organization" = "Acme Corp"
```

This shows everything deployed at Acme Corp regardless of product, answering portfolio-level questions.


# Portability

## Using Object Type Names Instead of Numeric IDs

CMDB platforms internally assign numeric IDs to object types, attributes, and values. A query using numeric IDs works on one instance but breaks when moved to another:

```
objectTypeId = 171 AND attribute_85 = "Active"
```

This query is meaningless to anyone reading it and will fail on any other instance where the IDs differ.

Always use human-readable names:

```
objectType = "CR Deployment Site" AND "Site Status" = "Active"
```

This query works on any instance with the same schema, is self-documenting, and can be version-controlled alongside the schema files.

## Writing Queries That Survive Schema Changes

Beyond using names instead of IDs, portable queries follow two practices:

Quote attribute names that contain spaces. `"Site Status"` is correct. `Site Status` without quotes will fail or be misinterpreted.

Use the display name for attributes, not the internal camelCase name. The schema defines `siteStatus` as the attribute key, but AQL uses the display name `"Site Status"` (Title Case). This is a common source of confusion when moving between schema files and query tools.

Reference object types by their full prefixed name. `"CR Deployment Site"` is correct. `"Deployment Site"` will match a different type or fail in a multi-product schema.


# Dashboard Integration

## AQL in JQL Filters

Some platforms allow CMDB queries inside work management filters. In the Atlassian ecosystem, the `aqlFunction()` JQL function finds Jira issues that link to specific assets:

```
"Deployment Site" in aqlFunction(
  "objectType = 'CR Deployment Site' AND 'Site Status' = 'Active'"
)
```

This JQL filter returns all Jira issues whose Deployment Site field references an active site. Combine with standard JQL:

```
project = CMDB AND status = Open
AND "Deployment Site" in aqlFunction(
  "objectType = 'CR Deployment Site' AND 'Site Status' = 'Degraded'"
)
```

This returns open issues for degraded sites, useful for an operations dashboard showing sites that need attention.

The reverse function, `connectedTickets()` in AQL, finds assets that have linked Jira issues:

```
objectType = "CR Deployment Site"
AND object HAVING connectedTickets("status != Done")
```

This returns deployment sites with open issues, highlighting assets that have active work in progress.

## AQL Gadgets for Dashboards

CMDB-aware dashboard gadgets display live CI data alongside work management data. In JSM, the Assets Object List gadget shows a filtered set of CI records on a Jira dashboard. The Assets Object Count gadget shows a count.

Configure each gadget with an AQL query:

Active deployment sites: `objectType = "CR Deployment Site" AND "Site Status" = "Active"`

Versions in pipeline: `objectType = "CR Product Version" AND "Version Status" IN ("Beta", "Current")`

Sites pending installation: `objectType IN ("CR Deployment Site", "AN Deployment Site") AND "Site Status" IN ("Provisioning", "Installing")`

Place these gadgets alongside JQL gadgets (open issues by type, issue trend charts) to create unified dashboards showing both CI state and work status.

## Real-time CMDB Views in Jira

When an agent opens a Jira issue that has asset reference fields, the linked CI's attributes display inline on the issue. This gives the agent immediate context: the site's current version, its status, its organization, its location. The agent does not need to navigate away from the issue to the CMDB to understand what they are working with.

Configure which CI attributes display on the issue view. For a Deployment Site reference, useful attributes include: Name, Site Status, Product Version, Primary Location, and Organization. For a Product Version reference: Name, Version Number, Release Date, and Version Status.

This integration turns every Jira issue into a contextualized work item. The agent sees not just "upgrade Acme Corp" but "upgrade CR Acme Corp US-East, currently running OvocoCRM 2.3.1, status Active, located at US-East datacenter, customer Acme Corp."


# Cross-System Reporting

## The Export-and-Join Pattern

Sometimes the queries you need span multiple object types in ways that the native query language cannot handle in a single query. The export-and-join pattern addresses this:

1. Export each relevant object type as CSV or JSON from the CMDB
2. Load the exports into a reporting tool (Excel, Power BI, Python pandas, or a database)
3. Join the tables using the reference fields (the Name column in one export matches the reference value in another)
4. Build the cross-type reports

Common joins for deployment reporting:

| Left Table | Join Column | Right Table | Join Column |
|------------|-------------|-------------|-------------|
| Deployment Site | organization | Organization | Name |
| Deployment Site | productVersion | Product Version | Name |
| Deployment Site | primaryLocation | Location | Name |
| Distribution Log | deploymentSite | Deployment Site | Name |
| Product Version | previousVersion | Product Version | Name |

This pattern is particularly useful for:

Site inventory reports: Deployment Site joined with Organization and Location to produce a full site roster with customer and geographic details.

Distribution audit reports: Distribution Log joined with Deployment Site and Product Version to show what was shipped, where, and which version.

Version adoption reports: Deployment Site joined with Product Version, grouped by version, showing how many sites run each version.

## Reporting Across Products

In a multi-product schema, the same join pattern works across product-prefixed types. Export CR Deployment Site and AN Deployment Site separately, then combine them in the reporting tool. Add a "Product" column to distinguish rows, and you have a portfolio-wide deployment report.

```
CR Deployment Site + AN Deployment Site
  → Join with Organization on organization = Name
  → Join with Location on primaryLocation = Name
  → Result: every deployment site across all products with customer and location
```

This portfolio view is one of the key benefits of a shared schema. Both products' deployment sites reference the same Organization and Location records, so the join works seamlessly.


# Anti-Duplication Principles

## What Not to Create

Maintaining both an asset record and an issue for the same thing creates synchronization problems. The rules:

Do not create an issue to track "site exists." The Deployment Site CI in the CMDB already tracks the site's existence and state. An issue is only needed when work is being done on that site (registration, upgrade, decommission).

Do not create a CMDB asset for "work in progress." A change request is temporary work. It does not need a CI record. The changes it produces (new version, updated component, modified baseline) are the assets.

Do not maintain a spreadsheet for data that already exists in either system. If you need to know which sites are active, query the CMDB. If you need to know which requests are open, query the issue tracker. A spreadsheet that duplicates either is immediately stale.

Do not manually synchronize status between systems. If an issue resolves and the CI should update, build that as an automation rule, not a manual step. Manual synchronization is the most common source of data quality degradation in a CMDB.

## The Automation Imperative

Every integration point between your CMDB and your issue tracker should be automated. When a site registration resolves, an automation rule creates the Deployment Site CI. When a media distribution completes, an automation rule updates the Distribution Log. When a certification approaches expiration, an automation rule creates a renewal task.

Manual handoffs between systems are where data quality dies. An analyst who forgets to update the CMDB after closing an issue creates a gap that compounds over time. Automation eliminates that gap.

The Atlassian Implementation Patterns section provides complete automation rule configurations for each integration point.


# Putting It Together: The OvocoCRM Example

A site manager at Acme Corp needs OvocoCRM upgraded from version 2.3.1 to 2.4.0. Here is how the integration patterns work across the full workflow:

Step 1: The site manager submits a site upgrade request through the service portal. The request form cascades: they select Product (OvocoCRM), then Site (CR Acme Corp US-East, filtered to active sites for OvocoCRM), and the current version auto-populates from the site's record. They select the target version (OvocoCRM 2.4.0, filtered to available versions).

Step 2: The issue routes to the CM Distribution queue. The agent opens the issue and sees the linked Deployment Site's attributes inline: current version 2.3.1, status Active, location US-East, organization Acme Corp. The agent also sees the target Product Version's attributes: version 2.4.0, status Current, release date 2025-07-01.

Step 3: The agent prepares the upgrade media. They reference the Product Media records in the CMDB to identify the correct artifacts, verify checksums, and package the delivery. A media distribution request is created as a sub-task.

Step 4: The media is shipped. The media distribution request moves through its workflow (Preparing Media, Shipping, Waiting for Customer). When the site confirms receipt, the media request resolves, and an automation rule creates a Distribution Log record in the CMDB.

Step 5: The site installs and verifies the upgrade. When verification passes, the site upgrade request resolves. An automation rule updates the Deployment Site CI: productVersion changes from "OvocoCRM 2.3.1" to "OvocoCRM 2.4.0", and the upgrade status clears.

Step 6: The CMDB now reflects reality. The Deployment Site shows the new version. The Distribution Log records the delivery. The old version "OvocoCRM 2.3.1" can be queried to see how many sites still run it. When the last site upgrades away from 2.3.1, that version's status changes to "Retired."

Throughout this workflow, the CMDB held the persistent state (site, version, distribution log), the issue tracker managed the work (upgrade request, media distribution), and automation kept them synchronized. No manual data entry was needed in the CMDB. No spreadsheet tracked the upgrade progress. The integrated system handled it all.
