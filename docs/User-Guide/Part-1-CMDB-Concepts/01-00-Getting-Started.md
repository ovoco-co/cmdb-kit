# Getting Started

# Prerequisites

- Node.js 18 or later
- A target CMDB platform (JSM Assets, ServiceNow, or custom)

# Choose a Schema Layer

CMDB-Kit ships with three schema layers:

| Layer | Types | Use case |
|-------|-------|----------|
| Base | 20 | Quick start, small teams, proof of concept |
| Extended | 55 | Full CMDB with change, incident, and asset management |
| Enterprise | 78 | Financial tracking, enterprise architecture, requirements, configuration library |

Start with the base layer. You can upgrade to extended or enterprise later without losing data. Each layer is a superset of the one below it. See the [Enterprise Extension README](../../../schema/enterprise/README.md) for details on what the enterprise layer adds.

# Validate the Schema

Run offline validation to confirm everything is consistent:

```bash
node tools/validate.js --schema schema/base
```

This checks:
- Schema structure integrity (no broken parent references)
- Attribute definitions (all reference types exist)
- LOAD_PRIORITY completeness
- Data file existence and reference value integrity

# Explore the Example Data

The schema ships with example data for a fictional SaaS CRM called OvocoCRM. Browse the `schema/base/data/` directory to see the format:

```bash
ls schema/base/data/
```

Lookup types are simple arrays:
```json
[
  { "Name": "Active", "description": "Application is live and serving traffic" },
  { "Name": "Planned", "description": "Application is approved but not yet built" }
]
```

CI types have richer attributes:
```json
[
  {
    "Name": "crm-app-01",
    "description": "Primary application server for CRM Core",
    "hostname": "crm-app-01.ovoco.internal",
    "ipAddress": "10.0.1.10",
    "operatingSystem": "Ubuntu 22.04 LTS",
    "environment": "Production"
  }
]
```

# Import into a Database

## JSM Assets

Set up environment variables and run the adapter:

```bash
export JSM_URL=http://your-jsm:8080
export JSM_USER=admin
export JSM_PASSWORD=password
export SCHEMA_KEY=CMDB
export DATA_DIR=schema/base/data
export SCHEMA_DIR=schema/base

# Step 1: Create object types and attributes
node adapters/jsm/import.js schema

# Step 2: Import data
node adapters/jsm/import.js sync
```

See the [JSM Setup Guide](../Part-3-Platform-Setup/03-01-JSM-Assets-Setup.md) for a full walkthrough, or [adapters/jsm/README.md](../../../adapters/jsm/README.md) for a command reference.

## ServiceNow CMDB

Set up environment variables and run the adapter:

```bash
export SN_INSTANCE=https://dev12345.service-now.com
export SN_USER=admin
export SN_PASSWORD=password
export DATA_DIR=schema/base/data
export SCHEMA_DIR=schema/base

# Step 1: Test connectivity
node adapters/servicenow/import.js --test-connection

# Step 2: Create custom tables and columns
node adapters/servicenow/import.js schema

# Step 3: Import data
node adapters/servicenow/import.js sync
```

See the [ServiceNow Setup Guide](../Part-3-Platform-Setup/03-04-ServiceNow-Setup.md) for a full walkthrough, or [adapters/servicenow/README.md](../../../adapters/servicenow/README.md) for a command reference.

## Other Platforms

Write a custom adapter following the guide in [Writing Custom Adapters](../../Developer-Manual/Part-2-Extending/02-01-Writing-Custom-Adapters.md).

# Replace Example Data

To use CMDB-Kit for your own product:

1. Copy `schema/base/` to a new directory (or edit in place)
2. Update lookup values to match your domain
3. Replace CI data with your actual infrastructure records
4. Update LOAD_PRIORITY if you add or remove types
5. Run validation to confirm consistency

# Generate CSV Templates

For teams that prefer Excel-based data entry:

```bash
# Generate blank templates with example rows
node tools/generate-templates.js --schema schema/base --examples --outdir csv-templates

# After filling templates in Excel, convert to JSON
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
```

# Next Steps

- [Schema Reference](../../Developer-Manual/Part-1-Project-Internals/01-02-Schema-Reference.md) for all types and attributes
- [Data Entry and Maintenance](../Part-4-Day-to-Day/04-03-Data-Entry-and-Maintenance.md) for JSON editing and CSV workflows
- [Writing Adapters](../../Developer-Manual/Part-2-Extending/02-01-Writing-Custom-Adapters.md) to connect to a new CMDB platform
