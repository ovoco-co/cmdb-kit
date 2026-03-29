# Drift Detection Tool

**Feature Branch**: drift-detection
**Created**: 2026-03-26
**Status**: Done (PR #16 merged 2026-03-28)
**Input**: Existing adapter pattern, validate tool pattern

## User Scenarios and Testing

### P1: Operations team detects version drift at customer sites

**Why this priority**: After initial import, the CMDB drifts from reality as deployments happen outside the tracked process. Drift detection closes that loop.

**Independent Test**: Import known data to a platform, modify one record on the platform, run drift detection, confirm the modification is reported.

**Acceptance Scenarios**:

- Given cmdb-kit data files define Product X at version 2.1 deployed to Site A
  When the platform shows Product X at version 2.0 at Site A
  Then the drift report flags Site A as a version mismatch with expected 2.1 vs actual 2.0

- Given cmdb-kit data files list 5 Deployment Sites
  When the platform has 6 Deployment Sites (one added outside the tracked process)
  Then the drift report lists the extra record as "in platform but not in kit"

- Given cmdb-kit data files list a Deployment Site that was deleted from the platform
  When drift detection runs
  Then the drift report lists the missing record as "in kit but not in platform"

### P2: User gets drift report in both machine-readable and human-readable format

**Why this priority**: Machine-readable output enables automation; human-readable output enables quick review.

**Independent Test**: Run drift detection and verify both JSON and formatted table output are produced.

**Acceptance Scenarios**:

- Given drift detection completes
  When the output is generated
  Then a JSON report is available for programmatic consumption
  And a formatted table is available for human review

## Edge Cases

- Platform has records with slightly different Name values (case sensitivity)
- Date format differences between platform and data files
- Multi-reference fields with different ordering but same values
- Platform record was modified and then reverted (no drift, but modification timestamp changed)
- Network timeout during platform query

## Requirements

### Functional Requirements

- FR-001: Read Deployment Site records from cmdb-kit data files as expected state
- FR-002: Query JSM Assets for current deployment records as actual state
- FR-003: Query ServiceNow for current deployment records as actual state
- FR-004: Compare expected vs actual on key fields (version, status, configuration)
- FR-005: Output drift report with matches, mismatches, records only in platform, records only in kit
- FR-006: Output in both JSON (machine-readable) and formatted table (human-readable)
- FR-007: Use the same config pattern as other tools (.migrationrc.json equivalent)

### Key Entities

- Deployment Site (expected state from data files)
- Platform deployment record (actual state from JSM Assets or ServiceNow)
- Drift report (comparison output)

## How It Works

1. Read Deployment Site records from cmdb-kit data files (expected state)
2. Query target platform (JSM Assets or ServiceNow) for current deployment records (actual state)
3. Compare expected vs actual on key fields (version, status, configuration)
4. Output drift report: matches, mismatches, records in platform but not in kit, records in kit but not in platform

## Dependencies

- Core + Domains restructure: DONE
- Blocks: Nothing (additive tool)

## Success Criteria

- SC-001: Detects version drift between cmdb-kit data files and live JSM Assets instance
- SC-002: Detects version drift between cmdb-kit data files and live ServiceNow instance
- SC-003: Output is both machine-readable (JSON) and human-readable (formatted table)
- SC-004: Runs as a standalone CLI tool with the same config pattern as other tools

## Assumptions

- Platform APIs (JSM Assets REST, ServiceNow REST) are accessible with provided credentials
- Deployment Site records use Name as the matching key between kit and platform
- The adapter pattern from existing tools can be reused for platform queries
- Drift detection is read-only and does not modify platform data
