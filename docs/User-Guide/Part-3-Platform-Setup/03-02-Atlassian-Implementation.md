# Atlassian Implementation Patterns

This chapter covers every aspect of operationalizing CMDB-Kit's schema in JSM Assets and Jira. It walks through portal pages, custom fields, AQL queries, cascading selects, ScriptRunner scripts, automation rules, dashboards, and queues. The focus is multi-product throughout, showing prefixed types and cross-product queries as the primary pattern.

The earlier chapters defined what to track (schema types), how to organize it (taxonomy), and what the data looks like (Product Library, DML, site deployments). This chapter is about making all of that operational in the Atlassian toolstack.


# Tool Responsibility Matrix

## Assets Track What Is, Issues Track What Needs to Happen

The core principle governing the entire Atlassian implementation: JSM Assets hold persistent CI state, Jira issues hold temporary work. When an issue closes, the work is done, but the CI it created or updated persists in Assets. A site registration request is temporary. The Deployment Site record it creates is permanent.

The decision matrix is simple: if something has a lifecycle beyond a single work request, it belongs in Assets. A deployment site exists for years. A server exists until decommissioned. A product version exists forever as part of the release history. These are Assets objects. A request to ship media, a request to upgrade a site, a problem report about a bug, these are temporary and belong as Jira issues.

## What Belongs in Each Tool

JSM Assets holds CI records: applications, servers, deployment sites, product versions, baselines, distribution logs, documents, certifications, licenses, organizations, teams, persons, and all lookup types. These are the persistent state of your infrastructure and organization.

Jira Issues holds work items: media distribution requests, change requests, problem reports, site registrations, site upgrades, site decommissions, action items, document review reports, and technical support tickets. These are tasks that have a beginning and an end.

Confluence holds narrative documentation: runbooks, SOPs, architecture decisions, training materials, meeting minutes, and design discussions. These are the knowledge layer that gives context to the structured data in Assets and the work tracked in Jira.

Extensions fill gaps in the core toolstack. Requirements management tools (RMSIS or equivalent) track formal requirements with traceability. Test management tools (Zephyr or equivalent) track test plans, test cases, and execution results. These integrate with both Assets and Jira through references and links.

## Data Flow Between Tools

Four integration patterns connect the tools:

Issue creates asset. A site registration request resolves, and the automation creates a new Deployment Site CI in Assets with status "Provisioning." The temporary work item produces a permanent CI record.

Issue updates asset. A media distribution request resolves, and the automation updates the Distribution Log record in Assets to status "Completed." The work item changes the state of an existing CI.

Asset triggers issue. A certification's expiration date passes a threshold (30 days out), and an automation rule creates a renewal task in Jira. The CI's state creates new work.

Asset informs issue. A media distribution request is submitted, and the agent checks the linked Deployment Site's status in Assets before approving. If the site is "Decommissioned," the request is rejected. The CI's state influences how work is processed.

These patterns combine in real workflows. A media distribution request (Jira issue) references a Deployment Site (Assets object) whose status informs whether to proceed. When the request resolves, it updates a Distribution Log (Assets object). If the distribution reveals a problem, a Problem Report (Jira issue) is created, which links back to the affected Application (Assets object).


# Multi-Product Schema Design in JSM Assets

## Product-Prefixed Type Strategy

When multiple products share one JSM Assets schema, generic type names like "Product Version" and "Deployment Site" are ambiguous. Which product's version? Which product's deployment site?

The prefix convention solves this with two-letter product codes: CR for OvocoCRM, AN for OvocoAnalytics. "CR Product Version" and "AN Product Version" are distinct types in the same schema. Each has its own attributes, its own data, and its own AQL namespace.

Types that get prefixed are product-specific CIs and library records: Deployment Site, Product Version, Product Component, Document, Deployment, Baseline, Distribution Log, Feature, Product Media, Product Suite, Documentation Suite, and Certification.

Types that stay shared (no prefix) are directory entities and lookups: Organization, Team, Person, Location, Facility, Vendor, and all lookup types. These are inherently cross-product.

## Schema Hierarchy for Multi-Product

The root branches remain the same four from CMDB-Kit's taxonomy. Product-specific branches nest under them:

```
Product CMDB
├── CR CMDB
│   ├── CR Application
│   ├── CR Server
│   └── CR Product Component
├── AN CMDB
│   ├── AN Application
│   └── AN Product Component
└── TS CMDB (shared services)
    └── TS Application

Product Library
├── CR Library
│   ├── CR Product Version
│   ├── CR Deployment Site
│   └── CR Distribution Log
└── AN Library
    ├── AN Product Version
    ├── AN Deployment Site
    └── AN Distribution Log

Directory (shared, no prefix)
Lookup Types (shared, no prefix)
```

## Shared Types vs Product-Specific Types

The rule: if the same record could serve multiple products, it is shared. If it describes something specific to one product, it gets a prefix.

Organization "Acme Corp" is shared because Acme Corp is a customer of both products. Deployment Site "CR Acme Corp US-East" is product-specific because it tracks OvocoCRM's deployment at that customer.

Site Status is shared because "Active" means the same thing regardless of product. But if OvocoCRM needed a "Suspended - Compliance Hold" status that OvocoAnalytics did not, you would create a product-specific lookup (CR Site Status).

## Extending CMDB-Kit's Schema Files for Multi-Product

To implement prefixing in CMDB-Kit's schema files, add prefixed types to schema-structure.json under product-specific parent branches. Add prefixed attribute sets to schema-attributes.json (the attribute definitions may be identical to the base type, but they reference product-specific types). Update LOAD_PRIORITY in constants.js: shared types first (all lookups, Directory), then product-specific types. Name data files with the prefix: cr-deployment-site.json, an-deployment-site.json.


# Portal Request Types

## Portal Architecture

The JSM Service Desk portal is the customer-facing entry point for all CM requests. Organize portal request types into groups: "Configuration Management" for CM-specific requests (media distribution, change requests, site registrations) and "Support" for general support tickets.

Each portal request type maps to a Jira issue type with Assets custom fields attached. The fields that appear on the portal form are the customer-facing inputs. Additional fields visible only to agents appear on the issue view after submission.

Schema permissions matter: the customer role needs read access to the Assets schema so the Assets object picker dropdowns work on the portal. Without this, customers see empty dropdowns.

## Media Distribution Request

A media distribution request asks the CM team to deliver software media to a deployment site. The portal form collects:

- Product (Assets picker, Tier 1, no cascade)
- Product Version (cascaded from Product: `objectType = "CR Product Version" AND "Product" = ${Product}`)
- Deployment Site (cascaded from Product, filtered to active: `"Product" = ${Product} AND "Site Status" = "Active"`)
- Delivery Method (standalone lookup)
- Media Urgency (standalone lookup)
- Companion Products and Special Instructions (optional text fields)

Workflow: Open, Preparing Media, Shipping, Waiting for Customer, Resolved.

On resolution, the automation creates or updates a Distribution Log record in Assets. The SLA is 4 hours for first response, 5 business days for resolution (standard); shorter targets for emergency requests.

## Change Request

A change request proposes a change to the product or its infrastructure. The form collects Product, Product Version, Change Type (Standard/Normal/Emergency from the Change Type lookup), Impact (High/Medium/Low from the Change Impact lookup), a description of the current state, the proposed change, and a justification.

The CCB Required field (boolean) is critical. When set to Yes, the request routes to the CCB Review queue and the SLA timer pauses. The CCB Board role reviews and either approves (auto-transitioning to Implementation) or rejects (transitioning to Rejected with a comment).

Workflow: Open, Review, CCB Review (if required), Implementation, Verifying, Resolved. The Rejected branch exits the workflow.

On resolution, affected CIs may be updated: application configuration, baselines, documentation. The SLA is 8 hours for first response, 30 business days for resolution, pausing during CCB Review.

## Problem Report

A problem report captures a defect or service degradation. Fields: Product, Product Version, Severity (SEV1 through SEV4), Component (cascaded from Product), and a description of the issue.

Workflow: Open, Investigating, Mitigated, Resolved, Closed. The five-status workflow separates mitigation (impact reduced) from resolution (root cause fixed) from closure (post-mortem complete).

SLAs vary by severity: SEV1 requires 1-hour response and 3-day resolution. SEV4 allows 24-hour response and 180-day resolution.

## Site Registration

A site registration registers a new customer deployment site. Fields: Site Name, Organization (Assets picker), Location, Site Type (lookup), Products Requested (multi-select for which products will be deployed), Network Domains, Security Level, Site Lead name and contact. Optional: seat count, hardware model, target go-live date.

Workflow: Open, In Review, Provisioning, Resolved.

On resolution, the automation creates Deployment Site CI records, one per product requested, each with status "Provisioning." SLA: 8 hours for first response, 14 days for resolution.

## Site Upgrade Request

A site upgrade request initiates an upgrade of a deployment site to a new product version. Fields: Product, Deployment Site (cascaded from Product, active sites only), Current Version (auto-populated from the site's productVersion attribute), Target Version (cascaded from Product, filtered to Current and Beta versions).

Workflow: Open, Review, Executing, Verifying, Resolved.

On resolution, the automation updates the Deployment Site's productVersion to the target version and creates a Distribution Log record.

## Site Decommission Request

A site decommission request retires a deployment site. Fields: Product, Deployment Site, current version, and a media return plan describing how installed media will be recalled.

Workflow: Open, Review, Media Recall, Resolved.

On resolution, the automation sets the Deployment Site's status to "Decommissioned."

## Document Request

A document request asks for delivery of a controlled document. Fields: Product, Document (cascaded from Product), Product Version, Delivery Method.

No CMDB impact on resolution because the Document CI already exists. This is a delivery request, not a CI creation event.

## Other Request Types

Additional request types follow the same pattern: Assets custom fields for CI selection, a workflow with clear statuses, and defined CMDB impact on resolution.

Baseline Inquiry: Product, Baseline (cascaded from Product). Certification Request: Product, Certification Type. License Request: Product, License Type, quantity. Technical Support: Product, Product Version, Support Category, Urgency. Access Request: System, Access Level.


# Custom Fields Configuration

## The Tiered Dependency Model

Custom fields in JSM have dependencies: a Product Version field cannot cascade from a Product field unless the Product field exists first. Organizing fields into tiers makes the creation order clear.

Tier 1 fields have no dependencies: Product, Organization. Create these first.

Tier 2 fields cascade from Tier 1: Product Version cascades from Product, Deployment Site cascades from Product, Component cascades from Product. Create these second.

Tier 3 fields cascade from Tier 2: Site POC cascades from Deployment Site. Create these third.

Tier 4 fields are standalone lookups with no cascade dependencies: Delivery Method, Urgency, Impact, Severity, Change Type. Create these in any order.

## Creating an Assets Custom Field

Each Assets custom field has three configuration areas:

Scope defines what objects appear. Set the Object Schema to your CMDB-Kit schema key. Set the Filter Scope (AQL) to restrict which objects the field shows. For a Product Version field: `objectType = "CR Product Version"`. For a cascading field, add the `${FieldName}` placeholder: `objectType = "CR Product Version" AND "Product" = ${Product}`.

Interaction defines how the user selects. Choose single-select (dropdown) or multi-select (checkboxes). Configure which object attributes are searchable in the picker. Configure which attributes display on the issue view when an object is selected.

Portal defines visibility. "Show Object Picker on Customer Portals" must be enabled for portal-facing fields. "Force on Customer Details" controls whether the field appears on the initial request form.

## Cascade Filtering With AQL

The `${FieldName}` placeholder is the mechanism for cascading selects. When the user selects a value in the Product field, the `${Product}` placeholder in dependent fields resolves to that selection. The dependent field's AQL re-evaluates, and its dropdown shows only matching objects.

Key cascade patterns:

```
Product Version from Product:
  objectType = "CR Product Version" AND "Product" = ${Product}

Active Deployment Sites from Product:
  objectType = "CR Deployment Site" AND "Product" = ${Product}
    AND "Site Status" = "Active"

Documents from Product:
  objectType = "CR Document" AND "Related Product" = ${Product}

Baselines via Product Version traversal:
  objectType = "CR Baseline" AND "Product Version"."Product" = ${Product}

Target Version (restricted to deployable versions):
  objectType = "CR Product Version" AND "Product" = ${Product}
    AND "Version Status" IN ("Current", "Beta")
```

The `${FieldName}` reference is case-sensitive and must match the custom field name exactly. "Product" works. "product" does not. This is the most common configuration mistake.

## Object Attributes on Issue View

When an Assets field is selected on a Jira issue, you can configure which object attributes display inline without clicking into the object record.

For a Deployment Site field, configure it to show: Name, Site Status, Product Version, and Primary Location. An agent processing a media distribution request sees the site's current version and status directly on the issue, without navigating to Assets.

For a Product Version field, show: Name, Version Number, Release Date, and Version Status. The agent sees whether the requested version is Current or Beta at a glance.

## Portal Visibility Settings

Not every field belongs on the customer portal. Product, Deployment Site, and Urgency are customer-facing. Internal tracking fields (Originator Organization, assigned analyst, internal notes) are agent-only.

"Show Object Picker on Customer Portals" enables the Assets dropdown on the portal. Without this, the field appears as a blank text box.

"Force on Customer Details" controls whether the field appears on the initial request form. Fields not forced to customer details appear only after the customer expands the "Additional Details" section, which most customers never do. Force the critical fields.

Schema permissions must grant the customer role read access to the Assets schema. Without this, the object picker loads but shows no results.

## Complete Field Reference

| Field Name | Assets Type | Tier | Cascade Source | AQL Filter | Multi-select | Portal |
|-----------|------------|------|---------------|-----------|-------------|--------|
| Product | Application | 1 | none | objectType = "CR Application" | no | yes |
| Organization | Organization | 1 | none | objectType = "Organization" | no | yes |
| Product Version | Product Version | 2 | Product | "Product" = ${Product} | no | yes |
| Deployment Site | Deployment Site | 2 | Product | "Product" = ${Product} AND "Site Status" = "Active" | no | yes |
| Component | Product Component | 2 | Product | "Product" = ${Product} | no | no |
| Document | Document | 2 | Product | "Related Product" = ${Product} | no | no |
| Baseline | Baseline | 2 | Product | "Product Version"."Product" = ${Product} | no | no |
| Affected Sites | Deployment Site | 2 | Product | "Product" = ${Product} | yes | no |
| Target Version | Product Version | 2 | Product | "Product" = ${Product} AND "Version Status" IN ("Current", "Beta") | no | yes |
| Delivery Method | (text select) | 4 | none | n/a | no | yes |
| Urgency | (text select) | 4 | none | n/a | no | yes |
| Severity | Incident Severity | 4 | none | objectType = "Incident Severity" | no | yes |
| Change Type | Change Type | 4 | none | objectType = "Change Type" | no | yes |
| Impact | Change Impact | 4 | none | objectType = "Change Impact" | no | yes |


# AQL Query Library

## AQL Fundamentals

AQL (Assets Query Language) is the query language for JSM Assets. It uses SQL-like syntax with operators specific to object relationships.

Comparison operators: `=` (case-insensitive match), `==` (case-sensitive), `!=` (not equal), `>`, `<`, `>=`, `<=` (for dates and numbers).

Set operators: `IN` (value matches any in list), `NOT IN` (value matches none in list).

Pattern matching: `LIKE` (wildcard match with `%`).

Null checks: `IS EMPTY` (no value), `IS NOT EMPTY` (has a value).

Functions: `startOfDay()` (date relative to today), `now()` (current datetime with offset), `currentUser()` (logged-in user).

Relationship functions: `inboundReferences()` (objects pointing to this one), `outboundReferences()` (objects this one points to).

Dot notation traverses references: `"Product Version"."Product"` reads the Product attribute on the referenced Product Version object. This enables queries like `"Product Version"."Product" = "OvocoCRM"` to find all objects whose version's product is OvocoCRM.

The HAVING clause filters by relationship counts: `HAVING inboundReferences(objectType = "CR Deployment Site") > 0` finds objects that have at least one Deployment Site pointing to them.

In a multi-product schema, always use product-prefixed type names: `objectType = "CR Product Version"`, not `objectType = "Product Version"`.

## Field Scoping Queries (Cascading Selects)

These queries power the cascade dropdowns described in the Custom Fields section:

```
Product to Product Version:
  objectType = "CR Product Version" AND "Product" = ${Product}

Product to Active Deployment Sites:
  objectType = "CR Deployment Site" AND "Product" = ${Product}
    AND "Site Status" = "Active"

Product to Documents:
  objectType = "CR Document" AND "Related Product" = ${Product}

Product to Baselines (via version traversal):
  objectType = "CR Baseline" AND "Product Version"."Product" = ${Product}

Product to Certifications:
  objectType = "CR Certification" AND "Product" = ${Product}

Product to Components:
  objectType = "CR Product Component" AND "Product" = ${Product}

Product to Distribution Records (via site traversal):
  objectType = "CR Distribution Log"
    AND "Deployment Site"."Product" = ${Product}
```

## Operational Dashboard Queries

Queries for day-to-day operational visibility:

```
Active deployment sites (single product):
  objectType = "CR Deployment Site" AND "Site Status" = "Active"

Sites pending installation (cross-product):
  objectType IN ("CR Deployment Site", "AN Deployment Site")
    AND "Site Status" IN ("Provisioning", "Installing")

Recent go-lives (last 90 days):
  objectType = "CR Deployment Site"
    AND "Go Live Date" >= startOfDay(-90d) AND "Site Status" = "Active"

Versions in pipeline:
  objectType = "CR Product Version"
    AND "Version Status" IN ("Beta", "Current")

Sites needing attention:
  objectType = "CR Deployment Site"
    AND "Site Status" IN ("Degraded", "Suspended")

Cross-product view for one customer:
  objectType IN ("CR Deployment Site", "AN Deployment Site")
    AND "Name" LIKE "Acme%"
```

## Data Quality Queries

These queries find gaps and inconsistencies in CMDB data:

```
Components without a product:
  objectType = "CR Product Component" AND "Product" IS EMPTY

Versions without components:
  objectType = "CR Product Version" AND "Components" IS EMPTY

Deployment sites without a version:
  objectType = "CR Deployment Site" AND "Product Version" IS EMPTY

Active sites with no distribution log:
  objectType = "CR Deployment Site" AND "Site Status" = "Active"
    HAVING inboundReferences(objectType = "CR Distribution Log") = 0

Documents not in any documentation suite:
  objectType = "CR Document"
    HAVING inboundReferences(objectType = "CR Documentation Suite") = 0

Organizations with no personnel:
  objectType = "Organization"
    HAVING inboundReferences(objectType = "Person") = 0
```

## Version Compliance Queries

These queries identify sites and certifications that are out of compliance:

```
Sites on deprecated versions:
  objectType = "CR Deployment Site" AND "Site Status" = "Active"
    AND "Product Version" IN (objectType = "CR Product Version"
      AND "Version Status" = "Deprecated")

Versions still deployed but deprecated:
  objectType = "CR Product Version" AND "Version Status" = "Deprecated"
    AND object IN inboundReferences(objectType = "CR Deployment Site")

Certifications expiring within 30 days:
  objectType = "CR Certification"
    AND "Expiration Date" <= now("+30d")
    AND "Certification Status" = "Active"

Licenses expiring within 60 days:
  objectType = "CR License"
    AND "Expiration Date" <= now("+60d")
    AND "License Status" = "Active"
```

## HAVING Queries for Relationship Audits

HAVING queries count relationships and filter on the count:

```
Components not included in any version:
  objectType = "CR Product Component"
    HAVING inboundReferences(objectType = "CR Product Version") = 0

Versions deployed to more than 10 sites:
  objectType = "CR Product Version"
    HAVING inboundReferences(objectType = "CR Deployment Site") > 10

Documentation suites with fewer than 3 documents:
  objectType = "CR Documentation Suite"
    HAVING outboundReferences(objectType = "CR Document") < 3

Baselines with no linked components:
  objectType = "CR Baseline"
    HAVING outboundReferences(objectType = "CR Product Component") = 0
```

## AQL in JQL (Hybrid Queries)

The `aqlFunction()` JQL function bridges Jira issue searches with Assets object queries. It finds Jira issues whose Assets custom fields match an AQL condition.

Find issues linked to active deployment sites:

```
"Deployment Site" in aqlFunction(
  "objectType = 'CR Deployment Site' AND 'Site Status' = 'Active'"
)
```

Find issues linked to expiring certifications:

```
"Certification" in aqlFunction(
  "objectType = 'CR Certification' AND 'Expiration Date' <= now('+30d')"
)
```

The `connectedTickets()` AQL function works in the opposite direction: it finds Assets objects that have linked Jira issues matching a JQL condition.

```
objectType = "CR Deployment Site"
  AND object having connectedTickets("status != Done")
```

This finds deployment sites with open Jira issues, useful for identifying sites with active work.


# Workflows

## Request Type Workflows

Each request type has a workflow designed around its specific lifecycle:

Media Distribution: Open, Preparing Media, Shipping, Waiting for Customer, Resolved. The "Waiting for Customer" status pauses the SLA timer while the site confirms receipt.

Change Request: Open, Review, CCB Review, Implementation, Verifying, Resolved. The Rejected branch exits from either Review or CCB Review. The CCB Review status pauses the SLA.

Problem Report: Open, Investigating, Mitigated, Resolved, Closed. Five statuses enable separate tracking of mitigation time and resolution time.

Site Registration: Open, In Review, Provisioning, Resolved. The Provisioning status represents the period where infrastructure is being set up.

Site Upgrade: Open, Review, Executing, Verifying, Resolved. The Verifying status confirms the upgrade was successful before closing.

## The CCB Integration Pattern

The CCB Required field (boolean) on Change Request issues controls whether a request routes through CCB review. This is implemented as a workflow condition:

When CCB Required = Yes, the transition from Review goes to CCB Review instead of directly to Implementation. The CCB Review queue is visible only to users with the CCB Board role.

In CCB Review, the SLA timer pauses. The CCB chair reviews the change request with its five-dimension impact analysis. Approval triggers an auto-transition to Implementation and notifies the requester. Rejection transitions to Rejected with a mandatory comment explaining the decision.

A weekly automation rule checks for CCB reviews pending more than 7 days and sends a reminder to the CCB Board.

## Status-to-CMDB Synchronization

When an issue resolves, the linked CI in Assets updates automatically:

- Site Registration resolved: create Deployment Site CI with status "Provisioning"
- Media Distribution resolved: set Distribution Log status to "Completed"
- Site Upgrade resolved: update Deployment Site productVersion to the target version
- Site Decommission resolved: set Deployment Site status to "Decommissioned"

The pattern: every issue carries an Assets reference field pointing to the affected CI. On the Resolve transition, an Automation for Jira rule (or ScriptRunner post-function) reads the CI reference, queries the Assets API, and updates the appropriate attribute.

## Multi-Level Approval Patterns

ITIL defines three change models that map to Jira workflow branches:

Standard changes are pre-approved. They follow a documented procedure and do not require individual CCB review. In the workflow, CCB Required defaults to No, and the request goes directly from Review to Implementation.

Normal changes require CCB review. CCB Required is set to Yes, routing through the CCB Review status.

Emergency changes need expedited approval. The CCB chair alone can approve (instead of the full board), with post-hoc ratification at the next regular CCB meeting.


# ScriptRunner Automation

## Auto-Generate Unique Identifiers

Organizations that require formatted identifiers beyond Jira's built-in issue keys use a ScriptRunner Listener on the issue creation event. The script generates an identifier like "CMDB-0042-I" (project key, padded sequence number, network suffix) and writes it to a custom text field.

## Auto-Populate Originator Data

When a user submits a request, their Person record in Assets contains their site and organization. A ScriptRunner Listener on issue creation queries Assets:

```
objectType = "Person" AND "Email" = "${currentUser.emailAddress}"
```

It reads the Person's site and organization references and populates the Originator Site and Originator Organization fields on the issue. The agent sees the requester's context without asking.

## Calculated Fields (Hours Rollup)

Work Plans track effort in seven category fields: Analysis, Development, Management, Documentation, Testing, QA, and Miscellaneous hours. A ScriptRunner Behaviour (or Listener on field change) sums these values and writes the result to a read-only Total Hours field.

## Status History Tracking

A ScriptRunner Listener on status change events appends each transition to a multi-line text field: timestamp, old status, new status, and the user who made the transition. This creates a human-readable audit trail directly on the issue without navigating Jira's activity stream.

## Bidirectional Relationship Maintenance

When a Product Version links to a Deployment Site in Assets, the reverse reference (Deployment Site back to Product Version) may not exist if the platform only stores one direction. A ScriptRunner Listener on relationship creation checks for the reverse and creates it if missing. The script must check before updating to avoid infinite loops.

## Notification for Restricted Records

In classified environments, a ScriptRunner Listener fires when an issue is created with a RESTRICTED label. It looks up the program from the issue, finds the CM and PM users for that program in Assets, and sends targeted email notifications. Only the people who need to know are notified.

## Archive Processing (Scheduled Job)

A quarterly ScriptRunner scheduled job searches for closed issues with the ARCHIVE_READY label, clones them to a separate archive project (preserving issue links), and marks the originals as ARCHIVED. This keeps the active project clean while maintaining the full audit trail.

## Workflow Validators

ScriptRunner validators gate workflow transitions based on CMDB state:

- Block "Resolve" on a media request if no Distribution Log record exists for the linked site and version
- Block "Close" on a site registration if no Deployment Site CI was created
- Block "Approve" on a change request if a linked requirement is not in Approved status

The validator queries Assets for the linked CI, checks the required fields or status, and returns an error message if the condition is not met.


# Automation Rules

## Request Routing Rules

Automation for Jira rules route new requests to the appropriate queues:

- Media Distribution Requests route to the CM Distribution queue, auto-assigned by product
- Change Requests with CCB Required = Yes route to the CCB Board queue
- Problem Reports with SEV1 or SEV2 route to the CM Leads queue with Highest priority
- Site Registrations route to the CM Leads queue
- Technical Support requests route to the Support Team queue
- Any issue unassigned after 2 hours triggers an alert to CM Leads

## SLA Configuration

Two SLA timers per request type: First Response (time until an agent responds) and Resolution (time until the issue is resolved).

Pause conditions: the SLA clock pauses when status is "Waiting for Customer" or "CCB Review." These statuses represent time where the agent cannot act.

Stop conditions: the clock stops when the status reaches the Done category.

Breach actions: on breach, the issue priority escalates, a "sla-breached" label is added, and CM Leads receive a notification.

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
| Technical Support | 8h | 14d |

## CMDB Auto-Update Rules

On resolution of specific request types, automation rules update Assets:

- Site Registration resolved: create Deployment Site CI with status "Provisioning"
- Site Upgrade resolved: update Deployment Site productVersion and upgradeStatus
- Site Decommission resolved: set Deployment Site status to "Decommissioned"
- Media Distribution resolved: update Distribution Log status to "Completed"

These rules use the Automation for Jira "Edit Object" action or a ScriptRunner post-function, depending on the complexity of the update.

## Notification Rules

- New Product Version created in Assets: email all active Deployment Site POCs
- Certification expiring within 30 days: daily alert to CM Leads
- License expiring within 60 days: daily alert to CM Leads
- CCB review pending more than 7 days: weekly reminder to CCB Board members
- High-impact change submitted: immediate alert to CM Leads and Product Leads

## Scheduled Data Quality Checks

Automated AQL queries run on a schedule and create issues or send alerts when problems are found:

Daily: Deployment Sites with "Site Status" = "Active" and "Product Version" IS EMPTY. Daily: Distribution Logs shipped more than 14 days ago with no receipt confirmation.

Weekly: Documents not linked to any Documentation Suite. Weekly: Organizations with no Person records.

Monthly: Deployment Sites on deprecated or retired versions.

## Upgrade Campaign Automation

An upgrade campaign tracks the rollout of a new version across multiple sites:

Campaign start: set each Deployment Site's targetVersion and upgradeStatus = "Not Started."

Media shipped: transition upgradeStatus to "Media Sent," send notification to the site POC.

Receipt confirmed: transition to "Media Received."

Reminder sequence: if "Media Sent" for 14+ days with no receipt confirmation, send a follow-up reminder.

Installation verified: set productVersion = targetVersion, clear targetVersion, set upgradeStatus = "Verified."

This sequence creates a per-site progress tracker that the Version Compliance Dashboard can visualize.


# Dashboards and Queues

## Agent Queues

Eight queues cover the primary work streams:

- Media Requests: assigned to the CM Distribution team
- Change Requests Pending CCB: visible to the CCB Board role
- Open Problem Reports: assigned to CM Analysts
- Site Registrations: assigned to CM Leads
- Site Upgrades: assigned to CM Leads
- Technical Support Open: assigned to the Support Team
- Unassigned Issues: escalation queue visible to CM Leads
- My Assigned Issues: individual agent's personal queue

Each queue is configured with a JQL filter (issue type, status, assignee) combined with an AQL filter for asset-aware routing (e.g., only show media requests for sites in my product scope).

## CM Operations Dashboard

The CM Operations Dashboard gives the CM Lead a portfolio-wide operational view:

- Open requests by type (pie chart showing distribution across media, change, problem, site, support)
- Requests by product (breakdown showing CR vs AN vs shared)
- Created vs resolved trend (line chart over the last 30 days)
- Active deployment sites by product (AQL gadget: `objectType = "CR Deployment Site" AND "Site Status" = "Active"`)
- Sites pending installation (AQL gadget: cross-product query for Provisioning/Installing)
- Recent go-lives in the last 90 days (AQL gadget)
- Distribution logs awaiting receipt (AQL gadget)

## CCB Review Dashboard

The CCB Review Dashboard supports CCB meetings:

- Pending CCB items count
- Change requests by impact level (High/Medium/Low)
- Change requests by type (Standard/Normal/Emergency)
- Change request activity timeline (submitted vs decided over time)
- Overdue CCB reviews (pending more than 7 days, highlighted)

## Version Compliance Dashboard

The Version Compliance Dashboard tracks deployment currency:

- Sites by product version (stacked bar: current, previous, deprecated)
- Upgrade campaign progress (per-site status across the active campaign)
- Certifications approaching expiry (table with countdown in days)
- Licenses approaching expiry (table with countdown in days)
- Version parity report (sites not on the latest version with no upgrade plan)

## Support Dashboard

- Open support tickets by product
- Support by category distribution
- Support ticket aging (time in current status)
- Ticket volume trend over time

## AQL Gadgets for Dashboards

JSM Assets provides two gadget types for Jira dashboards:

The Assets Object List gadget displays a table of objects matching an AQL query. Configure it with your query, select which attributes to show as columns, and add it to any dashboard.

The Assets Object Count gadget displays a single number: how many objects match the query. Use it for KPIs like "Active Deployment Sites: 47" or "Expiring Certifications: 3."

Combining AQL gadgets (showing CI state) with JQL gadgets (showing work items) on the same dashboard creates a unified view of what exists and what work is in flight.


# Jira Issue Types and Field Mapping

## Issue Type Architecture

Each portal request type maps to a Jira issue type:

| Portal Request | Jira Issue Type | Sub-task of |
|---------------|----------------|-------------|
| Media Distribution Request | Media Request | - |
| Change Request | Change Request | - |
| Problem Report | Problem Report | - |
| Site Registration | Site Registration | - |
| Site Upgrade Request | Site Upgrade | - |
| Site Decommission | Site Decommission | - |
| Document Request | Document Request | - |
| Work Plan | Work Plan | Change Request |
| Action Item | Action Item | - |
| Document Review Report | DRR | - |

Work Plan is the only sub-task type. It nests under a Change Request to break complex changes into trackable work items.

## Fields per Issue Type

Each issue type carries a defined set of fields. The field source indicates how the value is populated:

Media Request: Product (manual), Product Version (manual, cascaded), Deployment Site (manual, cascaded), Delivery Method (manual), Media Urgency (manual), Companion Products (manual, optional), Special Instructions (manual, optional).

Change Request: Product (manual), Product Version (manual, cascaded), Change Type (manual), Impact (manual), CCB Required (manual), Affected Sites (manual, multi-select), Current State (manual, text), Proposed Change (manual, text), Justification (manual, text), Risk Assessment (manual, text), Rollback Plan (manual, text).

Problem Report: Product (manual), Product Version (manual, cascaded), Severity (manual), Component (manual, cascaded), Affected Application (auto-populated from Product), Steps to Reproduce (manual, text), Expected Behavior (manual, text), Actual Behavior (manual, text).

Site Registration: Site Name (manual), Organization (manual), Location (manual), Products Requested (manual, multi-select), Site Type (manual), Network Domains (manual), Security Level (manual), Site Lead (manual), Contact Email (manual), Seat Count (manual, optional).

Work Plan: Parent Issue (auto, sub-task link), Problem Type (manual), Suspense Date (manual, date), CSCIs Affected (manual, text), System Impacts (manual, text), Security Impacts (manual, text), hours fields for Analysis, Development, Management, Documentation, Testing, QA, Miscellaneous (manual, numeric), Total Hours (calculated).

## Issue Link Types

Four link types connect related issues:

- "has work plan" / "is work plan for" links a Change Request to its Work Plan sub-tasks
- "relates to" / "relates to" provides general cross-references between issues
- "generates" / "generated from" links a Problem Report to the Change Request it triggered
- "implements" / "implemented by" links a Change Request to the Feature or requirement it addresses


# Confluence Integration

## Documentation Space Structure

Create a CMDB Documentation space in Confluence that mirrors the four-branch taxonomy. Top-level pages for each product CMDB and Product Library. Sub-pages for each CI type. Separate sections for runbooks, SOPs, and training materials.

This structure makes documentation findable by the same hierarchy that organizes the CMDB itself. Someone looking for deployment site documentation navigates the same path in Confluence as they would in Assets.

## Linking Confluence Pages to Assets Objects

Bidirectional linking between Confluence and Assets creates traceability:

In Confluence, use JSM Assets macros to embed live CI data directly in documentation pages. A deployment site documentation page can show the site's current version, status, and go-live date pulled live from Assets.

In Assets, use a URL attribute on CI records to link to the corresponding Confluence page. The "url" attribute on Document records already serves this purpose.

## Library Item Tracking

Controlled documents are tracked as Document CIs in Assets. The Confluence page is the living document where content is authored and reviewed. The Document CI in Assets tracks metadata: type, state, author, publish date, and DML path.

The Document Review Report (DRR) workflow ties them together: a DRR issue links to both the Document CI in Assets and the Confluence page. When the review cycle completes and the document is approved, the Document CI's state updates to "Published" and the approved artifact moves to the DML.

## Templates

Three Confluence page templates support CMDB documentation:

CI documentation template: overview section, key attributes table, relationship diagram, linked runbooks, change history. Used for documenting individual CI types or important CI instances.

Lookup type documentation template: list of values with descriptions, usage guidance, which CI types reference this lookup. Used for documenting each lookup type.

Service documentation template: service overview, component inventory, SLA targets, incident procedures, escalation contacts. Used for documenting business services and their supporting infrastructure.


# Putting It All Together

## Implementation Sequence

Deploy the Atlassian implementation in seven phases:

Phase 1: Schema setup. Import the CMDB-Kit schema with product prefixes. Load all lookup data. Verify with AQL that all types and values are present.

Phase 2: Custom fields. Create Tier 1 fields first, then Tier 2 (cascading), then Tier 3, then Tier 4. Test each cascade by selecting values and verifying the dependent dropdown filters correctly.

Phase 3: Request types and workflows. Create the portal request types, assign custom fields to each, and build the workflow state machines. Test each request type end-to-end: submit, transition through all states, resolve.

Phase 4: Automation rules. Configure request routing, SLA timers, CMDB auto-update rules, and notification rules. Test by submitting requests and verifying routing, timing, and CI updates.

Phase 5: ScriptRunner scripts. Deploy auto-population scripts, calculated field scripts, and workflow validators. Test each script with representative data.

Phase 6: Dashboards. Build agent queues, the CM Operations Dashboard, CCB Review Dashboard, Version Compliance Dashboard, and Support Dashboard. Add AQL gadgets and verify data accuracy.

Phase 7: Confluence integration. Set up the documentation space structure, create page templates, configure Assets macros. Link CI records to their documentation pages.

## Common Mistakes

Importing into a non-empty schema. If the target JSM schema already has types with the same names, the import creates duplicates or fails. Always start with an empty schema or use the adapter's update mode.

Cascade field name mismatch. The `${FieldName}` placeholder must match the Jira custom field name exactly, including case. `${Product}` works if the field is named "Product." `${product}` does not.

Using camelCase in AQL. Schema attributes are camelCase in the JSON files, but JSM Assets converts them to Title Case for display. AQL uses the display name: `"Site Status"`, not `"siteStatus"`.

Forgetting product prefixes. In a multi-product schema, `objectType = "Product Version"` matches nothing. Use `objectType = "CR Product Version"`.

SLA timers that do not pause. CCB Review and Waiting for Customer statuses must be configured as SLA pause conditions. Without this, the SLA breaches while the agent cannot act.

Missing schema permissions. Portal customers need read access to the Assets schema. Without it, Assets dropdowns appear empty on the portal.

## Troubleshooting

Dropdown shows all objects instead of filtered results: the `${FieldName}` in the cascade AQL is misspelled. Check case sensitivity.

Dropdown shows no objects: test the AQL directly in Assets search. If it returns results there but not in the field, check that the field's Object Schema points to the correct schema.

Portal field not appearing: verify "Show Object Picker on Customer Portals" is enabled and "Force on Customer Details" is set for portal-required fields.

Automation not firing: check the trigger conditions. Verify the automation is scoped to the correct project and issue type.

ScriptRunner script errors: check the binding variables. A Listener bound to IssueEvent has different variables than a Behaviour bound to a field. Verify the API version matches your Jira version.

## The OvocoCRM Multi-Product Example

OvocoCRM (CR prefix) and OvocoAnalytics (AN prefix) share one JSM Assets schema. Shared types include Organization (Ovoco Inc, Acme Corp), Teams, Persons, Locations, and all lookup types. CR-specific types include CR Deployment Site, CR Product Version, CR Distribution Log. AN-specific types include AN Deployment Site, AN Product Version, AN Distribution Log.

A site manager at Acme Corp opens the JSM portal and submits a media distribution request. They select Product: OvocoCRM. The Product Version dropdown cascades, showing only CR Product Versions. They select v2.3.1. The Deployment Site dropdown cascades, showing only active CR Deployment Sites for OvocoCRM. They select "CR Acme Corp US-East."

The request routes to the CM Distribution queue. The agent sees the site's current version, status, and location displayed inline on the issue. The agent prepares the media, ships it, and resolves the request. On resolution, the automation creates a Distribution Log record: version 2.3.1, site CR Acme Corp US-East, today's date.

The CM Operations Dashboard shows this request alongside an AN media distribution request for the same customer. A cross-product query reveals all deployment sites for Acme Corp:

```
objectType IN ("CR Deployment Site", "AN Deployment Site")
  AND "Name" LIKE "%Acme%"
```

This returns both "CR Acme Corp US-East" (OvocoCRM, v2.3.1, Active) and "AN Acme Corp" (OvocoAnalytics, v1.0.0, Provisioning), giving the portfolio manager a complete view of the customer's deployment footprint.
