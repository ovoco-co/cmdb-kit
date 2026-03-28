# Scoped App Update Set Export

**Status**: Not Started
**Priority**: Medium (enables customer distribution)
**Created**: 2026-03-28

## What

Export the x_cmdbk scoped application from the PDI (dev210250) as an update set XML file. This file can be imported into any ServiceNow instance to install cmdb-kit's custom tables, columns, identification rules, and UI components.

## Why

Currently, installing cmdb-kit on ServiceNow requires running the Node.js adapter (schema mode) against the target instance. This requires API access and Node.js. An update set allows installation through ServiceNow's native "Retrieved Update Sets" UI with no external tools.

## What the Update Set Contains

- Custom tables (u_cmdbk_* or x_cmdbk_*)
- Custom columns on those tables
- Identification rules and entries
- Application menu and navigation modules (from install-scoped-app.js)
- Any UI policies, client scripts, or business rules created on the PDI

## What It Does NOT Contain

- Example data (data is imported separately via the adapter)
- OOTB table modifications (Server is cmdb_ci_server, no customization needed)
- Relationship records (created at import time)

## Steps

### Phase 1: Verify app scope on PDI

1. Navigate to System Applications > Studio on the PDI
2. Open the x_cmdbk application
3. Verify all custom tables, columns, and identification rules are captured in the app scope
4. Check that install-scoped-app.js artifacts (menu, modules, class registrations) are in scope

### Phase 2: Publish to update set

1. In Studio, select "Publish to Update Set"
2. Name: "CMDB-Kit v2.0.0"
3. Export the update set XML

### Phase 3: Save to repo

1. Download the XML from the PDI
2. Save to adapters/servicenow/update-sets/cmdb-kit-v2.0.0.xml
3. Document the installation process in docs/platform-servicenow.md

### Phase 4: Test on clean instance

1. Import the update set XML on a different PDI or clean instance
2. Verify tables, columns, and identification rules are created
3. Run the adapter data import against the new instance
4. Verify all types import correctly

## Dependencies

- PDI access (dev210250)
- All schema changes committed and imported to PDI
- Playwright for Studio UI navigation

## Success Criteria

- Update set XML file in the repo
- Import on a clean instance creates all custom tables and columns
- Adapter data import works against the clean instance
- Documentation covers the update set installation process
