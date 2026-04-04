# Research: ServiceNow CMDB Data Foundations

## Sources

All findings derived from official ServiceNow documentation (docs.servicenow.com), ServiceNow Community articles, and ServiceNow Knowledge Base. Not from third-party study guides.

## Key Findings

### Data Source Registration
- Every external integration must register as a named data source
- discovery_source must be set on every CI payload, never blank (blank bypasses reconciliation)
- Data source record enables reconciliation rules to reference the integration

### Identification (IRE)
- Compound keys with fallback priorities (lower number = higher priority, tried first)
- Independent CIs match on own attributes only
- Dependent CIs require hosting parent to exist first (e.g., Application depends on Server via "Runs on")
- cmdb_ci_appl is dependent, which is why cmdb-kit uses independent custom classes for Product
- Always route CI writes through CMDB Instance API, never direct Table API for CIs

### Reconciliation
- Two layers: reconciliation rules (which sources can write) and precedence (which source wins)
- Precedence is per-attribute, not per-CI. Different fields on the same CI can come from different sources
- Lower number = higher priority. Typical values: Discovery 10-20, Service Mapping 20-30, SGC 30-50, External integrations 50-70, Manual 80-90
- Without reconciliation rules, precedence has no effect
- Blank data_source on payload takes precedence over everything (documented gotcha)

### CMDB Health Dashboard
- Completeness: required + recommended fields populated (location, support_group, managed_by, assigned_to)
- Correctness: no duplicates (IRE), no orphans (required relationships), no stale CIs (90-day default)
- Compliance: custom audit rules per CI class
- Health Inclusion Rules control which classes are evaluated

### CI Lifecycle
- install_status: 1=Installed, 2=Pending, 4=Maintenance, 7=Retired
- operational_status: 1=Operational, 6=Retired
- Staleness evaluated by last_discovered or sys_updated_on (90-day default threshold)
- Retired CIs incorrectly flagged as stale is a known issue (KB2478553)
- CIs removed from source must be explicitly retired, not just abandoned

### Normalization
- Performed during ingestion via Transform Maps and Transform Scripts
- Standardization (variant spellings to canonical), Validation (format checks), Enrichment (infer manufacturer from model), Deduplication prevention
- Key fields: manufacturer, model_id, os, os_version

### CSDM v5.0
- Seven domains: Foundation, Ideation/Strategy, Design/Planning, Build/Integration, Service Delivery, Service Consumption, Manage Portfolios
- Business Application is the "Rosetta Stone" connecting business to technical
- cmdb-kit Product maps to Business Application or Product Model concept
- Custom independent class is correct approach when avoiding dependent hosting requirements

### Duplicate Management
- IRE creates de-duplication tasks, does not auto-merge
- CMDBDuplicateTaskUtils API for programmatic task creation
- De-duplication templates enable consistent bulk remediation
- Strong identification rules are the primary prevention mechanism

## Adapter Code Audit Summary

Current adapter capabilities mapped to requirements:

| Requirement | Status | Detail |
|---|---|---|
| CMDB Instance API for Tier 2 CIs | Done | Two-pass import (IRE + Table API for custom refs) |
| Identification rules | Partial | Independent only, single attribute (name), order 100 |
| discovery_source on payloads | Missing | Configurable env var exists but defaults to "ServiceNow" not "CMDB-Kit" |
| Data source record creation | Missing | No sys_data_source record created |
| Reconciliation rules | Missing | No reconciliation configuration |
| install_status mapping | Partial | Status transform exists but only for install_status, not operational_status |
| Staleness prevention | Missing | No sys_updated_on touch on unchanged records |
| Retirement detection | Missing | No comparison of ServiceNow state to local data |
| Manufacturer normalization | Missing | Only OS/CPU/RAM/disk transforms exist |
| Compound identification keys | Missing | Hardcoded to ["name"] |
| Dependent CI classes | Missing | All identification rules are independent=true |
| Health field population | Missing | No mapping for location, support_group, managed_by, assigned_to |
| CSDM domain documentation | Missing | Overlay has no CSDM annotations |
