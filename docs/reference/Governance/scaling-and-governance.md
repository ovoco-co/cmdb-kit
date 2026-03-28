# Scaling and Data Governance

A CMDB that is accurate on day one degrades without active maintenance. Data quality erodes as records go stale, new CIs are added without proper attributes, references break when names change, and documentation drifts from reality. This section covers the practices that keep the CMDB healthy over time: data quality standards, hygiene auditing, ownership accountability, review cadence, performance tuning, and backup and recovery.


# Data Quality Practices

## Defining Data Quality Standards

Data quality has four dimensions.

Completeness: every CI record has values for all required attributes. A Deployment Site without a `status` reference is incomplete.

Accuracy: attribute values reflect reality. A Deployment Site that references "Active" as its Site Status when the site was decommissioned last month is inaccurate.

Consistency: the same concept is represented the same way across all records. If one Deployment Site uses "US East (Virginia)" for its name and another uses "US-East-Virginia," the data is inconsistent.

Timeliness: records are updated promptly when the real-world state changes. A Product Version that was released two weeks ago but still shows a Version Status of "Beta" in the CMDB is untimely.

Define standards for each dimension. A pragmatic starting point:

Completeness: every CI must have Name and a status reference. Additional required fields vary by type. For example, a Product Version must have `versionNumber` and `status` (referencing Version Status).

Accuracy: verified quarterly through audit. Discrepancies are remediated within two weeks.

Consistency: lookup types enforce consistent vocabulary. Free text fields follow documented conventions.

Timeliness: CI updates within 48 hours of the real-world change. Status transitions on the same day as the event.

## Mandatory and Optional Fields Per Type

Not every attribute is equally important. Define a tier system:

Tier 1 (mandatory): fields that must have a value for the record to be useful. Name, status, and key references.

Tier 2 (expected): fields that should have a value but may be empty during initial data entry. These will be filled as data matures.

Tier 3 (optional): fields that provide additional context but are not required for operational use.

For OvocoCRM's Deployment Site type, the tiers look like this:

| Tier | Fields |
|------|--------|
| 1 (mandatory) | Name, status, environment |
| 2 (expected) | location, goLiveDate |
| 3 (optional) | description |

For the Product type:

| Tier | Fields |
|------|--------|
| 1 (mandatory) | Name, status, owner |
| 2 (expected) | productType, technology |
| 3 (optional) | description, companionProducts |

Use gap detection queries to enforce Tier 1 completeness:

```
objectType = "Deployment Site" AND "Status" IS EMPTY
```

```
objectType = "Product" AND "Owner" IS EMPTY
```

These queries appear on the data quality dashboard and are reviewed weekly.

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

Schema compliance: do all records conform to the schema structure and attribute definitions?

Reference integrity: do all references resolve to existing records?

Completeness: do all records have values for Tier 1 fields?

Naming conventions: do all records follow the established naming standards?

Staleness: are there records that have not been updated in an unreasonable time?

Orphans: are there records with no inbound references that should have them?

Duplicates: are there records with the same or confusingly similar names?

Run the audit quarterly. Document findings and track remediation.

## Common Data Quality Issues

### Duplicate Records

Two records representing the same real-world entity. "Acme Corporation" and "Acme Corp" as separate Organization records. "CR Core Platform" and "CR Core Platform Product" as separate Product records. Duplicates cause confusion and split the reference graph.

In OvocoCRM's data, the CRM Platform Team owns several Products (CR Core Platform, CR API Gateway, CR Search Service, CR Authentication Module). If someone creates a duplicate "CR API Gateway" record, references from Product Version, SLA, and Incident records may split between the original and the duplicate, breaking reporting and traceability.

Fix by merging: decide which record is authoritative, update all references to point to it, then delete the duplicate.

### Naming Convention Violations

Records that do not follow the established naming pattern. If Product Versions should follow the pattern "OvocoCRM X.Y.Z" but one record is named "v2.4" instead of "OvocoCRM 2.4.0," references from Deployment, Baseline, and Documentation Suite records will fail to resolve.

Fix by renaming the record and updating all references. Run validation to catch broken references after the rename.

### Orphaned Records

Records that exist but are not referenced by anything. A Product Component that no Product Version includes in its `components` list. A Person who is not on any Team. An Organization with no Teams or Deployment Sites.

Some orphans are legitimate (a new Organization like Meridian Healthcare that is still in the provisioning phase). Others indicate data entry gaps or stale records.

### Stale Status Values

Records whose status does not reflect reality. A Deployment Site marked "Active" through its Site Status reference that was decommissioned. A Product Version marked "Current" through its Version Status reference when a newer version has shipped.

In OvocoCRM's data, the Product Version "OvocoCRM 2.4.0" has a Version Status of "Current." When version 2.5.0 ships, someone must update 2.4.0 to "Previous." Stale statuses usually result from missing process integration: the event happened but no one updated the CMDB.

## Cleanup Process: Archival, Deletion, Reorganization

When the audit identifies issues:

Archive stale records by updating their status reference to the terminal value (Retired, Decommissioned, Expired). Do not delete them unless they were created in error.

Delete only erroneous records: test data that leaked into production, duplicates that should never have existed.

Reorganize by fixing names, references, and categorizations to match current conventions.

## Preventive Controls

Prevent quality issues before they occur:

Validation before every import catches reference errors, unknown fields, and format violations.

Lookup types constrain vocabulary, preventing free-text inconsistencies. In the enterprise schema, the lookup types enforce controlled vocabularies for statuses, classifications, and enumerations across Products, Versions, Deployments, Sites, Capabilities, Contracts, and other types.

Templates from `generate-templates.js` provide the correct field structure, preventing unknown field names.

Process integration (automation rules that update CIs when issues resolve) prevents stale statuses.

Documentation of naming conventions reduces the chance of ad hoc naming.


# Ownership and Accountability

## Assigning CI Ownership to Teams

Every CI should have an owner. In CMDB-Kit, ownership is tracked through the `owner` reference attribute on types like Product and Product Component, which references the Team type.

In OvocoCRM's data, the Product "CR Core Platform" has `owner` set to "CRM Platform Team," while "AN Analytics Engine" is owned by "Analytics Platform Team." The Infrastructure Team owns shared services products like SS Jira and SS Jenkins. This means each team is responsible for:

Keeping the CI record accurate (updating attributes when the real-world state changes).

Reviewing the CI during audits.

Responding to questions about the CI from other teams.

Approving changes to the CI.

## Data Steward Roles

A data steward is responsible for the overall quality of a set of CIs, typically organized by type or branch:

The CM Lead is the data steward for the entire CMDB.

CM Analysts are data stewards for Product Library types (Product Version, Baseline, Deployment, Documentation Suite, Distribution Log).

The Infrastructure Team Lead is the data steward for Shared Services CMDB types (SS Product, SS Server, SS Virtual Machine, SS Network Segment, SS Hardware Model).

The HR Liaison or CM Analyst is the data steward for Directory types (Organization, Team, Person, Location).

Data stewards do not enter all the data themselves. They ensure that the teams who do enter data follow the standards.

## Who Approves Schema Changes

Schema changes follow a defined approval path:

Lookup value additions and modifications: approved by the CM Lead or data steward for lookup types.

New attribute additions: approved by the CM Lead after review for naming conventions and reference correctness.

New type additions: approved by the CM Lead and reviewed by affected stakeholders (if the new type affects their import order or reporting).

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

Added records that were not created through the standard process (manual additions in the target database).

Changed fields that were not updated through an import (manual edits in the target database).

Removed records that should not have been deleted.

Track these discrepancies and either back-port them to the data files (if the change is legitimate) or revert them in the target database (if the change was unauthorized).

## Scheduled Validation Runs

Run validation on a schedule, not just before imports. A weekly validation run catches issues introduced by data file edits that were committed without validation:

```bash
node tools/validate.js --schema schema/extended
```

If the validation runs in a CI pipeline, it catches errors before they reach the main branch.


# Performance Considerations

## Import Time Scaling With Record Count

Import time is roughly linear with the number of records, but reference resolution adds overhead. Each reference field on each record requires a query to the target database to resolve the referenced object's ID.

For the extended schema with hundreds of records, import completes in minutes. For the enterprise schema with thousands of records and complex reference chains, import may take an hour or more.

Optimization strategies:

Import in batches by type rather than all at once. This allows monitoring progress and catching errors early.

Use the `--type` filter to re-import only the types that changed, rather than the entire schema.

Ensure the target database has appropriate indexes on the Name field (most platforms index this by default).

## Reference Resolution Performance

The import script resolves references by querying for records by Name. Each reference resolution is an API call.

A record with five reference fields requires five queries. A type with 100 records, each with five reference fields, requires 500 queries. This adds up.

Caching helps: the import script caches resolved IDs so that the same reference value is not queried twice. The first record that references "Active" as a Site Status value triggers a query. Subsequent records reuse the cached result.

Consider the OvocoCRM enterprise schema: the CR Product Version type has references to Version Status, CR Product Component (multi-value), and CR Product Version (self-reference for `previousVersion`). A type with six records and three reference fields each generates up to 18 queries, but caching reduces this significantly because many records share the same Version Status and Component values.

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

Identify the commit that introduced the problem: `git log --oneline`

Revert the commit: `git revert <hash>`

Validate the reverted state: `node tools/validate.js --schema schema/extended`

Re-import: `node adapters/jsm/import.js sync`

Post-import validation: `node adapters/jsm/validate-import.js`

The CMDB's data is ultimately derived from the data files in the repository. The repository is the source of truth. The target database is a derived copy. This means recovery is always possible: fix the files, validate, re-import.


# Schema Decision Log

Every taxonomy decision should be recorded with its rationale. When you move on and someone else inherits the CMDB, the decision log is how they understand why the schema looks the way it does. Without it, they will either break things by removing types they do not understand, or add redundant types because they do not know the originals exist.

## Template

Record each decision using this format. Keep it in version control alongside the schema files.

```markdown
## [Decision Title]

Date: YYYY-MM-DD
Decided by: [Names and roles]
Status: Accepted | Superseded by [link] | Revoked

### Context
What situation or question prompted this decision?

### Decision
What did we decide to do?

### Rationale
Why this approach over the alternatives?

### Alternatives Considered
What other options were evaluated and why were they rejected?

### Consequences
Which types, attributes, or relationships were added, modified, or removed?
```

## Worked Examples

### Use product prefixes for multi-product isolation

Date: 2024-06-15. Decided by: CM Lead, Portfolio Manager. Status: Accepted.

Context: The organization manages two products (OvocoCRM and OvocoAnalytics) that share customer sites and infrastructure. Queries for one product's servers returned the other product's servers. Reports were inaccurate because filtering required compound queries that users frequently got wrong.

Decision: Prefix all product-specific CI types with a product abbreviation (CR for OvocoCRM, AN for OvocoAnalytics, SS for Shared Services). Shared types (Directory, Lookup Types) remain unprefixed.

Rationale: Prefixing makes every query product-scoped by default. "Show me all CR Servers" is unambiguous. The alternative (a "product" attribute on every type) requires users to remember to add a filter on every query, which they will not do consistently.

Alternatives considered: (1) Separate schemas per product, rejected because cross-product queries become impossible and shared lookups must be duplicated. (2) Single "product" attribute on all types, rejected because it relies on user discipline for query accuracy.

Consequences: Added CR, AN, and SS prefixed types to enterprise schema. Restructured enterprise schema-structure.json with product-specific branches. Updated LOAD_PRIORITY to handle prefixed types. Schema became larger but more navigable.

### Separate Site from Deployment Site

Date: 2024-08-22. Decided by: CM Lead, Operations Manager. Status: Accepted.

Context: Different products at the same customer location were at different versions, with different support teams, and on different upgrade schedules. A single "Deployment" record per customer could not represent this.

Decision: Create a shared Site type representing the customer location, and product-specific Deployment Site types (CR Deployment Site, AN Deployment Site) representing each product's deployment at that location.

Rationale: The site's physical identity (address, organization, contacts) is shared. The deployment state (version, status, support team, upgrade schedule) is product-specific. Splitting them prevents data duplication while allowing independent lifecycle tracking.

Alternatives considered: (1) One Deployment Site type with a product attribute, rejected because the attribute lists were too different between products. (2) Duplicate all site data per product, rejected because address changes would need to be updated in multiple places.

Consequences: Added Site type to shared library branch. Added product-specific Deployment Site types under product branches. Site records are shared across products. Deployment Site records are product-specific.

### Lookup types as first-class object types

Date: 2024-03-10. Decided by: CM Lead. Status: Accepted.

Context: Deciding whether status values, environment types, and other controlled vocabulary should be implemented as picklists (simple dropdown lists) or as separate object types with their own records.

Decision: Implement all lookup values as separate object types. Each lookup value is a record with a Name and description.

Rationale: First-class objects can be queried, reported on, and documented. The description field explains what each value means in context. Adding a new value is a data change, not a schema change.

Alternatives considered: Platform-native picklists, rejected because they lack descriptions, are harder to document, and adding values requires schema modifications on some platforms.

Consequences: The schema has more types than a picklist approach would require. Initial setup takes longer. But data quality is higher because every value is defined, and maintenance is easier because adding values does not require schema changes.

## Maintaining the Log

Record decisions when you make them, not months later from memory. Include the names of people involved so future staff know who to ask. Link to related decisions when one supersedes another. Review the log when onboarding new team members. Keep it in the same repository as the schema files so it stays in sync. Do not backfill decisions you cannot accurately remember - a partial log is better than a fabricated one.
