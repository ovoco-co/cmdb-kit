# Data Entry and Maintenance

Schema design defines the shape of your CMDB. Data entry fills it with records. This chapter covers the two workflows for creating and maintaining CI data in CMDB-Kit: direct JSON editing for developers and small changes, and the CSV workflow for bulk data operations and non-technical contributors. It also covers reference consistency, the rules for adding and removing records, and the validation step that should precede every import.


# JSON Editing Workflow

## Direct Editing of Data Files

The most direct way to add or modify CI data is to edit the JSON files in the `data/` directory. Open the file, add or modify records, save, validate, and import.

For a new Product Version record, open `product-version.json` and append to the array:

```json
{
  "Name": "OvocoCRM 2.4.0",
  "versionNumber": "2.4.0",
  "versionStatus": "Current",
  "releaseDate": "2025-07-01",
  "previousVersion": "OvocoCRM 2.3.1",
  "components": "CR Core Platform;CR Authentication Module;CR Export Module;CR API Gateway"
}
```

Direct editing works well for developers who are comfortable with JSON syntax and know the schema. It is the fastest path for small changes: adding a single record, updating an attribute, or fixing a data error.

## JSON Syntax Rules and Common Pitfalls

JSON is strict about syntax. Common mistakes:

Trailing commas. JSON does not allow a comma after the last item in an array or object. `["a", "b",]` is invalid. Most code editors flag this, but it is the most common JSON syntax error.

Unquoted keys. JSON requires double-quoted keys. `{Name: "value"}` is invalid. `{"Name": "value"}` is correct.

Single quotes. JSON requires double quotes for strings. `{'Name': 'value'}` is invalid.

Missing commas between records. When appending a record to an array, add a comma after the previous record:

```json
[
  { "Name": "Record A" },
  { "Name": "Record B" }
]
```

Forgetting the comma between Record A and Record B is the second most common syntax error.

Encoding. Data files must be UTF-8. Files saved with other encodings may import incorrectly or fail validation.

## Using Validation to Catch Errors Before Import

After every edit, run validation:

```bash
node tools/validate.js --schema schema/extended
```

Validation catches syntax errors, reference mismatches, unknown fields, and format violations before the data reaches the target database. Fix all errors before importing. Warnings should be reviewed but do not block import.


# CSV and Excel Workflow

## Generating CSV Templates

The `generate-templates.js` tool creates blank templates that match the schema:

```bash
node tools/generate-templates.js --schema schema/extended
```

This generates one CSV file per importable type. Each template has three header rows:

Row 1: camelCase attribute names (the machine-readable keys that match schema-attributes.json).

Row 2: Title Case display names (human-readable labels).

Row 3: type hints (Text, Date YYYY-MM-DD, Boolean, Integer, Ref to Application Status, Multi-Ref to Team with semicolons).

The `--examples` flag pulls the first record from existing data files as a sample row:

```bash
node tools/generate-templates.js --schema schema/extended --examples
```

For XLSX output (requires the exceljs package):

```bash
node tools/generate-templates.js --schema schema/extended --format xlsx
```

The XLSX output creates one worksheet per type with frozen header rows after row 3, color-coded headers (dark blue for camelCase keys, light blue for display names, gray for type hints), auto-sized column widths, and dropdown validation for reference fields populated from lookup data.

## Template Columns Match Schema Attributes

Template columns are generated directly from schema-attributes.json. Every attribute for a type becomes a column. The Name column is always first. Reference columns include a type hint showing which type the value should reference.

The column order and names are not arbitrary. They match the schema exactly. Do not rename columns or add custom columns. The csv-to-json tool relies on the column headers to map values to the correct attributes.

## Filtering Templates by Role or Family

The template generator supports filters to reduce the number of files generated:

```bash
# Only lookup types
node tools/generate-templates.js --schema schema/extended --family lookups

# Only types relevant to a CM analyst
node tools/generate-templates.js --schema schema/extended --role cm-analyst

# Specific types
node tools/generate-templates.js --schema schema/extended "Product Version" "Deployment Site"
```

## Filling Templates in a Spreadsheet

Open the CSV or XLSX template in a spreadsheet application. Fill in data starting from row 4 (below the three header rows). Follow the type hints in row 3:

Text fields: enter plain text.

Date fields: use YYYY-MM-DD format (2025-07-01, not 07/01/2025 or July 1 2025).

Boolean fields: enter true or false (or yes/no, 1/0, y/n; the converter normalizes them).

Integer fields: enter whole numbers.

Reference fields: enter the exact Name of the referenced record. "Current" must match a value in Version Status. Case matters.

Multi-reference fields: enter multiple values separated by semicolons. "CR Core Platform;CR Authentication Module" references two Product Component records.

When saving from Excel as CSV, choose "CSV UTF-8" format. Files saved with other encodings may contain invisible characters that cause validation failures or corrupted data on import.

## Converting Back to JSON

When the template is filled, convert it to JSON:

```bash
node tools/csv-to-json.js --schema schema/extended --outdir schema/extended/data filled-templates/*.csv
```

The converter:

1. Infers the type name from the CSV filename (product-version.csv maps to Product Version)
2. Detects and skips the display-name and type-hint header rows
3. Coerces values to the correct types (dates validated, booleans normalized, multi-refs split)
4. Writes JSON in the correct format (flat or nested, matching existing files)
5. Skips rows without a Name value

Use `--dry-run` to validate the conversion without writing files:

```bash
node tools/csv-to-json.js --schema schema/extended --dry-run filled-templates/server.csv
```

Use `--strict` to treat unknown columns as errors instead of warnings:

```bash
node tools/csv-to-json.js --schema schema/extended --strict filled-templates/server.csv
```

## When CSV Is Better Than Direct JSON Editing

Use CSV when:

Non-technical stakeholders are entering data. A spreadsheet is more accessible than a JSON file.

You are entering bulk data. Spreadsheets are faster for entering 50 records than editing JSON by hand.

You need review before import. Share the filled CSV for review, then convert once approved.

You are migrating from another system. Export from the old system as CSV, map columns to the template, and convert.

Use JSON when:

You are making a small change (one or two records).

You are scripting data generation.

You need precise control over the output format.

## End-to-End CSV Checklist

1. Run `generate-templates.js` to create CSV (or XLSX) templates
2. Distribute templates to team members
3. Team members fill data in a spreadsheet and save as CSV (UTF-8)
4. Run `csv-to-json.js` to convert CSVs to JSON (use `--dry-run` first)
5. Run `validate.js` to check data integrity
6. Import JSON using your adapter


# Reference Value Consistency

## Exact Name Matching

Reference fields in data files must contain the exact Name value of the referenced record. If the Application Status lookup has a value named "Active," then the data file must use "Active," not "active," "ACTIVE," or "Active " (with trailing space).

The import script resolves references by querying for records where Name matches exactly. A mismatch means the reference will not resolve, and the record will import with a broken or empty reference.

## Case Sensitivity

Name matching is case-sensitive in the data files. "Current" and "current" are different values. Always check the exact spelling and capitalization in the referenced type's data file.

A common pattern: lookup type data files define values with Title Case ("Active," "Current," "Deprecated"). CI data files reference those values. If someone types "active" in a CI data file, validation catches it as a reference error.

## Common Mistakes

Referencing a value that does not exist. The data file says `"versionStatus": "Released"` but the Version Status lookup only has "Current," "Beta," "Previous," "Deprecated," and "Retired." Validation catches this.

Referencing a record from the wrong type. The data file says `"owner": "Engineering Department"` for a field that references Team, but "Engineering Department" is an Organization, not a Team. Validation catches this because it checks the referenced type.

Trailing spaces. `"Active "` (with a trailing space) does not match `"Active"`. This is invisible in most editors but causes reference failures. Use a linter or validation to catch it.

Semicolon mistakes in multi-references. Multi-reference values use semicolons as separators: `"CR Core;CR Auth Module"`. Using commas or spaces instead will treat the entire string as a single reference value, which will not match any record.


# Adding, Updating, and Removing CI Records

## Adding: Append to the Array

To add a new record, append a JSON object to the data file's array. For flat format files, add to the top-level array. For nested format files, add to the array under the type name key.

Every record must have a `Name` field. This is the unique identifier. Do not duplicate Names within a type.

## Updating: Find by Name and Modify Attributes

To update a record, find it by Name and change the attribute values. The import script uses Name as the match key: if a record with that Name already exists in the target database, it updates the existing record rather than creating a duplicate.

## Removing: Delete the Object, Check References First

To remove a record, delete it from the data file. But first, check whether any other records reference it. If a Product Version references a Product Component that you are removing, the version's component list will have a broken reference after the component is deleted.

Use validation to check: remove the record, run `node tools/validate.js`, and check for reference errors. If validation reports errors, fix the referencing records before importing.

## Never Include Key or id Fields

Data files must not contain `Key` or `id` fields. The target database assigns these automatically during import. Including them causes conflicts or errors.

```json
{
  "Name": "OvocoCRM 2.4.0",
  "versionNumber": "2.4.0"
}
```

Not:

```json
{
  "Key": "CMDB-42",
  "id": 12345,
  "Name": "OvocoCRM 2.4.0",
  "versionNumber": "2.4.0"
}
```


# Bulk Data Operations

## Using CSV Workflow for Large Batches

When you need to add dozens or hundreds of records (initial data load, migration from another system, quarterly site registration batch), the CSV workflow is more efficient:

1. Generate templates for the types you need
2. Fill the templates (manually or by scripting from a source system export)
3. Convert to JSON
4. Validate
5. Import

This workflow handles the type coercion, format detection, and header skipping automatically. You focus on getting the data right in the spreadsheet.

## Scripting JSON Transformations

For automated data pipelines, write scripts that generate JSON data files directly. The format is simple: an array of objects with camelCase keys matching schema-attributes.json.

Common scripting scenarios:

Exporting from another database and transforming to CMDB-Kit format.

Generating test data for development environments.

Synchronizing CI data from a monitoring tool or cloud provider API.

The key rule: the output must pass `node tools/validate.js`. If your script generates data that fails validation, the import will have problems.


# Documentation Quality Standards

## Completeness Audit Methodology

Periodically audit the data files for completeness:

Are all types that should have data populated? An empty data file for a type that should have records indicates a gap.

Do all records have values for required fields? A Deployment Site with no `productVersion` or no `siteStatus` is incomplete.

Are all reference fields populated? A Product Version with no `components` list cannot be meaningfully baselined.

Run gap detection queries (described in the System Integration Patterns chapter) to find records with missing references.

## Document Type Requirements by Product

Each product should have a defined set of document types that must exist for each release. For OvocoCRM:

| Document Type | Required Per Release |
|--------------|---------------------|
| Software Design Description | Yes |
| Version Description | Yes |
| Release Notes | Yes |
| Installation Guide | Yes |
| User Manual | Yes, updated if features change |
| Test Report | Yes |

Query the Documentation Suite CI for a given version and verify all required document types are present.

## Archive and Obsolescence Procedures

When a CI is no longer active (a version is retired, a site is decommissioned, a vendor contract is terminated), do not delete the record from the data file. Instead, update its status to the terminal state (Retired, Decommissioned, Terminated). The record remains as a historical artifact.

Only delete records that were created in error. Legitimate CIs that have completed their lifecycle should be preserved for audit purposes.


# Validation Before Every Import

## Always Run tools/validate.js Before Importing

This is the single most important data quality practice. Before every import to the target database, run:

```bash
node tools/validate.js --schema schema/extended
```

Validation checks nine categories of errors and warnings: schema structure integrity, attribute definitions, LOAD_PRIORITY completeness, data file existence, reference resolution, undefined fields, null values, boolean format, and date format.

Fix all errors before importing. Errors indicate problems that will cause import failures or data quality issues in the target database.

Review all warnings. Warnings indicate potential issues that may or may not be problems depending on your context. A warning about a missing data file is expected if you have not created data for that type yet. A warning about an unknown field suggests a typo or a schema mismatch.

## Fix All Errors Before Running the Import Script

The import script does not perform the same level of validation as validate.js. It will attempt to import records with broken references, missing fields, and format errors. The result is a target database with incomplete or incorrect data.

The validation-then-import sequence is the quality gate:

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

The post-import validation (`validate-import.js`) connects to the live JSM instance and compares field-by-field against local data. It catches records that failed silently during import, fields that did not map correctly, and reference values that did not resolve in the target database.
