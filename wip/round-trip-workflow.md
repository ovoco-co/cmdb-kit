# Round-Trip Workflow: Export, Edit in Excel, Re-Import

This workflow pulls live data from JSM, generates editable spreadsheets, and pushes changes back. Use it when you need to update CMDB data in bulk using Excel rather than editing JSON by hand.

## Prerequisites

- A working JSM connection (`.env` configured, schema already imported)
- Node.js 18+
- A spreadsheet application (Excel, Google Sheets, LibreOffice Calc)

## Step 1: Export Live Data to JSON

Pull the current state of your CMDB into local JSON files:

```bash
node adapters/jsm/export.js --overwrite
```

This overwrites the JSON files in your `data/` directory with what is currently in JSM. Every object type in LOAD_PRIORITY is exported.

To export a single type:

```bash
node adapters/jsm/export.js --overwrite --type "Server"
```

To preview what changed without overwriting, use `--diff` first:

```bash
node adapters/jsm/export.js --diff
```

After exporting, your local JSON files are an exact mirror of JSM.

## Step 2: Generate Spreadsheet Templates

Generate XLSX or CSV templates pre-populated with your exported data:

```bash
# XLSX workbook (one worksheet per type, with dropdowns and formatting)
node tools/generate-templates.js --schema schema/base --examples --format xlsx

# Or CSV (one file per type, no dependencies)
node tools/generate-templates.js --schema schema/base --examples
```

The `--examples` flag pulls sample rows from the JSON files you just exported, so the templates contain your live data.

Templates go to `csv-templates/` by default. Use `--outdir` to change:

```bash
node tools/generate-templates.js --schema schema/base --examples --format xlsx --outdir my-templates
```

To generate templates for specific types only:

```bash
node tools/generate-templates.js --schema schema/base --examples "Server" "Database"
```

## Step 3: Edit in Excel

Open the XLSX or CSV files in your spreadsheet application. Each template has three header rows:

- Row 1: camelCase attribute names (machine keys, do not edit)
- Row 2: Title Case display names (human-readable labels)
- Row 3: Type hints (Text, Date YYYY-MM-DD, Ref to Application Status, etc.)

Enter or modify data starting from row 4. Follow the type hints:

- Text: plain text
- Date: YYYY-MM-DD format (2025-07-01, not 07/01/2025)
- Boolean: true or false
- Integer: whole numbers
- Reference: exact Name of the referenced record (case-sensitive)
- Multi-reference: semicolon-separated Names ("CR Core Platform;CR Auth Module")

Do not rename, reorder, or delete columns. Do not edit the header rows.

When saving, use CSV UTF-8 format. If your spreadsheet application offers multiple CSV options, choose the one that says UTF-8.

## Step 4: Convert CSV Back to JSON

Convert the edited spreadsheets back to JSON data files:

```bash
# Dry run first to check for problems
node tools/csv-to-json.js --schema schema/base --dry-run csv-templates/*.csv

# If clean, convert for real
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
```

The converter infers the type name from the filename (server.csv becomes Server), skips the header rows, coerces values to correct types, and writes JSON in the format the import script expects.

## Step 5: Validate

Check data integrity before pushing to JSM:

```bash
node tools/validate.js --schema schema/base
```

Fix all errors before proceeding. Common issues:

- Reference to a Name that does not exist in the target type
- Trailing spaces in reference values
- Date format errors (use YYYY-MM-DD)
- Duplicate Names within a type

## Step 6: Sync Changes to JSM

Push the updated data back to JSM:

```bash
node adapters/jsm/import.js sync
```

The sync mode creates new records and updates existing ones (matched by Name). To import only specific types:

```bash
node adapters/jsm/import.js sync --type "Server"
```

## Step 7: Verify (Optional)

Run post-import validation to confirm JSM matches your local files:

```bash
node adapters/jsm/validate-import.js
```

This compares every field in every record between your local JSON and the live JSM data.

## Quick Reference

```bash
# Full round-trip in six commands
node adapters/jsm/export.js --overwrite
node tools/generate-templates.js --schema schema/base --examples --format xlsx
# ... edit spreadsheets ...
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
node tools/validate.js --schema schema/base
node adapters/jsm/import.js sync
node adapters/jsm/validate-import.js
```

## When to Use This Workflow

- Bulk updates: changing dozens of records is faster in a spreadsheet than in JSON
- Team collaboration: distribute templates to non-technical stakeholders, collect filled sheets, convert and import
- Data migration: export from JSM, transform in Excel, re-import to a different schema or instance
- Periodic review: export, review data in Excel for completeness, fix gaps, re-import

## Tips

- Always export before generating templates. Stale JSON files produce stale templates.
- Use `--diff` before `--overwrite` to see what changed in JSM since your last export.
- Use `--dry-run` on csv-to-json before writing files, especially with large batches.
- Keep your csv-templates directory gitignored. Templates are generated artifacts, not source files.
- For partial updates, generate templates for only the types you need rather than the entire schema.
