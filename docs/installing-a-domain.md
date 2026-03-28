# Installing a Domain

Domains are opt-in schema packages that extend Core with types for specialized teams. This guide covers validation, import, and verification.

## Validate Core Plus Domain

Before importing, validate that Core and the domain work together. The validator checks that all references in the domain resolve to types that exist in Core or within the domain itself.

```bash
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
```

You can validate multiple domains at once. The validator checks cross-domain references as well, confirming that types referenced across domain boundaries exist in the combined schema.

```bash
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure --domain schema/domains/compliance
```

If validation fails, the output identifies which types or attributes have unresolved references. Fix the schema files and re-run before proceeding to import.

## Import Domain Types

The adapter imports all types listed in LOAD_PRIORITY in `tools/lib/constants.js`. Domain types that exist in the schema directory will be imported. Types not found in the target platform are skipped with a warning.

Domain types must be added to LOAD_PRIORITY before import. The array controls both which types are imported and the order they are created. Place domain lookup types in the lookup section and domain CI types after the base CI types, respecting dependency order. Reference targets must appear before the types that reference them.

### JSM Import

For JSM Assets, run the schema sync first to create object types, then import data.

```bash
# Create Core and domain object types and attributes
node adapters/jsm/import.js schema

# Import all data records (create and update)
node adapters/jsm/import.js sync
```

You can also import in create-only mode to skip existing records:

```bash
node adapters/jsm/import.js create
```

Or import data without re-syncing schema:

```bash
node adapters/jsm/import.js data
```

### ServiceNow Import

For ServiceNow, the schema sync creates custom tables and the data sync pushes records.

```bash
# Create tables, columns, and field definitions
node adapters/servicenow/import.js schema

# Import data records (create and update)
node adapters/servicenow/import.js sync
```

The import creates domain types alongside Core types. Domain types appear under their parent containers (Product CMDB, Product Library, Directory, Lookup Types) just like Core types. There is no separate branch or namespace for domain types in the platform UI.

## Verify

After import, check the platform UI for the new types. For example, after installing the Infrastructure domain, you should see Hardware Model, Virtual Machine, and Network Segment under Product CMDB, and Location and Facility under Directory. The Network Type lookup should appear under Lookup Types.

Run post-import validation to compare local data against the live platform. The validation script reads every record from the platform and compares field values against the local JSON data files.

For JSM:

```bash
node adapters/jsm/validate-import.js
```

For ServiceNow:

```bash
node adapters/servicenow/validate-import.js
```

The validation report lists any mismatches: missing records, extra records, and field value differences. Resolve mismatches by either updating local data files to match intended platform state or re-running the import to push local data to the platform.

## Removing a Domain

To remove a domain's types from your platform, delete the records and object types through the platform's administration UI. Then remove the domain's types from LOAD_PRIORITY in `tools/lib/constants.js`. Core types are unaffected because Core never references domain types.

After removal, re-run validation against Core alone to confirm the schema is clean:

```bash
node tools/validate.js --schema schema/core
```
