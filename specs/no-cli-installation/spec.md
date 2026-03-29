# No-CLI Installation

**Feature Branch**: no-cli-installation
**Created**: 2026-03-28
**Status**: Not Started
**Input**: Current CLI-based installation workflow, platform admin personas

## User Scenarios and Testing

### P1: ServiceNow admin installs cmdb-kit without developer tools

**Why this priority**: Some target users are ServiceNow admins who don't have Node.js and aren't comfortable with CLI tools. They need a way to get cmdb-kit into their platform without a developer.

**Independent Test**: A ServiceNow admin with no Node.js installed successfully gets cmdb-kit Core running on their instance.

**Acceptance Scenarios**:

- Given a ServiceNow admin with access to Scripts - Background
  When they copy-paste the background script and click Run
  Then all Core tables, columns, identification rules, lookup records, and example data are created

- Given the background script completes
  When the admin opens the CMDB
  Then all cmdb-kit Core types are visible with correct attributes and populated data

### P2: JSM admin installs cmdb-kit through the platform UI

**Why this priority**: JSM admins build schemas through the Assets UI and may not have CLI tools available.

**Independent Test**: A JSM admin follows the manual guide to create all Core types and attributes through the UI.

**Acceptance Scenarios**:

- Given a JSM admin reads the step-by-step manual guide
  When they follow each step to create types, attributes, and lookup values
  Then the resulting schema matches what the CLI adapter would produce

### P3: Consultant does a quick demo or evaluation

**Why this priority**: Consultants doing evaluations need the fastest path to a working demo.

**Independent Test**: Time how long it takes to go from zero to working CMDB without CLI tools.

**Acceptance Scenarios**:

- Given a consultant has a ServiceNow instance
  When they use the background script
  Then a working cmdb-kit Core is running within minutes, suitable for a demo

## Edge Cases

- ServiceNow script size limits may require splitting into multiple scripts
- JSM CSV import may not create object types automatically (may still require manual type creation)
- Background script errors are limited to server-side logs with no progress indicator
- CORS may block direct API calls from a browser to ServiceNow/JSM for the web tool option
- Admin credentials entered in a web-based tool raise security concerns

## Requirements

### Functional Requirements

- FR-001: Provide a ServiceNow background script that creates all Core tables, columns, identification rules, and data without external tools
- FR-002: Provide step-by-step manual instructions with screenshots for creating types through the JSM Assets UI
- FR-003: Background script must be generatable from schema files (tools/generate-background-script.js)
- FR-004: Manual guide must cover JSM Cloud, JSM DC, and ServiceNow platforms

### Key Entities

- Background script (ServiceNow Scripts - Background)
- Manual installation guide (JSM Assets)
- CSV templates (potential JSM import format)
- Update set XML (future, requires partner developer instance)

## Possible Solutions

### Option A: ServiceNow Update Set

Package the scoped app as an update set XML. Requires a ServiceNow partner developer instance (not a PDI) to publish. The update set would create all custom tables, columns, identification rules, and UI components. Data would still need to be imported separately.

**What it takes**: Partner developer instance ($), build the update set, test on clean instance, maintain for each ServiceNow release.

**What the user does**: Retrieved Update Sets > Upload XML > Preview > Commit. Then manually populate data through the ServiceNow list UI or CSV import.

### Option B: ServiceNow Background Script (Recommended first)

A single JavaScript file that runs in ServiceNow's Scripts - Background console. Creates all tables, columns, identification rules, lookup records, and example data in one execution. No external tools needed.

**What it takes**: Convert the schema-structure.json, schema-attributes.json, and data files into GlideRecord operations. Generate the script from the schema files (could be a new tool: `node tools/generate-background-script.js`).

**What the user does**: Copy-paste the script into Scripts - Background, click Run. Everything is created.

**Limitations**: Script size limits in ServiceNow (may need to split into multiple scripts). No progress indicator. Error handling is limited to server-side logs.

### Option C: JSM Assets CSV Import

JSM Assets supports CSV import through the UI. Generate pre-formatted CSV files that can be imported directly through Assets > Import > CSV.

**What it takes**: Research JSM's CSV import format. Generate compatible CSVs from our schema files. Document the manual import order (lookups first, then CIs).

**What the user does**: Download CSVs from GitHub. Open JSM Assets. Import CSVs in the documented order.

**Limitations**: JSM CSV import creates objects but may not create object types or attributes automatically. May still require manual type creation through the UI before importing data.

### Option D: Web-Based Import Tool

A hosted web application that reads the user's platform credentials and pushes the schema via the same REST APIs the CLI adapter uses.

**What it takes**: Web frontend, secure credential handling (never store, use client-side only), CORS considerations, hosting.

**What the user does**: Go to a URL, enter credentials, select Core + domains, click Import.

**Limitations**: CORS may block direct API calls from a browser to ServiceNow/JSM. May need a proxy. Security concerns with entering admin credentials in a third-party web page.

### Option E: Downloadable Documentation-Only Package (Recommended first for JSM)

Step-by-step manual instructions with screenshots for creating each type and attribute through the platform UI. Include a printable checklist.

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

- SC-001: A ServiceNow admin can install cmdb-kit Core on their instance without installing Node.js, git, or running any CLI commands
- SC-002: A JSM admin can install cmdb-kit Core on their instance without installing Node.js, git, or running any CLI commands
- SC-003: The background script produces the same result as the CLI adapter on a clean ServiceNow instance
- SC-004: The manual guide covers all Core types and attributes with step-by-step instructions

## Assumptions

- ServiceNow Scripts - Background is accessible to target admins (requires admin role)
- JSM Assets UI supports manual creation of all type and attribute configurations that the CLI adapter creates
- Schema files are stable (Core restructure is complete) before generating installation artifacts
- ServiceNow script size limits can be worked around by splitting into multiple scripts if needed
