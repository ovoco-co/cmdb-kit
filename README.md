CMDB-Kit

An open-source, database-agnostic CMDB starter kit. ITIL-aligned schema patterns, realistic example data, pluggable adapters for JSM Assets and ServiceNow, and a comprehensive guide for administrators and developers.

## Quick Start

```bash
# Validate the schema offline (no database needed)
node tools/validate.js --schema schema/base

# Browse the example data
ls schema/base/data/
```

To import into JSM Assets or ServiceNow, configure your connection:

```bash
cp .env.example .env    # copy the template
```

Edit `.env` with your details. For **Cloud**, use your Atlassian site URL, email, and an [API token](https://id.atlassian.com/manage-profile/security/api-tokens). For **Data Center**, use your server URL, username, and password.

```
# Cloud example                          # Data Center example
JSM_URL=https://yoursite.atlassian.net    JSM_URL=http://your-jsm:8080
JSM_USER=you@example.com                 JSM_USER=admin
JSM_PASSWORD=your-api-token              JSM_PASSWORD=password
SCHEMA_KEY=CMDB                          SCHEMA_KEY=CMDB
SCHEMA_DIR=schema/base                   SCHEMA_DIR=schema/base
DATA_DIR=schema/base/data                DATA_DIR=schema/base/data
```

Then run the import:

```bash
node adapters/jsm/import.js schema && node adapters/jsm/import.js sync
```

See the [Getting Started Guide](docs/User-Guide/Part-1-CMDB-Concepts/01-00-Getting-Started.md) for full setup instructions including schema creation, ServiceNow, and troubleshooting.

## What's Included

CMDB-Kit ships with a ready-to-use schema and example data modeling a fictional SaaS CRM called **OvocoCRM**, complete with applications, servers, databases, deployments, teams, and documentation.

### Schema Layers

| Layer | Use case |
|-------|----------|
| Base | Quick start, small teams, proof of concept |
| Extended | Full CMDB with baselines, compliance, licensing, and multi-site deployment |
| Enterprise | Multi-product portfolio, financial tracking, enterprise architecture, requirements |

The **base** layer covers the essentials: products, servers, databases, versions, and people. The **extended** layer adds licensing, certifications, baselines, network segments, SLAs, and more. The **enterprise** layer restructures the schema for multi-product portfolios with product-prefixed types, and adds service catalog, capability mapping, contracts, requirements traceability, and TBM cost attribution. Extended includes everything in base plus more types, and enterprise includes everything in extended plus more. Start with base and upgrade later without losing data.

### Type Hierarchy

- **Product CMDB** - Infrastructure CIs (applications, servers, databases, components)
- **Product Library** - Release management (versions, documents, deployments, baselines, requirements)
- **Enterprise Architecture** - Services, capabilities, business processes, information objects (enterprise only)
- **Configuration Library** - Controlled software artifacts (enterprise only)
- **Financial** - Contracts and cost attribution (enterprise only)
- **Directory** - People and organizations (orgs, teams, persons, locations)
- **Lookup Types** - Reference data (statuses, enumerations, categories)

## Adapters

Adapters connect the schema to specific CMDB platforms. Each adapter implements import, export, and validation.

| Adapter | Platform | Status |
|---------|----------|--------|
| [jsm](adapters/jsm/) | JSM Assets (Cloud and Data Center) | Available |
| [servicenow](adapters/servicenow/) | ServiceNow CMDB | Available |

See [Writing Adapters](docs/Developer-Manual/Part-2-Extending/02-01-Writing-Custom-Adapters.md) to build a custom adapter for another platform.

## User Guide

A guide for CMDB administrators covering concepts, schema design, platform setup, day-to-day operations, and governance. Sections are grounded in the CMDB-Kit schema and OvocoCRM examples.

| Part | Sections | Topics |
|------|----------|--------|
| [Part 1: CMDB Concepts](docs/User-Guide/Part-1-CMDB-Concepts/) | 7 sections | Getting started, CMDB fundamentals, CI selection, taxonomy design, ITIL alignment, lookup types, CM operations |
| [Part 2: Schema Design](docs/User-Guide/Part-2-Schema-Design/) | 3 sections | Product library, definitive media library, site deployments |
| [Part 3: Platform Setup](docs/User-Guide/Part-3-Platform-Setup/) | 5 sections | JSM setup, Atlassian implementation, wiki structure, ServiceNow setup, other platforms |
| [Part 4: Day-to-Day](docs/User-Guide/Part-4-Day-to-Day/) | 5 sections | Personnel, requirements, data entry, validation, DML operations |
| [Part 5: Governance](docs/User-Guide/Part-5-Governance/) | 4 sections | Portfolio management, enterprise architecture, scaling, IT asset lifecycle |

## Developer Manual

A reference for developers extending CMDB-Kit with custom adapters, integrations, and schema changes.

| Part | Sections | Topics |
|------|----------|--------|
| [Part 1: Project Internals](docs/Developer-Manual/Part-1-Project-Internals/) | 3 sections | File naming, schema reference, schema versioning |
| [Part 2: Extending](docs/Developer-Manual/Part-2-Extending/) | 3 sections | Custom adapters, system integration, air-gapped deployment |

Start with the [Getting Started Guide](docs/User-Guide/Part-1-CMDB-Concepts/01-00-Getting-Started.md) and browse by part.

## Project Structure

```
CMDB-Kit/
├── schema/
│   ├── base/                    # Lean starter schema
│   │   ├── schema-structure.json
│   │   ├── schema-attributes.json
│   │   └── data/               # OvocoCRM example data
│   ├── extended/                # Full single-product CMDB
│   │   ├── schema-structure.json
│   │   ├── schema-attributes.json
│   │   └── data/               # Richer OvocoCRM data
│   └── enterprise/              # Multi-product portfolio
│       ├── schema-structure.json
│       ├── schema-attributes.json
│       ├── data/               # Full OvocoCRM with EA, contracts, requirements
│       └── README.md           # What the extension adds
├── adapters/
│   ├── jsm/                     # JSM Assets adapter
│   └── servicenow/              # ServiceNow CMDB adapter
├── tools/                       # Database-agnostic utilities
│   ├── validate.js              # Offline schema and data validation
│   ├── csv-to-json.js           # CSV to JSON converter
│   └── generate-templates.js    # CSV template generator
└── docs/
    ├── User-Guide/              # Guide for CMDB administrators
    │   ├── Part-1-CMDB-Concepts/
    │   │   └── 01-00-Getting-Started.md
    │   ├── Part-2-Schema-Design/
    │   ├── Part-3-Platform-Setup/
    │   ├── Part-4-Day-to-Day/
    │   └── Part-5-Governance/
    ├── Developer-Manual/        # Reference for extending CMDB-Kit
    │   ├── Part-1-Project-Internals/
    │   └── Part-2-Extending/
    └── diagrams/                # SVG illustrations and interactive type explorer
```

## CSV Workflow

For teams that prefer Excel-based data entry:

```bash
# Generate CSV templates with example rows
node tools/generate-templates.js --schema schema/base --examples

# Fill templates in Excel, then convert to JSON
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
```

See [Data Entry and Maintenance](docs/User-Guide/Part-4-Day-to-Day/04-03-Data-Entry-and-Maintenance.md) for the full guide.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/User-Guide/Part-1-CMDB-Concepts/01-00-Getting-Started.md) | Prerequisites, setup, and first import |
| [Schema Reference](docs/Developer-Manual/Part-1-Project-Internals/01-02-Schema-Reference.md) | All types and attributes across all layers |
| [Enterprise Extension](schema/enterprise/README.md) | What the enterprise layer adds and when to use it |
| [Data Entry](docs/User-Guide/Part-4-Day-to-Day/04-03-Data-Entry-and-Maintenance.md) | JSON editing and CSV workflow |
| [Writing Adapters](docs/Developer-Manual/Part-2-Extending/02-01-Writing-Custom-Adapters.md) | Build a custom adapter for another platform |
| [User Guide](docs/User-Guide/) | 24 sections from fundamentals to governance |
| [Developer Manual](docs/Developer-Manual/) | 6 sections on internals and extending |

## Adding New Types

1. Add to `schema-structure.json` (under appropriate parent)
2. Add attributes to `schema-attributes.json`
3. Add to `LOAD_PRIORITY` in `tools/lib/constants.js` (respect dependency order)
4. Create data JSON file in the `data/` directory (kebab-case name)
5. Run validation: `node tools/validate.js --schema <dir>`

## License

MIT
