# Schema Changes and Version Control

The CMDB schema is not static. New types are added as processes mature. New attributes are added as reporting needs evolve. Lookup values are updated as the organization's vocabulary changes. Managing these changes through version control ensures that every schema modification is tracked, reversible, and promotable across environments.


# Git Workflow for Schema Changes

## Separate Schema Commits From Data Commits

CMDB-Kit enforces a strict separation: schema changes and data changes go in separate commits. A commit that adds a new type to schema-structure.json and schema-attributes.json should not also add records to a data file. A commit that adds new lookup values to a data file should not also modify the schema structure.

This separation serves two purposes:

Reviewability. A schema change commit is reviewed for structural correctness: does the type hierarchy make sense, are the attributes well-defined, are the reference types valid? A data change commit is reviewed for content correctness: are the values accurate, are references consistent, are naming conventions followed? Mixing both in one commit makes review harder.

Reversibility. If a data change introduces incorrect values, reverting it does not accidentally undo a schema change. If a schema change breaks the import, reverting it does not lose new data records.

In practice:

```bash
# Commit 1: schema change
git add schema/extended/schema-structure.json schema/extended/schema-attributes.json tools/lib/constants.js
git commit -m "Add Personnel Certification type to extended schema"

# Commit 2: data for the new type
git add schema/extended/data/personnel-certification-type.json schema/extended/data/personnel-certification-status.json schema/extended/data/personnel-certification.json
git commit -m "Add initial personnel certification data"
```

## Commit Message Conventions

Commit messages should describe what changed and why. For schema changes:

"Add Assessment type to extended schema" - new type.

"Add expirationDate attribute to License type" - new attribute.

"Remove deprecated hardwareSerial attribute from Server type" - attribute removal.

"Add Suspended value to Site Status lookup" - lookup value addition.

For data changes:

"Add OvocoCRM 2.4.0 product version data" - new records.

"Update Acme Corp deployment sites to version 2.4.0" - record updates.

"Fix reference typo in deployment-site.json (Curent to Current)" - data correction.


# Adding New Types

The five-step process for adding a new type. Each step builds on the previous one.

## Step 1: Add to schema-structure.json

Add the type definition to the schema structure file. Specify the name, parent branch, and description:

```json
{ "name": "Personnel Certification", "parent": "Directory", "description": "Professional certifications held by personnel" }
```

Place the entry logically: near related types (after Person if it is a personnel type, after Application if it is an infrastructure type).

## Step 2: Add Attributes to schema-attributes.json

Define the type's attributes. Each attribute needs a name (the key), a type code, and optionally a reference type or format specifier:

```json
"Personnel Certification": {
  "person": { "type": 1, "referenceType": "Person" },
  "certificationType": { "type": 1, "referenceType": "Personnel Certification Type" },
  "certificationStatus": { "type": 1, "referenceType": "Personnel Certification Status" },
  "issuedDate": { "type": 0, "defaultTypeId": 4 },
  "expirationDate": { "type": 0, "defaultTypeId": 4 },
  "issuingBody": { "type": 0 },
  "certificationNumber": { "type": 0 }
}
```

Type codes: 0 for text (with optional defaultTypeId for date, integer, or boolean), 1 for reference (single or multi with max: -1).

Verify that all referenced types exist in the schema. If `Personnel Certification Type` does not exist yet, add it first (it is a dependency).

## Step 3: Add to LOAD_PRIORITY

Open `tools/lib/constants.js` and add the type to the LOAD_PRIORITY array. Position it after all types it references:

Personnel Certification references Person, Personnel Certification Type, and Personnel Certification Status. All three must appear earlier in the array.

If you are also adding the lookup types, add them in the lookup section at the top of the array, then add the CI type in the appropriate section.

## Step 4: Create Data JSON File

Create the data file in the `data/` directory. The filename is the kebab-case version of the type name: `personnel-certification.json`.

If you have data:

```json
[
  {
    "Name": "Alex Chen CISSP",
    "person": "Alex Chen",
    "certificationType": "CISSP",
    "certificationStatus": "Active",
    "issuedDate": "2023-06-15",
    "expirationDate": "2026-06-15",
    "issuingBody": "ISC2",
    "certificationNumber": "654321"
  }
]
```

If you do not have data yet:

```json
[]
```

Also create data files for any new lookup types:

```json
[
  { "Name": "CISSP", "description": "Certified Information Systems Security Professional" },
  { "Name": "PMP", "description": "Project Management Professional" },
  { "Name": "ITIL", "description": "ITIL Foundation or higher" }
]
```

## Step 5: Run Validation

```bash
node tools/validate.js --schema schema/extended
```

If you are working with the enterprise schema, validate against that tier instead:

```bash
node tools/validate.js --schema schema/enterprise
```

Validation should report zero errors. Common issues at this stage:

Reference type not found: a referenced type does not exist in the schema (check schema-structure.json).

Type not in LOAD_PRIORITY: the new type needs to be added to the array.

Missing data file: the kebab-case data file does not exist yet.

## Worked Example: Adding a Problem Type

The extended schema does not include a Problem type (problems are tracked as issues, not CIs). If your organization wants to track problems as persistent CI records:

Step 1: Add to schema-structure.json:

```json
{ "name": "Problem", "parent": "Product Library", "description": "Root cause analysis records" }
```

Step 2: Add attributes to schema-attributes.json:

```json
"Problem": {
  "description": { "type": 0 },
  "status": { "type": 1, "referenceType": "Assessment Status" },
  "affectedApplication": { "type": 1, "referenceType": "Application" },
  "rootCause": { "type": 0 },
  "identifiedDate": { "type": 0, "defaultTypeId": 4 },
  "resolvedDate": { "type": 0, "defaultTypeId": 4 },
  "identifiedBy": { "type": 1, "referenceType": "Person" }
}
```

This reuses Assessment Status (Planned, In Progress, Complete, Remediation) rather than creating a new lookup. If the status values do not fit, create a Problem Status lookup instead.

Step 3: Add to LOAD_PRIORITY after Application and Person (both are dependencies):

```js
'Problem',  // after Application, Person, and Assessment Status
```

Step 4: Create `schema/extended/data/problem.json`:

```json
[]
```

Step 5: Run validation. Zero errors expected.


# Modifying Existing Types

## Adding New Attributes

Adding an attribute to an existing type is the most common schema change. Open schema-attributes.json, find the type, and add the new attribute:

```json
"Application": {
  "description": { "type": 0 },
  "appStatus": { "type": 1, "referenceType": "Application Status" },
  "owner": { "type": 1, "referenceType": "Team" },
  "repository": { "type": 0 }
}
```

The new `repository` attribute is a text field. Existing records do not need to be updated immediately. Records without the new field simply have an empty value for that attribute.

After adding the attribute, re-run validation and re-import the schema to the target database:

```bash
node tools/validate.js --schema schema/extended
node adapters/jsm/import.js schema
```

The schema import creates the new attribute in the target database. Existing records are not affected.

## Removing Attributes

Removing an attribute is a more sensitive change. Any data files that use the attribute will have unknown field warnings after the schema change.

Step 1: Remove the attribute definition from schema-attributes.json.

Step 2: Remove the attribute's values from all data files that use it. Run validation to find files that still reference the removed attribute (they will produce "unknown field" warnings).

Step 3: Re-import the schema. The attribute remains in the target database (most CMDB platforms do not auto-delete attributes), but it will no longer be populated by future imports.

## Changing Attribute Types

Changing an attribute from text to reference (or vice versa) requires careful handling:

1. Remove the old attribute definition
2. Add the new attribute definition with the desired type
3. Update all data files to use values compatible with the new type
4. Validate and re-import

If changing a text field to a reference field, ensure that a lookup type exists with the values currently in the text field. If the text field contains "Active," "Inactive," and "Pending," create a lookup type with those three values before changing the attribute type.


# Promoting Changes Across Environments

## Development to Staging to Production

If your organization runs multiple environments (development, staging, production), schema changes flow through them in order:

1. Make the change in the development schema directory
2. Validate and import to the development database
3. Verify the change works correctly
4. Copy the change to the staging schema directory (or use the same directory with environment-specific import targets)
5. Import to staging, verify
6. Promote to production

The git repository is the mechanism for promoting changes. A branch or tag marks the state that each environment runs.

## Using Git Branches or Tags

A simple branching strategy:

`main` branch contains the production-ready schema. Production imports from `main`.

Feature branches contain in-progress schema changes. Development imports from the feature branch.

Tags mark specific schema versions: `schema-v1.0`, `schema-v1.1`. Staging imports from the latest tag.

This gives you rollback capability: if a schema change causes problems in staging, switch back to the previous tag.

## Re-running the Import After Schema Changes

After a schema change, re-import the schema to the target database:

```bash
node adapters/jsm/import.js schema
```

This creates new types and attributes in the target database without affecting existing data. It does not remove types or attributes that were deleted from the schema files (most CMDB platforms do not support destructive schema operations through APIs).

After the schema import, re-import the data if the schema change affects data format:

```bash
node adapters/jsm/import.js sync
```


# Rollback Strategy

## Git Revert for Schema Changes

If a schema change causes problems, revert the commit:

```bash
git revert <commit-hash>
```

This creates a new commit that undoes the change, preserving the history. Then re-import the schema and data.

Note that reverting a schema change in the repository does not automatically revert the change in the target database. You must re-import the schema after the revert. And if the change added a type or attribute that was then populated with data, reverting the schema does not remove that data from the target database. Manual cleanup may be required.

## Keeping the Previous Import State

Before a potentially risky schema change, export the current state of the target database:

```bash
node adapters/jsm/export.js
```

This saves the current data to the `objects-export/` directory. If the schema change causes problems and you need to restore the previous state, you have a snapshot to work from.

## Export Before Import as a Safety Net

The safest workflow for schema changes:

1. Export current state: `node adapters/jsm/export.js`
2. Make schema changes in the repository
3. Validate: `node tools/validate.js --schema schema/extended`
4. Import schema: `node adapters/jsm/import.js schema`
5. Import data: `node adapters/jsm/import.js sync`
6. Post-import validation: `node adapters/jsm/validate-import.js`

If step 6 reveals problems, you have the export from step 1 as a reference for what the correct state should be. In the worst case, you can restore from the export by overwriting the data files and re-importing.
