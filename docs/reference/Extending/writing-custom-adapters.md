# Writing Custom Adapters

Adapters connect CMDB-Kit schemas to specific CMDB platforms. This guide describes the adapter interface and how to build a new one.

# Adapter Structure

Each adapter lives in `adapters/<name>/` and provides these scripts:

```
adapters/<name>/
├── README.md            # Platform-specific setup guide
├── import.js            # Push schema + data to the target
├── export.js            # Pull data from the target to local JSON
├── validate-import.js   # Post-import comparison
├── check-schema.js      # Schema alignment check (optional)
└── lib/
    ├── api-client.js    # Platform API client
    ├── config.js        # Environment variable loader
    └── index.js         # Barrel export
```

# Required Scripts

## import.js

The core adapter script. Must support these modes:

| Mode | Behavior |
|------|----------|
| schema | Create/sync object types and attributes |
| sync | Create new records and update existing |
| create | Create new records only, skip existing |
| update | Update existing records only |

CLI interface:

```bash
node adapters/<name>/import.js [mode] [options]
  --type <name>   Import only this type
  --dry-run       Preview without changes
  --help          Show help
```

The import script reads schema files and data files, then uses the platform API to create/update types and records.

## export.js

Pulls live data from the target platform and writes local JSON files.

```bash
node adapters/<name>/export.js [options]
  --type <name>   Export only this type
  --outdir <dir>  Output directory
  --diff          Compare instead of export
  --overwrite     Write to data directory
```

## validate-import.js

Compares local JSON against live data for post-import verification.

```bash
node adapters/<name>/validate-import.js [options]
  --type <name>      Validate only this type
  --skip-fields      Count records only
  --summary-only     Summary table only
```

# Using Shared Libraries

Adapters should use the shared tools library for file loading, attribute name mapping, and constants:

```javascript
// In your adapter's lib/index.js
const { loadConfig } = require('./config');
const { createApiClient } = require('./api-client');
const toolsLib = require('../../../tools/lib');

module.exports = {
  loadConfig,
  createApiClient,
  ...toolsLib,
};
```

This gives your adapter access to:

| Export | Purpose |
|--------|---------|
| loadJsonFile(path) | Load and parse a JSON file |
| loadDataFile(dir, file, type) | Load data with format detection |
| mapAttrName(key) | Convert camelCase to Title Case |
| LOAD_PRIORITY | Import order array |
| PERSONNEL_TYPES | Types bundled in person.json |
| NESTED_TYPES | Types using nested JSON format |
| C | ANSI color codes |

# Configuration Pattern

Adapters load configuration from environment variables:

```javascript
function loadConfig(options = {}) {
  const config = {
    // Platform connection
    url: process.env.PLATFORM_URL || 'http://localhost:8080',
    user: process.env.PLATFORM_USER || '',
    password: process.env.PLATFORM_PASSWORD || '',

    // Schema location
    dataDir: process.env.DATA_DIR || 'schema/core/data',
    schemaDir: process.env.SCHEMA_DIR || 'schema/core',
    schemaKey: process.env.SCHEMA_KEY || 'CMDB',

    // Schema files
    structureFile: 'schema-structure.json',
    attrFile: 'schema-attributes.json',
  };

  return config;
}
```

# Data File Resolution

The shared `loadDataFile` function handles multiple wrapper formats:

- Plain array: `[{ "Name": "..." }]`
- Nested object: `{ "TypeName": [{ "Name": "..." }] }`
- Single-key wrapper: `{ "anyKey": [...] }`

File names are resolved by convention: type "Product Version" maps to `product-version.json`.

# Import Order

The LOAD_PRIORITY array in `tools/lib/constants.js` defines the import order. Lookup types come first (no dependencies), then entity types that reference them. Your adapter must respect this order to avoid broken references.

# CMDB Instance API vs Table API (ServiceNow)

ServiceNow exposes two APIs for writing records. Which one you use depends on whether the target table is a CI class or a supporting table.

**Table API** (`/api/now/table/{tablename}`) works for non-CI types: core_company, cmn_location, custom standalone tables (u_cmdbk_person, u_cmdbk_product_version, etc.), and lookup tables. You control create-vs-update logic yourself by querying first and then choosing POST or PATCH.

**CMDB Instance API** (`/api/now/cmdb/instance/{classname}`) is the correct endpoint for CI classes. It routes records through the Identification and Reconciliation Engine (IRE), which handles deduplication automatically. If a CI with the same identifying attributes already exists, IRE updates it instead of creating a duplicate.

The single-CI payload format:

```json
{
  "source": "ServiceNow",
  "attributes": {
    "name": "web-prod-01",
    "ip_address": "10.0.1.50",
    "os": "Ubuntu 22.04"
  }
}
```

POST this to `/api/now/cmdb/instance/{classname}` where `{classname}` is the table name (e.g., `cmdb_ci_server`).

For IRE to match incoming records against existing CIs, the target class needs an identification rule. OOTB ServiceNow classes (cmdb_ci_server, cmdb_ci_db_instance) already have rules. Tier 2 custom CI classes (u_cmdbk_product, u_cmdbk_database, u_cmdbk_virtual_machine, u_cmdbk_product_component, u_cmdbk_feature, u_cmdbk_assessment) need independent identification rules created via cmdb_identifier and cmdb_identifier_entry, matching by name.

In the ServiceNow adapter, the `cmdbApi` flag in class-map.js controls routing. When `cmdbApi: true`, the import script sends records through the CMDB Instance API. When false or absent, it uses the Table API.

# Reference Resolution

When importing a record with a reference field (e.g., `"environment": "Production"`), the adapter must:

1. Look up the referenced type's ID in the target system
2. Search for a record with that Name in the referenced type
3. Use the target system's internal ID for the reference value

The JSM adapter does this via IQL queries. Other platforms may use different search mechanisms.

# Error Handling

Adapters should:

- Continue processing after individual record errors
- Track error counts and report them in the summary
- Exit with non-zero status if any errors occurred
- Provide clear error messages for connection failures

# Example: Minimal Adapter

Here is a skeleton for a new adapter:

```javascript
#!/usr/bin/env node
const { loadJsonFile, loadDataFile, mapAttrName, LOAD_PRIORITY, C } = require('../../../tools/lib');

async function main() {
  const schemaDir = process.env.SCHEMA_DIR || 'schema/core';
  const dataDir = process.env.DATA_DIR || 'schema/core/data';

  // Load schema
  const structure = loadJsonFile(`${schemaDir}/schema-structure.json`);
  const attributes = loadJsonFile(`${schemaDir}/schema-attributes.json`);

  // Connect to your platform
  const client = createPlatformClient(/* ... */);

  // Create types
  for (const type of structure) {
    await client.createType(type.name, type.parent, type.description);
  }

  // Create attributes
  for (const [typeName, attrs] of Object.entries(attributes)) {
    for (const [key, def] of Object.entries(attrs)) {
      await client.createAttribute(typeName, mapAttrName(key), def);
    }
  }

  // Import data in dependency order
  for (const typeName of LOAD_PRIORITY) {
    const safeName = typeName.toLowerCase().replace(/ /g, '-');
    const data = loadDataFile(dataDir, `${safeName}.json`, typeName);
    if (data.length === 0) continue;

    for (const record of data) {
      await client.upsertRecord(typeName, record);
    }
  }
}

main().catch(console.error);
```
