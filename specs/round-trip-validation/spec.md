# Round-Trip Validation

**Feature Branch**: round-trip-validation
**Created**: 2026-03-28
**Status**: Not Started
**Input**: Existing tools (validate, csv-to-json, generate-templates, import, export, drift), JSM Cloud instance, ServiceNow PDI

## User Scenarios and Testing

### P1: User completes the full CSV-to-platform workflow without data loss

**Why this priority**: This is how a real user works. Individual tools tested in isolation don't prove the full workflow is reliable. If any step breaks the data, the whole workflow is unreliable.

**Independent Test**: Generate CSV templates, edit them, convert back to JSON, validate, import to platform, export, and compare.

**Acceptance Scenarios**:

- Given CSV templates are generated from Core schema with example data
  When CSVs are converted back to JSON and validated
  Then record Names match, field values match, and no data is lost
  And boolean fields survive (true/false not "true"/"false" strings)
  And date fields survive (YYYY-MM-DD format preserved)
  And multi-reference fields survive (semicolons preserved)

- Given data is imported to JSM Cloud
  When the same data is exported from JSM Cloud
  Then exported data matches imported data (record counts, field values, references)

- Given data is imported to ServiceNow PDI
  When the same data is exported from ServiceNow PDI
  Then exported data matches imported data

### P2: Cross-platform round-trip preserves data integrity

**Why this priority**: Users may move data between platforms. Cross-platform fidelity is a differentiator.

**Independent Test**: Export from JSM, import to ServiceNow, export from ServiceNow, compare.

**Acceptance Scenarios**:

- Given data is exported from JSM Cloud
  When that exported data is imported to ServiceNow PDI and then exported again
  Then the JSM export and ServiceNow export contain the same data
  And platform-specific field name differences don't corrupt data

### P3: New user gets a working CMDB on first try

**Why this priority**: The clean install experience defines first impressions.

**Independent Test**: Import Core to a fresh JSM Assets schema, run validation, run drift detection.

**Acceptance Scenarios**:

- Given a new JSM Assets schema with no existing data
  When schema and data are imported following the documented workflow
  Then all types pass validation on first try
  And drift detection shows no drift

## Edge Cases

- Boolean fields stored as strings after CSV round-trip
- Date format transformations (YYYY-MM-DD to DD/Mon/YY and back)
- Multi-reference field ordering differences between platforms
- Case sensitivity in Name matching across platforms
- Nested format types (Person, Organization, Team) during CSV conversion
- Empty optional fields stored as empty strings instead of being omitted
- Phantom records created during import
- Attribute name case mismatches (Cpu vs CPU) during fresh import

## Requirements

### Functional Requirements

- FR-001: CSV round-trip (generate templates, convert back to JSON) preserves all data types without loss
- FR-002: JSM Cloud import-export round-trip preserves all records and field values
- FR-003: ServiceNow PDI import-export round-trip preserves all records and field values
- FR-004: Cross-platform round-trip (JSM to ServiceNow) preserves data integrity
- FR-005: Fresh instance import creates all types, attributes, and data on first try
- FR-006: Domain data survives the same round-trip as Core data

### Key Entities

- CSV templates (generated from schema)
- JSON data files (source of truth)
- Platform deployment records (JSM Assets, ServiceNow CMDB)
- Drift report (comparison output)

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

- SC-001: All 6 tests pass without manual intervention
- SC-002: Data survives every transformation step without loss or corruption
- SC-003: A new user can follow the documented workflow and get a working CMDB on first try
- SC-004: Boolean, date, and multi-reference fields are preserved through every round-trip path

## Assumptions

- JSM Cloud instance (ovoco.atlassian.net) is accessible for testing
- ServiceNow PDI (dev210250) is accessible for testing
- All tools (validate, csv-to-json, generate-templates, import, export, drift) are functional
- 26/26 Core types currently pass JSM validation as a known good baseline
