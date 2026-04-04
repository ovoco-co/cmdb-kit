# Documentation Specification: CMDB-Kit 2.0

## Approach

Documentation follows the user's journey from discovery to productive use. Each document answers the question the user has at that moment. A user reads them in order and each one builds on the last.

## The User Journey

### 1. What problem does this solve, and is it my problem?

**Document**: The Problem
**User's state**: Found CMDB-Kit on GitHub or a blog. Needs to know in 2 minutes whether to keep reading.
**Must answer**:
- What three traditions exist and why they don't talk to each other
- What gap that creates for someone shipping software to customer sites
- What evidence exists that nobody else solves this (marketplace research, book research, Boeing evidence)
- Who this is for (configuration manager, technical lead, defense/government, commercial with on-prem deployments)
- Who this is NOT for (pure IT ops, small programs with fewer than 10 sites, no ServiceNow/JSM)
**Source**: problem-statement.md, competitive-research-results.md

### 2. What do I get if I install it?

**Document**: The Core Schema
**User's state**: Problem resonates. Wants to see what they're actually getting before committing time.
**Must answer**:
- Core answers 7 categories of questions (list every question)
- For each question category: which types answer it, which attributes matter
- The type hierarchy: 4 branches, what's in each
- What the example data looks like (the OvocoCRM story, briefly)
- What Core deliberately does NOT include and why (infrastructure detail, compliance, licensing are domains)
**Source**: core-definition.md, schema/core/schema-structure.json, schema/core/schema-attributes.json

### 3. How do I install it?

**Document**: Getting Started
**User's state**: Decided to try it. Has a JSM or ServiceNow instance. Needs to go from zero to imported in 15 minutes.
**Must answer**:
- Prerequisites (Node.js, git clone, instance access)
- Validate offline first (prove it works before touching your instance)
- Configure connection (.env file)
- JSM path: schema mode then data mode (two commands)
- ServiceNow path: schema mode then sync mode (two commands)
- What you should see after each command
**Source**: core-verification.md (actual tested commands and output), .env.example

### 4. Did it work?

**Document**: Verification
**User's state**: Ran the import. Needs to confirm everything landed correctly.
**Must answer**:
- How to run post-import validation
- How to check in the platform UI (JSM: browse the schema; ServiceNow: open the CMDB workspace)
- Expected record counts per type
- Common errors and what they mean
- How to re-run if something went wrong
**Source**: core-verification.md, adapters/jsm/validate-import.js, adapters/servicenow/validate-import.js

### 5. How do I replace the example data with my own?

**Document**: Your Data
**User's state**: Has CMDB-Kit running with OvocoCRM data. Needs to replace it with real products, versions, sites, and people.
**Must answer**:
- The data file format (JSON, kebab-case files, camelCase attributes)
- How references work (exact Name matching, case-sensitive)
- The order to populate (lookups first, then directory, then CIs - follow LOAD_PRIORITY)
- How to validate before importing
- CSV workflow for teams that prefer spreadsheets
- How to do a round-trip (export current state, edit, reimport)
**Source**: schema/core/data/ files as examples, tools/ commands

### 6. Can I answer my actual questions now?

**Document**: Using the CMDB
**User's state**: Has their own data loaded. Wants to use it for real work.
**Must answer**:
- For each Core Question category: how to answer it with a query (JSM AQL, ServiceNow filter)
- The "is this site current or behind?" query (compare Deployment Site version to current Product Version)
- The "what changed since the last baseline?" query
- The "who do I call when something breaks at this site?" lookup chain
- How relationships between types work on each platform
**Source**: core-definition.md questions, platform query syntax

### 7. I need more than Core. What else is there?

**Document**: Domains
**User's state**: Core is working. They need infrastructure tracking, or compliance, or distribution, or licensing.
**Must answer**:
- What a domain is (opt-in package, references Core, Core never references it)
- Table: domain, team that uses it, questions it answers, what commercial plugin it replaces
- For each domain: one paragraph, types it adds, how to validate and import
- How to select domains for your organization
**Source**: domain-definitions.md, schema/domains/*/README.md, competitive-research-results.md

### 8. How do I add a domain?

**Document**: Installing a Domain
**User's state**: Chose a domain. Needs to add it to their running instance.
**Must answer**:
- Validate Core + domain together: `--domain` flag
- Import: same adapter commands, just with domain data files
- What happens on the platform (new types appear alongside Core types)
- Verify the domain types and data
**Source**: validate.js --domain support, adapter import process

### 9. How do I extend this for something you didn't build?

**Document**: Extending CMDB-Kit
**User's state**: Power user or developer. Wants to create a new domain, write an adapter, or understand the internals.
**Must answer**:
- Architecture: schema layer, data layer, adapter layer (how they connect)
- Creating a new domain: directory structure, rules, validation
- Writing an adapter: required scripts, overlay pattern, import modes
- Standards alignment: ITIL 4, EIA-649C, MIL-HDBK-61B, ISO 20000 (for users who need to justify the approach)
**Source**: constitution principles, adapter code, whitepaper standards sections

## Reference Material (not journey docs)

**Schema Reference**: Generated tables of every type and attribute across Core and all domains. Not a document to read, a document to look things up in. Generated from schema files, not hand-written.

## What Gets Deleted

All 55 existing files in docs/ except:
- docs/marketing/ (blog posts published externally, separate concern)
- docs/whitepaper.md (marketing piece, rewrite separately)

## Document Count

9 journey documents + 1 reference document = 10 files total.

Down from 55 files and 13,600 lines of stale content.

## Writing Order

Same as the journey. Each document can be reviewed and approved before the next one starts. A user can start using CMDB-Kit after document 4 and doesn't need to wait for all 10.

## Before Writing

Read every source document cover to cover. Build the mental model. Outline each document with specific claims, examples, queries, and references before writing prose.
