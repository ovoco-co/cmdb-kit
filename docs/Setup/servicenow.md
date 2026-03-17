# ServiceNow Setup

> **Tested against:** ServiceNow Zurich release (March 2026). Schema creation, data import, validation, and export have been verified end-to-end against a live Zurich instance. All OOTB tables, custom table creation, CI class extensions, and relationship handling work as documented.

A complete walkthrough for importing CMDB-Kit into ServiceNow CMDB. ServiceNow's native CMDB is infrastructure-centric and process-centric (CSDM, discovery-driven CI classes). CMDB-Kit's product-delivery schema maps onto it by using OOTB tables for infrastructure types and creating custom CI classes for product delivery concepts that ServiceNow doesn't model natively. This guide walks through that mapping, every step of the import, and the differences you will encounter compared to the JSM adapter.


# How CMDB-Kit Maps to ServiceNow

## Why Product is not Application

ServiceNow's OOTB `cmdb_ci_appl` (Application) class is designed for applications discovered running on hardware. The Identification and Reconciliation Engine (IRE) requires every application to have a "Runs on" relationship to hardware before it can be created. This makes sense for ServiceNow's discovery-driven model but breaks for product delivery, where a Product is an independent entity that you build and ship, not something discovered running on a server.

CMDB-Kit creates its own `u_cmdbk_product` CI class extending `cmdb_ci` directly. This class has an independent identification rule that matches by name, with no hosting dependency. The CMDB Instance API creates and deduplicates Products without requiring a "Runs on" relationship. This is the core architectural difference between CMDB-Kit's product-delivery model and ServiceNow's native infrastructure-centric model.

The same pattern applies to other product-delivery types that have no OOTB equivalent: Feature, Assessment, and Product Component are all custom CI classes with independent identification rules.

## ServiceNow's native CMDB model

ServiceNow ships with a large out-of-the-box (OOTB) CMDB built around the `cmdb_ci` base table. Types like Server (`cmdb_ci_server`), Database (`cmdb_ci_database`), and Virtual Machine (`cmdb_ci_vm_instance`) are pre-defined CI classes that extend `cmdb_ci`. ServiceNow also has standalone tables for non-CI data: `core_company` for organizations, `cmn_location` for locations, and `change_request` and `incident` for ITSM records.

CMDB-Kit uses OOTB tables for infrastructure types that ServiceNow already models well, and creates custom CI classes for product-delivery types that ServiceNow does not model. Non-CI types (organizations, locations, lookup data) use standalone tables. Person uses a custom standalone table (`u_cmdbk_person`) because Person records represent external contacts and site POCs, not platform users.

## The three-tier type mapping

**Tier 1: OOTB tables.** Infrastructure and directory types that map directly to built-in ServiceNow tables. No table creation needed.

| CMDB-Kit Type | ServiceNow Table | API |
|---|---|---|
| Server | cmdb_ci_server | CMDB Instance API |
| Database | cmdb_ci_database | CMDB Instance API |
| Hardware Model | cmdb_hardware_product_model | Table API |
| Network Segment | cmdb_ci_ip_network | CMDB Instance API |
| Virtual Machine | cmdb_ci_vm_instance | CMDB Instance API |
| License | alm_license | Table API |
| SLA | contract_sla | Table API |
| Organization | core_company | Table API |
| Team | sys_user_group | Table API |
| Location | cmn_location | Table API |
| Vendor | core_company (with vendor flag) | Table API |

**Tier 2: Custom CI classes.** Product-delivery types that extend `cmdb_ci` with independent identification rules. The adapter creates these tables, their columns, and their IRE identification rules automatically during schema sync.

| CMDB-Kit Type | ServiceNow Table | Identification |
|---|---|---|
| Product | u_cmdbk_product | Independent, match by name |
| Product Component | u_cmdbk_product_component | Independent, match by name |
| Feature | u_cmdbk_feature | Independent, match by name |
| Assessment | u_cmdbk_assessment | Independent, match by name |

These types use the CMDB Instance API (`POST /api/now/cmdb/instance/{classname}`) which routes through the IRE for automatic deduplication. Sending the same Product name twice updates the existing record instead of creating a duplicate.

**Tier 3: Custom standalone tables.** Product Library types and lookup types that are not CIs. These are standalone tables, not CI classes. They do not have identification rules and use the Table API.

| CMDB-Kit Type | ServiceNow Table |
|---|---|
| Person | u_cmdbk_person |
| Product Version | u_cmdbk_product_version |
| Document | u_cmdbk_document |
| Deployment | u_cmdbk_deployment |
| All lookup types | u_cmdbk_{type_name} |

Person is a custom standalone table representing external contacts, site POCs, and deployment stakeholders. Person records are not platform users and should never be mapped to ServiceNow's `sys_user` table or any platform's user directory. The optional `isUser` flag and `userAccount` reference allow linking a Person to a platform user account when that person happens to also be one. This design applies across all platforms, not just ServiceNow.

## Migration from previous versions

If you previously imported CMDB-Kit data with Product mapped to `cmdb_ci_appl`, use the migration tool to move records to the new table:

```bash
# See what would happen
node adapters/servicenow/migrate.js --from cmdb_ci_appl --to u_cmdbk_product --type Product --dry-run

# Migrate records, update relationships, delete old
node adapters/servicenow/migrate.js --from cmdb_ci_appl --to u_cmdbk_product --type Product --delete-old
```

The migration tool matches records by name against your local data files so it only touches records CMDB-Kit created. Relationships are updated to point at the new sys_ids.

## Lookup types in ServiceNow

By default, every lookup type (Application Status, Environment Type, etc.) creates a custom reference table with `name` and `description` columns. This preserves descriptions and keeps the adapter logic uniform across all types.

If you prefer to use ServiceNow's native choice lists for lookups that have OOTB equivalents, set the lookup strategy to hybrid:

```bash
export SN_LOOKUP_STRATEGY=hybrid
```

The `hybrid` strategy maps OOTB-equivalent lookups to ServiceNow choice list values and creates custom tables only for lookups that have no OOTB match.


# Prerequisites

## ServiceNow instance

You need a ServiceNow instance with admin access. A Personal Developer Instance (PDI) from developer.servicenow.com works for testing. For production use, you need an enterprise instance with API access enabled.

For custom table creation via the API, the instance needs the `glide.rest.create_metadata` system property set to `true`. This allows the adapter to create Tier 2 and Tier 3 tables automatically. If your instance is locked down and you cannot set this property, use the `--report-only` flag to generate manual creation instructions instead.

## Credentials

You need a username and password for an account with the `admin` role. The adapter authenticates via HTTP basic auth against the Table API.

If your organization uses LDAP or SSO for ServiceNow authentication and the admin account does not have a local password, create a dedicated service account with local credentials.

## Local tools

- Node.js 18 or later
- Git (to clone the repository)
- A terminal with `bash` or equivalent


# Environment Setup

Set the following environment variables before running any adapter commands.

```bash
# Required: ServiceNow connection
export SN_INSTANCE=https://dev12345.service-now.com  # Your instance URL, no trailing slash
export SN_USER=admin                                  # Admin username
export SN_PASSWORD=your-password                      # Password

# Required: Schema source
export SCHEMA_DIR=schema/base                         # Directory containing schema JSON files
export DATA_DIR=schema/base/data                      # Directory containing data JSON files

# Optional: Configuration
export SN_TABLE_PREFIX=u_cmdbk                        # Custom table prefix (default: u_cmdbk)
export SN_LOOKUP_STRATEGY=table                       # table or hybrid (default: table)
export SN_BATCH_SIZE=200                              # Records per pagination batch
export SN_REQUEST_DELAY=100                           # Delay between API calls in ms
export DEBUG=true                                     # HTTP debug logging
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| SN_INSTANCE | Yes | none | ServiceNow instance URL |
| SN_USER | Yes | | Admin username |
| SN_PASSWORD | Yes | | Password |
| SCHEMA_DIR | No | schema/base | Path to schema-structure.json and schema-attributes.json |
| DATA_DIR | No | schema/base/data | Path to data JSON files |
| SN_TABLE_PREFIX | No | u_cmdbk | Prefix for custom tables |
| SN_LOOKUP_STRATEGY | No | table | Lookup mapping strategy (table or hybrid) |
| SN_BATCH_SIZE | No | 200 | Records per pagination batch |
| SN_REQUEST_DELAY | No | 100 | Delay between API calls in milliseconds |
| DEBUG | No | false | HTTP debug logging |

## Table prefix

Custom tables use the `u_` prefix (global scope) by default. This avoids requiring a scoped application install on the instance. If your organization requires scoped apps, set:

```bash
export SN_TABLE_PREFIX=x_cmdbk
```

Scoped app tables require the app to be installed on the instance before the adapter can create tables under its namespace.

## Choosing a schema layer

| Schema | Best for |
|--------|----------|
| Base (schema/base) | Getting started, small teams, proof of concept |
| Extended (schema/extended) | Full CMDB with baselines, compliance, licensing, and SLA management |
| Enterprise (schema/enterprise) | Financial tracking, EA modeling, requirements, configuration library |

Start with base. You can switch to extended or enterprise later by changing `SCHEMA_DIR` and `DATA_DIR` and re-running the import. Extended includes everything in base plus more types, and enterprise includes everything in extended plus more.


# Running the Import

## Step 1: Test connectivity

Verify that the adapter can reach your ServiceNow instance and authenticate.

```bash
node adapters/servicenow/import.js --test-connection
```

This makes a single API call to confirm credentials and connectivity. If it fails, check your `SN_INSTANCE` URL (no trailing slash), username, and password.

## Step 2: Validate locally

Before touching ServiceNow, confirm that your schema and data files are internally consistent.

```bash
node tools/validate.js --schema schema/base
```

Fix any errors before proceeding. The validator output tells you exactly what is wrong.

## Step 3: Schema sync

This creates all custom tables (Tier 2 and Tier 3) and their columns in ServiceNow. Run this first.

```bash
node adapters/servicenow/import.js schema
```

What happens:

1. Connects to ServiceNow and authenticates
2. For Tier 1 types, verifies that the OOTB tables exist and adds any missing custom columns
3. For Tier 2 and Tier 3 types, creates custom tables with the configured prefix
4. Creates all columns on each table, including reference columns linking between tables

**Dry run:** To see what would happen without making changes:

```bash
node adapters/servicenow/import.js schema --dry-run
```

**Report only:** If your instance does not allow API-based table creation, generate manual creation instructions:

```bash
node adapters/servicenow/import.js schema --report-only
```

This outputs a report listing every table and column that needs to be created, which you can hand to a ServiceNow administrator.

## Step 4: Data sync

This imports all records from your data JSON files, respecting the LOAD_PRIORITY order.

```bash
node adapters/servicenow/import.js sync
```

The LOAD_PRIORITY order in `tools/lib/constants.js` controls which types are imported first. Lookup types go first, then directory types, then CIs, and finally library types that reference everything else.

**Import modes:**

```bash
# Create new records and update existing ones (default)
node adapters/servicenow/import.js sync

# Create only, skip records that already exist
node adapters/servicenow/import.js create

# Update only, skip records not found in ServiceNow
node adapters/servicenow/import.js update

# Import a single type
node adapters/servicenow/import.js sync --type "Application"

# Import multiple specific types
node adapters/servicenow/import.js sync --type "Server,Database"

# Dry run
node adapters/servicenow/import.js sync --dry-run
```

## Step 5: Review the output

The import prints a summary showing how many records were added, updated, skipped, or errored for each type. A successful import has zero errors.

If you see errors, check:

1. Is the referenced record actually in ServiceNow? (Check LOAD_PRIORITY order)
2. Does the Name in your data file match exactly? (Case-sensitive)
3. Is the attribute name in your data file correct? (camelCase, matching schema-attributes.json)
4. For 403 errors on table creation, see [Troubleshooting](#troubleshooting)


# Verifying the Result

After import, run the validation tools to confirm everything landed correctly.

## Post-import validation

Compares local data files field-by-field against live ServiceNow data.

```bash
# Full validation
node adapters/servicenow/validate-import.js

# Quick count check (faster, skips field comparison)
node adapters/servicenow/validate-import.js --skip-fields --summary-only

# Validate one type
node adapters/servicenow/validate-import.js --type "Application"
```

## Schema check

Compares local schema definitions against live ServiceNow tables and columns. Read-only, makes no changes.

```bash
# Full schema check
node adapters/servicenow/check-schema.js

# Check one type with verbose output
node adapters/servicenow/check-schema.js --type "Server" --verbose
```

## Browsing in the ServiceNow UI

For Tier 1 types, navigate to the standard CMDB views. Open **Configuration** in the application navigator and browse CI classes like Application, Server, and Database to see imported records.

For Tier 2 and Tier 3 types, search the application navigator for the table name (e.g., `u_cmdbk_product_version`) or use the **System Definition > Tables** module to find and open custom tables.

ServiceNow's CMDB Map view shows relationship graphs between CIs, similar to JSM Assets' graph view.


# Replacing Example Data with Your Own

The process for replacing example data is the same as described in the [JSM Setup Guide](03-01-JSM-Assets-Setup.md#replacing-example-data-with-your-own). Edit the JSON data files or use the CSV workflow, then re-run the import.

ServiceNow-specific notes:

- **Person records.** Person records import to the custom `u_cmdbk_person` table, not `sys_user`. They represent external contacts and site POCs, not platform users. If a Person also has a platform user account, set the `isUser` flag and `userAccount` reference to link the two.


# Troubleshooting

**403 on table creation.** The admin user needs the `admin` role and the `glide.rest.create_metadata` system property must be set to `true`. Navigate to **System Properties > All** in ServiceNow and search for `glide.rest.create_metadata`. If you cannot change this property, use `--report-only` to generate manual creation instructions.

**Person records fail to import.** Person records import to the custom `u_cmdbk_person` table via the Table API. If you see errors, check that schema sync has run and created the table. Person records represent external contacts and site POCs, not platform users.

**Rate limiting on developer instances.** Personal Developer Instances have lower API rate limits than production instances. If you see throttling errors, increase the delay between API calls:

```bash
export SN_REQUEST_DELAY=200
```


**Custom columns not appearing.** After schema sync, ServiceNow may cache the table schema. Navigate to the table definition in **System Definition > Tables** and verify the columns exist. If they appear there but not in forms or lists, update the form layout to include the new fields.


# Next Steps

- [Other Platforms](other-platforms.md) for options beyond JSM and ServiceNow
- [Schema Reference](../Internals/schema-reference.md) for all types and attributes
- [Editing Data](../Data/editing-data.md) for JSON editing and the CSV workflow
- [Writing Adapters](../Extending/writing-custom-adapters.md) to connect to a new CMDB platform
- [ServiceNow Adapter Reference](../../../adapters/servicenow/README.md) for all adapter commands and options
