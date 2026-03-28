# Atlassian Cloud

A complete guide to setting up CMDB-Kit on the Atlassian Cloud stack. JSM Assets ships as a blank canvas with no predefined schema. CMDB-Kit gives it a product-delivery schema: products, versions, components, deployment sites, servers, databases, and teams, all organized around what you deliver rather than what you operate. This guide covers initial schema creation, data import, validation, and basic AQL query syntax.

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

If you need editable service objects with full CMDB capabilities (custom attributes, references, imports), create them as types in your CMDB-Kit schema rather than relying on the built-in Services schema. Portfolio mode includes Service and related types for this purpose.

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

The lookup type data file (`schema/core/data/product-status.json`):

```json
[
  { "Name": "Active", "description": "Product is live and serving traffic" },
  { "Name": "Planned", "description": "Product is approved but not yet built" },
  { "Name": "Deprecated", "description": "Product is being phased out" },
  { "Name": "Retired", "description": "Product has been decommissioned" }
]
```

And the Product record that references it (`schema/core/data/product.json`):

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

This is the Core schema. Opt-in domains add SLAs, licenses, certifications, baselines, and more. Portfolio mode adds enterprise architecture, contracts, requirements, and configuration library management.

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
SCHEMA_DIR=schema/core
DATA_DIR=schema/core/data
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

## Choosing a Schema

| Schema | Best for |
|--------|----------|
| Core (schema/core) | Getting started, small teams, proof of concept |
| Core + domains | Full CMDB with baselines, compliance, licensing, and SLA management |
| Portfolio mode (schema/enterprise) | Financial tracking, EA modeling, requirements, configuration library |

Start with Core. You can add domains later by passing `--domain` flags and re-running the import. Each domain is opt-in and adds types for a specific area.

## All Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| JSM_URL | Yes | http://localhost:8080 | Your Cloud site URL (https://yoursite.atlassian.net) |
| JSM_USER | Yes | | Your Atlassian email address |
| JSM_PASSWORD | Yes | | API token from id.atlassian.com |
| SCHEMA_KEY | No | CMDB | Object schema key (case-sensitive, must match exactly) |
| SCHEMA_DIR | No | Parent of DATA_DIR | Path to schema-structure.json and schema-attributes.json |
| DATA_DIR | No | schema/core/data | Path to data JSON files |
| JSM_WORKSPACE_ID | No | auto-detected | Assets workspace ID (UUID), fetched automatically from Cloud |
| CREATE_SCHEMA | No | false | Set to 'true' to auto-create the schema if it does not exist |
| DEBUG | No | false | Set to 'true' for HTTP request and response logging |


# Running the Import

## Validate Locally

Before touching your Cloud instance, confirm that the schema and data files are internally consistent:

```bash
node tools/validate.js --schema schema/core
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

The Core schema ships with example data for OvocoCRM. To use CMDB-Kit for your own infrastructure, replace the data files.

## Edit JSON Directly

1. Open the data files in `schema/core/data/`
2. Replace the example records with your own
3. Keep the same JSON structure (array of objects with camelCase keys)
4. Make sure reference values (like status names, team names) match exactly across files
5. Run `node tools/validate.js --schema schema/core` to catch errors
6. Re-run the import

## CSV and Excel Workflow

For teams that prefer spreadsheets:

```bash
# Generate CSV templates with example rows
node tools/generate-templates.js --schema schema/core --examples --outdir csv-templates

# Fill in the templates in Excel or Google Sheets
# Then convert back to JSON
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
```

## Tips for Replacing Data

- Start with lookup types. Define your status values, environment types, and other reference data first.
- Keep Names consistent. If your Product references `"status": "In Production"`, the Product Status type must have a record with `"Name": "In Production"` (exact match, case-sensitive).
- Do not include Key or id fields. Assets generates these automatically. Including them causes import errors.
- Validate early and often. The offline validator catches most reference mismatches before you hit the Cloud API.


# AQL Reference

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


For custom fields, dashboards, automation, and platform integration, see the [integration documentation](../integration/jsm-cloud/setup.md).
