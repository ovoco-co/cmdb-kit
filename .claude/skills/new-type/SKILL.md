---
name: new-type
description: Add a new CI or lookup type to a CMDB-Kit schema
disable-model-invocation: true
argument-hint: [type-name, e.g. "SCCM Site"]
---

Add a new type to a CMDB-Kit schema. Ask the user which schema directory if not obvious from context.

## Steps

1. **Ask for details** (if not already provided):
   - Type name (title case, e.g. "SCCM Site")
   - Parent container in schema-structure.json
   - Description (under 70 characters)
   - Attributes with types (0 = text, 1 = reference) and reference targets
   - Whether it's a CI type or lookup type

2. **schema-structure.json**: Add the type entry under its parent. Preserve existing formatting.

3. **schema-attributes.json**: Add the attribute block. Follow existing patterns:
   - `"type": 0` for text/date fields
   - `"type": 1, "referenceType": "Target Type"` for references
   - `"defaultTypeId": 4` for date fields
   - `"defaultTypeId": 1` for integer fields
   - `"max": -1` for multi-references

4. **LOAD_PRIORITY** in `tools/lib/constants.js`: Add the type in the correct position respecting dependency order. Lookups before CIs. Types before types that reference them.

5. **Data file**: Create `schema/[path]/data/[kebab-case-name].json` with example records. Use the existing data files as format reference. Lookup types get Name and description. CI types get Name plus all defined attributes with realistic example values matching the OvocoCRM demo scenario.

6. **Validate**: Run `node tools/validate.js --schema [path]` and fix any errors.

## Naming conventions

- Type names: Title Case ("SCCM Site", "Product Version")
- Data file names: kebab-case ("sccm-site.json", "product-version.json")
- Attribute names: camelCase ("siteCode", "productType")
- Descriptions: under 70 characters, no period at end
