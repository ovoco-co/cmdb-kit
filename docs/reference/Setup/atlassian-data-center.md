# Atlassian Data Center

Full setup guide for running CMDB-Kit on the Atlassian Data Center stack. CMDB-Kit brings a product-delivery schema to JSM Assets, organizing your CMDB around the products you build and the sites you deploy to, rather than starting from infrastructure or ITIL process categories. This guide covers schema creation, data import, validation, and basic AQL query syntax.

The Data Center audience typically manages more complex environments than Cloud: multiple products sharing one schema, formal change control boards, ScriptRunner-driven automation, and classified or air-gapped networks. This guide reflects that complexity throughout.


# JSM Assets/Insight Setup

## DC Prerequisites

- Jira Service Management Data Center 5.x or later with Assets enabled
- Assets was formerly called Insight. Atlassian rebranded it in JSM DC 4.15+. Older installations may still show "Insight" in navigation menus, REST endpoints (`/rest/insight/1.0`), and ScriptRunner references. The functionality is identical regardless of branding.
- A local user account with Assets Administrator permissions. SSO-only accounts need a local fallback or a dedicated service account with direct login credentials.
- ScriptRunner for Jira Data Center (recommended, not required). Most automation patterns use ScriptRunner's Groovy scripting. Without it, you are limited to Assets-native automation rules and Automation for Jira.
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

The lookup type file (`schema/core/data/product-status.json`):

```json
[
  { "Name": "Active", "description": "Product is live and serving traffic" },
  { "Name": "Planned", "description": "Product is approved but not yet built" },
  { "Name": "Deprecated", "description": "Product is being phased out" },
  { "Name": "Retired", "description": "Product has been decommissioned" }
]
```

A Product record that references it (`schema/core/data/product.json`):

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

CMDB-Kit organizes types into a tree with four root branches (Core schema and domains) or seven (portfolio mode):

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

This is the Core schema. Opt-in domains add SLAs, licenses, certifications, baselines, and more. Portfolio mode adds enterprise architecture, contracts, requirements, and configuration library management.

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
SCHEMA_DIR=schema/core
DATA_DIR=schema/core/data
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
| JSM_URL | Yes | http://localhost:8080 | DC server URL (include port if non-standard) |
| JSM_USER | Yes | | Local username with Assets admin permissions |
| JSM_PASSWORD | Yes | | Account password |
| SCHEMA_KEY | No | CMDB | Object schema key in JSM (case-sensitive) |
| SCHEMA_DIR | No | Parent of DATA_DIR | Path to schema-structure.json and schema-attributes.json |
| DATA_DIR | No | schema/core/data | Path to data JSON files |
| CREATE_SCHEMA | No | false | Set to 'true' to auto-create the schema if missing |
| DEBUG | No | false | Set to 'true' for HTTP request/response logging |

The `JSM_WORKSPACE_ID` variable is Cloud-only and has no effect on Data Center.


# Running the Import

## Step 1: Validate Locally

Before touching JSM, confirm that your schema and data files are internally consistent.

```bash
node tools/validate.js --schema schema/core
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

The Core schema ships with example data for a fictional SaaS CRM called OvocoCRM. To use CMDB-Kit for your own infrastructure, replace the data files.

## Option 1: Edit JSON Directly

1. Open the data files in `schema/core/data/`
2. Replace the example records with your own
3. Keep the same JSON structure (array of objects with camelCase keys)
4. Make sure reference values (like status names, team names) match exactly across files
5. Run `node tools/validate.js --schema schema/core` to catch errors
6. Re-run the import

## Option 2: CSV/Excel Workflow

For teams that prefer spreadsheets:

```bash
# Generate CSV templates with example rows
node tools/generate-templates.js --schema schema/core --examples --outdir csv-templates

# Fill in the templates in Excel or Google Sheets
# Then convert back to JSON
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
```

Start with lookup types. Define your status values, environment types, and other reference data first. Keep Names consistent across files. If your Product references `"status": "In Production"`, the Product Status type must have a record with `"Name": "In Production"` (exact match, case-sensitive). Never include Key or id fields in your data. JSM generates these automatically.


# AQL Reference

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


For custom fields, dashboards, automation, and platform integration, see the [integration documentation](../integration/jsm-data-center/setup.md).
