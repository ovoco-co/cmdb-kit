# Extending CMDB-Kit

## Architecture

CMDB-Kit has three layers. Each is self-contained and can be modified independently.

### Schema Layer

JSON files that define structure. `schema-structure.json` declares the type hierarchy: each entry has a name, an optional parent, and a description. Types with no parent are container types (Product CMDB, Product Library, Directory, Lookup Types). Types with a parent appear as children in the hierarchy tree.

`schema-attributes.json` defines fields per type. Each attribute has a name (camelCase), a data type, and optionally a reference target. These files contain no platform-specific concepts. They describe what the data looks like, not where it lives.

Attribute types use a numeric encoding:

- `{ "type": 0 }` is a text field
- `{ "type": 0, "defaultTypeId": 4 }` is a date field (YYYY-MM-DD format)
- `{ "type": 0, "defaultTypeId": 1 }` is an integer field
- `{ "type": 0, "defaultTypeId": 2 }` is a boolean field
- `{ "type": 1, "referenceType": "Type Name" }` is a single reference
- `{ "type": 1, "referenceType": "Type Name", "max": -1 }` is a multi-reference

### Data Layer

JSON files containing example records. One file per type, kebab-case filename, camelCase field keys. A file named `product-version.json` contains records for the Product Version type.

References use exact Name matching. If a Product Version record has `"status": "Released"`, the import script looks up a Version Status record whose Name is "Released". This means reference data (lookup types) must be imported before the types that reference them.

Data files can be replaced without touching the schema. You can swap in your own organization's data, keeping the same schema structure, and the adapters will import it without modification.

Two JSON formats are used. Most types use a flat array: `[{ "Name": "...", "field": "value" }]`. Directory types (Organization, Team, Person, Location, Facility, Vendor) use a nested format: `{ "TypeName": [...] }`. The import scripts handle both formats.

### Adapter Layer

Scripts that push schema and data to a specific platform. Each adapter has an `overlay.json` that maps platform-agnostic schema concepts to platform-specific tables, columns, and field types.

The JSM adapter's overlay maps types to object types with icons, workspace IDs, and cardinality settings. It translates schema attribute types to JSM attribute types and handles reference resolution through JSM's object type reference system.

The ServiceNow adapter's overlay maps types to custom tables with column names, reference targets, and value transforms. It translates schema attribute types to ServiceNow column types and resolves references through sys_id lookups.

No layer depends on another layer's internals. You can swap adapters without touching schema. You can replace data without touching schema or adapters. You can restructure the schema without touching data files, as long as attribute names stay consistent.

## How Core Plus Domains Works

The validator loads Core schema files first, then overlays domain files on top. Domain `schema-structure.json` entries are added to the Core type tree. Domain `schema-attributes.json` entries are merged into the Core attribute definitions. Domain data files are loaded alongside Core data files.

Domain types reference Core container types as parents (Product CMDB, Product Library, Directory, Lookup Types). This means domain types appear as siblings of Core types in the hierarchy, not in a separate branch. A Hardware Model from the Infrastructure domain sits next to Product and Server under Product CMDB.

The rule: Core never references domain types. If you remove a domain, Core still validates and imports cleanly. Domain types can reference Core types freely. A Virtual Machine references Core's Server. An Assessment references Core's Person. These one-directional references mean domains depend on Core, but Core is independent.

Domains can reference other domains when explicitly declared. If a future domain needs types from both Infrastructure and Compliance, it declares both as dependencies, and the validator checks that all three are loaded together.

## Creating a New Domain

Create a directory under `schema/domains/` with the following structure:

```
schema/domains/your-domain/
  schema-structure.json    # domain types only
  schema-attributes.json   # domain attributes only
  data/                    # domain example data
  README.md                # who it's for, what it answers
```

In `schema-structure.json`, each type must reference a Core container as its parent. Do not create new container types. Domain types slot into the existing hierarchy.

```json
[
  { "name": "Your Type", "parent": "Product CMDB", "description": "What it tracks" },
  { "name": "Your Status", "parent": "Lookup Types", "description": "Status values for Your Type" }
]
```

In `schema-attributes.json`, define attributes for each type. Reference types can point to Core types or other types within the same domain.

```json
{
  "Your Type": {
    "description": { "type": 0 },
    "product": { "type": 1, "referenceType": "Product" },
    "status": { "type": 1, "referenceType": "Your Status" },
    "effectiveDate": { "type": 0, "defaultTypeId": 4 }
  },
  "Your Status": {
    "description": { "type": 0 }
  }
}
```

Add data files in `data/` using kebab-case filenames. Each file is an array of records with camelCase field keys matching the attribute names in `schema-attributes.json`.

```json
[
  { "Name": "Example Record", "description": "What this record represents", "product": "OvocoCRM", "status": "Active" }
]
```

Add the new types to `LOAD_PRIORITY` in `tools/lib/constants.js`. Place lookup types in the lookup section and CI types after the base CI types. Dependencies must come before dependents in the array.

Validate the domain against Core:

```bash
node tools/validate.js --schema schema/core --domain schema/domains/your-domain
```

The validator confirms that all parent references resolve to Core containers, all attribute reference targets exist in either Core or the domain, and all data file references resolve to records that exist in the combined dataset.

## Writing an Adapter

Each adapter implements four scripts:

- `import.js`: push schema and data to the platform
- `export.js`: pull current state from the platform to local JSON
- `validate-import.js`: compare local data against live platform data
- `check-schema.js`: verify connection and schema existence

The adapter reads schema files and data files as input. It maps type names and attribute names to platform-specific concepts using `overlay.json`. It resolves references by looking up records by Name in dependency order (LOAD_PRIORITY).

### Overlay Structure

The overlay file maps each CMDB-Kit type to its platform representation. For JSM, this means an object type with an icon and workspace. For ServiceNow, this means a custom table with a prefix and label.

```json
{
  "Product": {
    "objectTypeName": "Product",
    "iconId": "12345",
    "attributes": {
      "description": { "name": "Description" },
      "owner": { "name": "Owner", "referenceObjectTypeName": "Team" }
    }
  }
}
```

The overlay handles name translation (camelCase to platform display names), type mapping (schema type codes to platform field types), and reference resolution (type names to platform-specific object type IDs or table names).

### Import Modes

Adapters support multiple import modes to handle different workflows:

- `schema`: create types and attributes only, no data records
- `data`: create data records only, assume schema already exists
- `sync`: create and update both schema and data
- `create`: create new records, skip records that already exist
- `update`: update existing records, skip records that do not exist

The mode is passed as a command-line argument: `node adapters/your-adapter/import.js sync`.

### Reference Resolution

References are resolved during import by looking up the target record's Name in the platform. The import processes types in LOAD_PRIORITY order, so by the time a type is imported, all its reference targets already exist in the platform.

For multi-reference fields (those with `"max": -1` in the schema), the adapter splits the value into individual Names, resolves each one, and stores the list of platform IDs.

## Standards Alignment

For teams that need to justify the approach against industry standards, here is how CMDB-Kit maps to common frameworks.

### ITIL 4 SACM

Product maps to Configuration Item. Product Version maps to CI version, capturing the release lifecycle. Deployment Site maps to CI location context, tracking where a CI is installed and at what version. Baseline maps to configuration baseline, the approved state at a point in time. The schema's separation of Product (what it is) from Product Version (what was released) from Deployment (where it went) follows the SACM principle of tracking CIs through their lifecycle rather than treating them as static inventory entries.

### EIA-649C

Core implements configuration identification through Product and Product Component types, giving each item a unique identity and decomposition. Configuration status accounting is handled by Product Version status tracking and Deployment Site version records, answering "what version is where" at any point. Configuration verification is supported by the Baseline type, which captures approved component and document sets for comparison against actual state. Configuration change management stays in Jira or ServiceNow, using the platform's native workflow engine rather than duplicating it in the CMDB schema.

### MIL-HDBK-61B

Baseline types (Design, Build, Release) map to functional, allocated, and product baselines as defined in the handbook. The Product to Product Component hierarchy maps to product decomposition, tracking how a system breaks down into manageable configuration items. The Distribution domain implements media control with checksums and chain of custody through Distribution Log records, supporting the handbook's media distribution requirements.

### ISO/IEC 20000

Core supports service configuration management requirements by tracking configuration items (Products), their relationships (companion products, component decomposition), versions (Product Version with approval workflow), and deployment status (Deployment and Deployment Site). The Licensing domain's SLA type adds service level tracking. The schema provides the data foundation that ISO 20000 requires for configuration management, while leaving process execution to the platform's workflow tools.
