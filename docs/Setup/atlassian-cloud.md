# Atlassian Cloud

A complete guide to setting up and operating CMDB-Kit on the Atlassian Cloud stack. This covers JSM Assets, Jira Cloud, Confluence Cloud, and Cloud-only products. Everything you need is in this document, from initial schema creation through dashboards and automation.

The examples use OvocoCRM, the fictional SaaS CRM that ships with CMDB-Kit's example data. Replace "OvocoCRM" with your own product when working with real data.


# JSM Assets Setup

## Cloud Prerequisites

You need:

- An Atlassian Cloud site with a paid Service Collection plan (Standard, Premium, or Enterprise). Assets is included in all paid plans. Premium and Enterprise add Data Manager and Atlassian Analytics.
- An Atlassian account with Assets admin permissions.
- An API token generated at https://id.atlassian.com/manage-profile/security/api-tokens. You will use your email address and this token for authentication.
- Node.js 18 or later, Git, and a terminal.

Assets has moved to the platform level. It is accessible from any Jira app through the app switcher, not just from JSM service spaces. This means you can use Assets alongside Jira Software, Jira Work Management, or any other Jira product on your site.

## Creating an Object Schema

CMDB-Kit needs an empty object schema. It creates its own type hierarchy, attributes, and lookup types, so importing into a schema that already has types will cause naming collisions and broken references.

To create an empty schema:

1. Open Assets from the app switcher (top navigation bar)
2. Click **Create schema**
3. Select **Empty schema**
4. Enter a name (e.g., "CMDB") and a key (e.g., "CMDB")
5. Click **Create**

The schema key is the short identifier you will use in the `SCHEMA_KEY` environment variable. It must match exactly, including case. If your key is "CMDB", set `SCHEMA_KEY=CMDB`.

## Schema Templates and When to Skip Them

Cloud offers three schema templates when creating a new schema:

- **IT Asset Management** - hardware assets, models, and model categories
- **People** - employees, teams, departments, organizations
- **Facilities** - sites, buildings, floors, rooms

The three templates form a complementary set: ITAM covers the "What" (assets), People covers the "Who" (owners and users), and Facilities covers the "Where" (physical locations). All templates are fully editable after creation. Admins can add, remove, or modify object types and attributes to fit their organization.

These templates are designed for organizations building an ITAM practice from scratch. CMDB-Kit does not use them because it provides its own type hierarchy with its own attribute definitions and lookup pattern. Using a template and then importing CMDB-Kit would create duplicate types (both would have "Organization" or "Server" types) with conflicting attribute definitions.

If your organization wants both an ITAM schema (for hardware asset tracking with procurement and depreciation attributes) and a CMDB schema (for service and application configuration management), create them as separate object schemas. Assets supports multiple schemas, and they can reference each other through cross-schema references.

### What the Templates Contain

The IT Asset Management template creates a two-branch hierarchy. The Hardware Assets branch contains child types for Phones, Laptops, Servers (with Red Hat Linux and Windows Server children), and Printers. The Model branch contains Hardware Models, Model Categories, and Software Models. Hardware Assets carries attributes inherited by all children: Asset Tag, Serial Number, PO Number, Purchase Date, Refresh Date, Last Scan Date, Operational Status, Status, Model Name (reference to Hardware Models), and several more. Phones add IMEI and Phone Number. Servers add IP Address and Domain Name. The template also creates lifecycle statuses (In Use, In Stock, In Transit, Ordered, Retired, Disposed, Missing) and reference types (Assigned To, Located In, Manufactured By, Operates In).

The People template covers employees, teams, departments, and organizations. Typical attributes include Full Name, Employee ID, Email, Employment Type, Manager (object reference), Department, Role, Start Date, End Date, Location, and Cost Centre. The exact attribute list is not fully enumerated in Atlassian's public documentation, so deploying the template in a test instance provides the definitive inventory.

The Facilities template maps the physical hierarchy: sites, buildings, floors, and rooms. Typical attributes include Address, City, Country, Floor Number, Room Number, Room Type, Capacity, and Status. As with People, the full attribute list is best confirmed by deploying the template.

### How CMDB-Kit Overlaps With the Templates

CMDB-Kit and the templates serve different purposes, but they cover some of the same ground:

| Template | Overlapping CMDB-Kit Types | Key Difference |
|----------|---------------------------|----------------|
| IT Asset Management | Server, Hardware Model | CMDB-Kit adds application, component, and service relationships. ITAM adds procurement, depreciation, and lease tracking. |
| People | Organization, Team, Person | CMDB-Kit models team ownership of products and services. People tracks HR-style employee records. |
| Facilities | Location, Facility | CMDB-Kit links locations to deployments and servers. Facilities models the physical building hierarchy. |

When overlap exists, choose one schema to be the source of truth for each type. Use cross-schema references so that a CMDB-Kit Server record can reference a hardware asset in the ITAM schema, or an ITAM asset can reference a Team record in the CMDB-Kit schema.

## How CMDB-Kit Coexists with Other Schemas

You can run CMDB-Kit's schema alongside other schemas on the same site. Enable cross-schema references by going to your schema settings and checking "Allow other object schemas to reference objects in this schema." This lets an ITAM schema's hardware asset reference a CMDB-Kit Team record as the asset owner, for example.

## Assets Data Manager Awareness

Cloud Premium and Enterprise plans include Data Manager, an ETL pipeline for ingesting asset data from external sources. Data Manager uses five built-in object classes. Each object class defines a fixed set of attributes that data sources map into. Data Manager objects are distinct from Assets schema objects - they must be imported into a schema to appear in Assets.

- **Compute** (79 attributes) - servers, desktops, laptops, VMs. Covers hardware details (manufacturer, model, CPU, memory, disk), financial information (purchase price, depreciation, lease terms), lifecycle dates (install, refresh, retirement, warranty), OS details, virtualization flags, network addresses, and assignment fields.
- **Software** (15 attributes) - installed software products. Covers publisher, version, edition, classification (COTS, freeware), category (OS, database, in-house), and end-of-support dates.
- **People** (17 attributes) - employees and users. Covers name, employee ID, email, employment type, manager, role, organization, department, location, and cost centre.
- **Network** (62 attributes) - routers, switches, firewalls. Shares most attributes with Compute (financial, lifecycle, assignment) and adds firmware and port number fields.
- **Peripherals** (62 attributes) - printers, monitors, docking stations. Similar attribute set to Network, with the addition of stock count and device type fields.

Data Manager has 20+ adapters for sources like Active Directory, SCCM, Intune, Jamf, Entra ID, CrowdStrike Falcon, Lansweeper, ServiceNow, and Snow.

CMDB-Kit does not use Data Manager. The two serve different purposes: Data Manager ingests discovered infrastructure data (what hardware exists on the network), while CMDB-Kit defines the configuration management schema (how applications, services, versions, and deployments relate to each other). In a mature implementation, Data Manager feeds hardware inventory into an ITAM schema while CMDB-Kit manages the service and application configuration in a separate schema. The two schemas can cross-reference each other.

Cloud Premium and Enterprise plans include Assets Discovery, the same agentless network scanner available on Data Center. You install a Discovery agent on your local network, and it pushes discovered hardware and software data into your Cloud Assets schema. Data Manager and Discovery serve different purposes: Discovery scans your network to find what exists, while Data Manager pulls from existing data sources (SCCM, Intune, Active Directory, etc.) to enrich and reconcile that data.

## The Built-in Services Schema

Cloud includes a read-only, auto-generated Services schema. When you create services through the JSM Services panel, they appear automatically as objects in this schema. You cannot modify its structure, add object types, import data into it via the Assets API or CSV import, or change its attributes. The schema is not exportable and cannot be used as a basis for custom schemas.

The Services panel uses service type labels (Software Service, Business Service, Application, Capability) to categorize services, but these have no technical impact on the schema structure.

Services function as connectors between JSM features and Assets objects. They can demonstrate impact relationships, showing what a change request could affect and what major incidents could impact. However, services in this schema are not the same as full Assets objects. Organizations must choose whether to manage services through the Services panel (read-only in Assets) or create them as full Assets objects in a custom schema (fully editable but requires manual linking).

If you need editable service objects with full CMDB capabilities (custom attributes, references, imports), create them as types in your CMDB-Kit schema rather than relying on the built-in Services schema. The enterprise schema layer includes Service and related types for this purpose.

## Why CMDB-Kit Does Things Differently

If you have used JSM Assets before, you probably built your CMDB by creating object types in the UI, adding attributes with inline select lists, and populating records by hand. That approach works for a small CMDB but has limits:

- Schema changes are manual and hard to reproduce across environments
- Status fields are defined inline per type, so "Active" on Product and "Active" on Server are two separate, unrelated values
- There is no audit trail for schema changes, only for data
- Moving a CMDB from dev to production means clicking through the same UI screens again

CMDB-Kit takes a different approach. Everything is defined in version-controlled JSON files, and the adapter pushes those definitions into JSM. The schema is reproducible, diffable, and deployable like application code.

## Lookup Types: The Key Difference

The single biggest conceptual difference is how CMDB-Kit handles status values, categories, and other enumerations.

JSM's built-in approach uses a Status attribute (type: Status) with values defined inline on the attribute itself. Each type gets its own independent list:

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

The lookup type data file (`schema/base/data/product-status.json`):

```json
[
  { "Name": "Active", "description": "Product is live and serving traffic" },
  { "Name": "Planned", "description": "Product is approved but not yet built" },
  { "Name": "Deprecated", "description": "Product is being phased out" },
  { "Name": "Retired", "description": "Product has been decommissioned" }
]
```

And the Product record that references it (`schema/base/data/product.json`):

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

The `"status": "Active"` value is resolved at import time to the "Active" record in the Product Status type.

Why this matters:

- **Reusable values.** Multiple types can reference the same lookup type. Environment Type is shared by Server, Database, and Deployment.
- **Metadata on values.** Each status record can carry a description, sort order, or other fields. An inline select list is just a bare string.
- **Auditable changes.** Adding a status value is a JSON file change tracked in git, not a UI click.
- **Repeatable deployments.** Run the same import against dev, staging, and production. The schema and values are identical every time.

## Understanding the Schema Hierarchy

CMDB-Kit organizes types into a tree with four root branches. This is different from a flat type list.

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
    Environment Type      Deployment environment classification
    (and more)
```

This is the base schema. The extended schema adds SLAs, licenses, certifications, baselines, and more. The enterprise schema adds enterprise architecture, contracts, requirements, and configuration library management.

Parent types in Assets define a namespace. When you browse the schema in the Cloud UI, you see a collapsible tree. Grouping lookup types under "Lookup Types" keeps them visually separate from CI types.

## Cloud Icon Limitations

When the adapter creates object types via the API, it must provide an `iconId` parameter. Without it, object type rendering breaks in the Cloud UI. This is a known Cloud limitation (JSDCLOUD-11064).

The adapter assigns a global icon automatically when creating types. These icons may not render in the Cloud type tree sidebar, but they appear correctly on individual objects. You can customize icons manually in the Assets UI after the import, and your choices persist across subsequent schema syncs because the adapter never recreates existing types.


# Environment Configuration

## The .env File

The adapter needs connection details for your Cloud site. Create a `.env` file at the project root:

```bash
cp .env.example .env
```

Then edit `.env` with your Cloud values:

```bash
JSM_URL=https://yoursite.atlassian.net
JSM_USER=you@example.com
JSM_PASSWORD=your-api-token
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

The `.env` file is gitignored and will not be committed. Shell environment variables override `.env` values, so you can use the file for defaults and override specific values per run.

## Cloud-Specific Variables

`JSM_URL` is your Atlassian Cloud site URL, ending in `.atlassian.net`.

`JSM_USER` is your Atlassian email address (not a username).

`JSM_PASSWORD` is an API token generated at https://id.atlassian.com/manage-profile/security/api-tokens. This is not your account password.

The adapter auto-detects Cloud from the `.atlassian.net` hostname and routes API calls through `https://api.atlassian.com/jsm/assets/workspace/{workspaceId}/v1/`. The workspace ID is fetched automatically on first run.

## Workspace ID

The Assets workspace ID is a UUID that identifies your Assets instance within the Cloud platform. The adapter fetches it automatically using the JSM Cloud REST API.

If auto-detection fails (rare, usually due to permission issues), you can find the workspace ID manually:

1. Open Assets in your browser
2. Look at the URL, it contains the workspace ID
3. Set `JSM_WORKSPACE_ID` in your `.env` file

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
| JSM_URL | Yes | http://localhost:8080 | Your Cloud site URL (https://yoursite.atlassian.net) |
| JSM_USER | Yes | | Your Atlassian email address |
| JSM_PASSWORD | Yes | | API token from id.atlassian.com |
| SCHEMA_KEY | No | CMDB | Object schema key (case-sensitive, must match exactly) |
| SCHEMA_DIR | No | Parent of DATA_DIR | Path to schema-structure.json and schema-attributes.json |
| DATA_DIR | No | schema/base/data | Path to data JSON files |
| JSM_WORKSPACE_ID | No | auto-detected | Assets workspace ID (UUID), fetched automatically from Cloud |
| CREATE_SCHEMA | No | false | Set to 'true' to auto-create the schema if it does not exist |
| DEBUG | No | false | Set to 'true' for HTTP request and response logging |


# Running the Import

## Validate Locally

Before touching your Cloud instance, confirm that the schema and data files are internally consistent:

```bash
node tools/validate.js --schema schema/base
```

This checks schema structure integrity, attribute definitions, LOAD_PRIORITY completeness, data file existence, and reference value consistency. Fix any errors before proceeding.

## Schema Sync

Create all object types and their attributes in Assets. Run this first:

```bash
node adapters/jsm/import.js schema
```

What happens:

1. Connects to your Cloud site and finds the schema by `SCHEMA_KEY`
2. Creates root types (Product CMDB, Product Library, Directory, Lookup Types)
3. Creates child types under each root
4. Creates all attributes on each type, including references between types

If a type or attribute already exists, it is skipped or updated. This operation is safe to run multiple times.

To preview without making changes:

```bash
node adapters/jsm/import.js schema --dry-run
```

## Data Sync

Import all records from your data JSON files, respecting the LOAD_PRIORITY order:

```bash
node adapters/jsm/import.js sync
```

The LOAD_PRIORITY array in `tools/lib/constants.js` controls import order. Lookup types go first (they have no dependencies), then directory types (organizations, teams, people), then CIs (applications, servers, databases), and finally library types (versions, documents, deployments) that reference everything else.

This ordering is essential because references are resolved by name at import time. If you import a Product that references `"status": "Active"` before the Product Status type has its "Active" record, the reference will fail.

## Import Modes

```bash
# Create new records and update existing ones (default)
node adapters/jsm/import.js sync

# Create only, skip records that already exist
node adapters/jsm/import.js create

# Update only, skip records not found in Assets
node adapters/jsm/import.js update

# Import a single type
node adapters/jsm/import.js sync --type "Product"

# Dry run (preview without changes)
node adapters/jsm/import.js --dry-run
```

## Review the Output

The import prints a summary showing how many records were added, updated, skipped, or errored for each type. A successful import has zero errors.

```
==================================================
  Import Complete
==================================================
  Types processed:  20
  Elapsed:          12.3s
```

If you see errors, check:

1. Is the referenced record actually in Assets? (Check LOAD_PRIORITY order)
2. Does the Name in your data file match exactly? (Case-sensitive)
3. Is the attribute name in your data file correct? (camelCase, matching schema-attributes.json)


# Verifying the Result

## Post-Import Validation

Compares local data files field-by-field against live Assets data:

```bash
# Full validation
node adapters/jsm/validate-import.js

# Quick count check (faster, skips field comparison)
node adapters/jsm/validate-import.js --skip-fields --summary-only

# Validate one type
node adapters/jsm/validate-import.js --type "Product"
```

## Schema Check

Compares local schema definitions against live Assets types and attributes. Read-only, makes no changes:

```bash
# Full schema check
node adapters/jsm/check-schema.js

# Check one type
node adapters/jsm/check-schema.js --type "Product"
```

## Browsing in the Cloud Assets UI

1. Open Assets from the app switcher
2. Select your schema (e.g., "CMDB")
3. You should see the four root branches in the type tree on the left
4. Expand Lookup Types to see the reference data
5. Click on Product to see imported records with resolved references
6. Use the AQL search bar at the top to run queries like `objectType = "Product"`


# Replacing Example Data

The base schema ships with example data for OvocoCRM. To use CMDB-Kit for your own infrastructure, replace the data files.

## Edit JSON Directly

1. Open the data files in `schema/base/data/`
2. Replace the example records with your own
3. Keep the same JSON structure (array of objects with camelCase keys)
4. Make sure reference values (like status names, team names) match exactly across files
5. Run `node tools/validate.js --schema schema/base` to catch errors
6. Re-run the import

## CSV and Excel Workflow

For teams that prefer spreadsheets:

```bash
# Generate CSV templates with example rows
node tools/generate-templates.js --schema schema/base --examples --outdir csv-templates

# Fill in the templates in Excel or Google Sheets
# Then convert back to JSON
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
```

## Tips for Replacing Data

- Start with lookup types. Define your status values, environment types, and other reference data first.
- Keep Names consistent. If your Product references `"status": "In Production"`, the Product Status type must have a record with `"Name": "In Production"` (exact match, case-sensitive).
- Do not include Key or id fields. Assets generates these automatically. Including them causes import errors.
- Validate early and often. The offline validator catches most reference mismatches before you hit the Cloud API.


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

Custom fields in JSM have dependencies: a Product Version field cannot cascade from a Product field unless the Product field exists first. Organizing fields into tiers makes the creation order clear.

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

The cascade requires a reference attribute linking child types back to the Product type. The enterprise schema already includes a `product` attribute on all relevant types (CR Product Version, CR Deployment Site, CR Document, CR Baseline, etc.). The base and extended schemas do not include this attribute because they model a single product. If you are using the base or extended schema and want portal cascading, add a `product` attribute to each type that should filter by product:

In `schema-attributes.json`, add to Product Version, Deployment Site, Product Component, Document, Baseline, and any other types that should cascade:

```json
"product": { "type": 1, "referenceType": "Product" }
```

After adding the attribute, populate it in your data files. Every Product Version record needs a `"product": "OvocoCRM"` entry (matching the Name of the Product object). Then re-run the schema sync and data sync.

Once imported, the attribute displays as "Product" in Assets. The Tier 1 custom field on the Jira work item is also named "Product" and scoped to `objectType = "Product"`. When a customer selects a product on the portal, dependent fields use `${Product}` to filter their dropdowns to only show objects belonging to that product.

If you are using the enterprise schema, type names include product prefixes (CR Product Version, AN Product Version). Your AQL filters should use the prefixed names: `objectType = "CR Product Version" AND "Product" = ${Product}`. See the [Data Center guide](atlassian-data-center.md) for enterprise schema AQL examples with prefixed type names.

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

## AQL Fundamentals

AQL (Assets Query Language) is the query language for Assets in Cloud. Cloud uses "AQL" exclusively (the older "IQL" name from the Insight era is not used).

Core operators:

- `=` case-insensitive match, `==` case-sensitive match
- `!=` not equal, `>`, `<`, `>=`, `<=` for dates and numbers
- `IN` and `NOT IN` for set membership
- `LIKE` with `%` wildcard for pattern matching
- `IS EMPTY` and `IS NOT EMPTY` for null checks

Functions:

- `startOfDay()` and `now()` for date-relative queries (e.g., `now("+30d")`)
- `currentUser()` for the logged-in user
- `inboundReferences()` and `outboundReferences()` for relationship traversal

Dot notation traverses references: `"Product Version"."Product"` reads the Product attribute on the referenced Product Version object.

Important: schema attributes are camelCase in CMDB-Kit's JSON files, but Assets converts them to Title Case for display. AQL uses the display name: `"Site Status"`, not `"siteStatus"`.

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


