# Validation and Troubleshooting

Validation is the quality gate between data files and the target database. CMDB-Kit provides three validation tools: an offline validator that checks schema and data integrity without a database connection, a post-import validator that compares live database records against local data, and a schema drift detector that finds differences between the repository schema and the target database. This chapter covers each tool, the checks they perform, the errors they report, and the debugging checklist for resolving problems.


# Offline Validation With tools/validate.js

## Running Validation

Run validation against a schema directory:

```bash
node tools/validate.js --schema schema/extended
```

For the base schema:

```bash
node tools/validate.js --schema schema/base
```

The tool loads schema-structure.json, schema-attributes.json, and all data files from the specified directory. It performs nine sequential checks, reporting errors and warnings. Exit code 0 means no errors (warnings are allowed). Exit code 1 means one or more errors were found.

## Schema Structure Integrity

The first check validates the type hierarchy:

No duplicate type names. If two entries in schema-structure.json share the same name, the check reports an error. Duplicate names cause ambiguous behavior in the import script.

All parent references are valid. If a type declares `"parent": "Product CMDB"` but no type named "Product CMDB" exists, the check reports an error.

Description length. JSM Assets limits type descriptions to 70 characters. The check warns (not errors) if any description exceeds this limit. Other target databases may not have this constraint.

## Attribute Definitions

The second check validates the attribute schema:

Attributes for unknown types. If schema-attributes.json defines attributes for a type that does not exist in schema-structure.json, the check warns. This catches typos in type names.

Reference type existence. If an attribute has `"type": 1, "referenceType": "Application Status"` but no type named "Application Status" exists in the schema, the check reports an error. This is one of the most important checks because a broken reference type means the attribute cannot be created in the target database.

## Data File Existence

For every type in LOAD_PRIORITY that exists in the current schema, the check looks for a data file using the standard resolution: kebab-case match, plural fallback, personnel type fallback. A missing data file produces a warning (not an error) because some types may not have data yet.

## Data Field Alignment

For every record in every data file, the check verifies that each field key matches a known attribute in schema-attributes.json. Recognized keys include all attributes defined for the type, plus the meta fields (Name, name, description).

Unknown fields produce a warning. This catches typos in field names: `"versionSatus"` instead of `"versionStatus"`.

## Reference Resolution

This is the most thorough check. For every reference attribute in every record, the check verifies that the referenced value exists as a Name in the target type's data:

If Product Version has `"versionStatus": "Current"`, the check looks for a record named "Current" in the Version Status data file.

If Deployment Site has `"productVersion": "OvocoCRM 2.4.0"`, the check looks for a record named "OvocoCRM 2.4.0" in the Product Version data file.

Multi-reference values (semicolon-separated) are split and checked individually. Each value must exist in the referenced type.

Reference errors are the most common cause of import failures. A single typo in a referenced value will cause the record to import with a missing or broken reference.

## LOAD_PRIORITY Coverage

The check identifies "leaf types" (types that have attribute definitions) and verifies that each one appears in the LOAD_PRIORITY array. A type with attributes that is not in LOAD_PRIORITY will not be imported. This warns rather than errors because the type may be intentionally excluded.

## LOAD_PRIORITY Ordering

The check verifies dependency order: if type A has a reference to type B, type B must appear before type A in LOAD_PRIORITY. The import script processes types in LOAD_PRIORITY order. If a type is imported before its dependencies, reference resolution fails because the referenced records do not exist yet.

## Naming Convention Compliance

The check verifies that data file names follow the kebab-case convention. A file named `ProductVersion.json` or `product_version.json` will not be found by the standard resolution algorithm.

## Duplicate Detection

Within each data file, the check looks for records with the same Name value. Duplicate names cause unpredictable behavior during import (one record overwrites the other, or both are created as separate records with the same name depending on the target database).


# Post-import Validation With validate-import.js

## Comparing Imported vs Expected

After importing to JSM Assets, run the post-import validator:

```bash
node adapters/jsm/validate-import.js
```

This connects to the live JSM instance and performs a field-by-field comparison for each type in LOAD_PRIORITY:

For each type, it fetches all records from JSM and builds an index by Name (stripping the JSM key prefix). It then compares against the local data file, checking for:

Missing records: local records that do not exist in JSM (import failed silently).

Extra records: JSM records that do not exist locally (manual additions or leftover from previous imports).

Field mismatches: records that exist in both but have different values for one or more fields.

The comparison normalizes values before comparing: dates are converted to YYYY-MM-DD regardless of JSM's display format, booleans are normalized, null and empty string are treated as equivalent, and multi-value references are sorted before comparison.

## Identifying Records That Failed Silently

The import script does not always report individual record failures. A reference that does not resolve might result in the field being silently left empty rather than throwing an error. The post-import validator catches these silent failures by checking that every field in every record matches the expected value.

Use `--type "Product Version"` to validate a specific type. Use `--verbose` for detailed per-field comparison output. Use `--summary-only` for just pass/fail per type.


# Schema Drift Detection With check-schema.js

## Comparing Repo Schema to Target Database

Over time, the target database schema may drift from the repository. Someone adds a type manually in the JSM admin interface. Someone adds an attribute through the UI that does not exist in schema-attributes.json. The export tool can detect these differences:

```bash
node adapters/jsm/export.js --diff
```

The diff mode compares JSM's current state against local data files and reports added, removed, and changed records per type. While this operates at the data level rather than the schema level, it reveals drift that started as a schema change (a new attribute added in JSM shows up as new field values that do not exist locally).

## Detecting Manual Changes

Manual changes to the target database are the primary source of drift. Common examples:

Someone adds a new lookup value directly in JSM Assets instead of adding it to the data file and importing.

Someone renames a type or attribute in JSM without updating the schema files.

Someone creates a new type directly in JSM that does not exist in schema-structure.json.

The fix is always the same: bring the repository in sync with the desired state, validate, and re-import. The repository is the source of truth. Manual changes in the target database should be reflected back into the data files.


# Common Errors and Their Fixes

## Reference Not Found

Error: `Reference "Curent" in field "versionStatus" of "OvocoCRM 2.4.0" not found in type "Version Status"`

Cause: the referenced value does not exist in the target type's data. Usually a typo ("Curent" instead of "Current") or a missing record in the lookup data file.

Fix: correct the spelling in the data file to match the exact Name in the referenced type's data.

## Unknown Attribute

Warning: `Unknown field "versionnumber" in record "OvocoCRM 2.4.0" of type "Product Version"`

Cause: the field name does not match any attribute in schema-attributes.json. Usually a case error ("versionnumber" instead of "versionNumber") or a typo.

Fix: correct the field name to match the camelCase attribute name in schema-attributes.json.

## Type Not in LOAD_PRIORITY

Warning: `Type "Assessment" has attributes but is not in LOAD_PRIORITY`

Cause: the type is defined in the schema but not listed in the LOAD_PRIORITY array in tools/lib/constants.js.

Fix: add the type to LOAD_PRIORITY in the correct position (after its dependencies).

## Dependency Order Violation

Error: `Type "Deployment Site" references "Product Version" but "Product Version" appears after "Deployment Site" in LOAD_PRIORITY`

Cause: the import order would process Deployment Site before Product Version, so Product Version records would not exist when Deployment Site tries to resolve its productVersion references.

Fix: move the dependent type after its dependency in LOAD_PRIORITY. Product Version must come before Deployment Site.

## Duplicate Name

Warning: `Duplicate Name "OvocoCRM 2.4.0" in product-version.json`

Cause: two records in the same data file have the same Name value.

Fix: remove the duplicate or rename one of the records. Names must be unique within a type.


# The Debugging Checklist

When something goes wrong during import or validation, work through this checklist in order. Most problems are caught by the first three checks.

## Is the Type in LOAD_PRIORITY?

If a type is not in LOAD_PRIORITY, it will not be imported. Check `tools/lib/constants.js` and verify the type appears in the array.

## Does the JSON File Name Match the Type Name Convention?

The type name "Product Version" must have a data file named `product-version.json`. Check the conversion: lowercase, spaces to hyphens. Look for common mistakes: `ProductVersion.json`, `product_version.json`, `productversion.json`.

## Are All Referenced Objects Imported First?

Check LOAD_PRIORITY order. Every type that is referenced by the type you are trying to import must appear earlier in the array. If Deployment Site references Product Version, Product Version must come first.

## Do Field Names Match schema-attributes.json?

Field names in data files must be camelCase and match the schema exactly. Check for case mismatches: `versionstatus` vs `versionStatus`. Check for naming mismatches: `status` vs `versionStatus` (if the attribute is named `versionStatus` in the schema, the data file must use `versionStatus`, not `status`).

## Are Reference Values Exact Matches?

Reference values must match the Name field of the referenced record exactly: same capitalization, same spacing, no trailing whitespace. "Active" is not "active" is not "Active " (trailing space).

## Is the JSON Valid?

Run the file through a JSON linter or `node -e "JSON.parse(require('fs').readFileSync('file.json'))"`. Common issues: trailing commas, single quotes, missing commas between records, unquoted keys.

## Does the Data File Use the Correct Format?

Directory types (Organization, Team, Person, Location, Facility, Vendor) use nested format: `{ "TypeName": [...] }`. All other types use flat format: `[...]`. Check the NESTED_TYPES set in constants.js if unsure.
