JSM Assets Adapter

Adapter for Jira Service Management (JSM) Assets, also known as Insight. Provides bidirectional schema and data synchronization between local JSON files and a live JSM instance.

## Prerequisites

- JSM with Assets/Insight enabled (JSM 5.x Data Center or Cloud with Assets)
- Admin credentials with Assets access
- Node.js 18+ (or use Docker)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| JSM_URL | Yes | http://localhost:8080 | JSM instance URL (no trailing slash) |
| JSM_USER | Yes | | Admin username |
| JSM_PASSWORD | Yes | | Admin password |
| SCHEMA_KEY | No | CMDB | Object schema key in JSM |
| DATA_DIR | No | schema/base/data | Path to data JSON files |
| SCHEMA_DIR | No | parent of DATA_DIR | Path to schema-structure.json and schema-attributes.json |
| DEBUG | No | false | Set to 'true' for HTTP debug logging |

## Scripts

### Schema Sync

Push local schema-structure.json and schema-attributes.json to JSM. Run this first when changing types or attributes.

```bash
node adapters/jsm/import.js schema
```

### Data Import

```bash
# Create new + update existing (default)
node adapters/jsm/import.js sync

# Create only (skip existing)
node adapters/jsm/import.js create

# Update only (skip missing)
node adapters/jsm/import.js update

# Import a single type
node adapters/jsm/import.js sync --type "Application"

# Dry run
node adapters/jsm/import.js --dry-run
```

### Export

Pull live data from JSM into local JSON files.

```bash
# Export all types
node adapters/jsm/export.js

# Export a single type
node adapters/jsm/export.js --type "Application"

# Compare JSM vs local files
node adapters/jsm/export.js --diff

# Overwrite local files with JSM data
node adapters/jsm/export.js --overwrite
```

### Validate Import

Compare local data files field-by-field against live JSM data.

```bash
# Full validation
node adapters/jsm/validate-import.js

# Spot-check one type
node adapters/jsm/validate-import.js --type "Application"

# Quick count check
node adapters/jsm/validate-import.js --skip-fields --summary-only
```

### Check Schema

Compare local schema definitions against live JSM without making changes.

```bash
# Full schema check
node adapters/jsm/check-schema.js

# Check a single type
node adapters/jsm/check-schema.js --type "Application"
```

## Docker Usage

Run any script via Docker without installing Node.js locally:

```bash
# Schema sync
docker run --rm --network your_network \
  -v "$(pwd)":/app -w /app \
  -e JSM_URL=http://jira:8080 \
  -e JSM_USER=admin \
  -e JSM_PASSWORD=password \
  -e SCHEMA_KEY=CMDB \
  node:20-alpine node adapters/jsm/import.js schema

# Data sync
docker run --rm --network your_network \
  -v "$(pwd)":/app -w /app \
  -e JSM_URL=http://jira:8080 \
  -e JSM_USER=admin \
  -e JSM_PASSWORD=password \
  -e SCHEMA_KEY=CMDB \
  node:20-alpine node adapters/jsm/import.js sync

# Export with diff
docker run --rm --network your_network \
  -v "$(pwd)":/app -w /app \
  -e JSM_URL=http://jira:8080 \
  -e JSM_USER=admin \
  -e JSM_PASSWORD=password \
  -e SCHEMA_KEY=CMDB \
  node:20-alpine node adapters/jsm/export.js --diff
```

## API Path

The adapter uses `/rest/insight/1.0` as the API base path, which works for both JSM Data Center (5.x) and older Insight standalone installations. This is configured in `lib/api-client.js`.

## File Layout

```
adapters/jsm/
  import.js             Main import script (schema + data)
  export.js             Export JSM data to local JSON
  validate-import.js    Post-import field-by-field validation
  check-schema.js       Schema alignment checker (read-only)
  lib/
    index.js            Adapter library entry point
    config.js           Configuration loader (env vars, paths)
    api-client.js       HTTP client with retry and auth
```
