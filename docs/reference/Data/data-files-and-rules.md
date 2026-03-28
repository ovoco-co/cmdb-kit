# Data Files and Rules

CMDB-Kit stores CI data in JSON files inside a `data/` directory alongside the schema. These files are the single source of truth for your CMDB records. Understanding their format and rules is essential before adding or modifying data.


# File Format and Naming

Each importable type has one JSON data file. The file name follows the kebab-case convention: lowercase, with spaces replaced by hyphens. The type name "Product Version" becomes `product-version.json`. The type "Deployment Site" becomes `deployment-site.json`.

Common naming mistakes that cause the import script to miss a file:

- `ProductVersion.json` (PascalCase, not kebab-case)
- `product_version.json` (underscores, not hyphens)
- `productversion.json` (no separator)

The file resolution algorithm also checks plural forms (`servers.json` for Server) and personnel type aliases (`people.json` for Person), but the primary convention is singular kebab-case.

## Flat Format

Most types use flat format: a top-level JSON array of objects.

```json
[
  {
    "Name": "OvocoCRM 2.3.1",
    "versionNumber": "2.3.1",
    "status": "Current",
    "releaseDate": "2026-02-10"
  },
  {
    "Name": "OvocoCRM 2.3.0",
    "versionNumber": "2.3.0",
    "status": "Previous",
    "releaseDate": "2025-11-15"
  }
]
```

## Nested Format

Directory types (Organization, Team, Person, Location, Facility, Vendor) use nested format: a JSON object with the type name as the key, containing an array of records.

```json
{
  "Organization": [
    {
      "Name": "Acme Corp",
      "orgType": "Customer"
    }
  ]
}
```

The `NESTED_TYPES` set in `tools/lib/constants.js` defines which types use nested format. If you are unsure which format a type uses, check that set or look at the existing data files.


# The Name Field

Every record must have a `Name` field. This is the unique identifier for the record within its type. The import script uses Name to match local records against existing records in the target database: if a record with that Name already exists, the import updates it rather than creating a duplicate.

Names must be unique within a type. Two Product Version records both named "OvocoCRM 2.3.1" will cause unpredictable behavior during import. The validator catches duplicates.

Name matching is case-sensitive. "OvocoCRM 2.3.1" and "ovococrm 2.4.0" are treated as different records.


# Never Include Key or id Fields

Data files must not contain `Key` or `id` fields. The target database assigns these automatically during import. Including them causes conflicts or errors.

Correct:

```json
{
  "Name": "OvocoCRM 2.3.1",
  "versionNumber": "2.4.0"
}
```

Incorrect:

```json
{
  "Key": "CMDB-42",
  "id": 12345,
  "Name": "OvocoCRM 2.3.1",
  "versionNumber": "2.4.0"
}
```

If you export data from a live database using the export tool, it strips Key and id automatically.


# Reference Values

Reference fields link one record to another. A Product Version's `status` field references a record in the Version Status lookup type. The value in the data file must be the exact Name of the referenced record.

## Exact Name Matching

If the Version Status lookup contains a record named "Current", the data file must use exactly "Current", not "current", "CURRENT", or "Current " (with a trailing space). The import script resolves references by querying for records where Name matches exactly. A mismatch means the reference will not resolve, and the record imports with a broken or empty reference.

## Case Sensitivity

Name matching is case-sensitive everywhere: in the data files, during validation, and during import. A common pattern is that lookup types define values in Title Case ("Active", "Current", "Deprecated") and CI data files reference those values. If someone types "active" instead of "Active", validation catches it as a reference error.

## Multi-Reference Fields

Multi-reference fields hold multiple values separated by semicolons. A Product Version's `components` field might contain:

```json
"components": "Contact Manager;Deal Pipeline;Email Integration;REST API"
```

Each value between semicolons must be an exact Name match in the referenced type (Product Component in this case). Using commas or spaces as separators instead of semicolons will treat the entire string as a single reference value, which will not match any record.

## Common Reference Mistakes

Referencing a value that does not exist. The data file says `"status": "Released"` but the Version Status lookup only has "Current", "Beta", "Previous", "Deprecated", and "Retired". Validation catches this.

Referencing a record from the wrong type. The data file says `"owner": "Ovoco Engineering"` for a field that references Team, but "Ovoco Engineering" is an Organization, not a Team. Validation catches this because it checks the referenced type.

Trailing spaces. `"Active "` (with a trailing space) does not match `"Active"`. This is invisible in most editors but causes reference failures.


# Attribute Keys

Field names in data files use camelCase and must match the attribute names in `schema-attributes.json` exactly. The attribute "Version Number" is stored as `versionNumber` in the schema and in data files. The import script converts camelCase to Title Case for display in the target database.

Common field name mistakes:

- `versionnumber` instead of `versionNumber` (missing capital)
- `version_number` instead of `versionNumber` (underscores)
- `VersionNumber` instead of `versionNumber` (PascalCase)

Validation warns about fields that do not match any known attribute, which catches most typos.


# Data Type Formats

Text fields accept any string value.

Date fields use `YYYY-MM-DD` format: `"2025-07-01"`, not `"07/01/2025"` or `"July 1, 2025"`.

Boolean fields use JSON booleans: `true` or `false` (without quotes). Using the string `"true"` instead of the boolean `true` produces a validation warning.

Integer fields use JSON numbers: `42`, not `"42"`.

Reference fields use the Name string of the referenced record, as described above.


# Relationship Data

CI-to-CI relationships are defined in `relationships.json` in the data directory. This file is separate from the per-type data files because relationships span multiple types.

```json
[
  { "parent": "CRM Core", "parentClass": "u_cmdbk_product", "child": "crm-app-01", "childClass": "cmdb_ci_server", "type": "Runs on::Runs" },
  { "parent": "CRM Core", "parentClass": "u_cmdbk_product", "child": "crm-primary", "childClass": "u_cmdbk_database", "type": "Depends on::Used by" },
  { "parent": "crm-db-01", "parentClass": "cmdb_ci_server", "child": "crm-primary", "childClass": "u_cmdbk_database", "type": "Contains::Contained by" }
]
```

Each relationship has five fields:

- `parent` and `child`: the Name of each CI (must match the name in its data file)
- `parentClass` and `childClass`: the ServiceNow table name for each CI (used to resolve the sys_id)
- `type`: the relationship type name from ServiceNow's `cmdb_rel_type` table (e.g., "Runs on::Runs", "Depends on::Used by", "Contains::Contained by")

The ServiceNow adapter imports relationships after all CI records are loaded. The JSM adapter expresses the same relationships as reference attribute values on the object types. The relationship data is platform-agnostic in intent but uses ServiceNow relationship type names. JSM adapters translate these to reference attributes.

The Core schema ships with relationships covering three types: Runs on (applications to servers), Depends on (applications to databases and app-to-app), and Contains (servers containing databases).
