# CMDB-Kit Documentation

Read these in order. Each document builds on the last. You can start using CMDB-Kit after Getting Started and come back to the rest as you need it.

## Start Here

| Document | What You Learn |
|----------|---------------|
| [The Problem](problem-statement.md) | Why CMDB-Kit exists, the three traditions gap, who it's for |
| [The Core Schema](core-schema.md) | What Core tracks, the questions it answers, the type hierarchy |
| [Getting Started](getting-started.md) | First import on JSM Assets or ServiceNow in 15 minutes |
| [Verification](verification.md) | Confirm everything imported correctly |

## Working with Your Data

| Document | What You Learn |
|----------|---------------|
| [Your Data](your-data.md) | Replace example data with your own records |
| [Using the CMDB](using-the-cmdb.md) | Answer real questions with queries on each platform |

## Domains

| Document | What You Learn |
|----------|---------------|
| [Domains](domains.md) | Available domains, which teams use them, what they replace |
| [Installing a Domain](installing-a-domain.md) | Add a domain to your running instance |

## For Developers

| Document | What You Learn |
|----------|---------------|
| [Extending CMDB-Kit](extending.md) | Architecture, creating domains, writing adapters, standards alignment |

## Reference

| Document | What You Learn |
|----------|---------------|
| [Schema Reference](schema-reference.md) | Every type and attribute across Core and all domains |

## Deep Dives

The reference library covers topics in depth. These documents were written for earlier versions of the schema and use older terminology (base/extended/enterprise instead of Core + Domains), but the patterns and guidance remain valuable.

### Concepts

| Document | Description |
|----------|-------------|
| [CMDB Fundamentals](reference/Concepts/cmdb-fundamentals.md) | What a CMDB is, why it matters, the guidance gap |
| [CI Selection](reference/Concepts/ci-selection.md) | Criteria for deciding what to track and what not to |
| [Taxonomy Design](reference/Concepts/taxonomy-design.md) | Organizing types, hierarchies, and branch patterns |
| [Lookup Types](reference/Concepts/lookup-types.md) | Reference data patterns and catalog design |
| [Service Management Design](reference/Concepts/service-management-design.md) | Mapping ITIL 4 practices to schema types |

### Schema Design Patterns

| Document | Description |
|----------|-------------|
| [Case Study: OvocoCRM](reference/Schema-Design/case-study-ovococrm.md) | How the schema was designed iteratively through seven real problems |
| [Building the Product Library](reference/Schema-Design/building-the-product-library.md) | Version tracking, release chains, and component modeling |
| [Designing Site Deployments](reference/Schema-Design/designing-site-deployments.md) | Site vs Deployment Site, lifecycle states, multi-product sites |
| [Definitive Media Library](reference/Schema-Design/definitive-media-library.md) | Controlled artifact storage and distribution tracking |
| [Taxonomy Playbook](reference/Schema-Design/taxonomy-playbook.md) | Step-by-step guide to building a taxonomy from scratch |
| [Schema Assessment](reference/Schema-Design/schema-assessment.md) | Evaluating and improving an existing schema design |

### Platform Setup (detailed)

| Document | Description |
|----------|-------------|
| [JSM Assets Cloud](reference/Setup/atlassian-cloud.md) | Detailed Cloud setup, AQL reference, icon handling |
| [JSM Assets Data Center](reference/Setup/atlassian-data-center.md) | DC-specific setup, ScriptRunner, Insight naming history |
| [ServiceNow](reference/Setup/servicenow.md) | CMDB Instance API, custom CI classes, tier mapping |
| [ServiceNow Scoped App](reference/Setup/servicenow-scoped-app-guide.md) | UI configuration, navigation modules, class registration |
| [Other Platforms](reference/Setup/other-platforms.md) | Guidance for unsupported platforms |

### Configuration Management

| Document | Description |
|----------|-------------|
| [CM Operations](reference/Configuration-Management/cm-operations.md) | Four CM pillars mapped to schema types |
| [Change Control Governance](reference/Configuration-Management/change-control-governance.md) | CCB structure, change classification, escalation paths |
| [Personnel Management](reference/Configuration-Management/personnel-management.md) | Modeling people, teams, posts, and the HR boundary |
| [Requirements Management](reference/Configuration-Management/requirements-management.md) | Features, requirements traceability, tool integration |

### Governance

| Document | Description |
|----------|-------------|
| [Portfolio and Shared Services](reference/Governance/portfolio-and-shared-services.md) | Multi-product schema management patterns |
| [Enterprise Architecture](reference/Governance/enterprise-architecture.md) | EA/UAF viewpoints mapped to schema branches |
| [IT Asset Lifecycle](reference/Governance/it-asset-lifecycle.md) | Six-phase lifecycle, hardware models, disposal |
| [Scaling and Governance](reference/Governance/scaling-and-governance.md) | Data quality, staleness detection, backup, performance |

### Data Operations

| Document | Description |
|----------|-------------|
| [Data Files and Rules](reference/Data/data-files-and-rules.md) | JSON format, naming, references, relationships |
| [Editing Data](reference/Data/editing-data.md) | JSON and CSV workflows in detail |
| [Exporting and Round-Trip](reference/Data/exporting-and-round-trip.md) | Export, diff, and reimport patterns |
| [Validation and Troubleshooting](reference/Data/validation-and-troubleshooting.md) | Every validation check explained |

### Integration

| Document | Description |
|----------|-------------|
| [Writing Custom Adapters](reference/Extending/writing-custom-adapters.md) | Detailed adapter development guide |
| [Multi-Product Schema Design](reference/Extending/multi-product-schema-design.md) | Product-prefix patterns for portfolio mode |
| [Air-Gapped Deployment](reference/integration/common/air-gapped.md) | Disconnected environment import procedures |
| [DML Operations](reference/integration/common/dml-operations.md) | Definitive media library management |
| [Site Lifecycle](reference/integration/common/site-lifecycle.md) | Site provisioning through decommission |

### Developer Internals

| Document | Description |
|----------|-------------|
| [File Naming and Structure](reference/Internals/file-naming-and-project-structure.md) | Project conventions and directory layout |
| [Schema Changes](reference/Internals/schema-changes.md) | Versioning, migration, and rollback strategy |
