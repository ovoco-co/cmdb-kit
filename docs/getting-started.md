# Getting Started

CMDB-Kit is a product-delivery CMDB schema with adapters for JSM Assets and ServiceNow. This guide walks through cloning the repo, validating the schema offline, connecting to your CMDB platform, and importing the schema and example data.

The entire process takes about fifteen minutes. You will validate locally first, then configure a connection, then import.

## Prerequisites

You need three things before starting:

- **Node.js 18 or later.** The validation tools and adapters are written in JavaScript and run on Node. Check your version with `node --version`.
- **Git.** Used to clone the repository and track any schema changes you make.
- **A target CMDB instance.** Either a JSM Assets instance (Cloud or Data Center) with admin access, or a ServiceNow instance with admin access. A free Atlassian Cloud developer site or a ServiceNow Personal Developer Instance both work for evaluation.

Clone the repository and change into it:

```bash
git clone https://github.com/ovoco-co/cmdb-kit.git
cd cmdb-kit
```

No dependencies to install. The tools use only Node built-in modules.

## Validate Offline

Before touching any live instance, validate the schema locally. This confirms that the type hierarchy is consistent, all attributes reference valid types, the import order is correct, and the example data files match the schema.

Run validation against the core schema:

```bash
node tools/validate.js --schema schema/core
```

Expected output:

```
Errors:   0
Warnings: 0
Result:   PASS
```

If you see errors, something is wrong with your local copy. Re-clone and try again.

To validate the core schema together with a domain, pass both paths. Domains are optional extensions that add specialized types on top of core. The validator checks that domain types integrate cleanly with core types and that all cross-references resolve.

```bash
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
```

You can substitute any domain under `schema/domains/` in that command. Available domains include infrastructure, compliance, distribution, licensing, and sccm.

Validation is fast and runs entirely offline. Run it after every schema edit to catch problems before they reach your live instance.

## Configure Your Connection

Copy the example environment file:

```bash
cp .env.example .env
```

The `.env` file is gitignored and will not be committed. Edit it with your instance details. The variables you set depend on which platform you are importing to.

### JSM Assets, Cloud

```
JSM_URL=https://yoursite.atlassian.net
JSM_USER=you@example.com
JSM_PASSWORD=your-api-token
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/core
```

`JSM_USER` is your Atlassian account email address. `JSM_PASSWORD` is not your account password. It is an API token. Generate one at:

https://id.atlassian.com/manage-profile/security/api-tokens

Log in, click "Create API token", give it a label like "cmdb-kit", and copy the value into your `.env` file. Tokens do not expire automatically but can be revoked at any time from the same page.

`SCHEMA_KEY` is the key of the object schema in JSM Assets. If you have not created a schema yet, set `CREATE_SCHEMA=true` in your `.env` file and the import script will create one for you using `SCHEMA_KEY` as both the key and the display name. You can also set `SCHEMA_NAME` to use a different display name.

The adapter auto-detects Cloud from the `.atlassian.net` hostname and fetches the Assets workspace ID on first run.

### JSM Assets, Data Center

```
JSM_URL=http://your-jsm:8080
JSM_USER=admin
JSM_PASSWORD=password
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/core
```

Data Center uses a local username and password. The URL points directly to your JSM server, including the port if it is not on 80 or 443.

### ServiceNow

```
SN_INSTANCE=https://your-instance.service-now.com
SN_USER=admin
SN_PASSWORD=your-password
SCHEMA_DIR=schema/core
```

Use an account with admin privileges. On a Personal Developer Instance, the default admin account works. On a production instance, create a dedicated integration account with the `admin` role or scoped table-creation privileges.

You can test connectivity before importing:

```bash
node adapters/servicenow/import.js --test-connection
```

This makes a single API call and reports success or failure without modifying anything.

## Import to JSM Assets

The import runs in two steps. Run them separately, not as a single command.

**Step 1: Create object types and attributes.**

```bash
node adapters/jsm/import.js schema
```

This reads the schema structure and attribute definitions, then creates matching object types and attributes in your JSM Assets schema. You should see each type created with an ID logged to the console. Types are created in dependency order so that parent types and reference targets exist before the types that depend on them.

**Step 2: Import example data.**

```bash
node adapters/jsm/import.js data
```

This reads the JSON data files and creates records in JSM Assets with the correct attribute values. You should see record counts for each type as they are imported. References between records (like a Server referencing an Environment) are resolved by name.

A note on import modes: do not use `sync` mode for the initial import. The sync mode re-syncs attributes before importing data, which can cause reference attributes to be deleted and recreated with new IDs. This is safe for subsequent updates but not for a clean first import. Use `schema` then `data` as separate steps when importing for the first time.

After the initial import, you can use other modes for ongoing maintenance:

- `sync` re-syncs attributes and then creates new records and updates existing ones.
- `create` re-syncs attributes and creates new records only, skipping any that already exist. Use this when you want to add missing records without overwriting changes you made in the UI.
- `update` re-syncs attributes and updates existing records only, skipping new ones.

All modes accept `--type <name>` to filter to a specific type and `--dry-run` to preview changes without writing anything.

## Import to ServiceNow

The ServiceNow import also runs in two steps.

**Step 1: Create custom tables and columns.**

```bash
node adapters/servicenow/import.js schema
```

This creates custom tables prefixed with `u_cmdbk_` and adds columns matching the schema attributes. On a scoped app instance, the prefix will be `x_cmdbk_` instead. The script logs each table and column as it is created.

**Step 2: Import data.**

```bash
node adapters/servicenow/import.js sync
```

This creates records in each custom table. Records are imported in dependency order so that reference targets exist before the records that reference them.

The ServiceNow adapter uses the Table API for record operations and the Metadata API for table and column creation. Both are available on standard instances without additional plugins.

## Verify

After import, check the platform UI to confirm everything looks right.

For JSM Assets: open Assets from the top navigation, find your schema by its key, and browse the type tree. Expand the top-level categories (Product CMDB, Product Library, Directory, Lookup Types) and spot-check that types have the expected attributes and records.

For ServiceNow: navigate to the CMDB workspace or open the custom tables directly from the Application Navigator. Search for `u_cmdbk` to find the imported tables.

Both adapters include a post-import validation script that checks the live instance against the local schema and reports any discrepancies:

```bash
# JSM Assets
node adapters/jsm/validate-import.js

# ServiceNow
node adapters/servicenow/validate-import.js
```

These scripts compare type counts, attribute definitions, and record totals between your local schema and the live instance. They report missing types, extra types, attribute mismatches, and record count differences. Run them after every import to catch issues early.

## Adding a Domain

The core schema covers product delivery fundamentals. Domains add specialized types for specific disciplines. To import core with a domain, set `SCHEMA_DIR` to core and pass the domain with the `--domain` flag:

```bash
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
```

When importing, the adapter reads both core and domain definitions and imports them together. Update your `.env` to include the domain path if your adapter supports it, or consult the adapter README for domain-specific instructions.

Available domains are listed in `schema/domains/`. Each domain has its own README explaining what types it adds and what questions it helps answer.

## Next Steps

Three things to do from here:

- **Replace the example data with your own.** The schema ships with data for a fictional SaaS CRM called OvocoCRM. Swap it out with your actual products, servers, and teams. See the Your Data guide for format details and the CSV workflow for spreadsheet-based data entry.
- **Learn what questions the schema answers.** The schema is designed around real operational questions like "what servers run this product" and "what changed in this release." See the Using the CMDB guide for worked examples.
- **Add domains for your team's specialized needs.** If you manage infrastructure, compliance certifications, software licensing, or distribution channels, there is a domain for that. See the Domains guide for an overview of each one.
