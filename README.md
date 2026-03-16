CMDB-Kit

Existing CMDB schemas are designed around IT service processes, infrastructure discovery, or asset procurement. None of them are designed around product delivery.

If you ship software products to customer sites, none of that helps. You need to track what version is deployed where, what components make up each release, what infrastructure supports each site, and what changed since the last baseline. That's a product delivery problem, and no existing CMDB schema is designed for it.

CMDB-Kit is. It's a production-ready, product-centric CMDB schema with example data, import scripts for JSM Assets and ServiceNow, and documentation that covers the full arc from schema design to multi-site deployment tracking.

## Product-Centric, Not Infrastructure-Centric

The root organizing concept is the **Product**, not the server. A server exists because a product needs it. A database exists because a product stores data in it. The taxonomy mirrors the questions product delivery teams actually ask: "what version is at this site?" not "what's running on this VM?"

Three schema layers scale from a proof of concept to a multi-product enterprise portfolio without redesign. Start with base, upgrade to extended or enterprise when you need baselines, compliance tracking, or multi-product isolation.

For the full design rationale, including why the schema is product-centric, how the three layers were designed, and lessons from production use, see the [case study](docs/Schema-Design/case-study-ovococrm.md).

## Who It's For

- Configuration managers who manage product baselines across deployment sites
- Software teams shipping to multiple customer environments who need to track versions, components, and dependencies
- ITSM teams that have outgrown spreadsheet-based deployment tracking
- Anyone who has tried to bend a process-centric CMDB into a product delivery tracking system and found it doesn't fit

CMDB-Kit fits less well when the organization is purely an IT operations shop with no product development, when discovery-driven infrastructure inventory is the primary goal, or when the CMDB is mainly for IT asset management and procurement. For those scenarios, start from the platform's built-in model and use CMDB-Kit's patterns selectively where they add value.

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

See the [Getting Started Guide](docs/Setup/getting-started.md) for full setup instructions including schema creation, ServiceNow, and troubleshooting.

## What's Included

CMDB-Kit ships with a ready-to-use schema and example data modeling a fictional SaaS CRM called **OvocoCRM**, complete with applications, servers, databases, deployments, teams, and documentation.

### Schema Layers

| Layer | Use case |
|-------|----------|
| Base | Quick start, small teams, proof of concept |
| Extended | Full CMDB with baselines, compliance, licensing, and multi-site deployment |
| Enterprise | Multi-product portfolio, financial tracking, enterprise architecture, requirements |

The **base** layer covers the essentials: products, servers, databases, versions, and people. The **extended** layer adds licensing, certifications, baselines, network segments, SLAs, and more. The **enterprise** layer restructures the schema for multi-product portfolios with product-prefixed types, and adds service catalog, capability mapping, contracts, requirements traceability, and TBM cost attribution. Each layer includes everything from the layer below. Start with base and upgrade later without losing data.

### Type Hierarchy

- **Product CMDB** — Infrastructure CIs (applications, servers, databases, components)
- **Product Library** — Release management (versions, documents, deployments, baselines, requirements)
- **Enterprise Architecture** — Services, capabilities, business processes, information objects (enterprise only)
- **Configuration Library** — Controlled software artifacts (enterprise only)
- **Financial** — Contracts and cost attribution (enterprise only)
- **Directory** — People and organizations (orgs, teams, persons, locations)
- **Lookup Types** — Reference data (statuses, enumerations, categories)

## Adapters

Adapters connect the schema to specific CMDB platforms. Each adapter implements import, export, and validation.

| Adapter | Platform | Status |
|---------|----------|--------|
| [jsm](adapters/jsm/) | JSM Assets (Cloud and Data Center) | Available |
| [servicenow](adapters/servicenow/) | ServiceNow CMDB | Available |

See [Writing Adapters](docs/Extending/writing-custom-adapters.md) to build a custom adapter for another platform.

## CSV Workflow

For teams that prefer Excel-based data entry:

```bash
# Generate CSV templates with example rows
node tools/generate-templates.js --schema schema/base --examples

# Fill templates in Excel, then convert to JSON
node tools/csv-to-json.js --schema schema/base --outdir schema/base/data csv-templates/*.csv
```

The CSV-to-JSON converter produces files ready for direct import via the JSM adapter or ScriptRunner. See [Editing Data](docs/Data/editing-data.md) for the full workflow.

## Documentation

### Setup

| Document | Description |
|----------|-------------|
| [Getting Started](docs/Setup/getting-started.md) | Prerequisites, setup, and first import |
| [Atlassian Cloud](docs/Setup/atlassian-cloud.md) | JSM Assets Cloud setup |
| [Atlassian Data Center](docs/Setup/atlassian-data-center.md) | JSM Assets DC setup |
| [ServiceNow](docs/Setup/servicenow.md) | ServiceNow CMDB setup |
| [Other Platforms](docs/Setup/other-platforms.md) | Guidance for unsupported platforms |
| [Cloud vs DC Reference](docs/Setup/cloud-vs-dc-reference.md) | Feature comparison |

### Concepts

| Document | Description |
|----------|-------------|
| [CMDB Fundamentals](docs/Concepts/cmdb-fundamentals.md) | What a CMDB is, why it matters |
| [CI Selection](docs/Concepts/ci-selection.md) | Choosing what to track |
| [Taxonomy Design](docs/Concepts/taxonomy-design.md) | Organizing types and hierarchies |
| [Lookup Types](docs/Concepts/lookup-types.md) | Reference data patterns |
| [Service Management Design](docs/Concepts/service-management-design.md) | Designing for ITSM workflows |

### Schema Design

| Document | Description |
|----------|-------------|
| [Building the Product Library](docs/Schema-Design/building-the-product-library.md) | Versioned product modeling |
| [Definitive Media Library](docs/Schema-Design/definitive-media-library.md) | Controlled artifact storage |
| [Designing Site Deployments](docs/Schema-Design/designing-site-deployments.md) | Multi-site deployment modeling |
| [Taxonomy Playbook](docs/Schema-Design/taxonomy-playbook.md) | Step-by-step taxonomy creation |
| [Schema Assessment](docs/Schema-Design/schema-assessment.md) | Evaluate your schema design |

### Data and Operations

| Document | Description |
|----------|-------------|
| [Editing Data](docs/Data/editing-data.md) | JSON editing and CSV workflow |
| [Exporting and Round-Trip](docs/Data/exporting-and-round-trip.md) | Export, modify, re-import |
| [Validation and Troubleshooting](docs/Data/validation-and-troubleshooting.md) | Fixing import errors |
| [DML Operations](docs/Deployment-Operations/dml-operations.md) | Definitive media library operations |

### Configuration Management

| Document | Description |
|----------|-------------|
| [CM Operations](docs/Configuration-Management/cm-operations.md) | Day-to-day CM tasks |
| [Change Control](docs/Configuration-Management/change-control-governance.md) | Change governance |
| [Change Management in Jira](docs/Configuration-Management/change-management-in-jira.md) | Jira-based change workflows |
| [Personnel Management](docs/Configuration-Management/personnel-management.md) | Managing people CIs |
| [Requirements Management](docs/Configuration-Management/requirements-management.md) | Requirements traceability |

### Governance

| Document | Description |
|----------|-------------|
| [Portfolio and Shared Services](docs/Governance/portfolio-and-shared-services.md) | Multi-product portfolio model |
| [Enterprise Architecture](docs/Governance/enterprise-architecture.md) | EA layer design |
| [Scaling and Governance](docs/Governance/scaling-and-governance.md) | Growing your CMDB program |
| [IT Asset Lifecycle](docs/Governance/it-asset-lifecycle.md) | Asset lifecycle management |

### Developer Reference

| Document | Description |
|----------|-------------|
| [Schema Reference](docs/Internals/schema-reference.md) | All types and attributes across all layers |
| [File Naming and Structure](docs/Internals/file-naming-and-project-structure.md) | Project conventions |
| [Schema Changes](docs/Internals/schema-changes.md) | Versioning and migration |
| [Writing Adapters](docs/Extending/writing-custom-adapters.md) | Build a custom adapter |
| [System Integration](docs/Extending/system-integration-patterns.md) | Integration patterns |
| [Air-Gapped Deployment](docs/Deployment-Operations/air-gapped-deployment.md) | Disconnected environments |

## Project Structure

```
cmdb-kit/
├── schema/
│   ├── base/                    # Lean starter schema
│   │   ├── schema-structure.json
│   │   ├── schema-attributes.json
│   │   └── data/               # OvocoCRM example data
│   ├── extended/                # Full single-product CMDB
│   │   ├── schema-structure.json
│   │   ├── schema-attributes.json
│   │   └── data/
│   └── enterprise/              # Multi-product portfolio
│       ├── schema-structure.json
│       ├── schema-attributes.json
│       ├── data/
│       └── README.md
├── adapters/
│   ├── jsm/                     # JSM Assets adapter (Cloud + DC)
│   └── servicenow/              # ServiceNow CMDB adapter
├── tools/
│   ├── validate.js              # Offline schema and data validation
│   ├── csv-to-json.js           # CSV to JSON converter
│   └── generate-templates.js    # CSV template generator
└── docs/
    ├── Setup/                   # Installation and platform setup
    ├── Concepts/                # CMDB fundamentals and design principles
    ├── Schema-Design/           # Type hierarchy and schema patterns
    ├── Data/                    # Data editing, import/export, validation
    ├── Configuration-Management/ # CM operations, change control, requirements
    ├── Deployment-Operations/   # DML, site lifecycle, air-gapped
    ├── Governance/              # Portfolio, EA, scaling, asset lifecycle
    ├── Extending/               # Custom adapters, integrations
    ├── Internals/               # Schema reference, file conventions
    └── diagrams/                # SVG illustrations
```

## Adding New Types

1. Add to `schema-structure.json` (under appropriate parent)
2. Add attributes to `schema-attributes.json`
3. Add to `LOAD_PRIORITY` in `tools/lib/constants.js` (respect dependency order)
4. Create data JSON file in the `data/` directory (kebab-case name)
5. Run validation: `node tools/validate.js --schema <dir>`

## License

MIT
