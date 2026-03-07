JSM Assets Adapter

Adapter for Jira Service Management (JSM) Assets, also known as Insight. Provides bidirectional schema and data synchronization between local JSON files and a live JSM instance. Supports both JSM Cloud and Data Center.

## Prerequisites

- JSM Cloud with Assets (Premium or Enterprise plan), or JSM Data Center 5.x with Assets/Insight
- Admin credentials with Assets access
- Node.js 18+ (or use Docker)

## Quick Start

```bash
# 1. Copy the example env file and fill in your values
cp .env.example .env

# 2. Validate the schema offline
node tools/validate.js --schema schema/base

# 3. Push schema to JSM
node adapters/jsm/import.js schema

# 4. Import data
node adapters/jsm/import.js sync
```

## Configuration

Set variables in a `.env` file at the project root, or export them in your shell. See `.env.example` for the full template.

### Cloud

```bash
JSM_URL=https://yoursite.atlassian.net
JSM_USER=you@example.com
JSM_PASSWORD=your-api-token          # from id.atlassian.com
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

Generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens

The adapter auto-detects Cloud from the `.atlassian.net` hostname and fetches the Assets workspace ID automatically. To skip auto-detection, set `JSM_WORKSPACE_ID` explicitly.

### Data Center

```bash
JSM_URL=http://your-jsm:8080
JSM_USER=admin
JSM_PASSWORD=password
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

### All Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| JSM_URL | Yes | http://localhost:8080 | Cloud site URL or DC server URL |
| JSM_USER | Yes | | Cloud: email address. DC: username |
| JSM_PASSWORD | Yes | | Cloud: API token. DC: password |
| SCHEMA_KEY | No | CMDB | Object schema key in JSM |
| SCHEMA_DIR | No | parent of DATA_DIR | Path to schema-structure.json and schema-attributes.json |
| DATA_DIR | No | schema/base/data | Path to data JSON files |
| JSM_WORKSPACE_ID | No | auto-detected | Cloud only: Assets workspace ID |
| CREATE_SCHEMA | No | false | Set to 'true' to create the schema if missing |
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

## Cloud vs Data Center

The adapter uses the same commands and data format for both platforms. The differences are handled automatically:

| Aspect | Cloud | Data Center |
|--------|-------|-------------|
| API routing | api.atlassian.com via workspace ID | Direct to server /rest/insight/1.0 |
| Auth | Email + API token (Basic auth) | Username + password (Basic auth) |
| Detection | Automatic from .atlassian.net hostname | Default |
| Workspace | Auto-fetched, or set JSM_WORKSPACE_ID | Not applicable |
| Icons | Set from global icons on create; may not render in type tree | Set from global icons |

Cloud requires an icon ID when creating object types. The adapter assigns a global icon automatically. These icons may not render in the Cloud type tree sidebar (a known Cloud UI limitation), but they appear correctly on objects. You can customise icons in the JSM Assets UI and your choices persist across subsequent schema syncs because the adapter never recreates existing types.

For Cloud API details, see:

- [Assets REST API Guide](https://developer.atlassian.com/cloud/assets/assets-rest-api-guide/workflow/)
- [Assets REST API Reference](https://developer.atlassian.com/cloud/assets/rest/api-group-object/)
- [Creating Objects via REST API](https://support.atlassian.com/jira/kb/how-to-create-assets-objects-via-rest-api-based-on-different-attribute-type/)

For Data Center, see:

- [Insight REST API](https://docs.atlassian.com/assets/REST/) (bundled with JSM DC)

## Docker Usage

Run any script via Docker without installing Node.js locally:

```bash
# Schema sync (Cloud)
docker run --rm \
  -v "$(pwd)":/app -w /app \
  -e JSM_URL=https://yoursite.atlassian.net \
  -e JSM_USER=you@example.com \
  -e JSM_PASSWORD=your-api-token \
  -e SCHEMA_KEY=CMDB \
  node:20-alpine node adapters/jsm/import.js schema

# Data sync (Data Center)
docker run --rm --network your_network \
  -v "$(pwd)":/app -w /app \
  -e JSM_URL=http://jira:8080 \
  -e JSM_USER=admin \
  -e JSM_PASSWORD=password \
  -e SCHEMA_KEY=CMDB \
  node:20-alpine node adapters/jsm/import.js sync
```

## File Layout

```
adapters/jsm/
  import.js             Main import script (schema + data)
  export.js             Export JSM data to local JSON
  validate-import.js    Post-import field-by-field validation
  check-schema.js       Schema alignment checker (read-only)
  lib/
    index.js            Adapter library entry point
    config.js           Configuration loader (env vars, .env file, paths)
    api-client.js       HTTP client with Cloud/DC routing, retry, auth
```
