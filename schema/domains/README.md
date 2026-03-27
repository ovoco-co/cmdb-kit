# Domain Extensions

Domain extensions are opt-in schema modules for specialized use cases. They add CI types and lookup types that layer on top of a base schema tier (base, extended, or enterprise) without modifying it.

Each domain has its own schema-structure.json, schema-attributes.json, and data/ directory following the same conventions as the core schema tiers.

## Available Domains

| Domain | Extends | Description |
|--------|---------|-------------|
| [sccm](sccm/) | extended | SCCM infrastructure modeling and security assessment tracking |

## How to Use

A domain's types reference types from its parent schema. Load the parent schema first, then add the domain's types and data on top.

Standalone validation of a domain will report errors for cross-schema references (e.g., SCCM Finding references Assessment from extended). This is expected. The references resolve when the domain is loaded on top of its parent schema.

For platform import, run the parent schema import first, then import the domain's data:

```bash
# Import extended schema, then SCCM domain data
SCHEMA_DIR=schema/extended DATA_DIR=schema/extended/data node adapters/jsm/import.js sync
DATA_DIR=schema/domains/sccm/data node adapters/jsm/import.js sync
```

## Creating a Domain

1. Create a directory under `schema/domains/` with your domain name
2. Add schema-structure.json with your types (use a container type as the root)
3. Add schema-attributes.json with attribute definitions
4. Create data/ with example records
5. Add a README.md documenting prerequisites and types
