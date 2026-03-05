# Scaling and Governance

A CMDB that is accurate on day one degrades without active maintenance. Data quality erodes as records go stale, new CIs are added without proper attributes, references break when names change, and documentation drifts from reality. This chapter covers the practices that keep the CMDB healthy over time: data quality standards, hygiene auditing, ownership accountability, review cadence, performance considerations for large schemas, and backup and recovery.


# Data Quality Practices

## Defining Data Quality Standards

Data quality has four dimensions:

Completeness: every CI record has values for all required attributes. A Deployment Site without a productVersion is incomplete.

Accuracy: attribute values reflect reality. A Deployment Site that says "Active" when the site was decommissioned last month is inaccurate.

Consistency: the same concept is represented the same way across all records. If one Deployment Site uses "US-East" for its location and another uses "US East" (no hyphen), the data is inconsistent.

Timeliness: records are updated promptly when the real-world state changes. A version that was released two weeks ago but still shows "Beta" in the CMDB is untimely.

Define standards for each dimension. A pragmatic starting point:

Completeness: every CI must have Name, status, and owner. Additional required fields vary by type (Deployment Site must have productVersion and organization).

Accuracy: verified quarterly through audit. Discrepancies are remediated within two weeks.

Consistency: lookup types enforce consistent vocabulary. Free text fields follow documented conventions.

Timeliness: CI updates within 48 hours of the real-world change. Status transitions on the same day as the event.

## Mandatory vs Optional Fields Per Type

Not every attribute is equally important. Define a tier system:

Tier 1 (mandatory): fields that must have a value for the record to be useful. Name, status, and key references.

Tier 2 (expected): fields that should have a value but may be empty during initial data entry. Will be filled as data matures.

Tier 3 (optional): fields that provide additional context but are not required for operational use.

For Deployment Site:

| Tier | Fields |
|------|--------|
| 1 (mandatory) | Name, siteStatus, productVersion, organization |
| 2 (expected) | primaryLocation, goLiveDate, environmentType |
| 3 (optional) | seatCount, notes |

Use gap detection queries to enforce Tier 1 completeness:

```
objectType = "CR Deployment Site" AND "Product Version" IS EMPTY
```

This query appears on the data quality dashboard and is reviewed weekly.

## Automated Validation as a Quality Gate

Run `node tools/validate.js` as part of the CI/CD pipeline or as a pre-commit hook. No import should proceed with validation errors. This is the automated equivalent of a data quality gate.

For the target database, schedule periodic exports and diffs:

```bash
node adapters/jsm/export.js --diff
```

This compares the live database against the local data files and reports discrepancies. Discrepancies indicate either manual changes in the database (which should be back-ported to the files) or import failures that went undetected.


# Data Hygiene Auditing

## Audit Methodology and Framework

A CMDB hygiene audit examines the data files and the target database for quality issues. The audit checks:

1. Schema compliance: do all records conform to the schema structure and attribute definitions?
2. Reference integrity: do all references resolve to existing records?
3. Completeness: do all records have values for Tier 1 fields?
4. Naming conventions: do all records follow the established naming standards?
5. Staleness: are there records that have not been updated in an unreasonable time?
6. Orphans: are there records with no inbound references that should have them?
7. Duplicates: are there records with the same or confusingly similar names?

Run the audit quarterly. Document findings and track remediation.

## Common Data Quality Issues

### Duplicate Records

Two records representing the same real-world entity. "Acme Corp" and "Acme Corporation" as separate Organization records. "CRM Core" and "CRM Core Application" as separate Application records. Duplicates cause confusion and split the reference graph.

Fix by merging: decide which record is authoritative, update all references to point to it, then delete the duplicate.

### Naming Convention Violations

Records that do not follow the established naming pattern. If Deployment Sites should be named "CR [Customer] [Region]" but one record is named "Acme East" instead of "CR Acme Corp US-East."

Fix by renaming the record and updating all references. Run validation to catch broken references after the rename.

### Orphaned Records

Records that exist but are not referenced by anything. A Product Component that no Product Version includes. A Person who is not on any Team. An Organization with no Teams or Deployment Sites.

Some orphans are legitimate (a new Organization that has not been assigned assets yet). Others indicate data entry gaps or stale records.

### Stale Status Values

Records whose status does not reflect reality. A Deployment Site marked "Active" that was decommissioned. A Product Version marked "Beta" that shipped months ago.

Stale statuses usually result from missing process integration: the event happened (site decommissioned, version released) but no one updated the CMDB.

## Cleanup Process: Archival, Deletion, Reorganization

When the audit identifies issues:

Archive stale records by updating their status to the terminal value (Retired, Decommissioned, Expired). Do not delete them unless they were created in error.

Delete only erroneous records: test data that leaked into production, duplicates that should never have existed.

Reorganize by fixing names, references, and categorizations to match current conventions.

## Preventive Controls

Prevent quality issues before they occur:

Validation before every import catches reference errors, unknown fields, and format violations.

Lookup types constrain vocabulary, preventing free-text inconsistencies.

Templates from generate-templates.js provide the correct field structure, preventing unknown field names.

Process integration (automation rules that update CIs when issues resolve) prevents stale statuses.

Documentation of naming conventions reduces the chance of ad hoc naming.


# Ownership and Accountability

## Assigning CI Ownership to Teams

Every CI should have an owner. In CMDB-Kit, ownership is tracked through the `owner` reference on types like Application and Product Component (referencing the Team type).

Ownership means the team is responsible for:

Keeping the CI record accurate (updating attributes when the real-world state changes).

Reviewing the CI during audits.

Responding to questions about the CI from other teams.

Approving changes to the CI.

## Data Steward Roles

A data steward is responsible for the overall quality of a set of CIs, typically organized by type or branch:

The CM Lead is the data steward for the entire CMDB.

CM Analysts are data stewards for Product Library types (versions, baselines, deployments, distributions).

The Platform Engineering Lead is the data steward for Product CMDB types (applications, servers, databases).

The HR Liaison or CM Analyst is the data steward for Directory types (organizations, teams, people).

Data stewards do not enter all the data themselves. They ensure that the teams who do enter data follow the standards.

## Who Approves Schema Changes

Schema changes follow a defined approval path:

Lookup value additions and modifications: approved by the CM Lead or data steward for lookup types.

New attribute additions: approved by the CM Lead after review for naming conventions and reference correctness.

New type additions: approved by the CM Lead and reviewed by affected stakeholders (if the new type affects their product's import order or reporting).

Schema structure changes (moving types between branches, renaming types): approved by the CM Lead with review by all product teams, because these changes affect queries and dashboards.


# Review Cadence

## How Often to Audit the CMDB

| Review | Frequency | Scope | Owner |
|--------|-----------|-------|-------|
| Automated validation | Every import | Schema and data integrity | CI/CD pipeline |
| Gap detection queries | Weekly | Tier 1 field completeness | CM Analyst |
| Data quality dashboard | Weekly | Orphans, stale records, broken references | CM Lead |
| Type-level audit | Quarterly | Full review of one or two types per quarter | Data steward |
| Comprehensive audit | Annually | All types, all branches, full reconciliation | CM Lead |

The weekly gap detection queries are the most important regular check. They surface problems early, before they compound.

## Using Export and Diff Tools to Detect Drift

Schedule a weekly or bi-weekly export-and-diff run:

```bash
node adapters/jsm/export.js --diff
```

Review the diff output for unexpected changes:

Added records that were not created through the standard process (manual additions in JSM).

Changed fields that were not updated through an import (manual edits in JSM).

Removed records that should not have been deleted.

Track these discrepancies and either back-port them to the data files (if the change is legitimate) or revert them in JSM (if the change was unauthorized).

## Scheduled Validation Runs

Run validation on a schedule, not just before imports. A weekly validation run catches issues introduced by data file edits that were committed without validation:

```bash
node tools/validate.js --schema schema/extended
```

If the validation runs in a CI pipeline, it catches errors before they reach the main branch.


# Performance Considerations for Large Schemas

## Import Time Scaling With Record Count

Import time is roughly linear with the number of records, but reference resolution adds overhead. Each reference field on each record requires a query to the target database to resolve the referenced object's ID.

For a schema with 55 types and 500 total records, import completes in minutes. For a schema with 55 types and 5,000 records with complex reference chains, import may take an hour or more.

Optimization strategies:

Import in batches by type rather than all at once. This allows monitoring progress and catching errors early.

Use the `--type` filter to re-import only the types that changed, rather than the entire schema.

Ensure the target database has appropriate indexes on the Name field (most platforms index this by default).

## Reference Resolution Performance

The import script resolves references by querying for records by Name. In JSM Assets, this uses IQL (the internal query language). Each reference resolution is an API call.

A record with five reference fields requires five queries. A type with 100 records, each with five reference fields, requires 500 queries. This adds up.

Caching helps: the import script caches resolved IDs so that the same reference value is not queried twice. The first record that references "Active" as a Version Status value triggers a query. Subsequent records reuse the cached result.

## When to Split Schemas

If the schema grows beyond 100 types or the data grows beyond 10,000 records, consider whether the single-schema approach still serves you:

If all types are actively used and referenced, keep the single schema. The overhead is in the import, not in the schema itself.

If some types are used only by specific products and never cross-referenced, consider splitting into per-product schemas. This reduces import time for each product but loses cross-product query capability.

If lookup types are shared but CI types are product-specific, keep lookups in a shared schema and split CI types into product schemas. This preserves consistent vocabulary while reducing per-product import scope.

In practice, most organizations with fewer than 200 types and 20,000 records do fine with a single schema.


# Backup and Recovery

## Export Before Import as a Safety Practice

Before any import that modifies existing data, export the current state:

```bash
node adapters/jsm/export.js
```

This saves the current data to `objects-export/`, giving you a snapshot to compare against if something goes wrong.

## Git History as a Recovery Mechanism

Every change to the schema and data files is tracked in git. If an import introduces bad data, you can identify the commit that caused the problem, revert it, and re-import.

This is why the git workflow rule (separate schema commits from data commits) matters: you can revert a data change without losing a schema change, and vice versa.

To recover from a bad import:

1. Identify the commit that introduced the problem: `git log --oneline`
2. Revert the commit: `git revert <hash>`
3. Validate the reverted state: `node tools/validate.js --schema schema/extended`
4. Re-import: `node adapters/jsm/import.js sync`
5. Post-import validation: `node adapters/jsm/validate-import.js`

The CMDB's data is ultimately derived from the data files in the repository. The repository is the source of truth. The target database is a derived copy. This means recovery is always possible: fix the files, validate, re-import.
