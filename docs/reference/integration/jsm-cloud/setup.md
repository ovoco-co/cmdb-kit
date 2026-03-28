This document covers integrating CMDB-Kit with Jira, Confluence, and platform automation. For schema import and data sync, see the [platform setup documentation](../../Setup/atlassian-cloud.md).


# Jira Cloud Setup

## Space Types for CMDB Work

In Jira Service Management Cloud, the primary workspace is a service space (called a "service project" in older documentation). Create a service space for configuration management work using the ITSM template. This gives you built-in work categories for changes, incidents, problems, and service requests.

If your CMDB team also does software development or project tracking, create a separate Jira Software space for that work. Keep CM operational requests (media distribution, site registration, change requests) in the JSM service space where they benefit from portals, queues, SLAs, and customer-facing request types.

## Work Types for CM Requests

Cloud uses "work types" (called "issue types" in older documentation and in the underlying data model). Each work type defines the fields and workflow for a category of work.

Create these work types in your service space:

| Work Type | Work Category | Purpose |
|-----------|---------------|---------|
| Media Request | Service Request | Software media delivery to a deployment site |
| Change Request | Change | Proposed changes to products or infrastructure |
| Problem Report | Problem | Defect or service degradation reports |
| Site Registration | Service Request | New customer deployment site onboarding |
| Site Upgrade | Change | Upgrade a site to a new product version |
| Site Decommission | Change | Retire a deployment site |
| Document Request | Service Request | Controlled document delivery |
| Action Item | Service Request | General action tracking |

Work categories matter because they determine which queues, reports, and automation features are available. Change Requests assigned to the Change category get access to change management features like risk assessment and approval workflows.

## Custom Fields Overview

Assets custom fields connect work items to CMDB objects. When an agent opens a media distribution request, the Product field shows a dropdown of Product objects from Assets, and the Deployment Site field cascades from the selected product to show only that product's active sites.

Cloud has a single Assets custom field type (unlike Data Center which has three variants). You configure its behavior through scope, interaction, and portal visibility settings. The next section covers this in detail.


# Custom Fields Configuration

## The Tiered Dependency Model

Custom fields in JSM have dependencies: a Product Version field cannot cascade from a Product field unless the Product field exists first. Organizing fields into tiers makes the creation order clear. These tiers refer to import dependency order (which types must be imported before others), not to the ServiceNow adapter's table classification.

**Tier 1** fields have no dependencies. Create these first:
- Product (scoped to Product objects)
- Organization (scoped to Organization objects)

**Tier 2** fields cascade from Tier 1. Create these second:
- Product Version (cascades from Product)
- Deployment Site (cascades from Product)
- Component (cascades from Product)
- Document (cascades from Product)
- Baseline (cascades from Product)
- Affected Sites (multi-select, cascades from Product)
- Target Version (cascades from Product, filtered to deployable versions)

**Tier 3** fields cascade from Tier 2. Create these third:
- Site POC (cascades from Deployment Site)

**Tier 4** fields are standalone lookups with no cascade dependencies. Create these in any order:
- Delivery Method, Urgency, Severity, Change Type, Impact

## Creating an Assets Custom Field in Cloud

1. Go to **Settings** (gear icon) then **Issues** then **Custom fields**
2. Click **Create field**
3. Select the **Assets object** field type
4. Name the field (e.g., "Product Version")
5. Configure the three areas described below

Each Assets custom field has three configuration areas:

**Scope** defines what objects appear. Set the Object Schema to your CMDB-Kit schema key. Set the Filter Scope (AQL) to restrict which objects the field shows. For a Product Version field: `objectType = "Product Version"`. For a cascading field, add the `${FieldName}` placeholder: `objectType = "Product Version" AND "Product" = ${Product}`.

**Interaction** defines how the user selects. Choose single-select (dropdown) or multi-select (checkboxes). Configure which object attributes are searchable in the picker. Configure which attributes display on the work item view when an object is selected.

**Portal visibility** defines customer access. "Show Object Picker on Customer Portals" must be enabled for portal-facing fields. Without this, customers see a blank text box instead of a dropdown.

## Cascade Filtering with AQL

The `${FieldName}` placeholder is the mechanism for cascading selects. When a user selects a value in the Product field, the `${Product}` placeholder in dependent fields resolves to that selection. The dependent field's AQL re-evaluates, and its dropdown shows only matching objects.

### Setting up the cascade

The cascade requires a reference attribute linking child types back to the Product type. Portfolio mode already includes a `product` attribute on all relevant types (CR Product Version, CR Deployment Site, CR Document, CR Baseline, etc.). The Core schema does not include this attribute because it models a single product. If you are using the Core schema and want portal cascading, add a `product` attribute to each type that should filter by product:

In `schema-attributes.json`, add to Product Version, Deployment Site, Product Component, Document, Baseline, and any other types that should cascade:

```json
"product": { "type": 1, "referenceType": "Product" }
```

After adding the attribute, populate it in your data files. Every Product Version record needs a `"product": "OvocoCRM"` entry (matching the Name of the Product object). Then re-run the schema sync and data sync.

Once imported, the attribute displays as "Product" in Assets. The Tier 1 custom field on the Jira work item is also named "Product" and scoped to `objectType = "Product"`. When a customer selects a product on the portal, dependent fields use `${Product}` to filter their dropdowns to only show objects belonging to that product.

If you are using portfolio mode, type names include product prefixes (CR Product Version, AN Product Version). Your AQL filters should use the prefixed names: `objectType = "CR Product Version" AND "Product" = ${Product}`. See the [Data Center guide](../../Setup/atlassian-data-center.md) for portfolio mode AQL examples with prefixed type names.

### Attribute naming for clarity

CMDB-Kit uses `status` as the attribute name on multiple types (Deployment Site, Product, License, Certification). After import, all of these display as "Status" in Assets. This works because AQL scopes to `objectType`, but it can be confusing in dashboards. Consider renaming ambiguous attributes for clarity: `siteStatus` on Deployment Site (displays as "Site Status"), `versionStatus` on Product Version (displays as "Version Status"). The AQL examples below use the renamed display names.

### Cascade patterns

```
Product Version from Product:
  objectType = "Product Version" AND "Product" = ${Product}

Active Deployment Sites from Product:
  objectType = "Deployment Site" AND "Product" = ${Product}
    AND "Site Status" = "Active"

Documents from Product:
  objectType = "Document" AND "Product" = ${Product}

Baselines via Product Version traversal:
  objectType = "Baseline" AND "Version"."Product" = ${Product}

Target Version (restricted to deployable versions):
  objectType = "Product Version" AND "Product" = ${Product}
    AND "Version Status" IN ("Current", "Beta")
```

The `${FieldName}` reference is case-sensitive and must match the custom field name exactly. `${Product}` works if the field is named "Product." `${product}` does not. This is the most common configuration mistake.

## Object Attributes Displayed on Work Items

When an Assets field is selected on a work item, you can configure which object attributes display inline without clicking into the object record.

For a Deployment Site field, display: Name, Site Status, Product Version, Location. An agent processing a media distribution request sees the site's current version and status directly on the work item.

For a Product Version field, display: Name, Version Number, Release Date, Version Status. The agent sees whether the requested version is Current or Beta at a glance.

## Portal Visibility

Not every field belongs on the customer portal. Product, Deployment Site, and Urgency are customer-facing. Internal tracking fields (assigned analyst, internal notes) are agent-only.

Schema permissions must grant the customer role read access to the Assets schema. Without this, the object picker loads but shows no results. To set this, go to your schema settings and add the "Service Desk Customer" role with read access.

## Complete Field Reference

| Field Name | Assets Type | Tier | Cascade Source | AQL Filter | Multi-select | Portal |
|-----------|------------|------|---------------|-----------|-------------|--------|
| Product | Product | 1 | none | objectType = "Product" | no | yes |
| Organization | Organization | 1 | none | objectType = "Organization" | no | yes |
| Product Version | Product Version | 2 | Product | "Product" = ${Product} | no | yes |
| Deployment Site | Deployment Site | 2 | Product | "Product" = ${Product} AND "Site Status" = "Active" | no | yes |
| Component | Product Component | 2 | Product | "Product" = ${Product} | no | no |
| Document | Document | 2 | Product | "Product" = ${Product} | no | no |
| Baseline | Baseline | 2 | Product | "Version"."Product" = ${Product} | no | no |
| Affected Sites | Deployment Site | 2 | Product | "Product" = ${Product} | yes | no |
| Target Version | Product Version | 2 | Product | "Product" = ${Product} AND "Version Status" IN ("Current", "Beta") | no | yes |
| Delivery Method | (text select) | 4 | none | n/a | no | yes |
| Urgency | (text select) | 4 | none | n/a | no | yes |


# Portal Request Types

## Portal Architecture

In Cloud, the customer portal is organized into portal groups. Each group contains related request types. For a configuration management service space, create a "Configuration Management" portal group for CM-specific requests and a "Support" group for general support tickets.

Each request type maps to a work type with Assets custom fields attached. The fields on the portal form are the customer-facing inputs. Additional fields visible only to agents appear on the work item view after submission.

Request types and work types are distinct concepts in Cloud. One work type can serve multiple request types. For example, a "Change Request" work type can back both a "Request a Software Change" and a "Request an Infrastructure Change" request type, each with different portal descriptions and field visibility.

## Request Types

**Media Distribution Request.** Asks the CM team to deliver software media to a deployment site. Portal fields: Product, Product Version (cascaded), Deployment Site (cascaded, active only), Delivery Method, Media Urgency. Workflow: Open, Preparing Media, Shipping, Waiting for Customer, Resolved.

**Change Request.** Proposes a change to the product or infrastructure. Portal fields: Product, Product Version, Change Type, Impact, description, justification. Agent fields: CCB Required (boolean), Affected Sites. Workflow: Open, Review, CCB Review (if required), Implementation, Verifying, Resolved.

**Problem Report.** Captures a defect or service degradation. Portal fields: Product, Product Version, Severity, Component (cascaded), issue description. Workflow: Open, Investigating, Mitigated, Resolved, Closed.

**Site Registration.** Registers a new customer deployment site. Portal fields: Site Name, Organization, Location, Products Requested (multi-select), Site Type. Workflow: Open, In Review, Provisioning, Resolved. On resolution, automation creates Deployment Site CI records.

**Site Upgrade Request.** Initiates an upgrade to a new product version. Portal fields: Product, Deployment Site (cascaded, active only), Target Version (cascaded, filtered to Current and Beta). Workflow: Open, Review, Executing, Verifying, Resolved.

**Site Decommission Request.** Retires a deployment site. Portal fields: Product, Deployment Site, media return plan. Workflow: Open, Review, Media Recall, Resolved.

## Schema Permissions for Portal Dropdowns

For Assets object picker dropdowns to work on the customer portal, the customer role needs read access to your schema. Go to your schema settings, find the permissions section, and add read access for the "Service Desk Customer" role. Without this, customers see empty dropdowns.


# AQL Query Library

## Field Scoping Queries

These queries power the cascade dropdowns in custom fields:

```
Product to Product Version:
  objectType = "Product Version" AND "Product" = ${Product}

Product to Active Deployment Sites:
  objectType = "Deployment Site" AND "Product" = ${Product}
    AND "Site Status" = "Active"

Product to Documents:
  objectType = "Document" AND "Product" = ${Product}

Product to Baselines (via version traversal):
  objectType = "Baseline" AND "Version"."Product" = ${Product}

Product to Components:
  objectType = "Product Component" AND "Product" = ${Product}
```

## Operational Dashboard Queries

```
Active deployment sites:
  objectType = "Deployment Site" AND "Site Status" = "Active"

Sites being provisioned:
  objectType = "Deployment Site"
    AND "Site Status" = "Provisioning"

Recent go-lives (last 90 days):
  objectType = "Deployment Site"
    AND "Go Live Date" >= startOfDay(-90d) AND "Site Status" = "Active"

Versions in pipeline:
  objectType = "Product Version"
    AND "Version Status" IN ("Beta", "Current")

Sites in maintenance:
  objectType = "Deployment Site"
    AND "Site Status" = "Maintenance"
```

## Data Quality Queries

```
Components without a product:
  objectType = "Product Component" AND "Product" IS EMPTY

Versions without components:
  objectType = "Product Version" AND "Components" IS EMPTY

Deployment sites without a version:
  objectType = "Deployment Site" AND "Product Version" IS EMPTY

Organizations with no personnel:
  objectType = "Organization"
    HAVING inboundReferences(objectType = "Person") = 0
```

## HAVING Queries for Relationship Audits

HAVING queries count relationships and filter on the count:

```
Components not included in any version:
  objectType = "Product Component"
    HAVING inboundReferences(objectType = "Product Version") = 0

Active sites with no distribution log:
  objectType = "Deployment Site" AND "Site Status" = "Active"
    HAVING inboundReferences(objectType = "Distribution Log") = 0

Documents not in any documentation suite:
  objectType = "Document"
    HAVING inboundReferences(objectType = "Documentation Suite") = 0
```

## AQL in JQL (Hybrid Queries)

The `aqlFunction()` JQL function bridges Jira work item searches with Assets object queries. It finds work items whose Assets custom fields match an AQL condition.

Find work items linked to active deployment sites:

```
"Deployment Site" in aqlFunction(
  "objectType = 'Deployment Site' AND 'Site Status' = 'Active'"
)
```

Find work items linked to expiring certifications:

```
"Certification" in aqlFunction(
  "objectType = 'Certification' AND 'Expiration Date' <= now('+30d')"
)
```

The `connectedTickets()` AQL function works in the opposite direction, finding Assets objects that have linked work items matching a JQL condition:

```
objectType = "Deployment Site"
  AND object having connectedTickets("status != Done")
```

This finds deployment sites with open work items, useful for identifying sites with active work in progress.


# Workflows and Automation

## Request Type Workflows

Each request type has a workflow designed around its lifecycle:

**Media Distribution:** Open, Preparing Media, Shipping, Waiting for Customer, Resolved. "Waiting for Customer" pauses the SLA timer.

**Change Request:** Open, Review, CCB Review, Implementation, Verifying, Resolved. "CCB Review" pauses the SLA. A Rejected branch exits from Review or CCB Review.

**Problem Report:** Open, Investigating, Mitigated, Resolved, Closed. Five statuses separate mitigation time from resolution time.

**Site Registration:** Open, In Review, Provisioning, Resolved.

**Site Upgrade:** Open, Review, Executing, Verifying, Resolved.

## Cloud-Native Automation Rules

Cloud does not support ScriptRunner, Groovy scripts, or custom workflow post-functions. All automation uses Jira Automation rules, which are a component-based rule builder with triggers, conditions, branches, and actions.

This is the most significant difference from Data Center. Every script-based automation pattern must be rebuilt using Cloud Automation rules. The trade-off: Cloud automation is easier to set up and maintain, but it cannot do everything that Groovy scripts can. For complex logic that Automation rules cannot handle, use Forge apps or external webhooks.

### Request Routing Rules

- Media Distribution Requests route to the CM Distribution queue
- Change Requests with CCB Required = Yes route to the CCB Board queue
- Problem Reports with SEV1 or SEV2 route to the CM Leads queue with Highest priority
- Site Registrations route to the CM Leads queue
- Any work item unassigned after 2 hours triggers an alert to CM Leads

### SLA Configuration

Two SLA timers per request type: First Response and Resolution.

Pause conditions: the SLA clock pauses when status is "Waiting for Customer" or "CCB Review."

Stop conditions: the clock stops when the status reaches the Done category.

| Request Type | Response SLA | Resolution SLA |
|-------------|-------------|---------------|
| Media Distribution | 4h | 5d |
| Change Request | 8h | 30d |
| Problem Report (SEV1) | 1h | 3d |
| Problem Report (SEV2) | 4h | 14d |
| Problem Report (SEV3) | 8h | 30d |
| Problem Report (SEV4) | 24h | 180d |
| Site Registration | 8h | 14d |
| Site Upgrade | 8h | 30d |

### Status-to-CMDB Synchronization

When a work item resolves, automation rules update the linked CI in Assets:

- Site Registration resolved: create Deployment Site CI with status "Provisioning"
- Media Distribution resolved: update Distribution Log Transfer Status to "Completed"
- Site Upgrade resolved: update Deployment Site productVersion to the target version
- Site Decommission resolved: set Deployment Site status to "Decommissioned"

Use the Automation for Jira "Create Assets object" and "Edit Assets object" actions for these updates. The trigger is "Work item transitioned" with a condition checking that the target status is in the Done category.

### Multi-Level Approval Patterns

Three change models map to workflow branches:

**Standard changes** are pre-approved. CCB Required defaults to No. The request goes directly from Review to Implementation.

**Normal changes** require CCB review. CCB Required is Yes, routing through the CCB Review status. The CCB chair reviews and approves or rejects.

**Emergency changes** need expedited approval. The CCB chair alone can approve, with post-hoc ratification at the next regular meeting.

### Scheduled Data Quality Checks

Automation rules with scheduled triggers run AQL queries and create alerts:

- Daily: Deployment Sites with "Active" status and no Product Version
- Weekly: Documents not linked to any Documentation Suite
- Monthly: Deployment Sites on deprecated or retired versions

Cloud Automation supports scheduled triggers (daily, weekly, monthly) that can query Assets via AQL and create work items or send notifications when problems are found.

### Notification Rules

- New Product Version created: email all active Deployment Site contacts
- Certification expiring within 30 days: daily alert to CM Leads
- CCB review pending more than 7 days: weekly reminder to CCB Board members
- High-impact change submitted: immediate alert to CM Leads


# Dashboards and Queues

## Agent Queues

Configure queues in your service space to route work to the right team:

- Media Requests: assigned to the CM Distribution team
- Change Requests Pending CCB: visible to the CCB Board role
- Open Problem Reports: assigned to CM Analysts
- Site Registrations: assigned to CM Leads
- Site Upgrades: assigned to CM Leads
- Unassigned Work Items: escalation queue visible to CM Leads
- My Assigned Work Items: individual agent's personal queue

Each queue is configured with a JQL filter (work type, status, assignee) combined with work category filters for automatic categorization.

## CM Operations Dashboard

The CM Operations Dashboard gives the CM Lead a portfolio-wide view:

- Open requests by type (pie chart)
- Created vs resolved trend (line chart, last 30 days)
- Active deployment sites (AQL gadget: `objectType = "Deployment Site" AND "Site Status" = "Active"`)
- Sites pending installation (AQL gadget)
- Recent go-lives in the last 90 days (AQL gadget)

## Version Compliance Dashboard

Tracks deployment currency across your customer base:

- Sites by product version (stacked bar: current, previous, deprecated)
- Certifications approaching expiry (table with countdown in days)
- Licenses approaching expiry
- Sites not on the latest version with no upgrade plan

## AQL Gadgets for Dashboards

Assets provides two gadget types for Jira dashboards:

**Assets Object List** displays a table of objects matching an AQL query. Configure it with your query, select which attributes to show as columns, and add it to any dashboard.

**Assets Object Count** displays a single number: how many objects match the query. Use it for KPIs like "Active Deployment Sites: 47" or "Expiring Certifications: 3."

Combining AQL gadgets (showing CI state) with JQL gadgets (showing work items) on the same dashboard creates a unified view of what exists and what work is in flight.


# Requirements Management Plugin

## Cloud Marketplace Options

Cloud has no built-in requirements management tool. The Atlassian Marketplace offers several options:

**R4J (Requirements for Jira)** by easyBI is the most widely adopted requirements management app on Cloud. It supports hierarchical requirements, traceability matrices, coverage analysis, and baseline snapshots. Requirements are stored as Jira work items with a dedicated UI for tree views and traceability.

**Xray** by Xpand IT focuses on test management but includes requirements traceability. It links requirements to test cases and test executions, providing coverage reporting.

Both integrate with Jira work types and can reference Assets objects through custom fields. This means a requirement can link to the Product CI it specifies, and a test case can link to the Product Version it validates.

## Linking Requirements to CMDB Types

The traceability chain connects requirements to the CMDB:

- A requirement specifies behavior for a Product (Assets reference)
- A change request implements that requirement (work item link)
- The change deploys as a Product Version (Assets reference)
- The version deploys to Deployment Sites (Assets references)

This chain answers questions like "which sites have the version that satisfies requirement X?" using a combination of AQL and JQL queries.

## Integration with Assets Custom Fields

Add an Assets custom field to your requirement work type that references the Product CI the requirement applies to. This makes it possible to query "all requirements for OvocoCRM Core" using:

```
"Product" in aqlFunction("objectType = 'Product' AND Name = 'CRM Core'")
  AND issuetype = Requirement
```


# Confluence Cloud

## Documentation Space Structure

Create a Confluence space for CMDB documentation that mirrors the four-branch taxonomy. Top-level pages for each product CMDB and Product Library. Sub-pages for each CI type. Separate sections for runbooks, SOPs, and training materials.

This structure makes documentation findable by the same hierarchy that organizes the CMDB. Someone looking for deployment site documentation navigates the same path in Confluence as they would in Assets.

## Linking Confluence Pages to Assets Objects

Cloud supports Atlassian Smart Links for Assets objects. When you paste an Assets object URL into a Confluence page, it renders as a smart link showing the object name and type.

For richer integration, use URL attributes on CI records in Assets to link back to the corresponding Confluence page. The "url" attribute on Document records serves this purpose.

## Library Item Tracking

Controlled documents are tracked as Document CIs in Assets. The Confluence page is the living document where content is authored and reviewed. The Document CI in Assets tracks metadata: type, state, author, publish date, and DML path.

## Labels for Cross-Cutting Views

Use Confluence labels to create views that cut across the page hierarchy. Label all pages related to a specific product version (e.g., `crm-v2.1`) and use Confluence's label search to find all documentation for that release. Label pages by document type (`runbook`, `sop`, `architecture`) for type-based views.

## Templates for CI Documentation Pages

Create Confluence page templates for common documentation patterns:

**CI documentation template:** overview section, key attributes table, relationship diagram, linked runbooks, change history. Used for documenting individual CI types or important CI instances.

**Lookup type documentation template:** list of values with descriptions, usage guidance, which CI types reference this lookup.

**Service documentation template:** service overview, component inventory, SLA targets, incident procedures, escalation contacts.

## Automation Rules for Wiki-CMDB Sync

Confluence Cloud Automation can trigger actions when pages are created or updated. Use this to maintain consistency:

- When a page with the `controlled-document` label is published, send a notification to the CM team to verify the corresponding Document CI in Assets
- When a page is archived, flag the linked CI for review


# Other Cloud Products

## Compass

Compass is Atlassian's developer portal for tracking services, components, and their health. It is Cloud-only.

Where Compass overlaps with CMDB-Kit: both track applications and components. Where they differ: Compass focuses on software engineering metadata (repository links, CI/CD pipeline status, deployment frequency, on-call rotations), while CMDB-Kit focuses on configuration management metadata (version history, deployment sites, change control, baselines).

For organizations using both, Compass can serve as the developer-facing view of applications while CMDB-Kit's Assets schema serves as the configuration management view. Link them through naming conventions or URL references.

## Atlas and Teams

Atlas (now part of Jira under "Goals") tracks work at the goal and project level. Jira Teams provides a team directory.

The Teams feature overlaps with CMDB-Kit's Team and Person types. If your organization already uses Jira Teams for team management, you can reference those teams from CMDB-Kit's schema through AQL queries rather than duplicating the data. Alternatively, maintain Team and Person records in Assets for richer metadata (certifications, clearances, role assignments) that Jira Teams does not support.
