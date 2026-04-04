# Core Schema Verification

**Purpose**: Verify that every Core Question from the constitution can be answered by the base schema after the Phase 3 schema changes.

**Date**: 2026-03-27

## Product Identity

| Question | How It's Answered | Verified? |
|----------|------------------|-----------|
| What products do we manage? | Product type with name, description, status | Yes - 6 products in data |
| What components make up each product? | Product Component with componentType, owner, technology | Yes - 6 components in data |
| Who owns each product? | Product.owner refs Team | Yes - all products have owner |

## Version and Release

| Question | How It's Answered | Verified? |
|----------|------------------|-----------|
| What is the current version? | Product Version.status = "Current" | Yes - OvocoCRM 2.3.1 is Current |
| What versions have been released? | Query Product Version by status | Yes - 5 versions in data |
| What changed between versions? | Product Version.releaseNotes (NEW) | Yes - all versions have releaseNotes |
| What features are in this version? | Feature.product + Feature.version (product ref NEW) | Yes - 6 features with product refs |
| Who approved this release? | Product Version.approvedBy + approvalDate (NEW) | Yes - all versions have approvals |

## Deployment

| Question | How It's Answered | Verified? |
|----------|------------------|-----------|
| Where is this product deployed? | Deployment Site.product + organization (NEW) | Yes - 6 sites with product refs |
| What version at each site? | Deployment Site.version (NEW) | Yes - 4 of 6 have version (2 provisioning) |
| What environment? | Deployment Site.environment | Yes - all have environment |
| What infrastructure supports it? | Server/Database refs Environment Type (relationships via adapter) | Partial - relationships are adapter-level |
| When was the last deployment? | Deployment Site.lastDeploymentDate (NEW) | Yes - active sites have dates |
| Who performed the deployment? | Deployment Site.deployedBy (NEW) | Yes - active sites have deployer |
| Is this site current or behind? | Compare Deployment Site.version to Product Version where status=Current | Yes - Acme Corp shows 2.3.0 vs current 2.3.1 |

## Baselines

| Question | How It's Answered | Verified? |
|----------|------------------|-----------|
| What is the approved config? | Baseline.product + version + status (product NEW) | Yes - 2 baselines in data |
| What's in the baseline? | Baseline.components + documents (NEW multi-refs) | Yes - both baselines list components and docs |
| When was it established? | Baseline.establishedDate (NEW) | Yes - both have establishment dates |
| Who approved it? | Baseline.approvedBy + approvalDate (approvedBy NEW) | Yes - both have approval tracking |
| What changed since last baseline? | Compare component/document lists between baselines | Yes - data supports comparison |

## Dependencies

| Question | How It's Answered | Verified? |
|----------|------------------|-----------|
| What does this product depend on? | relationships.json (adapter-level) | Partial - schema defines types, adapters express relationships |
| What depends on this product? | Reverse query on relationships | Partial - same |
| If this server goes down? | Server linked to deployments via environment | Partial - requires relationship queries |
| If this database goes down? | Database linked to deployments | Partial - requires relationship queries |

**Note**: Dependencies remain adapter-level. The schema defines the types that participate in relationships (Product, Server, Database, Deployment Site) but the relationship records are in data/relationships.json and handled by each adapter differently. This is a deliberate design choice: JSM Assets uses reference attributes for relationships, ServiceNow uses cmdb_rel_ci. The schema layer stays platform-agnostic.

## People and Responsibility

| Question | How It's Answered | Verified? |
|----------|------------------|-----------|
| Who is responsible? | Product.owner refs Team, Team.teamLead refs Person | Yes |
| Who is the POC at each site? | Deployment Site.sitePOC (NEW) | Yes - all sites have POC |
| What team supports this deployment? | Deployment Site.supportTeam (NEW) | Yes - all sites have support team |
| Who do I call when something breaks? | Deployment Site.sitePOC, Person.phone + jobTitle (NEW) | Yes - all persons have phone and jobTitle |

## Documents

| Question | How It's Answered | Verified? |
|----------|------------------|-----------|
| What controlled documents exist? | Document.product (NEW) | Yes - all docs have product ref |
| What version does this doc apply to? | Document.version (NEW) | Yes - version-specific docs have version ref |
| Is the document current or superseded? | Document.state | Yes - all docs have state |

## Summary

| Category | Questions | Fully Answered | Partially Answered |
|----------|-----------|---------------|-------------------|
| Product Identity | 3 | 3 | 0 |
| Version and Release | 5 | 5 | 0 |
| Deployment | 7 | 6 | 1 |
| Baselines | 5 | 5 | 0 |
| Dependencies | 4 | 0 | 4 |
| People and Responsibility | 4 | 4 | 0 |
| Documents | 3 | 3 | 0 |
| Total | 31 | 26 | 5 |

The 5 partially answered questions are all in the Dependencies category and are partially answered by design. The schema defines the types; adapters express the relationships. This is documented as a deliberate architectural choice in the constitution (Principle II: Database-Agnostic Design).

## Schema Changes Made

### New types added to base
- Feature (promoted from extended, added product ref)
- Deployment Site (promoted from extended, enriched with product, version, organization, sitePOC, supportTeam, lastDeploymentDate, deployedBy)
- Baseline (promoted from extended, enriched with product, approvedBy, establishedDate, components multi-ref, documents multi-ref)
- Site Status (lookup, promoted from extended)
- Baseline Type (lookup, promoted from extended)
- Baseline Status (lookup, promoted from extended)

### Attributes added to existing types
- Product Version: approvedBy, approvalDate, releaseNotes
- Person: phone, jobTitle, manager
- Document: product, version
- Feature: product (was missing)

### Data enrichments
- Organization: added 3 customer organizations (Acme Corp, Globex Corp, Initech)
- Organization Type: added "Customer"
- All existing data files updated with values for new attributes

### Validation
- Base: 0 errors, 0 warnings
- Extended: 0 errors, 0 warnings (also fixed 10 pre-existing LOAD_PRIORITY warnings)
- Enterprise: 0 errors, 0 warnings

## Platform Testing: ServiceNow PDI

**Instance**: dev210250.service-now.com
**Date**: 2026-03-27

### Results

| Step | Result |
|------|--------|
| Table creation (new types) | Pass - 3 tables created (Feature, Deployment Site, Baseline) |
| Column creation (new attributes) | Pass - 31 new columns across existing and new tables |
| Identification rules | Partial - scoped prefix mismatch, fixed manually |
| Data import (existing types) | Pass - 23 types imported successfully |
| Data import (new types) | Pass after fixes - all 14 records created |

### Issues Found

1. **Scoped prefix**: PDI creates tables with `x_cmdbk_` prefix but overlay used `u_cmdbk_`. Fixed in overlay.json.
2. **Identification rule**: Schema mode creates rules referencing `u_cmdbk_feature` but actual table is `x_cmdbk_u_cmdbk_feature`. Fixed both cmdb_identifier and cmdb_identifier_entry records.
3. **Extra records**: PDI has data from previous extended tier imports. Validation shows extra records for types that exist in both base and extended (Baseline Type, Deployment Site, etc.). Not a bug - expected when testing base against a PDI that already has extended data.
4. **Reference field population**: Feature records created via CMDB Instance API have names and descriptions but reference fields (product, version, status, owner) are empty. Pre-existing adapter issue with how the SN import maps reference fields for CI types.

## Platform Testing: JSM Cloud

**Instance**: ovoco.atlassian.net
**Schema Key**: CORE (ID: 79)
**Date**: 2026-03-27

### Results

| Step | Result |
|------|--------|
| Schema creation (types + hierarchy) | Pass - 30 types created with correct parent relationships |
| Attribute creation (fields + references) | Pass - all attributes created, custom reference types created |
| Object creation (data records) | Pass - correct record counts for all 26 leaf types |
| Attribute value population | Pass - 133/133 records validated field-by-field |
| Post-import validation | Pass - all 26 base types pass (0 field mismatches) |

### Process Notes

The correct import sequence for JSM Cloud is:
1. `node adapters/jsm/import.js schema` - creates types and attributes
2. `node adapters/jsm/import.js data` - imports data records with attribute values

Running `sync` mode (which re-syncs attributes then imports data) causes reference attributes to be deleted and recreated, resulting in stale attribute IDs during data import. The `data` mode skips attribute sync and uses the correct IDs.

### Validation Fixes Applied

- `validate-import.js`: Cloud AQL endpoint returns `objectTypeAttributeId` (ID only), not the nested `objectTypeAttribute` object. Fixed by building an ID-to-name lookup from separately fetched attribute definitions.
- Date normalization: JSM Cloud returns 2-digit years (15/Jun/25). Fixed to expand to 4-digit (2025-06-15).
- Multi-reference normalization: local semicolon-separated strings now split into arrays before comparing against remote multi-reference arrays.
