# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

CMDB-Kit is an open-source, database-agnostic CMDB starter kit. It provides ITIL-aligned schema patterns, example data (fictional SaaS CRM called "OvocoCRM"), and pluggable database adapters.

## Architecture

Three layers: schema defines shape, data files contain records, adapters push both to a target database.

```
Target DB UI  <->  Schema Layer (structure + attributes JSON)  <->  Data Layer (JSON files)
```

## Key Files

| File | Purpose |
|------|---------|
| `schema/core/schema-structure.json` | Core object type hierarchy |
| `schema/core/schema-attributes.json` | Core field definitions per type |
| `schema/domains/*/schema-structure.json` | Domain type definitions (opt-in) |
| `schema/domains/*/schema-attributes.json` | Domain field definitions |
| `schema/extended/` | Legacy: all domains combined |
| `schema/enterprise/` | Legacy: portfolio mode with product-prefixed types |
| `tools/lib/constants.js` | LOAD_PRIORITY (import order) |
| `adapters/jsm/import.js` | JSM Assets import orchestrator |

## Commands

### Validation

```bash
node tools/validate.js --schema schema/core                    # Validate core schema
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure  # Core + domain
node tools/validate.js --schema schema/extended                # Validate extended (legacy)
node tools/validate.js --schema schema/enterprise              # Validate enterprise (legacy)
```

### CSV Workflow

```bash
# Generate templates
node tools/generate-templates.js --schema schema/core --examples

# Convert filled CSVs to JSON
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
```

### JSM Adapter

```bash
# Copy and edit .env file (or export variables)
cp .env.example .env

# Schema sync (run first)
node adapters/jsm/import.js schema

# Data sync (create + update existing)
node adapters/jsm/import.js sync

# Create only (skip existing records)
node adapters/jsm/import.js create

# Data only (skip schema/attribute sync)
node adapters/jsm/import.js data

# Export from JSM
node adapters/jsm/export.js

# Post-import validation
node adapters/jsm/validate-import.js
```

## Critical Rules

### LOAD_PRIORITY

The `LOAD_PRIORITY` array in `tools/lib/constants.js` controls which types get imported and in what order. Every importable type must be listed, and dependencies must come before dependents.

### Schema-to-Data Alignment

- `schema-attributes.json` attribute names are camelCase
- Data files use the same camelCase keys
- The import script converts camelCase to Title Case for display
- References use exact `Name` matching (case-sensitive)

### JSON Data Format

- Never include `Key` or `id` fields
- Lookup files: `[{ "Name": "Value", "description": "Explanation" }]`
- CI data files: array of objects with camelCase field names
- Some types use nested format: `{ "TypeName": [...] }`

## Naming Conventions

| Thing | Convention | Example |
|-------|------------|---------|
| Object type | Title Case | `Product Version` |
| JSON data file | kebab-case | `product-version.json` |
| Attribute (schema) | camelCase | `versionNumber` |
| Attribute (display) | Title Case | `Version Number` |

## Attribute Type Reference

```json
{ "type": 0 }                                              // Text
{ "type": 0, "defaultTypeId": 4 }                          // Date (YYYY-MM-DD)
{ "type": 0, "defaultTypeId": 1 }                          // Integer
{ "type": 0, "defaultTypeId": 2 }                          // Boolean
{ "type": 1, "referenceType": "Type Name" }                // Single reference
{ "type": 1, "referenceType": "Type Name", "max": -1 }    // Multiple references
```

## Adding New Types

1. Add to `schema-structure.json` (under appropriate parent)
2. Add attributes to `schema-attributes.json`
3. Add to `LOAD_PRIORITY` in `tools/lib/constants.js` (respect dependency order)
4. Create data JSON file in `data/` (kebab-case name)
5. Run validation: `node tools/validate.js --schema <dir>`

## Schema Hierarchy

Root has four major branches (base/extended) or seven (enterprise):
- **Product CMDB** - Infrastructure CIs (applications, servers, databases, components)
- **Product Library** - Release management (versions, documents, deployments, baselines, requirements)
- **Enterprise Architecture** - Services, capabilities, business processes (enterprise only)
- **Configuration Library** - Controlled software artifacts (enterprise only)
- **Financial** - Contracts and cost attribution (enterprise only)
- **Directory** - People and organizations (orgs, teams, persons, locations)
- **Lookup Types** - Reference data (statuses, enumerations, categories)

## Debugging Checklist

1. Is the type in LOAD_PRIORITY?
2. Does the JSON file name match the type name convention?
3. Are all referenced objects imported first? (Check LOAD_PRIORITY order)
4. Do field names in JSON match schema-attributes.json? (camelCase)

## Documentation Formatting Rules

- No em dashes (use hyphen or comma instead)
- No ampersands as "and" (proper acronyms are fine)
- No horizontal rules
- No numbered sections, just use header levels
- No tables of contents
- No bold in table cells
- Use "section" not "chapter" when referring to parts of the documentation

## Git Workflow

- Main branch: `main`
- Commit schema changes separately from data changes
