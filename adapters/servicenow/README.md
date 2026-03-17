# ServiceNow CMDB Adapter

Imports CMDB-Kit schema and data into ServiceNow CMDB. Uses the CMDB Instance API with IRE deduplication for CI types and the Table API for non-CI types.

## Prerequisites

- ServiceNow instance (Personal Developer Instance works)
- Admin user with API access
- Node.js 18+

For custom table creation via API, the instance needs the `glide.rest.create_metadata` system property set to `true`. If your instance is locked down, use `--report-only` to generate manual creation instructions.

## Setup

```bash
export SN_INSTANCE=https://dev12345.service-now.com
export SN_USER=admin
export SN_PASSWORD=password
export SCHEMA_DIR=schema/base
export DATA_DIR=schema/base/data
```

### Optional Configuration

```bash
export SN_TABLE_PREFIX=u_cmdbk        # Custom table prefix (default: u_cmdbk)
export SN_LOOKUP_STRATEGY=table        # table or hybrid (default: table)
export SN_BATCH_SIZE=200               # Records per pagination batch
export SN_REQUEST_DELAY=100            # Delay between API calls in ms (for dev instances)
export DEBUG=true                      # HTTP debug logging
```

## Quick Start

```bash
# 1. Test connectivity
node adapters/servicenow/import.js --test-connection

# 2. Preview schema creation (dry run)
node adapters/servicenow/import.js schema --dry-run

# 3. Create custom tables and columns
node adapters/servicenow/import.js schema

# 4. Import all data
node adapters/servicenow/import.js sync

# 5. Validate the import
node adapters/servicenow/validate-import.js
```

## Commands

### Import

```bash
# Modes
node adapters/servicenow/import.js sync      # Create + update (default)
node adapters/servicenow/import.js create    # Create only, skip existing
node adapters/servicenow/import.js update    # Update only, skip new
node adapters/servicenow/import.js schema    # Tables and columns only

# Options
--type "Product"    # Single type
--type "Server,Database" # Multiple types
--dry-run               # Preview without changes
--report-only           # Generate manual creation report
--test-connection       # Test connectivity and exit
```

### Export

```bash
node adapters/servicenow/export.js                     # Export to objects-export/
node adapters/servicenow/export.js --outdir ./backup    # Custom output dir
node adapters/servicenow/export.js --diff               # Compare SN vs local
node adapters/servicenow/export.js --overwrite          # Overwrite local files
```

### Validate Import

```bash
node adapters/servicenow/validate-import.js             # Full validation
node adapters/servicenow/validate-import.js --skip-fields  # Record counts only
node adapters/servicenow/validate-import.js --summary-only  # Summary table only
```

### Schema Check

```bash
node adapters/servicenow/check-schema.js                # Check all types
node adapters/servicenow/check-schema.js --verbose       # Show matching items
node adapters/servicenow/check-schema.js --type "Server" # Single type
```

## Type Mapping

CMDB-Kit types map to ServiceNow tables in three tiers:

### Tier 1: OOTB Tables

Infrastructure and directory types that map to built-in ServiceNow tables. CI types use the CMDB Instance API; non-CI types use the Table API.

| CMDB-Kit Type | ServiceNow Table | API |
|---|---|---|
| Server | cmdb_ci_server | CMDB Instance API |
| Hardware Model | cmdb_hardware_product_model | Table API |
| Network Segment | cmdb_ci_ip_network | CMDB Instance API |
| License | alm_license | Table API |
| SLA | contract_sla | Table API |
| Organization | core_company | Table API |
| Team | sys_user_group | Table API |
| Location | cmn_location | Table API |
| Vendor | core_company (with vendor flag) | Table API |

### Tier 2: Custom CI Classes

Product-delivery types that extend cmdb_ci with independent identification rules. The adapter creates these tables, columns, and IRE identification rules during schema sync. All use the CMDB Instance API for automatic deduplication.

| CMDB-Kit Type | ServiceNow Table | Identification |
|---|---|---|
| Product | u_cmdbk_product | Independent, match by name |
| Database | u_cmdbk_database | Independent, match by name |
| Virtual Machine | u_cmdbk_virtual_machine | Independent, match by name |
| Product Component | u_cmdbk_product_component | Independent, match by name |
| Feature | u_cmdbk_feature | Independent, match by name |
| Assessment | u_cmdbk_assessment | Independent, match by name |

### Tier 3: Custom Standalone Tables

Product Library types, directory types, and lookup types that use custom standalone tables:

| CMDB-Kit Type | ServiceNow Table |
|---|---|
| Person | u_cmdbk_person |
| Product Version | u_cmdbk_product_version |
| Document | u_cmdbk_document |
| Deployment | u_cmdbk_deployment |
| All lookup types | u_cmdbk_{type_name} |

Person is a custom standalone table representing external contacts, site POCs, and deployment stakeholders. Person records are not platform users and should never be mapped to `sys_user` or any platform's user directory. The optional `isUser` flag and `userAccount` reference allow linking a Person to a platform user account when applicable.

## Table Prefix

Custom tables use the `u_` prefix (global scope) by default. This avoids requiring a scoped application install. To use scoped app tables, set:

```bash
export SN_TABLE_PREFIX=x_cmdbk
```

## Lookup Strategy

By default, all lookup types (Product Status, Environment Type, etc.) create custom reference tables with `name` and `description` columns. This preserves descriptions and keeps the adapter logic uniform.

Set `SN_LOOKUP_STRATEGY=hybrid` to map OOTB-equivalent lookups to ServiceNow choice list values instead.

## Troubleshooting

**403 on table creation**: The admin user needs the `admin` role and the `glide.rest.create_metadata` system property must be `true`. Use `--report-only` to generate instructions for manual creation.

**Person records**: Person records import to the custom `u_cmdbk_person` table, not `sys_user`. They represent external contacts and site POCs, not platform users. If you see import errors, verify that schema sync has created the table.

**Rate limiting on dev instances**: Set `SN_REQUEST_DELAY=200` to add a 200ms delay between API calls.

**Auto-generated numbers**: Change Request and Incident use ServiceNow auto-numbered fields (CHG0001234, INC0001234). The adapter uses the `number` field for matching instead of `name`.
