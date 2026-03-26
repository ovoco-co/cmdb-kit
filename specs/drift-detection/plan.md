# Drift Detection Tool Plan

## Architecture Decisions

### Extension of the validate pattern

cmdb-kit already has three validation tools:

- `tools/validate.js` - offline schema and data validation
- `adapters/jsm/validate-import.js` - post-import comparison (expected vs actual in JSM)
- `adapters/servicenow/validate-import.js` - post-import comparison (expected vs actual in ServiceNow)

Drift detection extends this pattern from "did the import work?" to "has the CMDB stayed accurate?" The tool compares Deployment Site records (expected state from data files) against the live platform state and flags mismatches.

### Adapter pattern for platform queries

The drift tool uses the same adapter pattern as the import and export tools. It queries the target platform (JSM Assets or ServiceNow) for current deployment records, then compares against the Git-resident data files. This means it needs the same connection configuration (.env or environment variables) as the existing adapters.

### Focus on Deployment Sites

Drift detection starts with Deployment Site records because they answer the highest-value question: "is the version we think is deployed at each site actually what's deployed?" Version drift is the most consequential type of CMDB inaccuracy.

The tool can be extended to other CI types later, but Deployment Sites are the priority because they combine version, status, and configuration data in a single record type.

### Output formats

The drift report supports two output modes:

- **JSON** for machine consumption (CI/CD pipelines, scheduled monitoring, dashboards)
- **Formatted table** for human review (terminal output, email reports)

Each drift entry includes: site name, field name, expected value, actual value, and drift severity.

### Drift categories

The report classifies findings into four categories:

1. **Match**: expected and actual values are identical
2. **Mismatch**: field exists in both but values differ (version drift, status drift)
3. **Platform-only**: record exists in the platform but not in cmdb-kit data files (manual additions)
4. **Kit-only**: record exists in data files but not in the platform (missing deployments)

## Implementation Approach

### Tool location and interface

```
tools/drift.js
```

CLI interface:

```bash
# Detect drift against JSM Assets
node tools/drift.js --platform jsm --schema schema/core

# Detect drift against ServiceNow
node tools/drift.js --platform servicenow --schema schema/core

# JSON output for automation
node tools/drift.js --platform jsm --schema schema/core --format json

# Check specific domains too
node tools/drift.js --platform jsm --schema schema/core --domains schema/domains/compliance
```

### Comparison flow

1. Load Deployment Site records from cmdb-kit data files (expected state)
2. Load adapter configuration from environment (.env or exported variables)
3. Query target platform for all Deployment Site records (actual state)
4. Match records by Name field (same matching strategy as import dedup)
5. Compare key fields: productVersion, siteStatus, environment, configuration attributes
6. Generate drift report with categories (match, mismatch, platform-only, kit-only)
7. Output in requested format (table or JSON)

### Key fields to compare

| Field | Why |
|-------|-----|
| productVersion | Most critical: is the deployed version what we expect? |
| siteStatus | Is the site in the expected operational state? |
| environment | Has the environment classification changed? |
| workflowStatus | Is the site at the expected lifecycle stage? |
| upgradeStatus | Is an upgrade in the expected state? |

### Configuration

The tool uses the same config pattern as the adapters:

- JSM: JSM_URL, JSM_USER, JSM_PASSWORD, SCHEMA_KEY
- ServiceNow: SN_INSTANCE, SN_USER, SN_PASSWORD

No new configuration needed. A `.driftrc.json` file could override default field comparisons and severity thresholds, but is not required for initial implementation.

### Reuse of existing code

The tool imports from existing adapter libraries:

- JSM: `adapters/jsm/lib/` for API client and AQL queries
- ServiceNow: `adapters/servicenow/lib/` for API client and table queries
- Core: `tools/lib/file-loader.js` for loading schema and data files

## Phases

### Phase 1: Core drift detection

Build `tools/drift.js` with JSM Assets support. Compare Deployment Site records. Output formatted table and JSON.

### Phase 2: ServiceNow support

Add ServiceNow as a target platform. Reuse the same comparison logic with ServiceNow-specific queries.

### Phase 3: Extended field coverage

Add comparison for other high-value CI types beyond Deployment Sites: Products (status, version), Servers (OS, environment), Baselines (status, approval date).

### Phase 4: Scheduled drift checks

Document patterns for running drift detection as a scheduled job:

- ServiceNow: Scheduled Flow or Scheduled Job querying for version mismatches
- JSM: Scheduled AQL queries for deployment version parity
- CLI: cron job running `tools/drift.js` with JSON output piped to alerting

## Dependencies

- Blocked by: Core + Domains restructure (Deployment Site type moves to Core)
- Blocks: Nothing (additive tool)

## File Paths

| File | Purpose |
|------|---------|
| `tools/drift.js` | Drift detection tool (to be created) |
| `tools/lib/file-loader.js` | Schema and data file loader (existing) |
| `adapters/jsm/lib/` | JSM API client and query support (existing) |
| `adapters/servicenow/lib/` | ServiceNow API client (existing) |
| `schema/core/data/deployment-site.json` | Expected Deployment Site state (after restructure) |
| `schema/base/data/deployment.json` | Current deployment data (pre-restructure) |
