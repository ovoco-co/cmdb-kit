# JSON Schema Validation

**Status**: Not Started
**Priority**: Low (developer experience improvement)
**Created**: 2026-03-28

## The Idea

Use JSON Schema (https://json-schema.org/) to formally define the structure of:
- schema-structure.json (type hierarchy)
- schema-attributes.json (field definitions)
- Data files (per-type record format)
- overlay.json (adapter configuration)

## What It Would Give Us

- Editors (VS Code) would autocomplete and validate as you type
- validate.js could use a standard library instead of custom checks
- Domain authors would get instant feedback on malformed schema files
- CI could validate contributions automatically
- Documentation could be generated from the schema definitions

## What It Would Cost

- Time to write the JSON Schema definitions for each file format
- A dependency on a JSON Schema validator library (ajv is the standard)
- Maintaining the JSON Schema definitions alongside the actual schema files

## Questions

- Is the custom validate.js sufficient for our needs?
- Would JSON Schema replace validate.js or supplement it?
- Do we want a build-time dependency (ajv) or keep the zero-dependency tooling?

## Decision

Defer until there are external contributors who need schema validation guidance. Current validate.js handles all our checks. JSON Schema adds value when multiple people are creating domains or data files independently.
