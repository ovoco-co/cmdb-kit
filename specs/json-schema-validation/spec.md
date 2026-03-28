# JSON Schema Validation

**Status**: Not Started
**Priority**: Medium (developer experience)
**Created**: 2026-03-28

## What

Define JSON Schema files for each of our 4 file formats. Wire them into VS Code for editor autocomplete and inline validation. Supplements validate.js, does not replace it.

## File Formats to Define

### schema-structure.json
Array of objects with:
- name (required, string)
- parent (optional, string, must reference another name in the array)
- description (required, string, max 70 chars)

### schema-attributes.json
Object where keys are type names, values are objects where keys are attribute names and values are:
- type: 0 (text/date/int/bool) or 1 (reference)
- referenceType (required when type=1, string matching a type name)
- defaultTypeId: 0 (text), 1 (integer), 2 (boolean), 4 (date) - only when type=0
- max: -1 for multi-reference - only when type=1

### Data files
Array of objects (or nested { TypeName: [...] } for directory types) where:
- Name (required, string)
- All other keys must be camelCase strings
- Values: strings, dates (YYYY-MM-DD), booleans (true/false), or semicolon-separated multi-refs
- No null values, no Key/id fields

### overlay.json (JSM and ServiceNow)
Platform-specific. Each has different structure. Lower priority.

## What JSON Schema Gives Us (that validate.js doesn't)

- VS Code autocomplete when editing schema files
- Instant red squiggles for malformed entries (wrong type, missing required field)
- Tooltip descriptions on hover
- Schema documentation via json-schema.org tooling

## What validate.js Still Handles (that JSON Schema can't)

- Cross-file reference validation (Person name exists in person.json)
- LOAD_PRIORITY dependency order
- Domain collision warnings
- Data record counts and completeness
- Platform-specific checks

## Plan

### Phase 1: Write schema definitions
- schemas/json-schema/schema-structure.schema.json
- schemas/json-schema/schema-attributes.schema.json
- schemas/json-schema/data-file.schema.json

### Phase 2: VS Code integration
- .vscode/settings.json with json.schemas mapping
- Each schema file maps to its glob pattern (e.g., schema-structure.schema.json maps to **/schema-structure.json)

### Phase 3: Documentation
- Add a section to the extending.md doc explaining the JSON Schema files
- Note that JSON Schema catches format errors, validate.js catches logic errors

## What This Does NOT Include

- No ajv dependency in validate.js (keep it zero-dependency)
- No CI integration (VS Code only for now)
- No overlay.json schemas (complex, lower value)
- No auto-generation of schemas from existing files (hand-written for accuracy)

## Dependencies

None. Additive improvement.

## Success Criteria

- Editing schema-structure.json in VS Code shows autocomplete for name, parent, description
- Editing schema-attributes.json shows autocomplete for type, referenceType, defaultTypeId, max
- Adding a malformed entry shows an inline error before running validate.js
