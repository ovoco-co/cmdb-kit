# Getting Started

# Prerequisites

- Node.js 18 or later
- A target CMDB platform (JSM Assets, ServiceNow, or custom)

# Choose a Schema Layer

CMDB-Kit ships with three schema layers:

| Layer | Use case |
|-------|----------|
| Base | Quick start, small teams, proof of concept |
| Extended | Full CMDB with baselines, assessments, certifications, and infrastructure depth |
| Enterprise | Financial tracking, enterprise architecture, requirements, configuration library |

Start with the base layer. You can upgrade to extended or enterprise later without losing data. Extended includes everything in base plus more types, and enterprise includes everything in extended plus more. See the [Enterprise Extension README](../../../schema/enterprise/README.md) for details on what the enterprise layer adds.

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

## JSM Assets (Cloud or Data Center)

The JSM adapter supports both Atlassian Cloud and Data Center. Start by copying the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your connection details. The file is gitignored and will not be committed.

### Cloud setup

```
JSM_URL=https://yoursite.atlassian.net
JSM_USER=you@example.com
JSM_PASSWORD=your-api-token
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

`JSM_USER` is your Atlassian account email. `JSM_PASSWORD` is an API token generated at https://id.atlassian.com/manage-profile/security/api-tokens (not your account password). Cloud requires a paid JSM plan for Assets access.

The adapter auto-detects Cloud from the `.atlassian.net` hostname and fetches the Assets workspace ID on first run.

### Data Center setup

```
JSM_URL=http://your-jsm:8080
JSM_USER=admin
JSM_PASSWORD=password
SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

Data Center uses a local username and password. The URL points directly to your JSM server.

### Switching schema layers

To use the extended or enterprise schema, change `SCHEMA_DIR`:

```
SCHEMA_DIR=schema/enterprise
```

`DATA_DIR` defaults to `SCHEMA_DIR/data` when not set, so you only need to change one variable. Each layer is self-contained. You do not need to import base first, then extended, then enterprise. Just point `SCHEMA_DIR` at your chosen layer and run the import. You can switch layers at any time by changing the variable and re-running `import.js schema` followed by `import.js sync`.

### Create a schema in JSM

You can create the schema manually or let the import script do it.

To create manually: navigate to **Assets** in JSM, click **Create schema**, enter a name and key, then click **Create**. The key must match `SCHEMA_KEY` in your `.env` file (case-sensitive).

To create automatically: set `CREATE_SCHEMA=true` in your `.env` file. The import script will create the schema using `SCHEMA_KEY` as both the key and the name. Set `SCHEMA_NAME` to use a different display name (e.g., `SCHEMA_NAME=Product CMDB`).

### Run the import

```bash
# Step 1: Create object types and attributes
node adapters/jsm/import.js schema

# Step 2: Import data
node adapters/jsm/import.js sync
```

Import modes:

| Mode | What it does |
|------|-------------|
| schema | Create object types and sync attributes only, no data |
| sync | Sync attributes, then create new records and update existing |
| create | Sync attributes, then create new records only, skip existing |
| update | Sync attributes, then update existing records only, skip new |
| data | Import data only, skip schema and attribute sync |

Use `create` when you want to fill in missing records without overwriting changes you made in the UI. Use `data` when your schema and attributes are already set up and you just need to load records.

All modes support `--type <name>` to filter to specific types and `--dry-run` to preview without making changes.

See the [JSM Setup Guide](atlassian-cloud.md) for a full walkthrough including lookup types, schema hierarchy, and troubleshooting. See [adapters/jsm/README.md](../../../adapters/jsm/README.md) for a command reference.

## ServiceNow CMDB

Copy `.env.example` to `.env` and set the ServiceNow variables:

```
SN_INSTANCE=https://dev12345.service-now.com
SN_USER=admin
SN_PASSWORD=password
SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data
```

```bash
# Step 1: Test connectivity
node adapters/servicenow/import.js --test-connection

# Step 2: Create custom tables and columns
node adapters/servicenow/import.js schema

# Step 3: Import data
node adapters/servicenow/import.js sync
```

See the [ServiceNow Setup Guide](servicenow.md) for a full walkthrough, or [adapters/servicenow/README.md](../../../adapters/servicenow/README.md) for a command reference.

## Other Platforms

Write a custom adapter following the guide in [Writing Custom Adapters](../Extending/writing-custom-adapters.md).

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

- [Schema Reference](../Internals/schema-reference.md) for all types and attributes
- [Editing Data](../Data/editing-data.md) for JSON editing and CSV workflows
- [Writing Adapters](../Extending/writing-custom-adapters.md) to connect to a new CMDB platform
