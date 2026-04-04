---
name: schema-conventions
description: CMDB-Kit schema file conventions, naming patterns, and attribute type codes. Use when creating or modifying schema files, data files, or types.
user-invocable: false
---

## File conventions

- **schema-structure.json**: Array of objects with `name`, optional `parent`, and `description` (under 70 chars, no period).
- **schema-attributes.json**: Object keyed by type name. Each value is an object of attributes.
- **Data files**: Array of objects in `data/` directory. Filename is kebab-case of type name. Every record has a `Name` field (capital N).
- **Nested types**: Organization, Team, Person, Location, Facility, Vendor use `{ "TypeName": [...] }` format in their data files.
- **relationships.json**: Array of `{ "source", "target", "type" }` objects.

## Naming

- Type names: Title Case ("Product Version", "SCCM Site")
- Attribute names: camelCase ("siteCode", "productType", "parentSite")
- Data file names: kebab-case ("product-version.json", "sccm-site.json")
- Container types: no data file, just structural grouping in schema-structure.json

## Attribute type codes

- `"type": 0` — text (default)
- `"type": 0, "defaultTypeId": 1` — integer
- `"type": 0, "defaultTypeId": 2` — boolean
- `"type": 0, "defaultTypeId": 4` — date (YYYY-MM-DD format in data)
- `"type": 1, "referenceType": "Target"` — single reference
- `"type": 1, "referenceType": "Target", "max": -1` — multi-reference (list)

## LOAD_PRIORITY in tools/lib/constants.js

Controls import order. Rules:
1. Lookups before CIs that reference them
2. Types before types that reference them
3. Self-referencing types can appear anywhere after their lookups
4. Types not in the list get loaded after all listed types, alphabetically

## Data file values

- Reference fields: use the Name value of the target record (exact string match)
- Dates: YYYY-MM-DD
- Booleans: "true" or "false" (strings)
- Integers: string representation ("42")
- Multi-references: not used in data files (populated by relationships.json or platform-side)

## Domain extensions

- Live in `schema/domains/[name]/`
- Own schema-structure.json, schema-attributes.json, data/, README.md
- Can reference types from parent schema (Core) — those references won't validate standalone
- Container types use domain-specific names (e.g. "SCCM Infrastructure", "SCCM Lookup Types")
