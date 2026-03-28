# No-CLI Installation

**Status**: Not Started
**Priority**: Medium
**Created**: 2026-03-28

## The Problem

Installing cmdb-kit on ServiceNow or JSM Assets currently requires Node.js, git, and CLI commands. Some target users are ServiceNow admins or JSM admins who don't have Node.js on their machine and aren't comfortable with CLI tools. They need a way to get cmdb-kit into their platform without a developer.

## Who This Is For

- ServiceNow admins who manage the CMDB through the platform UI
- JSM Assets admins who build schemas through the Assets UI
- Consultants doing a quick demo or evaluation
- Organizations where developer tools aren't allowed on admin workstations

## Current State

### What works (requires CLI)
- ServiceNow: `node adapters/servicenow/import.js schema && sync`
- JSM Assets: `node adapters/jsm/import.js schema && data`
- Both create types, attributes, and records programmatically

### What doesn't work (no CLI alternatives)
- No update set XML for ServiceNow (PDI blocks export, need partner instance)
- No Forge app for JSM Cloud (deferred)
- No web-based import tool
- No downloadable CSV templates that work without the CLI converter

## Possible Solutions

### Option A: ServiceNow Update Set

Package the scoped app as an update set XML. Requires a ServiceNow partner developer instance (not a PDI) to publish. The update set would create all custom tables, columns, identification rules, and UI components. Data would still need to be imported separately (CSV upload to each table through the ServiceNow UI, or a background script).

**What it takes**: Partner developer instance ($), build the update set, test on clean instance, maintain for each ServiceNow release.

**What the user does**: Retrieved Update Sets > Upload XML > Preview > Commit. Then manually populate data through the ServiceNow list UI or CSV import.

### Option B: ServiceNow Background Script

A single JavaScript file that runs in ServiceNow's Scripts - Background console. Creates all tables, columns, identification rules, lookup records, and example data in one execution. No external tools needed.

**What it takes**: Convert the schema-structure.json, schema-attributes.json, and data files into GlideRecord operations. Generate the script from the schema files (could be a new tool: `node tools/generate-background-script.js`).

**What the user does**: Copy-paste the script into Scripts - Background, click Run. Everything is created.

**Limitations**: Script size limits in ServiceNow (may need to split into multiple scripts). No progress indicator. Error handling is limited to server-side logs.

### Option C: JSM Assets CSV Import

JSM Assets supports CSV import through the UI. Generate pre-formatted CSV files that can be imported directly through Assets > Import > CSV. The CSV files would need to include all object type and attribute definitions in JSM's expected format.

**What it takes**: Research JSM's CSV import format. Generate compatible CSVs from our schema files. Document the manual import order (lookups first, then CIs).

**What the user does**: Download CSVs from GitHub. Open JSM Assets. Import CSVs in the documented order.

**Limitations**: JSM CSV import creates objects but may not create object types or attributes automatically. May still require manual type creation through the UI before importing data.

### Option D: Web-Based Import Tool

A hosted web application (on ovoco.co or as a static GitHub Pages site) that reads the user's platform credentials and pushes the schema via the same REST APIs the CLI adapter uses. The user fills in their instance URL and credentials in a browser form and clicks Import.

**What it takes**: Web frontend, secure credential handling (never store, use client-side only), CORS considerations, hosting.

**What the user does**: Go to a URL, enter credentials, select Core + domains, click Import.

**Limitations**: CORS may block direct API calls from a browser to ServiceNow/JSM. May need a proxy. Security concerns with entering admin credentials in a third-party web page.

### Option E: Downloadable Documentation-Only Package

Instead of automating the installation, provide step-by-step manual instructions with screenshots for creating each type and attribute through the platform UI. Include a printable checklist.

**What it takes**: Write the guide with screenshots for JSM Cloud, JSM DC, and ServiceNow. Maintain it as the schema changes.

**What the user does**: Follow the guide manually. Create each type, add each attribute, enter each lookup value by hand.

**Limitations**: Tedious for the full Core schema. Error-prone. But guaranteed to work on any instance without any tooling.

## Recommendation

Start with Option B (background script) for ServiceNow and Option E (manual guide) for JSM Assets. Background script is the lowest friction for ServiceNow admins. Manual guide is the safest for JSM admins who can create types through the UI.

Option A (update set) should be pursued when we have a partner developer instance. Option D (web tool) is the long-term answer but has the most development cost. Option C needs research into JSM's CSV import capabilities.

## Dependencies

- Option A: ServiceNow partner developer instance (business decision, cost)
- Option B: Schema files stable (Core restructure done)
- Option C: Research JSM CSV import format
- Option D: Web hosting, CORS research
- Option E: Screenshots from current platform versions

## Success Criteria

A ServiceNow admin or JSM admin can install cmdb-kit Core on their instance without installing Node.js, git, or running any CLI commands.
