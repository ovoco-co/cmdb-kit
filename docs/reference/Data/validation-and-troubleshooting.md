# Validation and Troubleshooting

Validation is the quality gate between data files and the target database. CMDB-Kit provides three validation tools: an offline validator that checks schema and data integrity without a database connection, a post-import validator that compares live database records against local data, and a schema drift detector that finds differences between the repository and the target database.


# Offline Validation With tools/validate.js

## Running Validation

Run validation against a schema directory:

```bash
node tools/validate.js --schema schema/extended
```

The tool loads `schema-structure.json`, `schema-attributes.json`, and all data files from the specified directory. It performs nine sequential checks, reporting errors and warnings. Exit code 0 means no errors (warnings are allowed). Exit code 1 means one or more errors were found.

Always run validation before every import:

```bash
# Step 1: Validate
node tools/validate.js --schema schema/extended

# Step 2: If clean, import schema
node adapters/jsm/import.js schema

# Step 3: Import data
node adapters/jsm/import.js sync

# Step 4: Post-import validation
node adapters/jsm/validate-import.js
```

## What It Checks

The validator runs nine checks in sequence:

**Schema structure integrity.** No duplicate type names. All parent references are valid. Description length warnings (JSM Assets limits type descriptions to 70 characters).

**Attribute definitions.** Attributes for unknown types produce warnings. Reference type existence is verified: if an attribute references "Product Status" but no type with that name exists, the check reports an error.

**LOAD_PRIORITY completeness.** Every type with attribute definitions should appear in the LOAD_PRIORITY array in `tools/lib/constants.js`. Missing types will not be imported.

**LOAD_PRIORITY ordering.** If type A has a reference to type B, type B must appear before type A. The import script processes types in LOAD_PRIORITY order. Importing a type before its dependencies means reference resolution fails.

**Data file existence.** For every type in LOAD_PRIORITY, the check looks for a data file using the kebab-case naming convention. A missing file produces a warning since some types may not have data yet.

**Data field alignment.** Every field key in every record is checked against `schema-attributes.json`. Unknown fields produce warnings, catching typos like `versionSatus` instead of `versionStatus`.

**Reference resolution.** For every reference attribute in every record, the check verifies that the referenced value exists as a Name in the target type's data. Multi-reference values (semicolon-separated) are split and checked individually. This is the most thorough check and catches the most common cause of import failures.

**Null and boolean format validation.** Null values and boolean format issues (string `"true"` instead of boolean `true`) are flagged.

**Date format validation.** Date fields are checked for YYYY-MM-DD format.

Fix all errors before importing. Errors indicate problems that will cause import failures or data quality issues. Review warnings, which indicate potential issues that may or may not be problems depending on your context.


# Post-Import Validation With validate-import.js

After importing to JSM Assets, run the post-import validator:

```bash
node adapters/jsm/validate-import.js
```

This connects to the live JSM instance and performs a field-by-field comparison for each type in LOAD_PRIORITY. For each type, it fetches all records from JSM, builds an index by Name, and compares against the local data file.

It checks for:

Missing records: local records that do not exist in JSM (import failed silently).

Extra records: JSM records that do not exist locally (manual additions or leftovers from previous imports).

Field mismatches: records that exist in both but have different values for one or more fields.

The comparison normalizes values before comparing: dates are converted to YYYY-MM-DD, booleans are normalized, null and empty string are treated as equivalent, and multi-value references are sorted.

The import script does not always report individual record failures. A reference that does not resolve might result in the field being silently left empty rather than throwing an error. The post-import validator catches these silent failures.

Options:

```bash
# Validate a specific type
node adapters/jsm/validate-import.js --type "Product Version"

# Detailed per-field output
node adapters/jsm/validate-import.js --verbose

# Quick count check without field comparison
node adapters/jsm/validate-import.js --skip-fields

# Pass/fail summary per type
node adapters/jsm/validate-import.js --summary-only
```


# Schema Drift Detection

Over time, the target database schema may drift from the repository. Someone adds a type manually in the JSM admin interface. Someone adds an attribute through the UI. Someone creates a lookup value directly in Assets instead of adding it to the data file and importing. The export tool's diff mode detects these differences:

```bash
node adapters/jsm/export.js --diff
```

Diff mode compares JSM's current state against local data files and reports added, removed, and changed records per type. While this operates at the data level, it reveals drift that started as a schema change (a new attribute added in JSM shows up as new field values that do not exist locally).

The fix is always the same: bring the repository in sync with the desired state, validate, and re-import. The repository is the source of truth. Manual changes in the target database should be reflected back into the data files.


# Common Errors and Their Fixes

## Reference Not Found

```
Reference "Curent" in field "versionStatus" of "OvocoCRM 2.4.0"
not found in type "Version Status"
```

Cause: the referenced value does not exist in the target type's data. Usually a typo ("Curent" instead of "Current") or a missing record in the lookup data file.

Fix: correct the spelling to match the exact Name in the referenced type's data.

## Unknown Attribute

```
Unknown field "versionnumber" in record "OvocoCRM 2.4.0"
of type "Product Version"
```

Cause: the field name does not match any attribute in `schema-attributes.json`. Usually a case error ("versionnumber" instead of "versionNumber").

Fix: correct the field name to match the camelCase attribute name in the schema.

## Type Not in LOAD_PRIORITY

```
Type "Assessment" has attributes but is not in LOAD_PRIORITY
```

Cause: the type is defined in the schema but not listed in the LOAD_PRIORITY array in `tools/lib/constants.js`.

Fix: add the type to LOAD_PRIORITY in the correct position (after its dependencies).

## Dependency Order Violation

```
Type "Deployment Site" references "Product Version" but "Product Version"
appears after "Deployment Site" in LOAD_PRIORITY
```

Cause: the import order would process Deployment Site before Product Version, so referenced records would not exist yet.

Fix: move the dependent type after its dependency in LOAD_PRIORITY.

## Duplicate Name

```
Duplicate Name "OvocoCRM 2.4.0" in product-version.json
```

Cause: two records in the same data file have the same Name value.

Fix: remove the duplicate or rename one of the records.


# The Debugging Checklist

When something goes wrong during import or validation, work through this checklist in order. Most problems are caught by the first three checks.

**Is the type in LOAD_PRIORITY?** If a type is not in LOAD_PRIORITY, it will not be imported. Check `tools/lib/constants.js`.

**Does the JSON file name match the type name convention?** "Product Version" needs `product-version.json`. Check for common mistakes: `ProductVersion.json`, `product_version.json`, `productversion.json`.

**Are all referenced objects imported first?** Check LOAD_PRIORITY order. Every type referenced by the type you are importing must appear earlier in the array.

**Do field names match schema-attributes.json?** Field names must be camelCase and match exactly. Check for case mismatches (`versionstatus` vs `versionStatus`) and naming mismatches (`status` vs `versionStatus`).

**Are reference values exact matches?** Same capitalization, same spacing, no trailing whitespace. "Active" is not "active" is not "Active " (trailing space).

**Is the JSON valid?** Run the file through a JSON linter or `node -e "JSON.parse(require('fs').readFileSync('file.json'))"`. Common issues: trailing commas, single quotes, missing commas between records.

**Does the data file use the correct format?** Directory types (Organization, Team, Person, Location, Facility, Vendor) use nested format: `{ "TypeName": [...] }`. All other types use flat format: `[...]`. Check the NESTED_TYPES set in `tools/lib/constants.js`.
