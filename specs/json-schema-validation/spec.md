# JSON Schema Validation

**Feature Branch**: json-schema-validation
**Created**: 2026-03-28
**Status**: Not Started
**Input**: Existing validate.js tool, VS Code JSON Schema support, 4 cmdb-kit file formats

## User Scenarios and Testing

### P1: Developer gets autocomplete and inline validation when editing schema files

**Why this priority**: Developer experience improvement. Catching format errors before running validate.js saves time and reduces errors.

**Independent Test**: Open schema-structure.json in VS Code, type a new entry, verify autocomplete suggests name/parent/description fields.

**Acceptance Scenarios**:

- Given a developer opens schema-structure.json in VS Code with the JSON Schema configured
  When they start typing a new object type entry
  Then autocomplete suggests name, parent, and description fields

- Given a developer opens schema-attributes.json in VS Code
  When they start typing a new attribute definition
  Then autocomplete suggests type, referenceType, defaultTypeId, and max fields

- Given a developer adds a malformed entry (wrong type, missing required field)
  When VS Code processes the file
  Then an inline error (red squiggle) appears before running validate.js

### P2: Developer understands what JSON Schema catches vs what validate.js catches

**Why this priority**: Clear boundaries prevent confusion about which tool to use when.

**Independent Test**: Review documentation section explaining the separation.

**Acceptance Scenarios**:

- Given a developer reads the extending.md documentation
  When they look for validation guidance
  Then the doc explains that JSON Schema catches format errors and validate.js catches logic errors (cross-file references, dependency order, domain collisions)

## Edge Cases

- Developer has VS Code settings that conflict with the json.schemas configuration
- Schema files are opened outside VS Code (JSON Schema only helps in VS Code)
- Data files with nested format (e.g., Person, Organization) need different schema handling
- Multi-reference values with semicolons may be hard to express in JSON Schema
- Empty optional fields should be omitted, not stored as empty strings

## Requirements

### Functional Requirements

- FR-001: Define JSON Schema for schema-structure.json (array of objects with name, parent, description)
- FR-002: Define JSON Schema for schema-attributes.json (object of type-to-attribute mappings)
- FR-003: Define JSON Schema for data files (array of objects with Name required, camelCase keys)
- FR-004: Configure VS Code settings (json.schemas) to map each schema to its glob pattern
- FR-005: Document the JSON Schema files in extending.md with explanation of what they catch vs validate.js

### Key Entities

- schema-structure.json: array of objects with name (required, string), parent (optional, string), description (required, string, max 70 chars)
- schema-attributes.json: object where keys are type names, values are attribute definitions with type (0 or 1), referenceType, defaultTypeId, max
- Data files: array of objects with Name required, camelCase string keys, values as strings/dates/booleans/semicolon-separated multi-refs
- overlay.json: platform-specific, lower priority, not included in this spec

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

- SC-001: Editing schema-structure.json in VS Code shows autocomplete for name, parent, description
- SC-002: Editing schema-attributes.json shows autocomplete for type, referenceType, defaultTypeId, max
- SC-003: Adding a malformed entry shows an inline error before running validate.js

## Assumptions

- Developers use VS Code as their primary editor
- VS Code JSON Schema support is enabled by default (it is)
- Hand-written schemas are more accurate than auto-generated ones for this use case
- The zero-dependency constraint on validate.js means no ajv integration
