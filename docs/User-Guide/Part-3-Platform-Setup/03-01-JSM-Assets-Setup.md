# JSM Assets Setup Guide

A complete walkthrough for importing CMDB-Kit into Jira Service Management Assets. This guide explains the design decisions behind CMDB-Kit, walks through every step, and highlights where CMDB-Kit's approach differs from what you might expect if you have built CMDBs inside JSM before.

# Why CMDB-Kit Does Things Differently

If you have used JSM Assets before, you probably built your CMDB by creating object types in the UI, adding attributes with inline select lists, and populating records by hand. That works fine for a small, single-instance CMDB, but it has limits:

- Schema changes are manual and hard to reproduce across environments
- Status fields are defined inline per type, so "Active" on Application and "Active" on Server are two separate, unrelated values
- There is no audit trail for schema changes, only for data
- Moving a CMDB from dev to production means clicking through the same UI screens again

CMDB-Kit takes a different approach. Everything is defined in version-controlled JSON files, and the adapter pushes that definition into JSM. This makes the schema reproducible, diffable, and deployable like application code.

## Lookup types: the key difference

The single biggest conceptual difference is how CMDB-Kit handles status values, categories, and other enumerations.

**JSM's built-in approach** uses a Status attribute (type: Status) with values defined inline on the attribute itself. To add a new status, you edit the attribute definition. Each type gets its own independent list.

```
Application
  Status: [Active, Planned, Deprecated, Retired]   <-- inline on the field

Server
  Status: [Active, Planned, Deprecated, Retired]   <-- separate copy, same values
```

**CMDB-Kit's approach** creates a separate object type for each set of values, like a reference table in a relational database. The Application's `status` field is a reference to the "Application Status" type.

```
Application Status (object type under "Lookup Types")
  Records: Active, Planned, Deprecated, Retired

Application
  Status  -->  references Application Status
```

Here is what the actual data files look like. The lookup type (`schema/base/data/application-status.json`):

```json
[
  { "Name": "Active", "description": "Application is live and serving traffic" },
  { "Name": "Planned", "description": "Application is approved but not yet built" },
  { "Name": "Deprecated", "description": "Application is being phased out" },
  { "Name": "Retired", "description": "Application has been decommissioned" }
]
```

And the Application record that references it (`schema/base/data/application.json`):

```json
{
  "Name": "CRM Core",
  "description": "Primary CRM application handling contacts, deals, and workflows",
  "applicationType": "Web Application",
  "technology": "Node.js, React, PostgreSQL",
  "owner": "Platform Engineering",
  "status": "Active"
}
```

The `"status": "Active"` value is resolved at import time to the "Active" record in the Application Status type.

## Why this matters

- **Reusable values.** Multiple types can reference the same lookup type. Environment Type is shared by Server, Database, and Deployment.
- **Metadata on values.** Each status record can carry a description, sort order, or other fields. An inline select list is just a bare string.
- **Auditable changes.** Adding a status value is a JSON file change tracked in git, not a UI click.
- **Repeatable deployments.** Run the same import against dev, staging, and production. The schema and values are identical every time.
- **Consistent naming.** Because status values are shared records, there is no risk of "Active" in one type and "active" in another.

# Prerequisites

## JSM instance

JSM Cloud with the Assets module, included in JSM Premium and Enterprise plans. This is the recommended platform. Atlassian is actively migrating customers to Cloud, and Cloud has FedRAMP authorization in progress.

Data Center is also supported. See [Data Center Differences](#data-center-differences) at the end of this chapter for DC-specific prerequisites and setup.

## Credentials

You need an Atlassian account with Assets admin permissions. Generate an API token from your Atlassian account settings (https://id.atlassian.com/manage-profile/security/api-tokens). You will use your email address and this token to authenticate.

## Local tools

- Node.js 18 or later
- Git (to clone the repository)
- A terminal with `bash` or equivalent

## An empty object schema

This is critical. CMDB-Kit creates its own type hierarchy, attributes, and lookup types. Importing into a schema that already has types will cause naming collisions, attribute conflicts, and broken references.

Create a new, empty object schema in JSM before running the import. Instructions for this are in the next section.

# Creating an Empty Schema in JSM

1. Log in to your Atlassian Cloud site
2. Navigate to **Assets** (from the top navigation bar or a JSM project sidebar)
3. Click **Create schema**
4. Enter a name (e.g., "CMDB") and a key (e.g., "CMDB")
5. Click **Create**

The **schema key** is the short identifier you will use in the `SCHEMA_KEY` environment variable. It must match exactly (case-sensitive). If you named the key "CMDB", set `SCHEMA_KEY=CMDB`.

For Data Center schema creation steps, see [Data Center Differences](#data-center-differences).

> **Why start empty?** If you import into a schema that already has types named "Application" or "Server", the import will find them by name and try to update their attributes. This can create mismatched attribute types, broken references, and hard-to-debug failures. Starting from an empty schema avoids all of this.

# Understanding the Schema Hierarchy

CMDB-Kit organizes types into a tree with four root branches. This is different from JSM's default flat type list.

```
Root
  Product CMDB          Infrastructure CIs
    Application           Software services and applications
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
    Application Status    Lifecycle status for applications
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

This is the **base** schema (20 types). The **extended** schema adds 35 more types covering change management, incidents, SLAs, licenses, certifications, and more (55 types total). The **enterprise** schema adds another 23 types for enterprise architecture, contracts, requirements, and configuration library management (78 types total).

**Why the hierarchy matters:** Parent types in JSM Assets define a namespace. When you browse the schema in the JSM UI, you see a collapsible tree. Grouping lookup types under "Lookup Types" keeps them visually separate from the actual CI types. The hierarchy also enables type-level permissions and icon inheritance.

# How Lookup Types Work

This section expands on the key difference introduced earlier with a concrete walkthrough.

## Adding a new status value

**JSM's way (inline select):**

1. Navigate to the Application object type
2. Open the Status attribute configuration
3. Find the select list options
4. Add the new value (e.g., "Sunset")
5. Save

If Server also has a Status attribute with the same options, repeat the process there. The two lists are independent.

**CMDB-Kit's way (lookup type):**

1. Open `schema/base/data/application-status.json`
2. Add the new record:

```json
{ "Name": "Sunset", "description": "Application is entering planned wind-down" }
```

3. Commit the change
4. Run `node adapters/jsm/import.js sync --type "Application Status"` to push it

The new value is immediately available to any type that references Application Status.

## Lookup types in the schema definition

In `schema-attributes.json`, a lookup reference looks like this:

```json
"Application": {
  "status": { "type": 1, "referenceType": "Application Status" }
}
```

- `"type": 1` means this attribute is a reference (not a text field)
- `"referenceType": "Application Status"` points to the lookup type

In data files, the reference is by Name:

```json
{ "status": "Active" }
```

The import script resolves `"Active"` to the actual JSM object ID of the "Active" record in the Application Status type. This is why lookup types must be imported before the types that reference them.

# Environment Setup

The adapter needs connection details for your JSM instance. You can set these in a `.env` file at the project root (recommended) or export them as shell environment variables.

## Using a .env file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your connection details. The file is gitignored and will not be committed. Shell environment variables override values in `.env`, so you can use the file for defaults and override specific values when needed.

## Cloud configuration

```bash
# .env file for Cloud
JSM_URL=https://yoursite.atlassian.net
JSM_USER=you@example.com
JSM_PASSWORD=your-api-token
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

`JSM_USER` is your Atlassian email address. `JSM_PASSWORD` is an API token, not your account password. Generate a token at https://id.atlassian.com/manage-profile/security/api-tokens.

The adapter auto-detects Cloud from the `.atlassian.net` hostname and fetches the Assets workspace ID automatically on first run. If auto-detection fails, you can set `JSM_WORKSPACE_ID` manually.

## Data Center configuration

```bash
# .env file for Data Center
JSM_URL=http://your-jsm:8080
JSM_USER=admin
JSM_PASSWORD=password
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

Data Center uses a username and password rather than an email and API token. The account must have direct login credentials; SSO-only accounts need a local fallback or a service account.

## All variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| JSM_URL | Yes | http://localhost:8080 | Cloud site URL or DC server URL |
| JSM_USER | Yes | | Cloud: email address. DC: username |
| JSM_PASSWORD | Yes | | Cloud: API token. DC: password |
| SCHEMA_KEY | No | CMDB | Object schema key in JSM (case-sensitive) |
| SCHEMA_DIR | No | Parent of DATA_DIR | Path to schema-structure.json and schema-attributes.json |
| DATA_DIR | No | schema/base/data | Path to data JSON files |
| JSM_WORKSPACE_ID | No | auto-detected | Cloud only: Assets workspace ID |
| CREATE_SCHEMA | No | false | Set to 'true' to auto-create the schema |
| DEBUG | No | false | HTTP debug logging |

## Choosing a schema layer

| Schema | Types | Best for |
|--------|-------|----------|
| Base (schema/base) | 20 | Getting started, small teams, proof of concept |
| Extended (schema/extended) | 55 | Full CMDB with change, incident, SLA, and asset management |
| Enterprise (schema/enterprise) | 78 | Financial tracking, EA modeling, requirements, configuration library |

Start with base. You can switch to extended or enterprise later by changing `SCHEMA_DIR` and `DATA_DIR` and re-running the import. Each schema layer is a superset of the one below it.

# Running the Import

## Step 1: Validate locally

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

## Step 2: Schema sync

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

**Dry run:** To see what would happen without making changes:

```bash
node adapters/jsm/import.js schema --dry-run
```

## Step 3: Data sync

This imports all records from your data JSON files, respecting the LOAD_PRIORITY order.

```bash
node adapters/jsm/import.js sync
```

The LOAD_PRIORITY order in `tools/lib/constants.js` controls which types are imported first. Lookup types go first (they have no dependencies), then directory types (organizations, teams, people), then CIs (applications, servers, databases), and finally library types (versions, documents, deployments) that reference everything else.

This ordering is essential because references are resolved by name at import time. If you try to import an Application that references `"status": "Active"` before the Application Status type has its "Active" record, the reference will fail.

**Import modes:**

```bash
# Create new records and update existing ones (default)
node adapters/jsm/import.js sync

# Create only, skip records that already exist
node adapters/jsm/import.js create

# Update only, skip records not found in JSM
node adapters/jsm/import.js update

# Import a single type
node adapters/jsm/import.js sync --type "Application"

# Dry run
node adapters/jsm/import.js --dry-run
```

## Step 4: Review the output

The import prints a summary showing how many records were added, updated, skipped, or errored for each type. A successful import has zero errors.

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

See the Debugging Checklist in CLAUDE.md for more troubleshooting tips.

# Verifying the Result

After import, run the validation tools to confirm everything landed correctly.

## Post-import validation

Compares local data files field-by-field against live JSM data.

```bash
# Full validation
node adapters/jsm/validate-import.js

# Quick count check (faster, skips field comparison)
node adapters/jsm/validate-import.js --skip-fields --summary-only

# Validate one type
node adapters/jsm/validate-import.js --type "Application"
```

## Schema check

Compares local schema definitions against live JSM types and attributes. Read-only, makes no changes.

```bash
# Full schema check
node adapters/jsm/check-schema.js

# Check one type
node adapters/jsm/check-schema.js --type "Application"
```

## Browsing in the JSM UI

1. Open Assets in JSM
2. Select your schema (e.g., "CMDB")
3. You should see the four root branches in the type tree
4. Expand Lookup Types to see the reference data
5. Click on Application to see imported records with resolved references

# Replacing Example Data with Your Own

The base schema ships with example data for a fictional SaaS CRM called OvocoCRM. To use CMDB-Kit for your own infrastructure, replace the data files.

## Option 1: Edit JSON directly

1. Open the data files in `schema/base/data/`
2. Replace the example records with your own
3. Keep the same JSON structure (array of objects with camelCase keys)
4. Make sure reference values (like status names, team names) match exactly across files
5. Run `node tools/validate.js --schema schema/base` to catch errors
6. Re-run the import

## Option 2: CSV/Excel workflow

For teams that prefer spreadsheets:

```bash
# Generate CSV templates with example rows
node tools/generate-templates.js --schema schema/base --examples --outdir csv-templates

# Fill in the templates in Excel or Google Sheets
# Then convert back to JSON
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
```

## Tips for replacing data

- **Start with lookup types.** Define your status values, environment types, and other reference data first.
- **Keep Names consistent.** If your Application references `"status": "In Production"`, the Application Status type must have a record with `"Name": "In Production"` (exact match, case-sensitive).
- **Do not include Key or id fields.** JSM generates these automatically. Including them causes import errors.
- **Validate early and often.** The offline validator catches most reference mismatches before you hit JSM.

# Data Center Differences

This section covers the differences when running against JSM Data Center instead of Cloud. The adapter commands are identical; only the prerequisites and URL format change.

## DC prerequisites

- Jira Service Management 5.x (or later) with Assets enabled. Older installations may have Assets under its former name, Insight.
- A user account with Assets admin permissions.

## DC schema creation

1. Log in to JSM as an admin
2. Open **Assets** from the top navigation (or go to Insight if running standalone)
3. Click **Object Schemas** in the sidebar
4. Click **Create Object Schema**
5. Enter a name (e.g., "CMDB") and a schema key (e.g., "CMDB")
6. Leave description empty or add your own
7. Click **Create**

## How Cloud vs DC routing works

The adapter auto-detects Cloud from the `.atlassian.net` hostname. For Cloud, Assets API calls are routed through `api.atlassian.com` using the workspace ID. For Data Center, calls go directly to your server at `/rest/insight/1.0`. The endpoint paths after the base URL are the same on both platforms, so all commands work identically.

# API References

These are the Atlassian developer docs for the REST APIs used by this adapter.

## Cloud

- [Assets REST API Guide](https://developer.atlassian.com/cloud/assets/assets-rest-api-guide/workflow/) - authentication, workspace ID discovery, and workflow
- [Assets REST API Reference](https://developer.atlassian.com/cloud/assets/rest/api-group-object/) - full endpoint documentation
- [Creating Objects via REST API](https://support.atlassian.com/jira/kb/how-to-create-assets-objects-via-rest-api-based-on-different-attribute-type/) - attribute type formats and examples
- [JSM Cloud REST API - Assets](https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-assets/) - service desk API for workspace discovery

## Data Center

- [Insight REST API](https://docs.atlassian.com/assets/REST/) - bundled REST API documentation for JSM DC

# Next Steps

- [Atlassian Implementation Patterns](03-02-Atlassian-Implementation.md) for portal request types, AQL queries, workflows, ScriptRunner automation, and dashboards
- [Wiki Structure](03-03-Wiki-Structure.md) for organizing documentation alongside the CMDB
- [ServiceNow Setup](03-04-ServiceNow-Setup.md) if your organization uses ServiceNow instead of JSM
- [Other Platforms](03-05-Other-Platforms.md) for options beyond JSM and ServiceNow
- [Schema Reference](../../Developer-Manual/Part-1-Project-Internals/01-02-Schema-Reference.md) for all types and attributes
- [Data Entry and Maintenance](../Part-4-Day-to-Day/04-03-Data-Entry-and-Maintenance.md) for JSON editing and the CSV workflow
- [Writing Adapters](../../Developer-Manual/Part-2-Extending/02-01-Writing-Custom-Adapters.md) to connect to a new CMDB platform
- [JSM Adapter Reference](../../../adapters/jsm/README.md) for all adapter commands and options
