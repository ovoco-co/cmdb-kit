# Editing Data

Two workflows for creating and maintaining CI data: direct JSON editing for developers and small changes, and the spreadsheet workflow for bulk operations and non-technical contributors.


# JSON Editing

## Adding Records

To add a new record, open the data file and append a JSON object to the array. For a new Product Version, open `product-version.json` and add:

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

Every record must have a `Name` field. Do not duplicate Names within a type.

## Updating Records

Find the record by Name and change the attribute values. The import script uses Name as the match key: if a record with that Name already exists in the target database, it updates the existing record.

## Removing Records

Delete the record from the data file, but check references first. If a Product Version references a Product Component you are removing, the version's component list will have a broken reference. Remove the record, run validation, and fix any reference errors before importing.

## JSON Syntax Pitfalls

JSON is strict about syntax. The most common mistakes:

Trailing commas. JSON does not allow a comma after the last item in an array or object. `["a", "b",]` is invalid.

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

After every edit, run validation:

```bash
node tools/validate.js --schema schema/extended
```


# Spreadsheet Workflow

## Generating Templates

The `generate-templates.js` tool creates blank templates that match the schema:

```bash
node tools/generate-templates.js --schema schema/extended
```

This generates one CSV file per importable type in the `csv-templates/` directory. Each template has three header rows:

Row 1: camelCase attribute names (the machine-readable keys that match schema-attributes.json).

Row 2: Title Case display names (human-readable labels).

Row 3: Type hints (Text, Date YYYY-MM-DD, Boolean, Integer, Ref to Product Status, Multi-Ref to Team with semicolons).

## Template Structure

Template columns are generated directly from `schema-attributes.json`. Every attribute for a type becomes a column. The Name column is always first. Reference columns include a type hint showing which type the value should reference.

Do not rename columns or add custom columns. The `csv-to-json` tool relies on the column headers to map values to the correct attributes.

## Including Example Data

The `--examples` flag pulls the first record from existing data files as a sample row:

```bash
node tools/generate-templates.js --schema schema/extended --examples
```

## XLSX Output

For Excel workbooks with formatting (requires the exceljs package):

```bash
node tools/generate-templates.js --schema schema/extended --format xlsx
```

XLSX output creates one worksheet per type with frozen header rows, color-coded headers (dark blue for camelCase keys, light blue for display names, gray for type hints), auto-sized column widths, and dropdown validation for reference fields.

## Filtering by Type, Family, or Role

Generate templates for a subset of types:

```bash
# Only lookup types
node tools/generate-templates.js --schema schema/extended --family lookups

# Only types relevant to a CM analyst
node tools/generate-templates.js --schema schema/extended --role cm-analyst

# Specific types
node tools/generate-templates.js --schema schema/extended "Product Version" "Deployment Site"
```

## Filling Data in a Spreadsheet

Open the CSV or XLSX template in a spreadsheet application. Fill in data starting from row 4 (below the three header rows). Follow the type hints in row 3:

Text fields: enter plain text.

Date fields: use YYYY-MM-DD format (2025-07-01, not 07/01/2025 or July 1 2025).

Boolean fields: enter true or false (or yes/no, 1/0, y/n; the converter normalizes them).

Integer fields: enter whole numbers.

Reference fields: enter the exact Name of the referenced record. "Current" must match a value in Version Status. Case matters.

Multi-reference fields: enter multiple values separated by semicolons. "CR Core Platform;CR Authentication Module" references two Product Component records.

When saving from Excel as CSV, choose "CSV UTF-8" format. Files saved with other encodings may contain invisible characters that cause validation failures.

## Converting Back to JSON

When the templates are filled, convert to JSON:

```bash
node tools/csv-to-json.js --schema schema/extended --outdir schema/extended/data filled-templates/*.csv
```

The converter:

- Infers the type name from the CSV filename (product-version.csv maps to Product Version)
- Detects and skips the display-name and type-hint header rows
- Coerces values to the correct types (dates validated, booleans normalized, multi-refs split)
- Writes JSON in the correct format (flat or nested, matching existing files)
- Skips rows without a Name value

Use `--dry-run` to validate the conversion without writing files:

```bash
node tools/csv-to-json.js --schema schema/extended --dry-run filled-templates/server.csv
```

Use `--strict` to treat unknown columns as errors instead of warnings:

```bash
node tools/csv-to-json.js --schema schema/extended --strict filled-templates/server.csv
```

## When to Use Each Workflow

Use the spreadsheet workflow when non-technical stakeholders are entering data, when you are entering bulk data (dozens or hundreds of records), when you need review before import (share the filled CSV for approval), or when migrating from another system (export as CSV, map columns, convert).

Use JSON editing when making a small change (one or two records), when scripting data generation, or when you need precise control over the output format.

## CSV Checklist

1. Run `generate-templates.js` to create CSV or XLSX templates
2. Distribute templates to team members
3. Team members fill data in a spreadsheet and save as CSV (UTF-8)
4. Run `csv-to-json.js` to convert CSVs to JSON (use `--dry-run` first)
5. Run `validate.js` to check data integrity
6. Import JSON using your adapter
