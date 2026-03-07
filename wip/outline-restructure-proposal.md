# Documentation Restructure Proposal

## Design Principles

1. Practical first, theory later. Get the user doing real work before teaching
   CMDB philosophy.
2. Separate general CMDB content from PMO/defense/portfolio content. The general
   guide works for any team adopting CMDB-Kit. The PMO part is for the team and
   BAE, covering CCBs, classified deployments, multi-site lifecycle, and
   governance bodies.
3. The round-trip workflow (export, edit, re-import) is a first-class citizen,
   not something you piece together from three documents.
4. The Atlassian Implementation mega-chapter gets broken up.
5. Developer Manual stays separate but Schema Changes and File Naming move to
   the User Guide since admins need them.


## Proposed Structure


# User Guide

## Part 1: Setup and First Import

Get CMDB-Kit running. A new user finishes this part with a working CMDB.

### Getting Started
- Prerequisites
- Choose a Schema Layer
- Validate the Schema
- Explore the Example Data

### JSM Assets Setup
- Creating an Empty Schema in JSM
- Why CMDB-Kit Does Things Differently (lookup types)
- Environment Setup (.env file, Cloud vs Data Center)
- Running the Import (schema sync, data sync)
- Verifying the Result
- API References

### ServiceNow Setup
- How CMDB-Kit Maps to ServiceNow
- Environment Setup
- Running the Import
- Verifying the Result

### Other Platforms
- Supported Adapters
- Building a Custom Adapter (link to Developer Manual)


## Part 2: Working With Data

Day-to-day operations. How to get data in, get data out, keep it clean.

### Data Files and Rules
- File format and naming (kebab-case, flat vs nested)
- The Name field as unique identifier
- Never include Key or id fields
- Reference values (exact name matching, case sensitivity, semicolons)
- JSON data formats (flat array, nested object)

### Editing Data
- JSON editing for small changes
  - Adding, updating, and removing records
  - JSON syntax pitfalls
- Spreadsheet workflow for bulk changes
  - Generating templates (CSV and XLSX)
  - Template structure (three header rows, column rules)
  - Filtering by type, family, or role
  - Filling data in Excel
  - Converting back to JSON

### Exporting and Round-Trip Workflow
- Exporting from a live database
  - Pulling current state to local JSON
  - Previewing changes with diff
  - Overwriting local files
- The round-trip: export, generate templates, edit, convert, validate, sync
- Quick reference (six commands)
- When to use this (bulk updates, team collaboration, data migration, review)

### Validation and Troubleshooting
- Offline validation with tools/validate.js
  - What it checks (nine categories)
- Post-import validation with validate-import.js
- Schema drift detection with check-schema.js
- Common errors and their fixes
- The debugging checklist

### Schema Changes
- Adding new types (5-step process with worked example)
- Modifying existing types (add/remove/change attributes)
- File naming conventions (types, attributes, data files)
- Keeping schema layers in sync
- Git workflow (separate schema commits from data commits)
- Rollback strategy


## Part 3: CMDB Concepts

Theory and design principles. Read this when you are ready to understand
why the schema is shaped the way it is, or when you need to customize it.

### CMDB Fundamentals
- What a CMDB is and why it matters
- Configuration items vs assets
- Relationships as first-class data
- ITIL 4 service configuration management
- When you need a CMDB vs when a spreadsheet is fine

### CI Selection
- What makes something a CI
- Positive and negative indicators for CI designation
- Scoping criteria
- The CMDB-Kit type catalog as a selection menu
- What not to put in the CMDB
- Decision framework

### Taxonomy Design
- The four-branch hierarchy (Product CMDB, Product Library, Directory, Lookups)
- CI type vs lookup type vs attribute
- Parent-child relationships
- Base vs extended vs enterprise schema
- Extending the taxonomy with custom types
- Naming conventions
- Real-world examples (OvocoCRM)

### Lookup Types and Reference Data
- Why status values are separate object types
- How lookup types work in CMDB-Kit
- Designing your own lookup types
- The complete lookup type catalog

### Service Management Design
- Mapping your processes to CMDB types
- Change enablement
- Incident management
- Service level management
- Release management
- IT asset management
- ITIL 4 practice alignment


## Part 4: Schema Design

Designing and extending the schema for specific use cases.

### Building the Product Library
- Product Version as the anchor
- Documentation suites and document types
- Baselines and certifications
- Documentation completeness audit
- Building a complete release record

### Definitive Media Library
- What the DML is (ITIL secure store)
- DML architecture (three-tier model)
- Folder organization
- Product media and file naming standards
- Release designation system (GOLD, GC, TR)
- Product suites
- Document tracking
- Media intake and delivery workflows
- Distribution log
- DML hygiene and auditing

### Designing Site Deployments
- Site vs Deployment Site (the two-record pattern)
- Site as a shared identity
- Deployment Site as a product record
- Related record types (location, org, personnel assignments)
- Site status lifecycle
- Deployments and environment types
- Multi-product patterns


## Part 5: Platform Patterns

Advanced configuration for specific platforms.

### Atlassian Implementation Patterns
- Tool responsibility matrix (Assets = state, Jira = work, Confluence = knowledge)
- Multi-product schema design
- Portal request types
- Custom fields and cascade filtering with AQL
- AQL query library
- Workflows and approval patterns

### Atlassian Automation and Dashboards
- ScriptRunner automation
- Automation rules
- Dashboards and queues
- Jira issue types and field mapping
- Confluence integration

### Wiki Structure
- The three-tier documentation model
- Page hierarchy matching the CMDB taxonomy
- Library item tracking
- Templates for CI documentation pages
- Document review workflow
- Keeping the wiki in sync with the live CMDB
- Confluence-specific patterns
- Other wiki platforms


## Part 6: Governance

Scaling, quality, and long-term management.

### Portfolio and Shared Services
- Managing the CMDB across a program portfolio
- Shared services as CMDB custodian
- Global vs program-specific lookups
- Practical patterns

### Enterprise Architecture
- UAF as an EA template for the CMDB
- Mapping UAF domains to CMDB-Kit types
- Service modeling and capability mapping
- Application portfolio management
- Extending the schema for EA

### Scaling and Data Governance
- Data quality practices
- Data hygiene auditing
- Ownership and accountability
- Review cadence
- Performance considerations
- Backup and recovery

### IT Asset Management Lifecycle
- Six-phase asset lifecycle
- ITAM data model alignment
- Financial and compliance integration
- Discovery and reconciliation
- Compliance frameworks


## Part 7: PMO and Deployment Operations

For teams managing a portfolio of products deployed to multiple customer
sites, especially in environments with classification requirements,
formal change control, and air-gapped networks. This part draws on
patterns from a production military CMDB managing three products across
dozens of deployment sites.

### Configuration Management Operations
- CM department structure
  - The four pillars of CM (identification, control, status accounting, audit)
  - Role definitions (CM Lead, CM Analyst, Librarian, CCB Chair, PMO)
- Change control governance bodies
  - Product configuration control boards (scope, membership, authority)
  - Strategic delivery body (portfolio-level release decisions)
  - Joint CM working group (cost, schedule, performance impact)
  - Interface control working group
- Change classification
  - Class I changes (form, fit, function)
  - Class II changes (implementation details)
  - Five-dimension impact analysis (technical, cost, schedule, risk, performance)
- Baseline management process
- Emergency change procedures

### Personnel Management
- Modeling personnel in the CMDB (org, team, person)
- Posts and positions (role-based, not person-based)
- Certifications and qualifications
- Security clearances
- Role-based CI ownership

### Requirements Management
- Using the Feature type for requirements
- Requirement types and hierarchy
- Requirement lifecycle and immutable audit records
- Traceability (implements, satisfies, verifies, derives, documents)
- Integration with change management and test management

### Site Lifecycle and Pipeline
- The full site lifecycle (pre-planning through decommission)
- The three-status data model (site status, workflow status, upgrade status)
- Phase ownership across the enterprise
- Pipeline schema design
- Pipeline tracker setup (issue types, workflows, boards, dashboards)
- Managing the pipeline (prospecting, qualification, site survey, engineering)
- Pipeline reporting

### Deployment Handoff
- Migration triggers
- Export from pipeline, import to production CMDB
- Data mapping (direct fields, translated fields, production-only fields)
- Cross-team coordination
- Go-live process

### Upgrade and Distribution Operations
- Upgrade campaign management
- Media distribution tracking (distribution log workflow)
- Site version tracking (three version references)
- Contact management at deployment sites
- Cross-system notification for air-gapped environments

### DML Operations
- Document review reporting (DRR workflow, review cycles, comment resolution)
- Intake processing (metadata, artifact types, submission methods, rejection)
- Operational checklists (DML-CMDB consistency, document compliance, naming)

### Air-Gapped and Offline Deployment
- Deployment scenarios (connected vs air-gapped)
- Import method comparison (ScriptRunner, portable package, cURL)
- ScriptRunner import (Groovy scripts for schema and data)
- Portable package import
- Media transfer procedures (encrypted USB, classification markings, chain of custody)
- Verification after import


# Developer Manual

## Part 1: Project Internals

### File Naming and Project Structure
- Repository layout
- Schema directory structure
- Data file naming convention
- JSON data formats
- Adding new files when extending the schema
- Keeping base and extended schemas in sync

### Schema Reference
- Schema hierarchy (base, extended, enterprise)
- CI types (base and extended)
- Lookup types

## Part 2: Extending

### Writing Custom Adapters
- Adapter structure and required scripts
- Configuration pattern and data file resolution
- Import order and reference resolution
- Error handling
- Example: minimal adapter

### System Integration Patterns
- Assets vs issues (the core principle)
- Common integration scenarios
- Linking patterns
- AQL fundamentals and query patterns
- Portability
- Dashboard integration and cross-system reporting


## What Changed and Why

### Moved earlier (practical first)
- JSM Setup, ServiceNow Setup, and Other Platforms moved from Part 3 to Part 1.
  Users need to get running before learning theory.
- Data Entry and Validation moved from Part 4 to Part 2. These are the first
  things you do after setup.
- Schema Changes moved from Developer Manual to Part 2. Admins extending the
  schema are not developers.

### New content
- Exporting and Round-Trip Workflow (Part 2). The most common real-world data
  workflow was completely absent.

### Restructured
- 04-03 Data Entry rewritten as three chapters: Data Files and Rules, Editing
  Data, and Exporting and Round-Trip Workflow.
- 03-02 Atlassian Implementation split into two chapters: Patterns (config and
  queries) and Automation (scripts, rules, dashboards).

### Moved to Part 7 (PMO and Deployment Operations)
- 01-06 CM Operations. CCBs, Class I/II changes, and governance bodies are
  defense/PMO patterns, not general CMDB concepts.
- 04-01 Personnel Management. Posts, clearances, and certification tracking
  are driven by the PMO context.
- 04-02 Requirements Management. Feature-as-requirement with traceability and
  immutable audit records comes from defense contract compliance.
- 04-05 DML Operations. Intake processing, DRR workflows, and operational
  checklists are specific to a managed media library.
- All of Part 6 (Deployment Lifecycle). Site lifecycle, pipeline, handoff,
  and upgrade campaigns are multi-site deployment patterns.
- Dev Manual 02-03 Air-Gapped Deployment. Classified network deployment
  belongs with the PMO content.

### Removed from Developer Manual
- Schema Changes and Version Control (moved to User Guide Part 2)
- Air-Gapped Deployment (moved to User Guide Part 7)

### Unchanged
- Part 3 CMDB Concepts (was Part 1, minus CM Operations)
- Part 4 Schema Design (was Part 2)
- Part 6 Governance (was Part 5)
- Developer Manual Part 1 (Project Internals) and Part 2 (Extending), minus
  the chapters that moved
