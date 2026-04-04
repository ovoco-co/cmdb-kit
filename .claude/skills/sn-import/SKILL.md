---
name: sn-import
description: Run the ServiceNow adapter import sequence
disable-model-invocation: true
argument-hint: [optional: schema, sync, relationships, or all]
allowed-tools: Bash, Read
---

Run the ServiceNow adapter import. Requires SN_INSTANCE, SN_USER, and SN_PASSWORD environment variables to be set (check .env file).

## Usage

`/sn-import` or `/sn-import all` — runs the full sequence: schema sync, data sync, relationships.

`/sn-import schema` — runs only schema sync (creates tables and columns).

`/sn-import sync` — runs only data sync (imports records).

`/sn-import relationships` — runs only relationship import.

## Full sequence

```bash
# 1. Schema sync - creates/updates tables and columns
node adapters/servicenow/import.js schema

# 2. Data sync - imports all records
node adapters/servicenow/import.js sync

# 3. Relationships - creates CI-to-CI relationships
node adapters/servicenow/import.js relationships
```

Run each step and report results. If any step fails, stop and diagnose the error before continuing. Common issues:

- **401 Unauthorized**: Check SN_USER and SN_PASSWORD in .env
- **HTML response instead of JSON**: PDI is hibernating, wake it at developer.servicenow.com
- **"Record not found"**: Table or column doesn't exist yet, run schema sync first
- **Duplicate records**: Identification rules may not have propagated, wait 10 seconds and retry
