# CMDB-Kit

Three disciplines manage different parts of the same product lifecycle using different tools, vocabulary, and communities that don't overlap.

**Software CM** uses Git, CI/CD, and build systems. It knows what's in a release but not where it's deployed.

**ITIL CMDB** uses ServiceNow, JSM Assets, and discovery tools. It knows what infrastructure exists but has no concept of a software product version deployed to a customer site.

**Defense/Manufacturing CM** defines baselines, deployment configurations, and change control boards per EIA-649C and MIL-HDBK-61B. But it lives in spreadsheets and SharePoint, not in modern platforms.

CMDB-Kit bridges the three by putting product delivery concepts (Product, Version, Baseline, Deployment Site) into ITSM platforms where they connect to the infrastructure data that's already there.

## Core + Domains

**Core** answers one question: "What do we ship and where does it go?"

It tracks products, versions, components, deployment sites, baselines, documents, and the people responsible for them. Core runs on JSM Assets (Cloud and Data Center) and ServiceNow.

**Domains** are opt-in packages for specialized teams:

| Domain | Team | What it adds |
|--------|------|-------------|
| Infrastructure | SRE, Platform Ops | Hardware models, VMs, network segments, locations, facilities |
| Compliance | Security, Accreditation | Assessments, certifications, ATO tracking |
| Distribution | CM Library, Media | Media packages, distribution logs, documentation suites |
| Licensing | Procurement, Finance | Licenses, vendors, SLAs, contracts |

Each domain references Core types but Core never references domain types. Add the domains your team needs.

## Who It's For

- Software companies deploying to customer sites (SaaS with dedicated instances, on-prem, hybrid)
- Configuration managers tracking product baselines across deployment sites
- ITSM teams that have outgrown spreadsheet-based deployment tracking
- Any organization that needs to answer "what version is running at this customer's site"

CMDB-Kit fits less well for pure IT operations with no product development, for discovery-driven infrastructure inventory, or for organizations that don't use ServiceNow or JSM Assets.

## Quick Start

```bash
# Validate the Core schema offline
node tools/validate.js --schema schema/core

# Validate Core + a domain
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure

# Browse the example data
ls schema/core/data/
```

To import into JSM Assets or ServiceNow:

```bash
cp .env.example .env    # copy the template, edit with your details
```

```bash
# JSM Assets
node adapters/jsm/import.js schema    # create types and attributes
node adapters/jsm/import.js data      # import records

# ServiceNow
node adapters/servicenow/import.js schema    # create tables and columns
node adapters/servicenow/import.js sync      # import records
```

See the [Getting Started Guide](docs/getting-started.md) for full setup instructions.

## What Core Answers

The schema exists to answer these questions on both JSM and ServiceNow:

- **Product Identity**: What products do we manage? Who owns each one?
- **Version and Release**: What is the current version? Who approved it? What changed?
- **Deployment**: Where is this product deployed? What version is at each site? Is it current or behind?
- **Baselines**: What is the approved configuration? What's in it? Who approved it?
- **Dependencies**: What does this product depend on? If this server goes down, what's affected?
- **People**: Who is the POC at each site? What team supports this deployment?
- **Documents**: What controlled documents exist? What version do they apply to?

## Example Data

All example data uses a fictional SaaS CRM called **OvocoCRM** with 6 products, 5 versions, 6 deployment sites (including 3 customer-dedicated instances), 2 baselines, 6 features, 10 team members, and 5 controlled documents.

The data tells a realistic story: Acme Corp is one version behind (2.3.0 vs current 2.3.1). The EU Frankfurt site is provisioning. The 2.3.1 hotfix was emergency-approved by the principal engineer instead of the product manager.

## Adapters

| Adapter | Platform | Status |
|---------|----------|--------|
| [jsm](adapters/jsm/) | JSM Assets (Cloud and Data Center) | Available |
| [servicenow](adapters/servicenow/) | ServiceNow CMDB | Available |

See [Writing Adapters](docs/extending.md) to build an adapter for another platform.

## CSV Workflow

```bash
node tools/generate-templates.js --schema schema/core --examples
node tools/csv-to-json.js --schema schema/core --outdir schema/core/data csv-templates/*.csv
```

## Documentation

| Document | Description |
|----------|-------------|
| [The Problem](docs/problem-statement.md) | Why CMDB-Kit exists, the three traditions gap |
| [Core Schema](docs/core-schema.md) | What Core tracks and the questions it answers |
| [Getting Started](docs/getting-started.md) | First import on JSM Assets or ServiceNow |
| [Verification](docs/verification.md) | Confirm everything imported correctly |
| [Your Data](docs/your-data.md) | Replace example data with your own |
| [Using the CMDB](docs/using-the-cmdb.md) | Answer real questions with queries |
| [Domains](docs/domains.md) | Available domains and selection guide |
| [Extending](docs/extending.md) | Architecture, new domains, adapters, standards |
| [Schema Reference](docs/schema-reference.md) | Every type and attribute |

See [docs/README.md](docs/README.md) for the full documentation index including deep-dive reference material.

## Project Structure

```
cmdb-kit/
  schema/
    core/                       # Core schema: products, versions, sites, baselines
      schema-structure.json
      schema-attributes.json
      data/                     # OvocoCRM example data
    domains/
      infrastructure/           # Hardware, VMs, networks, locations
      compliance/               # Assessments, certifications
      distribution/             # Media, distribution logs, doc suites
      licensing/                # Licenses, vendors, SLAs
      sccm/                     # SCCM security assessment
    extended/                   # Legacy: all domains combined
    enterprise/                 # Legacy: multi-product portfolio mode
  adapters/
    jsm/                        # JSM Assets adapter (Cloud + DC)
    servicenow/                 # ServiceNow CMDB adapter
  tools/
    validate.js                 # Offline schema and data validation
    csv-to-json.js              # CSV to JSON converter
    generate-templates.js       # CSV template generator
  docs/
```

## Adding New Types

1. Add to `schema-structure.json` (under appropriate parent)
2. Add attributes to `schema-attributes.json`
3. Add to `LOAD_PRIORITY` in `tools/lib/constants.js` (respect dependency order)
4. Create data JSON file in `data/` (kebab-case name)
5. Run validation: `node tools/validate.js --schema schema/core`

## License

MIT
