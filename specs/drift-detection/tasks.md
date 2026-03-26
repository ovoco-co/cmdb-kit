# Drift Detection Tasks

## Phase 1: Core Drift Detection (JSM Assets)

- [ ] Create `tools/drift.js` with CLI argument parsing (--platform, --schema, --domains, --format)
- [ ] Implement data file loader: read Deployment Site records from schema data directory
- [ ] Implement JSM adapter query: fetch all Deployment Site objects from JSM Assets via AQL
- [ ] Implement record matching: pair expected (data file) and actual (platform) records by Name
- [ ] Implement field comparison for key fields: productVersion, siteStatus, environment, workflowStatus, upgradeStatus
- [ ] Implement drift categorization: match, mismatch, platform-only, kit-only
- [ ] Implement formatted table output for terminal display
- [ ] Implement JSON output mode for machine consumption
- [ ] Add summary statistics: total records, matches, mismatches, platform-only count, kit-only count
- [ ] Test against a JSM Assets instance with known drift (manually modify a Deployment Site version)
- [ ] Document usage in tool help text (--help flag)

## Phase 2: ServiceNow Support

- [ ] Implement ServiceNow adapter query: fetch Deployment Site records via Table API or CMDB Instance API
- [ ] Handle ServiceNow-specific field naming (u_name, table prefix differences)
- [ ] Handle reference field resolution (ServiceNow returns sys_ids, need display values for comparison)
- [ ] Test against Zurich PDI with known drift
- [ ] Verify --platform servicenow flag works end-to-end

## Phase 3: Extended Field Coverage

- [ ] Add Product type drift detection (status, version, technology)
- [ ] Add Server type drift detection (operatingSystem, environment, status)
- [ ] Add Baseline type drift detection (status, approvalDate)
- [ ] Add --types flag to specify which CI types to check (default: Deployment Site only)
- [ ] Add configurable field comparison list via .driftrc.json (override default fields per type)

## Phase 4: Scheduled Drift Checks

- [ ] Document cron job pattern: `node tools/drift.js --format json | <alerting pipeline>`
- [ ] Document ServiceNow Scheduled Job pattern for drift detection
- [ ] Document JSM scheduled AQL query patterns for version parity checks
- [ ] Add exit code support: exit 0 for no drift, exit 1 for drift detected (enables CI/CD gating)

## Documentation

- [ ] Write usage guide for `tools/drift.js`
- [ ] Add drift detection to `docs/Data/validation-and-troubleshooting.md`
- [ ] Add drift detection section to adapter setup guides
- [ ] Update README.md tools section to include drift detection

## Not Started

No drift detection code exists in the codebase. The Deployment Site type and its data file exist in `schema/base/data/deployment.json` (current) and will move to `schema/core/data/` after the restructure.
