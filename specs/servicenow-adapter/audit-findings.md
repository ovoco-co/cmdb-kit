# Code Audit Findings: 2026-03-28

Comprehensive audit of all adapter code and tools. Three audits run in parallel against schema source of truth.

## Summary

| Area | High | Medium | Low | Total |
|------|------|--------|-----|-------|
| ServiceNow adapter | 4 | 7 | 5 | 16 |
| JSM adapter | 4 | 3 | 3 | 10 |
| Tools and shared code | 7 | 7 | 5 | 19 |
| Total | 15 | 17 | 13 | 45 |

## HIGH Severity

### SN-H1: Identification rules use wrong table name for scoped apps
**File**: import.js:264-310
**Impact**: Schema mode creates identification rules that don't match actual table names on scoped instances. Feature, Deployment Site, Baseline all fail to import via CMDB API.
**Fix**: Look up actual table name from sys_db_object before creating cmdb_identifier. Use sys_id for applies_to field.

### SN-H2: Reference fields empty via CMDB Instance API
**File**: import.js:686, api-client.js:182
**Impact**: CI records created with names but custom reference columns are empty. Affects all tier 2 types.
**Fix**: Two-pass import: IRE for dedup, then Table API PUT for custom fields.

### SN-H3: Double-prefixed table names in overlay
**File**: overlay.json:481,621,712
**Impact**: Feature, Baseline, Deployment Site tables resolve to x_cmdbk_u_cmdbk_* instead of the actual table name.
**Fix**: Remove the x_cmdbk_ prefix from overlay. Let the schema mode handle the actual prefix.

### SN-H4: Default data path is schema/base/data (doesn't exist)
**File**: lib/config.js
**Impact**: Running without SCHEMA_DIR crashes.
**Fix**: Change default to schema/core/data.

### JSM-H1: syncAttributes deletes reference attrs causing data loss
**File**: import.js:341-343
**Impact**: Every sync run deletes and recreates reference attributes, destroying all existing reference values on every object.
**Root cause**: refMismatch comparison at line 336-338. currentRefTypeId reads from typeValue/defaultType.typeValue but Cloud returns the ID in referenceObjectTypeId or referenceObjectType.id. The comparison always fails, triggering delete+recreate.
**Fix**: Expand the comparison to check referenceObjectTypeId and referenceObjectType.id before declaring a mismatch.

### JSM-H2: validate-import reference values include key prefix
**File**: validate-import.js extractRemoteValue
**Impact**: References display as "CMDB-12 - Production" but local data has "Production". Every reference field reports a false mismatch.
**Fix**: Strip the key prefix from reference display values (same logic as buildRemoteIndex name stripping).

### JSM-H3: sitePOC and other acronym attributes get wrong display names
**File**: tools/lib/attr-names.js
**Impact**: sitePOC becomes "Site P O C" in JSM. Also affects sslEnabled, pxeEnabled, collectionId, techniqueId, cidr, vlan.
**Fix**: Add explicit mappings to ATTR_NAME_MAP.

### TOOLS-H1: Four tools default to stale schema/base or schema/extended
**Files**: csv-to-json.js, generate-templates.js, generate-site-content.js, deployment-readiness.js
**Impact**: Running without --schema crashes (directory doesn't exist).
**Fix**: Change defaults to schema/core.

### TOOLS-H2: csv-to-json coerces booleans to strings
**File**: csv-to-json.js
**Impact**: Produces "true"/"false" strings. validate.js requires native true/false. CSV-converted data always fails boolean validation.
**Fix**: Parse "true"/"false" strings to native booleans.

### TOOLS-H3: SLA duplicated in LOAD_PRIORITY
**File**: tools/lib/constants.js lines 93 and 167
**Impact**: SLA imported twice, potential duplicate records.
**Fix**: Remove the duplicate entry.

## MEDIUM Severity

### SN-M1: class-map.js Feature missing product reference
Feature mapping doesn't include the new product attribute.

### SN-M2: install-scoped-app.js hardcodes u_cmdbk_ prefix
Doesn't work with scoped app prefix.

### SN-M3: check-schema.js only validates u_ columns
Misses x_cmdbk_ scoped columns.

### SN-M4: cmdbInstance bypasses retry logic
api-client.js cmdbInstance method doesn't use requestWithRetry.

### SN-M5: Deployment Site and Document person refs point to sys_user
Should reference custom person table for consistency.

### SN-M6: validate-import cannot handle transform fields
Fields with value transforms (install_status) compare raw values against transformed values.

### SN-M7: Query injection in resolveSysId
Record names with special characters break the sysparm_query.

### JSM-M1: Boolean handling dead code
import.js checks def.type === 4 for booleans but correct check is type 0, defaultTypeId 2.

### JSM-M2: AQL injection
Record names with double quotes break query strings.

### JSM-M3: Overlay integer type code wrong
attributeTypes.integer mapped to 1 (Reference) instead of 0 with defaultTypeId 1.

### TOOLS-M1: No --domain flag on csv-to-json, generate-templates, generate-site-content
Can't work with Core+Domains architecture.

### TOOLS-M2: generate-site-content countRecords misses file patterns
Only checks {name}.json, not {name}s.json or person.json.

### TOOLS-M3: deployment-readiness.js assumes distribution domain types exist
Crashes on Core-only schema.

### TOOLS-M4: Domain attribute merge silently overwrites Core definitions
Object.assign with no warning on collision.

### TOOLS-M5: Dead code in validate.js extraInPriority loop
Empty loop body produces no warnings for 100+ legacy LOAD_PRIORITY entries.

## LOW Severity

### SN-L1: VM scoped column name hardcoded
### SN-L2: Hardcoded prefix in relationship import
### SN-L3: Export name field skip logic incomplete
### SN-L4: Discovery source not validated against choice list
### SN-L5: migrate.js references stale paths
### JSM-L1: bulk-update-icons-mapped.js completely broken (wrong imports)
### JSM-L2: Export doesn't handle all domain types
### JSM-L3: Icon map missing explicit entries for some domain types
### TOOLS-L1: SCCM domain types not in LOAD_PRIORITY
### TOOLS-L2: LOAD_PRIORITY has 100+ enterprise entries that bloat every import
### TOOLS-L3: Domain collision produces no warning
### TOOLS-L4: generate-site-content README has stale path
### TOOLS-L5: Hardcoded status strings in deployment-readiness
