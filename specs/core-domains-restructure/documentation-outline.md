# CMDB-Kit 2.0 Documentation Outline

## For Users (docs/)

### Getting Started
- What CMDB-Kit is and what problem it solves
- The three traditions and where CMDB-Kit fits
- When to use CMDB-Kit and when not to
- Quick start: import Core into JSM Cloud
- Quick start: import Core into ServiceNow

### Core Schema
- Core Questions: what the schema answers
- Type reference: every type with attributes and what question it answers
- Example data walkthrough: the OvocoCRM story
- Relationships: how types connect to each other

### Platform Setup
- JSM Assets Cloud setup
- JSM Assets Data Center setup
- ServiceNow setup (CMDB Instance API, custom CI classes, identification rules)
- Validation and troubleshooting

### Working with Data
- Data files and rules
- Editing and maintaining data
- Import and export
- Round-trip workflow (export, edit, reimport)

### Configuration Management with CMDB-Kit
- Tracking versions and releases
- Managing deployment sites
- Establishing and maintaining baselines
- Change control and the CMDB
- Personnel and responsibility tracking
- Document management

### Domains (one section per domain)
- What this domain does and who it's for
- Questions this domain answers
- Types and attributes
- Example data
- What commercial plugin it replaces
- Platform-specific setup notes

### Portfolio Mode
- When to use portfolio mode
- How product-prefixed types work
- Shared vs isolated types
- Multi-product example data

## For Developers (docs/integration/)

### Schema Internals
- Schema structure and file organization
- How Core + Domains works
- Adding types and attributes
- Writing custom adapters

### Platform Integration
- JSM Cloud: automation rules, dashboards, Confluence integration
- JSM Data Center: ScriptRunner, workflows, dashboards
- ServiceNow: CMDB workspace, Flow Designer, scoped app architecture
- Common: change management patterns, deployment pipeline integration

### Extending CMDB-Kit
- Creating a new domain
- Domain dependency declarations
- Writing domain-specific automations
- Contributing to the project

## For Decision Makers

### Problem Statement
- The three traditions gap
- Evidence from marketplaces, books, and industry research
- When CMDB-Kit is the right answer

### Domain Guide
- Domain overview table (team, questions answered, plugin replaced)
- Selecting domains for your organization
- Cost comparison with commercial plugins

### Standards Alignment
- ITIL 4 SACM mapping
- EIA-649C mapping
- MIL-HDBK-61B mapping
- ISO/IEC 20000 mapping

## File Locations

| Document | Location |
|----------|----------|
| Problem statement | specs/002-core-domains-restructure/problem-statement.md |
| Competitive research | specs/002-core-domains-restructure/competitive-research-results.md |
| Core definition (question mapping) | specs/002-core-domains-restructure/core-definition.md |
| Core questions (from source docs) | specs/002-core-domains-restructure/questions-from-sources.md |
| Additional questions | specs/002-core-domains-restructure/questions-from-sources-2.md |
| Constitution | .specify-projects/cmdb-kit/memory/constitution.md |
| Feature spec | specs/002-core-domains-restructure/spec.md |
