# Atlassian Data Center

Full setup and operational guide for running CMDB-Kit on the Atlassian Data Center stack: JSM Assets, Jira, Confluence, and ScriptRunner. CMDB-Kit brings a product-delivery schema to JSM Assets, organizing your CMDB around the products you build and the sites you deploy to, rather than starting from infrastructure or ITIL process categories.

The Data Center audience typically manages more complex environments than Cloud: multiple products sharing one schema, formal change control boards, ScriptRunner-driven automation, and classified or air-gapped networks. This guide reflects that complexity throughout.


# JSM Assets/Insight Setup

## DC Prerequisites

- Jira Service Management Data Center 5.x or later with Assets enabled
- Assets was formerly called Insight. Atlassian rebranded it in JSM DC 4.15+. Older installations may still show "Insight" in navigation menus, REST endpoints (`/rest/insight/1.0`), and ScriptRunner references. The functionality is identical regardless of branding.
- A local user account with Assets Administrator permissions. SSO-only accounts need a local fallback or a dedicated service account with direct login credentials.
- ScriptRunner for Jira Data Center (recommended, not required). Most automation patterns in this guide use ScriptRunner's Groovy scripting. Without it, you are limited to Assets-native automation rules and Automation for Jira.
- Node.js 18 or later on the machine running the import scripts
- Git (to clone the repository)

## Naming History

The product has gone through several names:

- **Insight** (standalone Marketplace plugin, pre-2020)
- **Insight for Jira Service Management** (bundled with JSM DC 4.x)
- **Assets** (rebranded in JSM DC 4.15+, current name)

ScriptRunner documentation and the HAPI library still reference "Insight" alongside "Assets." The REST API uses `/rest/insight/1.0` on DC regardless of version. AQL was originally called IQL (Insight Query Language); DC 5.x docs use both terms, but the syntax is identical.

## Creating an Object Schema

1. Log in to JSM as an admin
2. Open **Assets** from the top navigation bar (or **Insight** on older versions)
3. Click **Object Schemas** in the sidebar
4. Click **Create Object Schema**
5. Enter a name (e.g., "CMDB") and a schema key (e.g., "CMDB")
6. Leave the description empty or add your own
7. Click **Create**

The **schema key** is the short identifier you will use in the `SCHEMA_KEY` environment variable. It must match exactly (case-sensitive). If you set the key to "CMDB", use `SCHEMA_KEY=CMDB`.

Start with an empty schema. CMDB-Kit creates its own type hierarchy, attributes, and lookup types. Importing into a schema that already has types named "Product" or "Server" will cause naming collisions, attribute conflicts, and broken references.

## Why CMDB-Kit Does Things Differently

If you have used JSM Assets before, you likely built your CMDB by creating object types in the UI, adding attributes with inline select lists, and populating records by hand. That works for a small, single-instance CMDB, but it has limits:

- Schema changes are manual and hard to reproduce across environments
- Status fields defined inline per type mean "Active" on Product and "Active" on Server are separate, unrelated values
- There is no audit trail for schema changes, only for data
- Moving a CMDB from dev to production means clicking through the same UI screens again

CMDB-Kit takes a different approach. Everything is defined in version-controlled JSON files, and the adapter pushes that definition into JSM. The schema is reproducible, diffable, and deployable like application code.

### Lookup Types: The Key Difference

The single biggest conceptual difference is how CMDB-Kit handles status values, categories, and other enumerations.

JSM's built-in approach uses a Status attribute (type: Status) with values defined inline on the attribute itself. Each type gets its own independent list.

```
Product
  Status: [Active, Planned, Deprecated, Retired]   <-- inline on the field

Server
  Status: [Active, Planned, Deprecated, Retired]   <-- separate copy, same values
```

CMDB-Kit creates a separate object type for each set of values, like a reference table in a relational database:

```
Product Status (object type under "Lookup Types")
  Records: Active, Planned, Deprecated, Retired

Product
  Status  -->  references Product Status
```

The lookup type file (`schema/base/data/product-status.json`):

```json
[
  { "Name": "Active", "description": "Product is live and serving traffic" },
  { "Name": "Planned", "description": "Product is approved but not yet built" },
  { "Name": "Deprecated", "description": "Product is being phased out" },
  { "Name": "Retired", "description": "Product has been decommissioned" }
]
```

A Product record that references it (`schema/base/data/product.json`):

```json
{
  "Name": "CRM Core",
  "description": "Primary CRM application handling contacts, deals, and workflows",
  "productType": "Web Application",
  "technology": "Node.js, React, PostgreSQL",
  "owner": "CRM Platform Team",
  "status": "Active"
}
```

The `"status": "Active"` value is resolved at import time to the "Active" record in the Product Status type. This approach gives you reusable values across types, metadata on each value, auditable changes through git, and repeatable deployments across environments.

## Understanding the Schema Hierarchy

CMDB-Kit organizes types into a tree with four root branches (base and extended schemas) or seven (enterprise):

```
Root
  Product CMDB          Infrastructure CIs
    Product               Software products and applications
    Server                Compute instances and hosts
    Database              Database instances
    Product Component     Modular parts of a product

  Product Library         Releases, documents, and deployments
    Product Version       Released software versions
    Document              Controlled documentation
    Deployment            Version deployed to an environment

  Directory               People, teams, and organizations
    Organization          Companies and departments
    Team                  Engineering and operations teams
    Person                Team members and contacts

  Lookup Types            Reference data and enumerations
    Product Status    Lifecycle status for applications
    Version Status        Lifecycle status for product versions
    Deployment Status     Status of a deployment
    Environment Type      Deployment environment classification
    Document Type         Classification of documents
    Document State        Document lifecycle state
    Component Type        Classification of product components
    Priority              Priority levels
    Organization Type     Classification of organizations
    Deployment Role       Roles involved in deployments
```

This is the base schema. The extended schema adds SLAs, licenses, certifications, baselines, and more. The enterprise schema adds enterprise architecture, contracts, requirements, and configuration library management.

Parent types in DC Assets define a namespace. When you browse the schema in the Assets UI, you see a collapsible tree. Grouping lookup types under "Lookup Types" keeps them visually separate from CI types. The hierarchy also enables type-level permissions and icon inheritance.


# Environment Configuration

## The .env File

The adapter needs connection details for your JSM instance. Set these in a `.env` file at the project root (recommended) or export them as shell environment variables.

```bash
cp .env.example .env
```

Then edit `.env` with your connection details. The file is gitignored and will not be committed. Shell environment variables override values in `.env`, so you can use the file for defaults and override specific values when needed.

## DC Values

```bash
# .env file for Data Center
JSM_URL=http://your-jsm:8080
JSM_USER=admin
JSM_PASSWORD=password
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

`JSM_USER` is a local username, not an email address. `JSM_PASSWORD` is the account password, not an API token. The account must have direct login credentials. If your environment uses SSO exclusively, create a local service account with Assets admin permissions for the import scripts.

## Service Accounts and SSO Fallback

In environments where SSO handles all user authentication, the import adapter still needs Basic auth credentials. Create a local Jira account (not tied to the SSO directory) with:

- Jira System Admin or Jira Admin role (for custom field and workflow operations)
- Assets Administrator role on the target schema
- A strong password stored in a secrets manager, not in plaintext `.env` files in shared locations

For ongoing automated syncs (CI/CD pipelines, scheduled re-imports), use this service account rather than a personal account.

## Direct API Routing

On Data Center, the adapter routes all API calls directly to your server at `/rest/insight/1.0`. There is no intermediate proxy, no workspace ID, and no rate limiting. The adapter auto-detects DC mode when the hostname does not end in `.atlassian.net`.

If your DC instance runs behind a reverse proxy, set `JSM_URL` to the externally reachable URL that the proxy exposes.

## Choosing a Schema Layer

| Schema | Best for |
|--------|----------|
| Base (schema/base) | Getting started, small teams, proof of concept |
| Extended (schema/extended) | Full CMDB with baselines, compliance, licensing, and SLA management |
| Enterprise (schema/enterprise) | Financial tracking, EA modeling, requirements, configuration library |

Start with base. You can switch to extended or enterprise later by changing `SCHEMA_DIR` and `DATA_DIR` and re-running the import. Extended includes everything in base plus more types, and enterprise includes everything in extended plus more.

## All Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| JSM_URL | Yes | http://localhost:8080 | DC server URL (include port if non-standard) |
| JSM_USER | Yes | | Local username with Assets admin permissions |
| JSM_PASSWORD | Yes | | Account password |
| SCHEMA_KEY | No | CMDB | Object schema key in JSM (case-sensitive) |
| SCHEMA_DIR | No | Parent of DATA_DIR | Path to schema-structure.json and schema-attributes.json |
| DATA_DIR | No | schema/base/data | Path to data JSON files |
| CREATE_SCHEMA | No | false | Set to 'true' to auto-create the schema if missing |
| DEBUG | No | false | Set to 'true' for HTTP request/response logging |

The `JSM_WORKSPACE_ID` variable is Cloud-only and has no effect on Data Center.


# Running the Import

## Step 1: Validate Locally

Before touching JSM, confirm that your schema and data files are internally consistent.

```bash
node tools/validate.js --schema schema/base
```

This checks:

- Schema structure integrity (no broken parent references)
- Attribute definitions (all referenced types exist in the structure)
- LOAD_PRIORITY completeness (every importable type is listed)
- Data file existence and reference value integrity

Fix any errors before proceeding. The validator output tells you exactly what is wrong.

## Step 2: Schema Sync

This creates all object types and their attributes in JSM. Run this first.

```bash
node adapters/jsm/import.js schema
```

What happens:

1. Connects to JSM and finds your schema by `SCHEMA_KEY`
2. Creates root types (Product CMDB, Product Library, Directory, Lookup Types)
3. Creates child types under each root
4. Creates all attributes on each type, including references between types

If a type or attribute already exists, it is skipped or updated. This operation is safe to run multiple times.

Dry run (see what would happen without making changes):

```bash
node adapters/jsm/import.js schema --dry-run
```

## Step 3: Data Sync

This imports all records from your data JSON files, respecting the LOAD_PRIORITY order.

```bash
node adapters/jsm/import.js sync
```

The LOAD_PRIORITY order in `tools/lib/constants.js` controls which types are imported first. Lookup types go first (they have no dependencies), then directory types (organizations, teams, people), then CIs (applications, servers, databases), and finally library types (versions, documents, deployments) that reference everything else.

This ordering is essential because references are resolved by name at import time. If you try to import a Product that references `"status": "Active"` before the Product Status type has its "Active" record, the reference will fail.

## Step 4: Review the Output

The import prints a summary showing how many records were added, updated, skipped, or errored for each type.

```
==================================================
  Import Complete
==================================================
  Types processed:  20
  Elapsed:          12.3s
```

If you see errors, check:

1. Is the referenced record actually in JSM? (Check LOAD_PRIORITY order)
2. Does the Name in your data file match exactly? (Case-sensitive)
3. Is the attribute name in your data file correct? (camelCase, matching schema-attributes.json)

## Import Modes

```bash
# Create new records and update existing ones (default)
node adapters/jsm/import.js sync

# Create only, skip records that already exist
node adapters/jsm/import.js create

# Update only, skip records not found in JSM
node adapters/jsm/import.js update

# Import a single type
node adapters/jsm/import.js sync --type "Product"

# Dry run
node adapters/jsm/import.js --dry-run
```


# Verifying the Result

## Post-Import Validation

Compares local data files field-by-field against live JSM data.

```bash
# Full validation
node adapters/jsm/validate-import.js

# Quick count check (faster, skips field comparison)
node adapters/jsm/validate-import.js --skip-fields --summary-only

# Validate one type
node adapters/jsm/validate-import.js --type "Product"
```

## Schema Check

Compares local schema definitions against live JSM types and attributes. Read-only, makes no changes.

```bash
# Full schema check
node adapters/jsm/check-schema.js

# Check one type
node adapters/jsm/check-schema.js --type "Product"
```

## Browsing in the DC Assets UI

1. Open Assets from the top navigation bar
2. Select your schema (e.g., "CMDB") from Object Schemas
3. You should see the four root branches in the type tree on the left
4. Expand Lookup Types to see the reference data
5. Click on Product to see imported records with resolved references
6. Use the AQL search bar to test queries against your data


# Replacing Example Data

The base schema ships with example data for a fictional SaaS CRM called OvocoCRM. To use CMDB-Kit for your own infrastructure, replace the data files.

## Option 1: Edit JSON Directly

1. Open the data files in `schema/base/data/`
2. Replace the example records with your own
3. Keep the same JSON structure (array of objects with camelCase keys)
4. Make sure reference values (like status names, team names) match exactly across files
5. Run `node tools/validate.js --schema schema/base` to catch errors
6. Re-run the import

## Option 2: CSV/Excel Workflow

For teams that prefer spreadsheets:

```bash
# Generate CSV templates with example rows
node tools/generate-templates.js --schema schema/base --examples --outdir csv-templates

# Fill in the templates in Excel or Google Sheets
# Then convert back to JSON
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
```

Start with lookup types. Define your status values, environment types, and other reference data first. Keep Names consistent across files. If your Product references `"status": "In Production"`, the Product Status type must have a record with `"Name": "In Production"` (exact match, case-sensitive). Never include Key or id fields in your data. JSM generates these automatically.


# Jira Data Center Setup

## Project Types

Create two Jira projects for CMDB operations:

A **JSM Service Desk project** handles customer-facing requests: media distribution, change requests, problem reports, site registrations, site upgrades, site decommissions, document requests, and technical support. This project provides the portal, SLAs, queues, and customer-visible request types.

A **Jira Software project** (optional) handles internal CM team work that does not originate from the portal: action items, internal investigations, DML maintenance tasks, and cross-product coordination. This project is agent-only with no portal.

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

Work Plan is the only sub-task type. It nests under a Change Request to break complex changes into trackable work items with separate hour estimates and suspense dates.

## Issue Link Types

Four link types connect related issues:

- **has work plan / is work plan for** links a Change Request to its Work Plan sub-tasks
- **relates to / relates to** provides general cross-references between issues
- **generates / generated from** links a Problem Report to the Change Request it triggered
- **implements / implemented by** links a Change Request to the Feature or requirement it addresses

Create these in **Administration > Issues > Issue Link Types**.

## Fields per Issue Type

Each issue type carries a defined set of fields. The field source indicates how the value is populated:

**Media Request:** Product (manual), Product Version (manual, cascaded), Deployment Site (manual, cascaded), Delivery Method (manual), Media Urgency (manual), Companion Products (manual, optional), Special Instructions (manual, optional).

**Change Request:** Product (manual), Product Version (manual, cascaded), Change Type (manual), Impact (manual), CCB Required (manual, boolean), Affected Sites (manual, multi-select), Current State (manual, text), Proposed Change (manual, text), Justification (manual, text), Risk Assessment (manual, text), Rollback Plan (manual, text).

**Problem Report:** Product (manual), Product Version (manual, cascaded), Severity (manual), Component (manual, cascaded), Affected Product (auto-populated from Product), Steps to Reproduce (manual, text), Expected Behavior (manual, text), Actual Behavior (manual, text).

**Site Registration:** Site Name (manual), Organization (manual), Location (manual), Products Requested (manual, multi-select), Site Type (manual), Network Domains (manual), Security Level (manual), Site Lead (manual), Contact Email (manual), Seat Count (manual, optional).

**Work Plan:** Parent Issue (auto, sub-task link), Problem Type (manual), Suspense Date (manual, date), CSCIs Affected (manual, text), System Impacts (manual, text), Security Impacts (manual, text), hours fields for Analysis, Development, Management, Documentation, Testing, QA, Miscellaneous (manual, numeric), Total Hours (calculated by ScriptRunner).


# Custom Fields Configuration

## The Tiered Dependency Model

Custom fields in JSM have dependencies: a Product Version field cannot cascade from a Product field unless the Product field exists first. Organizing fields into tiers makes the creation order clear. These tiers refer to import dependency order (which types must be imported before others), not to the ServiceNow adapter's table classification.

**Tier 1** fields have no dependencies: Product, Organization. Create these first.

**Tier 2** fields cascade from Tier 1: Product Version cascades from Product, Deployment Site cascades from Product, Component cascades from Product. Create these second.

**Tier 3** fields cascade from Tier 2: Site POC cascades from Deployment Site. Create these third.

**Tier 4** fields are standalone lookups with no cascade dependencies: Delivery Method, Urgency, Impact, Severity, Change Type. Create these in any order.

## Creating an Assets Custom Field in DC

In Data Center, navigate to **Administration > Issues > Custom Fields** and click **Add Custom Field**. Assets provides three custom field types:

**Assets object (Default)** is the standard picker. Use it for simple fields and for fields that use AQL placeholders for cascading. This is the most common type.

**Assets referenced object (Referenced)** creates a dependency where one field's value depends on another field's value. The dependent field configuration points to the parent field directly. Use this for complex cascades that need more control than AQL placeholders provide.

**Assets read-only object (Read-only)** displays an Assets object on the issue without allowing the user to change it. Use this for auto-populated fields set by ScriptRunner or automation.

After creating the field, add it to the appropriate screens. In DC, screen assignment is manual: go to **Administration > Issues > Screens**, find the screen used by your issue type's screen scheme, and add the field.

## Scope, Interaction, and Portal Visibility

Each Assets custom field has three configuration areas:

**Scope** defines what objects appear. Set the Object Schema to your CMDB-Kit schema key. Set the Filter Scope (AQL) to restrict which objects the field shows. For a Product Version field: `objectType = "CR Product Version"`. For a cascading field, add the `${FieldName}` placeholder: `objectType = "CR Product Version" AND "Product" = ${Product}`.

**Interaction** defines how the user selects. Choose single-select (dropdown) or multi-select (checkboxes). Configure which object attributes are searchable in the picker. Configure which attributes display on the issue view when an object is selected.

**Portal visibility** controls whether customers can use the field. In DC:

1. Go to **Project settings > Request types**
2. Select the request type and click **Edit fields**
3. Add your Assets custom field
4. To enable the object picker on the portal, open your schema in Assets, go to **Object Schema > Configure > Roles**, and enable the JSM customer access option in the information box at the bottom

Without enabling customer access on the schema, customers see empty dropdowns on the portal.

## Cascade Filtering with AQL

The `${FieldName}` placeholder is the mechanism for cascading selects. When the user selects a value in the Product field, the `${Product}` placeholder in dependent fields resolves to that selection. The dependent field's AQL re-evaluates, and its dropdown shows only matching objects.

### Setting up the cascade

In a multi-product schema, each product has its own prefixed CMDB branch (CR for OvocoCRM, AN for OvocoAnalytics). Each prefixed branch includes a Product type (CR Product, AN Product) that serves as the cascade root.

The cascade requires a `product` reference attribute on each type that should filter by product. In `schema-attributes.json`, add to CR Product Version, CR Deployment Site, CR Product Component, CR Document, CR Baseline, and any other types that should cascade:

```json
"product": { "type": 1, "referenceType": "CR Product" }
```

After adding the attribute, populate it in your data files. Every CR Product Version record needs a `"product": "OvocoCRM"` entry (matching the Name of the CR Product object). Then re-run the schema sync and data sync.

The Tier 1 custom field on the Jira issue is named "Product" and scoped to `objectType = "CR Product"`. When a customer selects a product on the portal, dependent fields use `${Product}` to filter their dropdowns.

### Attribute naming for clarity

CMDB-Kit uses `status` as the attribute name on multiple types (Deployment Site, Product, License, Certification). After import, all of these display as "Status" in Assets. This works because AQL scopes to `objectType`, but it can be confusing in dashboards. Consider renaming ambiguous attributes for clarity: `siteStatus` on Deployment Site (displays as "Site Status"), `versionStatus` on Product Version (displays as "Version Status"). The AQL examples below use the renamed display names.

### Cascade patterns

```
Product Version from Product:
  objectType = "CR Product Version" AND "Product" = ${Product}

Active Deployment Sites from Product:
  objectType = "CR Deployment Site" AND "Product" = ${Product}
    AND "Site Status" = "Active"

Documents from Product:
  objectType = "CR Document" AND "Product" = ${Product}

Baselines via Product Version traversal:
  objectType = "CR Baseline" AND "Version"."Product" = ${Product}

Target Version (restricted to deployable versions):
  objectType = "CR Product Version" AND "Product" = ${Product}
    AND "Version Status" IN ("Current", "Beta")
```

The `${FieldName}` reference is case-sensitive and must match the custom field name exactly. `${Product}` works if the field is named "Product." `${product}` does not. This is the most common configuration mistake.

DC supports additional placeholder syntax not available on Cloud. The `${FieldName${0}}` notation matches all values for multi-value fields. The `${FieldName${1}}` notation matches only the first value. These are useful when a custom field holds multiple Assets objects and you need to reference them in another field's AQL.

## Object Attributes on Issue View

When an Assets field is selected on a Jira issue, you can configure which object attributes display inline without clicking into the object record.

For a Deployment Site field, configure it to show: Name, Site Status, Product Version, and Location. An agent processing a media distribution request sees the site's current version and status directly on the issue.

For a Product Version field, show: Name, Version Number, Release Date, and Version Status. The agent sees whether the requested version is Current or Beta at a glance.

## Complete Field Reference

| Field Name | Assets Type | Tier | Cascade Source | AQL Filter | Multi-select | Portal |
|-----------|------------|------|---------------|-----------|-------------|--------|
| Product | CR Product | 1 | none | objectType = "CR Product" | no | yes |
| Organization | Organization | 1 | none | objectType = "Organization" | no | yes |
| Product Version | CR Product Version | 2 | Product | "Product" = ${Product} | no | yes |
| Deployment Site | CR Deployment Site | 2 | Product | "Product" = ${Product} AND "Site Status" = "Active" | no | yes |
| Component | CR Product Component | 2 | Product | "Product" = ${Product} | no | no |
| Document | CR Document | 2 | Product | "Product" = ${Product} | no | no |
| Baseline | CR Baseline | 2 | Product | "Version"."Product" = ${Product} | no | no |
| Affected Sites | CR Deployment Site | 2 | Product | "Product" = ${Product} | yes | no |
| Target Version | CR Product Version | 2 | Product | "Product" = ${Product} AND "Version Status" IN ("Current", "Beta") | no | yes |
| Delivery Method | (text select) | 4 | none | n/a | no | yes |
| Urgency | (text select) | 4 | none | n/a | no | yes |


# Portal Request Types

## Portal Architecture

The JSM Service Desk portal is the customer-facing entry point for all CM requests. Organize portal request types into groups: "Configuration Management" for CM-specific requests (media distribution, change requests, site registrations) and "Support" for general support tickets.

Each portal request type maps to a Jira issue type with Assets custom fields attached. The fields that appear on the portal form are the customer-facing inputs. Additional fields visible only to agents appear on the issue view after submission.

## Request Types

**Media Distribution Request** asks the CM team to deliver software media to a deployment site. Portal fields: Product, Product Version (cascaded), Deployment Site (cascaded, active only), Delivery Method, Media Urgency. Workflow: Open, Preparing Media, Shipping, Waiting for Customer, Resolved. On resolution, automation creates or updates a Distribution Log record.

**Change Request** proposes a change to the product or its infrastructure. Portal fields: Product, Product Version (cascaded), Change Type, Impact, description of current state, proposed change, justification. The CCB Required field (boolean) controls routing. Workflow: Open, Review, CCB Review (if required), Implementation, Verifying, Resolved. The Rejected branch exits from either Review or CCB Review.

**Problem Report** captures a defect or service degradation. Portal fields: Product, Product Version (cascaded), Severity, Component (cascaded), description. Workflow: Open, Investigating, Mitigated, Resolved, Closed. Five statuses separate mitigation from resolution from closure.

**Site Registration** registers a new customer deployment site. Portal fields: Site Name, Organization, Location, Site Type, Products Requested (multi-select), Network Domains, Security Level, Site Lead, Contact Email. Workflow: Open, In Review, Provisioning, Resolved. On resolution, automation creates Deployment Site CI records, one per product requested.

**Site Upgrade Request** initiates an upgrade to a new product version. Portal fields: Product, Deployment Site (cascaded, active only), Current Version (auto-populated), Target Version (cascaded, Current and Beta only). Workflow: Open, Review, Executing, Verifying, Resolved.

**Site Decommission** retires a deployment site. Portal fields: Product, Deployment Site, current version, media return plan. Workflow: Open, Review, Media Recall, Resolved. On resolution, automation sets the Deployment Site status to "Decommissioned."

**Document Request** asks for delivery of a controlled document. Portal fields: Product, Document (cascaded), Product Version, Delivery Method. No CMDB impact on resolution because the Document CI already exists.

## Schema Permissions for Portal Dropdowns

The customer role needs read access to the Assets schema so the object picker dropdowns work on the portal. Without this, customers see empty dropdowns.

To configure:

1. Open your schema in Assets
2. Select **Object Schema > Configure**
3. Switch to the **Roles** tab
4. In the JSM information box at the bottom, click **Enable**

This grants JSM portal customers read-only access to the schema objects that appear in custom field pickers.

For sensitive types that should not be visible to customers, use object type-level permissions. DC supports overriding schema-level permissions at the individual object type level. Grant the Users role on types customers need to see (lookups, deployment sites, versions) and remove access on internal types (persons, teams, internal applications).


# AQL Query Library

## AQL Fundamentals

AQL (Assets Query Language) is the query language for JSM Assets on Data Center. Older versions and some ScriptRunner references call it IQL (Insight Query Language). The syntax is identical regardless of name.

Basic syntax: `<attribute> <operator> <value/function>`

AQL is case-sensitive for attribute names. Attribute names with spaces must be enclosed in double quotes. Values with spaces also need double quotes.

**Comparison operators:** `=` (case-insensitive match), `==` (case-sensitive), `!=` (not equal), `>`, `<`, `>=`, `<=` (for dates and numbers).

**Set operators:** `IN` (value matches any in list), `NOT IN` (value matches none in list).

**Pattern matching:** `LIKE` (case-insensitive substring match), `NOT LIKE`, `STARTSWITH`, `ENDSWITH`.

**Null checks:** `IS EMPTY` (no value), `IS NOT EMPTY` (has a value).

**Keywords:** `objectType` (filter by type name), `objectTypeId` (filter by type ID), `anyAttribute` (search all attributes), `object` (used with HAVING), `objectId` (find by object ID).

**Functions:** `now()` (current datetime with offset), `startOfDay()`, `endOfDay()`, `startOfMonth()`, `endOfMonth()`, `startOfYear()`, `endOfYear()`, `currentUser()`, `currentReporter()`, `CIDR()` (IP range matching).

**Dot notation** traverses references: `"Product Version"."Product"` reads the Product attribute on the referenced Product Version object.

**Ordering:** Append `order by <attribute> [asc|desc]` to any query. If the attribute is a reference, use dot notation to order by attributes on the referenced object.

In a multi-product schema, always use product-prefixed type names: `objectType = "CR Product Version"`, not `objectType = "Product Version"`.

## Field Scoping Queries

These queries power the cascade dropdowns described in the Custom Fields section:

```
Product to Product Version:
  objectType = "CR Product Version" AND "Product" = ${Product}

Product to Active Deployment Sites:
  objectType = "CR Deployment Site" AND "Product" = ${Product}
    AND "Site Status" = "Active"

Product to Documents:
  objectType = "CR Document" AND "Product" = ${Product}

Product to Baselines (via version traversal):
  objectType = "CR Baseline" AND "Version"."Product" = ${Product}

Product to Certifications:
  objectType = "CR Certification" AND "Product" = ${Product}

Product to Components:
  objectType = "CR Product Component" AND "Product" = ${Product}

Product to Distribution Records (via site traversal):
  objectType = "CR Distribution Log"
    AND "Site"."Product" = ${Product}
```

## Operational Dashboard Queries

Queries for day-to-day operational visibility:

```
Active deployment sites (single product):
  objectType = "CR Deployment Site" AND "Site Status" = "Active"

Sites being provisioned (cross-product):
  objectType IN ("CR Deployment Site", "AN Deployment Site")
    AND "Site Status" = "Provisioning"

Recent go-lives (last 90 days):
  objectType = "CR Deployment Site"
    AND "Go Live Date" >= startOfDay(-90d) AND "Site Status" = "Active"

Versions in pipeline:
  objectType = "CR Product Version"
    AND "Version Status" IN ("Beta", "Current")

Sites in maintenance:
  objectType = "CR Deployment Site"
    AND "Site Status" = "Maintenance"

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

Reference functions accept an optional reference type argument to narrow by relationship type:

```
Objects with inbound "Depends" references from File Systems:
  object having inR(objectType = "File System", refType IN ("Depends"))
```

The `connectedTickets()` function bridges AQL and JQL, finding Assets objects that have linked Jira issues:

```
Deployment sites with open Jira issues:
  objectType = "CR Deployment Site"
    AND object having connectedTickets("status != Done")
```

## AQL in JQL (Hybrid Queries)

The `iqlFunction()` JQL function (DC naming) bridges Jira issue searches with Assets object queries. On newer DC versions, `aqlFunction()` also works. The function finds Jira issues whose Assets custom fields match an AQL condition.

Find issues linked to active deployment sites:

```
"Deployment Site" in iqlFunction(
  "objectType = 'CR Deployment Site' AND 'Site Status' = 'Active'"
)
```

Find issues linked to expiring certifications:

```
"Certification" in iqlFunction(
  "objectType = 'CR Certification' AND 'Expiration Date' <= now('+30d')"
)
```

Use `iqlFunction()` in JQL filters for dashboard gadgets, queue definitions, and saved filters. This is how you build dashboards that combine issue state with CI state.


# ScriptRunner Automation

ScriptRunner for Jira Data Center is the primary automation engine for complex CMDB operations. It provides Groovy scripting with full access to the Jira and Assets APIs through the HAPI (High-level API) library. Cloud has no equivalent; these patterns are DC-only.

## Auto-Generate Unique Identifiers

Organizations that require formatted identifiers beyond Jira's built-in issue keys use a ScriptRunner Listener on the issue creation event. The script generates an identifier like "CMDB-0042-I" (project key, padded sequence number, network suffix) and writes it to a custom text field.

This pattern is common in environments where issue keys need to follow an external numbering standard that does not match Jira's sequential key format.

## Auto-Populate Originator Data

When a user submits a request, their Person record in Assets contains their site and organization. A ScriptRunner Listener on issue creation queries Assets:

```
objectType = "Person" AND "Email" = "${currentUser.emailAddress}"
```

It reads the Person's site and organization references and populates the Originator Site and Originator Organization fields on the issue. The agent sees the requester's context without asking.

This eliminates manual data entry for the most common fields and reduces errors from customers selecting the wrong organization or site.

## Calculated Fields (Hours Rollup)

Work Plans track effort in seven category fields: Analysis, Development, Management, Documentation, Testing, QA, and Miscellaneous hours. A ScriptRunner Behaviour (client-side form behavior) or Listener (server-side on field change) sums these values and writes the result to a read-only Total Hours field.

Behaviours are DC-specific. They execute in the browser as the user edits the form, providing real-time feedback. The total updates as the user types, before the issue is saved.

## Status History Tracking

A ScriptRunner Listener on status change events appends each transition to a multi-line text field: timestamp, old status, new status, and the user who made the transition. This creates a human-readable audit trail directly on the issue without navigating Jira's activity stream.

The format is simple and grep-friendly:

```
2026-01-15 09:23:11 | Open -> Review | jane.smith
2026-01-15 14:07:45 | Review -> CCB Review | john.doe
2026-01-22 10:30:00 | CCB Review -> Implementation | ccb.chair
```

## Bidirectional Relationship Maintenance

When a Product Version links to a Deployment Site in Assets, the reverse reference (Deployment Site back to Product Version) may not exist if the platform only stores one direction. A ScriptRunner Listener on relationship creation checks for the reverse and creates it if missing.

The script must check before creating to avoid infinite loops: if the reverse already exists, do nothing.

## Notification for Restricted Records

In classified environments, a ScriptRunner Listener fires when an issue is created with a RESTRICTED label. It looks up the program from the issue, finds the CM and PM users for that program in Assets, and sends targeted email notifications. Only the people who need to know are notified, rather than a broad distribution list.

## Archive Processing (Scheduled Job)

A quarterly ScriptRunner scheduled job (using the Jobs feature) searches for closed issues with the ARCHIVE_READY label, clones them to a separate archive project (preserving issue links), and marks the originals as ARCHIVED. This keeps the active project clean while maintaining the full audit trail in the archive.

Configure the schedule using a cron expression in ScriptRunner's Jobs section: `0 0 2 1 1/3 ?` (2:00 AM on the first day of each quarter).

## Workflow Validators

ScriptRunner validators gate workflow transitions based on CMDB state:

- Block "Resolve" on a media request if no Distribution Log record exists for the linked site and version
- Block "Close" on a site registration if no Deployment Site CI was created
- Block "Approve" on a change request if a linked requirement is not in Approved status

The validator queries Assets for the linked CI using the HAPI Assets API, checks the required fields or status, and returns an error message if the condition is not met. Add validators to specific workflow transitions in **Administration > Workflows > Edit > Transition > Validators**.


# Workflows and Automation

## Request Type Workflows

Each request type has a workflow designed around its specific lifecycle:

**Media Distribution:** Open, Preparing Media, Shipping, Waiting for Customer, Resolved. The "Waiting for Customer" status pauses the SLA timer while the site confirms receipt.

**Change Request:** Open, Review, CCB Review, Implementation, Verifying, Resolved. The Rejected branch exits from either Review or CCB Review. The CCB Review status pauses the SLA.

**Problem Report:** Open, Investigating, Mitigated, Resolved, Closed. Five statuses enable separate tracking of mitigation time and resolution time.

**Site Registration:** Open, In Review, Provisioning, Resolved. The Provisioning status represents the period where infrastructure is being set up.

**Site Upgrade:** Open, Review, Executing, Verifying, Resolved. The Verifying status confirms the upgrade was successful before closing.

Create these workflows in **Administration > Workflows**. DC uses the traditional workflow editor with a text-based step/transition model and a graphical diagram view. Associate each workflow with its issue type through a workflow scheme.

## The CCB Integration Pattern

The CCB Required field (boolean) on Change Request issues controls whether a request routes through CCB review. This is implemented as a workflow condition:

When CCB Required = Yes, the transition from Review goes to CCB Review instead of directly to Implementation. The CCB Review queue is visible only to users with the CCB Board project role.

In CCB Review, the SLA timer pauses. The CCB chair reviews the change request with its five-dimension impact analysis (technical, cost, schedule, risk, performance). Approval triggers an auto-transition to Implementation and notifies the requester. Rejection transitions to Rejected with a mandatory comment explaining the decision.

A weekly automation rule checks for CCB reviews pending more than 7 days and sends a reminder to the CCB Board.

ITIL defines three change models that map to workflow branches:

- **Standard changes** are pre-approved. CCB Required defaults to No, and the request goes directly from Review to Implementation.
- **Normal changes** require CCB review. CCB Required is set to Yes.
- **Emergency changes** get expedited approval. The CCB chair alone can approve (instead of the full board), with post-hoc ratification at the next regular CCB meeting.

## Status-to-CMDB Synchronization

When an issue resolves, the linked CI in Assets updates automatically:

- Site Registration resolved: create Deployment Site CI with status "Provisioning"
- Media Distribution resolved: set Distribution Log Transfer Status to "Completed"
- Site Upgrade resolved: update Deployment Site productVersion to the target version
- Site Decommission resolved: set Deployment Site status to "Decommissioned"

The pattern: every issue carries an Assets reference field pointing to the affected CI. On the Resolve transition, a ScriptRunner post-function (or Assets workflow post-function) reads the CI reference, queries the Assets API, and updates the appropriate attribute.

DC provides two mechanisms for this:

**Assets workflow post-functions** (built into DC Assets) allow setting object attributes on workflow transitions without Groovy code. Add them in the workflow transition's post-functions tab. They support setting attribute values, creating objects, and updating objects using the current issue's field values.

**ScriptRunner post-functions** provide more flexibility for complex updates that involve multiple objects, conditional logic, or cross-product operations. Use ScriptRunner when the built-in post-functions are not sufficient.

## Automation Rules

### Request Routing

Automation for Jira rules route new requests to the appropriate queues:

- Media Distribution Requests route to the CM Distribution queue, auto-assigned by product
- Change Requests with CCB Required = Yes route to the CCB Board queue
- Problem Reports with SEV1 or SEV2 route to the CM Leads queue with Highest priority
- Site Registrations route to the CM Leads queue
- Technical Support requests route to the Support Team queue
- Any issue unassigned after 2 hours triggers an alert to CM Leads

### SLA Configuration

Two SLA timers per request type: First Response (time until an agent responds) and Resolution (time until the issue is resolved).

Pause conditions: the SLA clock pauses when status is "Waiting for Customer" or "CCB Review." These statuses represent time where the agent cannot act.

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

### CMDB Auto-Update Rules

On resolution of specific request types, automation rules update Assets:

- Site Registration resolved: create Deployment Site CI with status "Provisioning"
- Site Upgrade resolved: update Deployment Site productVersion and upgradeStatus
- Site Decommission resolved: set Deployment Site status to "Decommissioned"
- Media Distribution resolved: update Distribution Log Transfer Status to "Completed"

### Notification Rules

- New Product Version created in Assets: email all active Deployment Site POCs
- Certification expiring within 30 days: daily alert to CM Leads
- License expiring within 60 days: daily alert to CM Leads
- CCB review pending more than 7 days: weekly reminder to CCB Board members
- High-impact change submitted: immediate alert to CM Leads and Product Leads

### Assets-Native Automation Rules

DC Assets has its own automation engine, separate from Automation for Jira. Configure these within the schema: **Object Schema > Configure > Automation tab**.

Assets automation rules use a WHEN/IF/THEN model:

- **WHEN** (event): Object created, Object updated, Attachment added, or Scheduled (cron expression)
- **IF** (condition): AQL filter that narrows which objects trigger the action
- **THEN** (action): Send email, Set attribute value, Create Jira issue, Run Groovy script

Scheduled rules are particularly useful for data quality checks. Configure a cron expression to run a nightly AQL query that finds objects missing required fields and sends an email summary to the data steward.

### Scheduled Data Quality Checks

Daily: Deployment Sites with "Site Status" = "Active" and "Product Version" IS EMPTY. Daily: Distribution Logs shipped more than 14 days ago with no receipt confirmation.

Weekly: Documents not linked to any Documentation Suite. Weekly: Organizations with no Person records.

Monthly: Deployment Sites on deprecated or retired versions.

### Upgrade Campaign Automation

An upgrade campaign tracks the rollout of a new version across multiple sites:

1. Campaign start: set each Deployment Site's targetVersion and upgradeStatus = "Not Started"
2. Media shipped: transition upgradeStatus to "Media Sent," send notification to the site POC
3. Receipt confirmed: transition to "Media Received"
4. Reminder sequence: if "Media Sent" for 14+ days with no receipt confirmation, send a follow-up reminder
5. Installation verified: set productVersion = targetVersion, clear targetVersion, set upgradeStatus = "Verified"

This sequence creates a per-site progress tracker that the Version Compliance Dashboard can visualize.


# Dashboards and Queues

## Agent Queues

Eight queues cover the primary work streams:

- **Media Requests:** assigned to the CM Distribution team
- **Change Requests Pending CCB:** visible to the CCB Board role
- **Open Problem Reports:** assigned to CM Analysts
- **Site Registrations:** assigned to CM Leads
- **Site Upgrades:** assigned to CM Leads
- **Technical Support Open:** assigned to the Support Team
- **Unassigned Issues:** escalation queue visible to CM Leads
- **My Assigned Issues:** individual agent's personal queue

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

DC Assets provides two gadget types for Jira dashboards:

The **Assets Object List** gadget displays a table of objects matching an AQL query. Configure it with your query, select which attributes to show as columns, and add it to any dashboard.

The **Assets Object Count** gadget displays a single number: how many objects match the query. Use it for KPIs like "Active Deployment Sites: 47" or "Expiring Certifications: 3."

Combining AQL gadgets (showing CI state) with JQL gadgets (showing work items) on the same dashboard creates a unified view of what exists and what work is in flight.


# Requirements Management Plugin

## DC Marketplace Options

Three requirements management tools integrate with Jira Data Center and JSM Assets:

**RMSIS for Jira** (Optimizory) is a full requirements management solution with traceability matrices, baselines, import/export from ReqIF and DOORS, coverage analysis, and version control. It integrates tightly with Jira issue linking and can reference Assets objects through custom fields.

**R4J (Requirements and Test Management for Jira)** (easeRequirements) provides tree-structured requirements management within Jira, with traceability to test cases and downstream issues. It supports coverage reporting and impact analysis.

**Xray Test Management** focuses on test management but includes requirements traceability. It links test plans and test executions to requirements, providing coverage matrices. In a CMDB context, Xray tracks verification activities for product versions and certifications.

## Integration Pattern

The integration pattern links requirements to CMDB types through a traceability chain:

```
Requirement (RMSIS/R4J)
  -> implements -> Feature (Assets CI)
  -> verified by -> Test Case (Xray/Zephyr)
  -> deployed in -> Product Version (Assets CI)
  -> documented in -> Document (Assets CI)
```

CMDB-Kit's Feature type in the extended schema provides the bridge. A Feature record in Assets links to the implementing requirement (via Jira issue link) and to the Product Version where it ships. The RMSIS requirement links to the Feature's Jira issue, creating bidirectional traceability.

## Coverage Reporting

Requirements tools generate coverage matrices showing which requirements have implementing features, which features have test cases, and which test cases have been executed against which product versions. Combined with AQL queries on Product Version and Feature types, you can answer: "Which requirements are verified in version 2.3.1?" and "Which untested requirements will ship in the next release?"


# Confluence Data Center

## Documentation Space Structure

Create a CMDB Documentation space in Confluence that mirrors the four-branch taxonomy. Top-level pages for each product CMDB and Product Library. Sub-pages for each CI type. Separate sections for runbooks, SOPs, and training materials.

```
CMDB Documentation (space)
  OvocoCRM
    Products
    Servers
    Databases
    Components
  OvocoAnalytics
    Products
    Components
  Product Library
    CR Versions
    CR Documents
    CR Deployments
  Directory
    Organizations
    Teams
  Runbooks
  SOPs
  Training
```

This structure makes documentation findable by the same hierarchy that organizes the CMDB itself.

## Assets Macros for Live CMDB Data

DC Confluence with JSM Assets provides macros that embed live CI data directly in documentation pages. A deployment site documentation page can show the site's current version, status, and go-live date pulled live from Assets.

The Assets macro types include:

- **Assets Object** macro: displays a single object's attributes inline in the page
- **Assets Object List** macro: displays a table of objects matching an AQL query
- **Assets Object Count** macro: displays a count of matching objects

Use these to keep documentation automatically current. A page titled "OvocoCRM Active Deployment Sites" with an Assets Object List macro using `objectType = "CR Deployment Site" AND "Site Status" = "Active"` is always up to date.

## AQL Queries in Documentation and Runbooks

Embed AQL queries in runbook pages to provide operators with live context. A site upgrade runbook can show the current version of the target site, the target version's release notes, and the list of components included in the new version, all pulled live from Assets.

This eliminates the stale-data problem where runbook pages list versions that are months out of date.

## Page Properties for Document Tracking

Confluence page properties (key-value pairs in a table at the top of a page) enable metadata searches across the space. Define properties like:

- Document Type: SOP, Runbook, Architecture Decision, Training
- Status: Draft, In Review, Published, Archived
- Owner: Team or person responsible
- Last Review Date: When the document was last reviewed
- Related CI: The Assets object this page documents

Use the Page Properties Report macro to generate cross-cutting views: all SOPs awaiting review, all runbooks owned by a specific team, all architecture decisions made in the last quarter.

## Labels for Cross-Cutting Views

Confluence labels provide a flat taxonomy that cuts across the page hierarchy. Apply labels like `cr-deployment`, `an-deployment`, `sop`, `runbook`, `ccb-decision`, `architecture` to create views that span multiple sections.

Combined with the CQL (Confluence Query Language) search, labels enable queries like: "All pages labeled `sop` and `cr-deployment`" to find all SOPs related to OvocoCRM deployments.

## Jira Integration for Document Reviews

The Document Review Report (DRR) issue type in Jira links to both the Document CI in Assets and the Confluence page. The review workflow:

1. DRR issue created, linking the Document CI and the Confluence page
2. Reviewer opens the Confluence page, adds comments and suggestions
3. Author revises, marks review comments as resolved
4. DRR transitions to Approved
5. On DRR resolution, automation updates the Document CI state to "Published" and the approved artifact moves to the DML

This creates an auditable review trail in Jira with the actual review work happening in Confluence.

## Automation Rules

Assets-native automation rules can trigger Confluence updates:

- When a Product Version status changes to "Current," send a notification to update the corresponding Confluence release page
- When a Document CI state changes to "Archived," add an "archived" label to the linked Confluence page via REST API (ScriptRunner scheduled job)

Confluence macros referencing Assets data update automatically. No push is needed for data displayed through macros; the macro queries Assets on each page view.


# Tool Responsibility Matrix

## Assets Track What Is, Issues Track What Needs to Happen

The core principle governing the entire Atlassian implementation: JSM Assets hold persistent CI state, Jira issues hold temporary work. When an issue closes, the work is done, but the CI it created or updated persists in Assets. A site registration request is temporary. The Deployment Site record it creates is permanent.

The decision matrix is simple: if something has a lifecycle beyond a single work request, it belongs in Assets. A deployment site exists for years. A server exists until decommissioned. A product version exists forever as part of the release history. These are Assets objects. A request to ship media, a request to upgrade a site, a problem report about a bug, these are temporary and belong as Jira issues.

## What Belongs in Each Tool

**JSM Assets** holds CI records: products, servers, deployment sites, product versions, baselines, distribution logs, documents, certifications, licenses, organizations, teams, persons, and all lookup types. These are the persistent state of your infrastructure and organization.

**Jira Issues** holds work items: media distribution requests, change requests, problem reports, site registrations, site upgrades, site decommissions, action items, document review reports, and technical support tickets. These are tasks that have a beginning and an end.

**Confluence** holds narrative documentation: runbooks, SOPs, architecture decisions, training materials, meeting minutes, and design discussions. These are the knowledge layer that gives context to the structured data in Assets and the work tracked in Jira.

**Extensions** fill gaps in the core toolstack. Requirements management tools (RMSIS or equivalent) track formal requirements with traceability. Test management tools (Xray or Zephyr) track test plans, test cases, and execution results. These integrate with both Assets and Jira through references and links.

## Data Flow Between Tools

Four integration patterns connect the tools:

**Issue creates asset.** A site registration request resolves, and the automation creates a new Deployment Site CI in Assets with status "Provisioning." The temporary work item produces a permanent CI record.

**Issue updates asset.** A media distribution request resolves, and the automation updates the Distribution Log record's Transfer Status to "Completed" in Assets. The work item changes the state of an existing CI.

**Asset triggers issue.** A certification's expiration date passes a threshold (30 days out), and an automation rule creates a renewal task in Jira. The CI's state creates new work.

**Asset informs issue.** A media distribution request is submitted, and the agent checks the linked Deployment Site's status in Assets before approving. If the site is "Decommissioned," the request is rejected. The CI's state influences how work is processed.

These patterns combine in real workflows. A media distribution request (Jira issue) references a Deployment Site (Assets object) whose status informs whether to proceed. When the request resolves, it updates a Distribution Log (Assets object). If the distribution reveals a problem, a Problem Report (Jira issue) is created, which links back to the affected Product (Assets object).


