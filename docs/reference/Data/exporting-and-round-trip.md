# Exporting and Round-Trip Workflow

The round-trip workflow pulls live data from a target database, generates editable spreadsheets, and pushes changes back. Use it when you need to update CMDB data in bulk using Excel rather than editing JSON by hand.


# Exporting From a Live Database

Each adapter has its own export tool. The commands below show both JSM and ServiceNow. Pick the one for your platform.

## Pulling Current State to Local JSON

The export tool fetches every record from the target database and writes it to local JSON files:

```bash
# JSM Assets
node adapters/jsm/export.js --overwrite

# ServiceNow
node adapters/servicenow/export.js --overwrite
```

This overwrites the JSON files in your `data/` directory with what is currently in the live database. Every object type in LOAD_PRIORITY is exported. After exporting, your local JSON files are an exact mirror of the live state.

To export a single type:

```bash
node adapters/jsm/export.js --overwrite --type "Server"
node adapters/servicenow/export.js --overwrite --type "Server"
```

## Exporting to a Separate Directory

To export without overwriting your working data files, use `--outdir`:

```bash
mkdir -p /tmp/sn-export && chmod 755 /tmp/sn-export
node adapters/servicenow/export.js --outdir /tmp/sn-export

mkdir -p /tmp/jsm-export && chmod 755 /tmp/jsm-export
node adapters/jsm/export.js --outdir /tmp/jsm-export
```

This writes to the specified directory instead of your `data/` files. You can then compare, review, or merge selectively.

You can also use the `DATA_DIR` environment variable to redirect the default output:

```bash
DATA_DIR=/tmp/sn-export node adapters/servicenow/export.js --overwrite
```

## Previewing Changes With Diff

Before overwriting local files, preview what changed in the database since your last export:

```bash
node adapters/jsm/export.js --diff
node adapters/servicenow/export.js --diff
```

Diff mode compares JSM's current state against local data files and reports added, removed, and changed records per type. This is useful for detecting manual changes someone made directly in the database UI.

# The Round-Trip Workflow

The full round-trip takes live data through a spreadsheet editing cycle and back:

## Export

Pull current state from the database to local JSON:

```bash
node adapters/jsm/export.js --overwrite
```

## Generate Templates

Create spreadsheet templates pre-populated with exported data:

```bash
node tools/generate-templates.js --schema schema/core --examples --format xlsx
```

The `--examples` flag pulls sample rows from the JSON files you just exported, so the templates contain your live data. Templates go to `csv-templates/` by default.

For specific types only:

```bash
node tools/generate-templates.js --schema schema/core --examples "Server" "Database"
```

## Edit in a Spreadsheet

Open the XLSX or CSV files in your spreadsheet application. Each template has three header rows (camelCase keys, display names, type hints). Enter or modify data starting from row 4.

Do not rename, reorder, or delete columns. Do not edit the header rows. When saving, use CSV UTF-8 format.

## Convert Back to JSON

Convert edited spreadsheets to JSON data files:

```bash
# Dry run first to check for problems
node tools/csv-to-json.js --schema schema/core --dry-run csv-templates/*.csv

# If clean, convert for real
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
```

## Validate

Check data integrity before pushing back:

```bash
node tools/validate.js --schema schema/core
```

Fix all errors before proceeding. Common issues: reference to a Name that does not exist, trailing spaces in reference values, date format errors, duplicate Names.

## Sync to Database

Push the updated data back:

```bash
node adapters/jsm/import.js sync
```

Sync mode creates new records and updates existing ones (matched by Name). To sync specific types:

```bash
node adapters/jsm/import.js sync --type "Server"
```

## Verify

Run post-import validation to confirm the database matches your local files:

```bash
node adapters/jsm/validate-import.js
```


# Quick Reference

The full round-trip in six commands:

```bash
node adapters/jsm/export.js --overwrite
node tools/generate-templates.js --schema schema/core --examples --format xlsx
# ... edit spreadsheets ...
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
node tools/validate.js --schema schema/core
node adapters/jsm/import.js sync
node adapters/jsm/validate-import.js
```


# When to Use This Workflow

Bulk updates. Changing dozens of records is faster in a spreadsheet than in JSON files.

Team collaboration. Distribute templates to non-technical stakeholders, collect filled sheets, convert, and import.

Data migration. Export from JSM, transform in Excel, re-import to a different schema or instance.

Periodic review. Export, review data in Excel for completeness, fix gaps, re-import.

Always export before generating templates. Stale JSON files produce stale templates. Use `--diff` before `--overwrite` to see what changed. Use `--dry-run` on csv-to-json before writing files, especially with large batches. Keep your csv-templates directory gitignored since templates are generated artifacts, not source files.
