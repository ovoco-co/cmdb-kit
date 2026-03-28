# Round-Trip Validation

**Status**: Not Started
**Priority**: High (proves the full workflow works end-to-end)
**Created**: 2026-03-28

## The Problem

Individual tools have been tested in isolation (validate, import, export, drift). The full round-trip workflow has never been tested end-to-end:

1. Generate CSV templates from schema
2. Edit CSVs (add/modify data)
3. Convert CSVs back to JSON
4. Validate the JSON
5. Import to a live platform
6. Export from the live platform
7. Validate that exported data matches what was imported
8. Import the exported data to a DIFFERENT schema/instance
9. Validate the second instance matches

This is how a real user works. If any step breaks the data, the whole workflow is unreliable.

## Test Plan

### Test 1: CSV round-trip (offline, no platform)

1. Generate CSV templates with examples: `node tools/generate-templates.js --schema schema/core --examples --outdir /tmp/csv-rt`
2. Verify CSVs have correct headers and example data
3. Convert CSVs back to JSON: `node tools/csv-to-json.js --schema schema/core --outdir /tmp/json-rt /tmp/csv-rt/*.csv`
4. Validate the JSON: `node tools/validate.js --schema schema/core` (using the converted data dir)
5. Compare converted JSON against original schema/core/data/ files
6. Verify: record Names match, field values match, no data loss

**What to check specifically:**
- Boolean fields survive CSV round-trip (true/false not "true"/"false" strings)
- Date fields survive (YYYY-MM-DD format preserved)
- Multi-reference fields survive (semicolons preserved)
- Nested format types (Person, Organization, Team) convert correctly
- Empty optional fields are omitted (not stored as empty strings)
- Name field is always present
- No extra fields added by CSV conversion

### Test 2: CSV round-trip with domain data

1. Generate templates with domain: `node tools/generate-templates.js --schema schema/core --domain schema/domains/infrastructure --examples --outdir /tmp/csv-rt-dom`
2. Convert back to JSON with domain: `node tools/csv-to-json.js --schema schema/core --domain schema/domains/infrastructure --outdir /tmp/json-rt-dom /tmp/csv-rt-dom/*.csv`
3. Validate: `node tools/validate.js --schema schema/core --domain schema/domains/infrastructure`

### Test 3: JSM Cloud import-export round-trip

1. Start from known good state: schema/core/data/ files (already imported, 26/26 pass)
2. Export from JSM: `node adapters/jsm/export.js --outdir /tmp/jsm-export`
3. Validate exported data matches local: compare file by file
4. Modify one record locally (e.g., change a Product Version status)
5. Re-import the modified data: `node adapters/jsm/import.js data`
6. Export again: `node adapters/jsm/export.js --outdir /tmp/jsm-export-2`
7. Verify the modification appears in the second export
8. Run drift detection: `node tools/drift.js --platform jsm` - should show the modification as drift vs original

**What to check specifically:**
- Dates survive round-trip (YYYY-MM-DD -> DD/Mon/YY -> YYYY-MM-DD)
- Multi-references survive (semicolons, ordering)
- Reference values survive (Name matching, case sensitivity)
- Nested format types export correctly
- Record counts match import -> export
- No phantom records created or lost

### Test 4: ServiceNow import-export round-trip

1. Same as Test 3 but against the PDI
2. Additional checks: scoped table name resolution works for export
3. Tier 2 types (Feature) export with correct field values (two-pass import verification)
4. Tier 3 types (Product Version, Document) export with u_name correctly mapped

### Test 5: Cross-platform round-trip

1. Export from JSM Cloud
2. Import the exported data to ServiceNow PDI
3. Export from ServiceNow PDI
4. Compare JSM export vs ServiceNow export
5. Verify data integrity across platforms

**What to check specifically:**
- Platform-specific field name differences don't corrupt data
- Reference resolution works across platforms (same Name values)
- Date format differences are normalized

### Test 6: Fresh instance import

1. Take the schema/core/ directory as-is
2. Create a NEW JSM Assets schema (e.g., CORE2)
3. Run schema mode: `node adapters/jsm/import.js schema`
4. Run data mode: `node adapters/jsm/import.js data`
5. Run validate-import: all 26 types should pass on first try
6. Run drift detection: should show NO DRIFT

This tests the "clean install" experience that a new user would have.

**What to check specifically:**
- No leftover state from previous imports affects the new schema
- Attribute names are created correctly from attr-names.js (no Cpu/CPU mismatch)
- All reference types are created with correct reference type names
- All data populates on first import (no need for re-import)

## Dependencies

- JSM Cloud instance (ovoco.atlassian.net)
- ServiceNow PDI (dev210250)
- All tools working (validate, csv-to-json, generate-templates, import, export, drift)

## Success Criteria

- All 6 tests pass
- Data survives every transformation step without loss or corruption
- A new user can follow the documented workflow and get a working CMDB on first try
