# Verification

After importing schema and data into your target CMDB platform, run the post-import validation script to confirm that every record arrived intact. The validators compare what is in the live instance against the local JSON data files and report any discrepancies.

## Post-Import Validation

Each adapter includes a validation script:

JSM Assets:

```bash
node adapters/jsm/validate-import.js
```

ServiceNow:

```bash
node adapters/servicenow/validate-import.js
```

Both scripts perform the same three checks against every type in the schema:

- Record counts match the local data files. If the local `product.json` file contains six records, the target instance must also contain exactly six Product records.
- Field values match for every attribute on every record. Each record is fetched by Name and compared field by field against the local data.
- References resolve correctly. If a Deployment Site record references a Product named "CRM Core", the validator confirms that the reference actually points to the correct Product object in the target instance, not just that the text value is present.

The output is either PASS or FAIL for each type. PASS means every record in every type matches the local data exactly. FAIL shows which records have mismatches, which specific fields differ, and what the expected versus actual values are. This lets you trace the problem directly without manually inspecting objects one at a time in the target platform's UI.

## Expected Record Counts

When importing the Core schema with default example data, you should see the following counts:

| Type | Records |
|------|---------|
| Product | 6 |
| Server | 8 |
| Database | 4 |
| Product Component | 6 |
| Feature | 6 |
| Product Version | 5 |
| Document | 5 |
| Deployment | 4 |
| Deployment Site | 6 |
| Baseline | 2 |
| Organization | 6 |
| Team | 5 |
| Person | 10 |
| Product Status | 4 |
| Version Status | 5 |
| Deployment Status | 5 |
| Environment Type | 5 |
| Document Type | 6 |
| Document State | 4 |
| Component Type | 7 |
| Priority | 4 |
| Organization Type | 5 |
| Deployment Role | 5 |
| Site Status | 4 |
| Baseline Type | 3 |
| Baseline Status | 3 |

If a type shows zero records while the table above shows a non-zero count, the import for that type failed silently. Check the import log output for errors on that type.

The lookup types (Product Status through Baseline Status) are small reference tables. If any of these are missing, the CI types that depend on them will have empty status and category fields. Always verify lookup types first.

If you have added your own records on top of the example data, your counts will be higher than the table above. The validator still works correctly in that case. It checks that every local record exists in the target instance, not that the instance contains only local records.

## Common Errors

### "Invalid CMDB class" on ServiceNow

The table name in the identification rule does not match the actual table on the instance. On scoped app instances, tables are prefixed with `x_cmdbk_`, but identification rules may still reference `u_cmdbk_` from a global-scope installation. Fix this by updating the `cmdb_identifier` and `cmdb_identifier_entry` records to use the correct table prefix.

### Empty reference fields after JSM import

This usually means you used sync mode for the entire import instead of running schema and data as separate steps. When schema and data are pushed together in sync mode, the adapter may attempt to create records before all referenced types exist. Re-run with `data` mode only after confirming that the schema step completed successfully:

```bash
node adapters/jsm/import.js schema
node adapters/jsm/import.js data
```

### "Type not found" warnings

The import script iterates over every type in LOAD_PRIORITY, which includes types from the Extended and Enterprise layers. When you import Core only, types from those layers appear as "skipped" in the output. This is expected behavior. The warning means the type exists in LOAD_PRIORITY but was not included in the schema you selected. No action is needed.

### Reference value not found

A data record references a Name that does not exist in the target type. For example, a Deployment Site record might have `"sitePOC": "Drew Santos"` but no Person record named "Drew Santos" exists in the instance. Check spelling and case carefully. References are case-sensitive exact matches. "drew santos" will not match "Drew Santos".

This error can also occur when import order is wrong. If Person records have not been imported yet when Deployment Site records are created, the reference will fail. The canonical import order defined in LOAD_PRIORITY prevents this, but manual imports or partial re-imports can trigger it.

### Counts match but field values differ

This happens when a record was updated in the target instance after import but the local data file was not updated to match. If the target instance is the source of truth, export from the instance to update your local files:

```bash
node adapters/jsm/export.js
```

Then re-run validation to confirm the local files now match.
