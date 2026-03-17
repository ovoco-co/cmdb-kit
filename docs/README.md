# Documentation Guide

CMDB-Kit is product-centric: the root organizing concept is the Product, and infrastructure exists to support products. Most CMDB schemas start with servers and networks, then attach applications on top. CMDB-Kit inverts this to match the questions people actually ask: "what product is affected?" not "what server is this on?" For the full rationale, see the [case study](Schema-Design/case-study-ovococrm.md).

Start with Getting Started to set up and run your first import, then read the Concepts section to understand the design principles. Everything after that is reference material you can read as needed.


## Getting Started

| Page | Description |
|------|-------------|
| [Getting Started](Setup/getting-started.md) | Prerequisites, installation, and your first import |


## Platform Setup

Pick the guide for your platform. You only need one. These cover schema import and data sync. For custom fields, dashboards, automation, and workflow integration, see the [integration documentation](#integration).

| Page | Description |
|------|-------------|
| [Atlassian Cloud](Setup/atlassian-cloud.md) | JSM Assets on Atlassian Cloud. Schema import, data sync, validation |
| [Atlassian Data Center](Setup/atlassian-data-center.md) | JSM Assets on Jira Data Center. Schema import, data sync, validation |
| [ServiceNow](Setup/servicenow.md) | ServiceNow CMDB via CMDB Instance API and Table API. Custom CI classes for product delivery, OOTB tables for infrastructure. Tested against Zurich |
| [Other Platforms](Setup/other-platforms.md) | iTop, Device42, and other CMDB platforms. Adapter patterns and what to expect |


## Concepts

Read these in order. Each builds on the previous.

| Page | Description |
|------|-------------|
| [CMDB Fundamentals](Concepts/cmdb-fundamentals.md) | What a CMDB is, how it fits into configuration management, and when you need one |
| [CI Selection](Concepts/ci-selection.md) | Criteria for deciding what to track. Product-delivery focus: does it connect to a product you deliver? |
| [Taxonomy Design](Concepts/taxonomy-design.md) | How the classification hierarchy works. Schema files, type hierarchy, naming conventions |
| [Lookup Types and Reference Data](Concepts/lookup-types.md) | Why statuses and categories are first-class objects. How to design and extend |
| [Service Management Design](Concepts/service-management-design.md) | How CMDB types map to CM functions. Boundary between CMDB state and process records |


## Working with Data

| Page | Description |
|------|-------------|
| [Data Files and Rules](Data/data-files-and-rules.md) | JSON format, naming conventions, load priority, relationships.json |
| [Editing Data](Data/editing-data.md) | JSON editing and CSV workflow for team collaboration |
| [Exporting and Round-Trip](Data/exporting-and-round-trip.md) | Export from a live instance, diff, re-import |
| [Validation and Troubleshooting](Data/validation-and-troubleshooting.md) | Running the validator, interpreting errors, fixing issues |


## Schema Design

| Page | Description |
|------|-------------|
| [Taxonomy Playbook](Schema-Design/taxonomy-playbook.md) | End-to-end guide for designing a CMDB taxonomy from scratch |
| [Case Study](Schema-Design/case-study-ovococrm.md) | How CMDB-Kit's schema evolved through seven iterations. Design rationale, key decisions, lessons |
| [Building the Product Library](Schema-Design/building-the-product-library.md) | Version tracking, deployment records, the Product Library branch |
| [Definitive Media Library](Schema-Design/definitive-media-library.md) | Controlled software artifacts. Product Media, Product Suite, Distribution Log |
| [Designing Site Deployments](Schema-Design/designing-site-deployments.md) | Site vs Deployment Site. Multi-product tracking at customer locations |
| [Multi-Product Schema Design](Extending/multi-product-schema-design.md) | Enterprise schema with product-prefixed types and shared services |
| [Schema Assessment](Schema-Design/schema-assessment.md) | Evaluating and improving an existing CMDB schema |


## Configuration Management

| Page | Description |
|------|-------------|
| [CM Operations](Configuration-Management/cm-operations.md) | Day-to-day configuration management operations using the CMDB |
| [Change Control and Baselines](Configuration-Management/change-control-governance.md) | Baseline types (FBL, ABL, PBL), change governance concepts, baseline lifecycle |
| [Personnel Management](Configuration-Management/personnel-management.md) | Person CIs as external contacts, isUser flag, organizational structure |
| [Requirements Management](Configuration-Management/requirements-management.md) | Requirements traceability from requirement to feature to version to deployment |


## Governance

| Page | Description |
|------|-------------|
| [Portfolio and Shared Services](Governance/portfolio-and-shared-services.md) | Multi-product portfolios, shared services branch, cross-product dependencies |
| [Enterprise Architecture](Governance/enterprise-architecture.md) | Service, Capability, Business Process types. When and how to add EA |
| [Scaling and Governance](Governance/scaling-and-governance.md) | Data governance, ownership, quality metrics, growing the CMDB practice |
| [IT Asset Lifecycle](Governance/it-asset-lifecycle.md) | Asset lifecycle management and financial tracking |


## Internals

| Page | Description |
|------|-------------|
| [Schema Reference](Internals/schema-reference.md) | Complete type and attribute reference across base, extended, enterprise |
| [File Naming and Project Structure](Internals/file-naming-and-project-structure.md) | Repository layout, conventions |
| [Schema Changes](Internals/schema-changes.md) | Modifying the schema safely, version control, migration |
| [Writing Custom Adapters](Extending/writing-custom-adapters.md) | How to build an adapter for a new platform |


---

## Integration

Integration documentation covers connecting the CMDB to Jira, ServiceNow ITSM, Confluence, and other tools. These pages describe how other systems consume and update CMDB data.

### JSM Cloud Integration

| Page | Description |
|------|-------------|
| [Cloud Integration Setup](integration/jsm-cloud/setup.md) | Custom fields, dashboards, automation rules, Confluence integration |

### JSM Data Center Integration

| Page | Description |
|------|-------------|
| [DC Integration Setup](integration/jsm-data-center/setup.md) | Custom fields, ScriptRunner, workflows, dashboards, Confluence |

### Common Integration Patterns

| Page | Description |
|------|-------------|
| [Change Management](integration/common/change-management.md) | Change requests, incidents, and CCB workflows in Jira |
| [Deployment Pipeline](integration/common/deployment-pipeline.md) | Jira-driven site registration, media distribution, upgrade tracking |
| [Deployment Handoff](integration/common/deployment-handoff.md) | Handoff between development, CM, and operations teams |
| [Site Lifecycle](integration/common/site-lifecycle.md) | How sites move through provisioning, active, and decommission |
| [Upgrade and Distribution](integration/common/upgrade-and-distribution.md) | Version upgrades, media distribution, and rollback procedures |
| [DML Operations](integration/common/dml-operations.md) | Definitive Media Library operations with Jira tracking |
| [Air-Gapped Deployment](integration/common/air-gapped.md) | Deploying to disconnected or classified environments |
| [Integration Patterns](integration/common/integration-patterns.md) | CMDB-to-Jira, CI/CD, monitoring, and ticketing integrations |
| [API References](integration/common/api-references.md) | JSM Assets and ServiceNow API reference |
| [Cloud vs DC Reference](integration/common/cloud-vs-dc.md) | Cloud and Data Center feature comparison |
| [Wiki Structure](integration/common/wiki-structure.md) | Organizing CMDB documentation in Confluence |
