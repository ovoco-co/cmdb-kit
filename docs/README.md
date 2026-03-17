# Documentation Guide

CMDB-Kit is product-centric: the root organizing concept is the Product, and infrastructure exists to support products. Most CMDB schemas start with servers and networks, then attach applications on top. CMDB-Kit inverts this to match the questions people actually ask: "what product is affected?" not "what server is this on?" For the full rationale, see the [case study](Schema-Design/case-study-ovococrm.md).

Start with Getting Started to set up and run your first import, then read the Concepts section to understand the design principles. Everything after that is reference material you can read as needed.


## Getting Started

| Page | Description |
|------|-------------|
| [Getting Started](Setup/getting-started.md) | Prerequisites, installation, and your first import in five minutes |


## Platform Setup

Pick the guide for your platform. You only need one.

| Page | Description |
|------|-------------|
| [Atlassian Cloud](Setup/atlassian-cloud.md) | JSM Assets on Atlassian Cloud. Schema import, data sync, workspace setup |
| [Atlassian Data Center](Setup/atlassian-data-center.md) | JSM Assets on Jira Data Center. REST API setup, import, and validation |
| [Cloud vs DC Reference](Setup/cloud-vs-dc-reference.md) | Side-by-side comparison of Cloud and Data Center terminology, APIs, and behavior |
| [ServiceNow](Setup/servicenow.md) | ServiceNow CMDB via CMDB Instance API and Table API. Custom CI classes for product delivery, OOTB tables for infrastructure. Tested against Zurich |
| [Other Platforms](Setup/other-platforms.md) | iTop, Device42, and other CMDB platforms. Adapter patterns and what to expect |


## Concepts

Read these in order. Each builds on the previous.

| Page | Description |
|------|-------------|
| [CMDB Fundamentals](Concepts/cmdb-fundamentals.md) | What a CMDB is, how it fits into ITIL, and when you actually need one |
| [CI Selection](Concepts/ci-selection.md) | Criteria for deciding what to track. Too little vs too much. Practical selection framework |
| [Taxonomy Design](Concepts/taxonomy-design.md) | How CMDB-Kit's classification hierarchy works. Schema files, type hierarchy, naming conventions |
| [Lookup Types and Reference Data](Concepts/lookup-types.md) | Why statuses and categories are first-class objects, not picklists. How to design and extend lookup types |
| [Service Management Design](Concepts/service-management-design.md) | Mapping ITIL 4 practices to CMDB-Kit schema types. Change, incident, release, SLA |


## Working with Data

| Page | Description |
|------|-------------|
| [Data Files and Rules](Data/data-files-and-rules.md) | JSON data file format, naming conventions, load priority, and validation rules |
| [Editing Data](Data/editing-data.md) | How to edit data files directly or use the CSV workflow for team collaboration |
| [Exporting and Round-Trip](Data/exporting-and-round-trip.md) | Export from a live instance, diff against local files, and round-trip sync |
| [Validation and Troubleshooting](Data/validation-and-troubleshooting.md) | Running the validator, interpreting errors, and fixing common issues |


## Schema Design

| Page | Description |
|------|-------------|
| [Taxonomy Playbook](Schema-Design/taxonomy-playbook.md) | End-to-end guide for designing a CMDB taxonomy from scratch. Stakeholder discovery through governance |
| [Case Study: OvocoCRM](Schema-Design/case-study-ovococrm.md) | How CMDB-Kit's three-layer schema was designed. Design rationale, key decisions, lessons from production |
| [Building the Product Library](Schema-Design/building-the-product-library.md) | Version tracking, deployment records, and the Product Library branch |
| [Definitive Media Library](Schema-Design/definitive-media-library.md) | Controlled software artifacts. Product Media, Product Suite, Distribution Log |
| [Designing Site Deployments](Schema-Design/designing-site-deployments.md) | Multi-site deployment modeling. Site vs Deployment Site, upgrade pipelines |
| [Schema Assessment](Schema-Design/schema-assessment.md) | Evaluating and improving an existing CMDB schema. Gap analysis and recommendations |


## Configuration Management

| Page | Description |
|------|-------------|
| [CM Operations](Configuration-Management/cm-operations.md) | Day-to-day configuration management operations using the CMDB |
| [Change Control Governance](Configuration-Management/change-control-governance.md) | Change advisory boards, baselines, and approval workflows |
| [Change Management in Jira](Configuration-Management/change-management-in-jira.md) | Modeling change requests and approvals in Jira instead of the CMDB |
| [Personnel Management](Configuration-Management/personnel-management.md) | Tracking people, teams, roles, and organizational structure in the CMDB |
| [Requirements Management](Configuration-Management/requirements-management.md) | Requirements traceability, verification methods, and allocation |


## Governance

| Page | Description |
|------|-------------|
| [Portfolio and Shared Services](Governance/portfolio-and-shared-services.md) | Multi-product portfolios, shared services branch, cross-product dependencies |
| [Enterprise Architecture](Governance/enterprise-architecture.md) | Service, Capability, and Business Process types. When and how to add EA to the CMDB |
| [Scaling and Governance](Governance/scaling-and-governance.md) | Data governance, ownership, quality metrics, and scaling the CMDB practice |
| [IT Asset Lifecycle](Governance/it-asset-lifecycle.md) | Asset lifecycle management, financial tracking, and procurement integration |
| [Wiki Structure](Governance/wiki-structure.md) | Organizing CMDB documentation in Confluence or another wiki |


## Deployment Operations

| Page | Description |
|------|-------------|
| [Site Lifecycle and Pipeline](Deployment-Operations/site-lifecycle-and-pipeline.md) | How sites move through provisioning, active, and decommission states |
| [Pre-deployment Pipeline](Deployment-Operations/pre-deployment-pipeline.md) | Build, test, and staging gates before production deployment |
| [Deployment Handoff](Deployment-Operations/deployment-handoff.md) | Handoff process between development, CM, and operations teams |
| [Upgrade and Distribution](Deployment-Operations/upgrade-and-distribution.md) | Version upgrades, media distribution, and rollback procedures |
| [DML Operations](Deployment-Operations/dml-operations.md) | Definitive Media Library operations. Intake, storage, distribution, and auditing |
| [Air-Gapped Deployment](Deployment-Operations/air-gapped-deployment.md) | Deploying to disconnected or classified environments without network access |


## Extending CMDB-Kit

| Page | Description |
|------|-------------|
| [Multi-Product Schema Design](Extending/multi-product-schema-design.md) | How the enterprise schema isolates products with prefixed types and shared services |
| [System Integration Patterns](Extending/system-integration-patterns.md) | Integrating the CMDB with CI/CD, monitoring, ticketing, and other systems |
| [API References](Extending/api-references.md) | JSM Assets and ServiceNow API reference for adapter development |
| [Writing Custom Adapters](Extending/writing-custom-adapters.md) | How to write a new adapter for a platform CMDB-Kit doesn't support yet |


## Internals

| Page | Description |
|------|-------------|
| [Schema Reference](Internals/schema-reference.md) | Complete reference for all types and attributes across base, extended, and enterprise tiers |
| [File Naming and Project Structure](Internals/file-naming-and-project-structure.md) | Repository layout, file naming conventions, and directory structure |
| [Schema Changes](Internals/schema-changes.md) | How to modify the schema safely. Version control, migration, and backward compatibility |
