# Drift Detection Tool

**Status**: Done (PR #16 merged 2026-03-28)
**Updated**: 2026-03-26
**Priority**: High

### What's pending
- Design adapter interface for querying platform deployment state
- Build tools/drift.js using existing adapter pattern
- Support JSM Assets and ServiceNow as target platforms
- Output format: drift report with expected vs actual per Deployment Site
- Documentation and usage guide

## Overview

New tool at `tools/drift.js` that compares Deployment Site records (expected version at each customer site) against the actual deployed state in a target platform. Uses the adapter pattern to query JSM Assets or ServiceNow for current deployment records and flags mismatches as drift alerts.

## Why

cmdb-kit tracks what should be deployed where (Deployment Sites with version, configuration, and status). But after initial import, the CMDB drifts from reality as deployments happen outside the tracked process. Drift detection closes that loop: run the tool periodically, get a report of what changed without being recorded.

This is a natural extension of the existing validate pattern (count-compare, field-spot-check, link-integrity). Instead of validating a migration, it validates ongoing operational accuracy.

## How It Works

1. Read Deployment Site records from cmdb-kit data files (expected state)
2. Query target platform (JSM Assets or ServiceNow) for current deployment records (actual state)
3. Compare expected vs actual on key fields (version, status, configuration)
4. Output drift report: matches, mismatches, records in platform but not in kit, records in kit but not in platform

## Dependencies

- Core + Domains restructure: DONE
- Blocks: Nothing (additive tool)

## Success Criteria

- Detects version drift between cmdb-kit data files and live JSM Assets instance
- Detects version drift between cmdb-kit data files and live ServiceNow instance
- Output is machine-readable (JSON) and human-readable (formatted table)
- Runs as a standalone CLI tool with the same config pattern as other tools (.migrationrc.json equivalent)
