# Your Data

The example data that ships with CMDB-Kit describes a fictional SaaS CRM called OvocoCRM. It is there to demonstrate the schema and let you validate the import pipeline end to end. Once you have confirmed the pipeline works, replace it with your own data.

## Data File Format

Data lives in JSON files in the `data/` directory under each schema layer. There is one file per type. File names use kebab-case: `product-version.json`, `deployment-site.json`, `component-type.json`.

Attribute keys inside the JSON are camelCase, matching the attribute names defined in `schema-attributes.json`. For example, a Product Version record uses `versionNumber`, `releaseDate`, and `releaseNotes` as field names.

Every record has a `Name` field. This is the primary identifier used for matching and references. When one type references another, it uses the exact Name value. If a Deployment Site record has `"product": "CRM Core"`, there must be a Product record whose Name is exactly "CRM Core". References are case-sensitive.

Multi-value references use semicolons as separators. A Product Version that includes several components lists them as a single string:

```json
"components": "Contact Manager;Deal Pipeline;Email Integration;REST API;Webhook Service;Report Generator"
```

Dates use YYYY-MM-DD format: `"releaseDate": "2026-02-10"`. Booleans use `true` and `false` (literal values, not strings). Never include `Key` or `id` fields in data files. The adapter generates identifiers on the target platform automatically.

Most data files are flat arrays of objects:

```json
[
  { "Name": "CRM Core", "description": "Primary CRM application", "status": "Active" },
  { "Name": "API Gateway", "description": "Central API gateway", "status": "Active" }
]
```

Some types use a nested format where the array is wrapped in an object keyed by the type name:

```json
{
  "Person": [
    { "Name": "Alex Chen", "firstName": "Alex", "lastName": "Chen", "email": "alex.chen@ovoco.dev" }
  ]
}
```

The types that use nested format are Person, Organization, Team, Location, Facility, and Vendor. All other types use the flat array format.

## Populate in Order

Types must be imported in dependency order. A Deployment Site record references Product, Product Version, Organization, Person, and Team. All of those types must exist in the target instance before Deployment Site records can be created, or the references will fail to resolve.

The canonical import order is defined by `LOAD_PRIORITY` in `tools/lib/constants.js`. For Core, the order is:

Lookup types come first. These are the reference data types that have no dependencies of their own: Product Status, Version Status, Deployment Status, Environment Type, Document Type, Document State, Component Type, Priority, Organization Type, Deployment Role, Site Status, Baseline Type, and Baseline Status.

Directory types come next: Organization, then Person, then Team. Person comes before Team because Team records reference a Person as the team lead.

CI types follow: Product, Server, Database, Product Component, Product Version, Document, and Deployment. Each of these may reference lookup types, directory types, or earlier CI types.

Types with the most dependencies come last: Feature (references Product, Product Version, Version Status, and Team), Deployment Site (references Product, Product Version, Organization, Environment Type, Site Status, Person, and Team), and Baseline (references Baseline Type, Baseline Status, Product, Product Version, Person, Product Component, and Document).

You do not need to manage this order yourself. The import scripts read LOAD_PRIORITY and process types in the correct sequence automatically. But if you are building a custom adapter or importing manually, follow this order.

## Replace Example Data

There are two approaches to replacing example data with your own.

### Edit JSON directly

Open each data file in the `data/` directory and replace the OvocoCRM records with your own. Keep the same field names and format. For example, to replace the Product data, edit `product.json` and swap out the six example products for your own applications and services. Make sure every Name value you reference in other files matches exactly.

### Use the CSV workflow

Generate CSV templates with example rows to use as a starting point:

```bash
node tools/generate-templates.js --schema schema/core --examples
```

This creates one CSV file per type in the `csv-templates/` directory. Each file has a header row matching the schema attributes and one or more example rows showing the expected format. Open the CSV files in Excel, Google Sheets, or any spreadsheet editor. Delete the example rows and fill in your own data.

When you are done, convert the CSV files back to JSON:

```bash
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
```

This overwrites the existing JSON data files with your new records. The CSV-to-JSON converter handles the camelCase conversion and multi-reference semicolon format automatically.

## Validate Before Importing

Always run local validation after editing data files and before importing to a live instance:

```bash
node tools/validate.js --schema schema/core
```

The validator checks:

- All references resolve. If a Deployment Site references `"product": "CRM Core"` but no Product record has that Name, the validator reports the broken reference.
- All field names match the schema. If a data file uses `productName` but the schema defines `product`, the validator catches the mismatch.
- Dates are formatted correctly as YYYY-MM-DD.
- No null or undefined values exist where the schema expects data.

Fix any reported errors before running the import. Importing with broken references creates records that have empty reference fields, which defeats the purpose of the CMDB.

If you are working with domains in addition to Core, validate them together:

```bash
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
```

This runs the same checks across both the Core types and the domain types, including cross-schema references. A domain type that references a Core type (for example, a Virtual Machine referencing a Server) will be validated against the Core data files.

## Round-Trip Workflow

Once your CMDB is live, you may want to make changes locally and push them back, or export the current state from the instance to keep your local files in sync.

Export the current state from a live instance:

```bash
node adapters/jsm/export.js
```

Or for ServiceNow:

```bash
node adapters/servicenow/export.js
```

Edit the exported JSON files locally. Add new records, update field values, or remove records that are no longer relevant.

Validate the changes:

```bash
node tools/validate.js --schema schema/core
```

Push the changes back to the live instance:

```bash
node adapters/jsm/import.js sync
```

The sync mode compares local data to what exists in the instance. It creates new records, updates changed records, and leaves unchanged records alone. It does not delete records that exist in the instance but not in the local files, so removing a record from your JSON does not delete it from the CMDB. Deleting records must be done directly in the target platform.

This round-trip workflow lets you treat the local JSON files as a version-controlled source of truth while still allowing manual edits in the target platform between syncs.

Because the data files are plain JSON, they work well with standard version control. Commit your data files to Git alongside the schema, and you have a full audit trail of every change to your CMDB content. When multiple team members are editing data, each person can work in their own branch and merge changes through pull requests, just like application code.
