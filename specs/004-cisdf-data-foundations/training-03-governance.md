# CMDB Governance

## Governance

### CMDB Health Dashboard Deep Dive

Navigate to **CMDB > CMDB Health** to view data quality scores.

The dashboard provides a single view of your CMDB's trustworthiness across three dimensions. Each dimension is scored 0-100% per CI class.

**Completeness (are required fields populated?)**

The Completeness KPI measures the percentage of CIs that have all required and recommended attributes populated. It answers: "Do we have all the necessary data?"

Configuration:
1. Navigate to CI Class Manager
2. Select a CI class
3. Go to Health > Completeness
4. Define which attributes are Required (must be populated) and Recommended (should be populated)
5. Required attributes failing drops the CI from "complete" status
6. Recommended attributes failing reduces the overall score but doesn't mark the CI as incomplete

Typical completeness configuration for cmdb_ci_server:

| Attribute | Level | Reasoning |
|---|---|---|
| name | Required | Every CI must have a name |
| serial_number | Required | Hardware identification |
| ip_address | Recommended | Not all servers have static IPs |
| os | Recommended | Should be discoverable |
| location | Recommended | Physical or logical location |
| support_group | Recommended | Who fixes it when it breaks |
| managed_by | Recommended | Who is accountable for it |
| assigned_to | Recommended | Day-to-day operational contact |
| model_id | Recommended | Hardware model for capacity planning |
| manufacturer | Recommended | For vendor management and contracts |
| environment | Recommended | Production, staging, development |

To improve completeness:
- Ensure Discovery is configured to populate infrastructure attributes
- Ensure cmdb-kit or another business context source populates ownership and support fields
- Run the completeness report weekly and address the worst classes first
- For custom cmdb-kit classes, define completeness rules in CI Class Manager after import

**Correctness (is the data accurate?)**

Correctness evaluates three sub-metrics:

*Duplicates*: Multiple CIs representing the same entity. The CMDB Health scheduled job compares CIs using identification rules and flags potential duplicates. These appear as de-duplication tasks.

Root causes:
- Weak identification rules (name-only matching in multi-environment orgs)
- Data imported without routing through IRE (direct Table API writes for CI records)
- Identification rules changed after data was already imported (old data matched by old rules)
- Normalization differences (manufacturer="Dell" vs "Dell Inc." creates two CIs for the same server)

*Orphans*: CIs missing required relationships. An application CI without a "Runs on" relationship to a server is an orphan. Orphan rules are configured per class in CI Class Manager under Health > Correctness > Orphan Rules.

To configure an orphan rule:
1. Navigate to CI Class Manager > select class (e.g., cmdb_ci_appl)
2. Health > Correctness > Orphan Rules
3. Define: This CI MUST have a "Runs on" relationship to a cmdb_ci_server
4. CIs without this relationship are flagged as orphans

*Stale CIs*: CIs not updated within a configured threshold. The default threshold is 60 days. Staleness is evaluated by whichever is more recent: `last_discovered` or `sys_updated_on`.

A CI is stale when:
- install_status = 1 (Installed/Active) AND
- Neither last_discovered nor sys_updated_on has been updated in 60+ days

This means either:
- The device is offline or unreachable (investigate)
- The device was decommissioned but not retired in the CMDB (update status)
- The integration that manages this CI stopped running (fix the integration)

Known issue (KB2478553): Retired CIs (install_status=7) can incorrectly appear in the staleness dashboard because the health inclusion rules don't always filter by install_status. Solution: Configure health inclusion rules to exclude retired CIs.

To prevent staleness from cmdb-kit imports:
- Re-run imports periodically (even if data hasn't changed) so sys_updated_on advances
- If the adapter detects no changes, it should still touch the record to update the timestamp
- When a CI is removed from cmdb-kit data files, the adapter should flag it for retirement rather than just stopping updates

**Compliance (does the data meet organizational standards?)**

Compliance is measured by custom audit rules. Unlike Completeness and Correctness, Compliance rules are entirely organization-specific.

Examples of compliance audit rules:
- All production servers must have a backup job configured (check u_backup_schedule IS NOT EMPTY WHERE environment=Production)
- All servers must be assigned to a support group (check support_group IS NOT EMPTY)
- All business applications must have a business owner (check owned_by IS NOT EMPTY on cmdb_ci_business_app)
- No CI should have install_status = 1 (Installed) with operational_status = 6 (Retired) (contradictory states)
- All CIs with environment = Production must have business_criticality populated

To create an audit rule:
1. Navigate to CMDB > CMDB Health > Audit
2. Create new audit rule
3. Define the CI class, filter condition, and expected state
4. The health job evaluates all CIs against the rule and flags non-compliant ones

A CI must pass ALL applicable audit rules to be considered compliant. One failure on any rule marks the entire CI as non-compliant.

### Health Inclusion Rules

Not every CI class needs health measurement. Including too many classes dilutes the score and creates noise. Health Inclusion Rules control which CIs appear on the dashboard.

Navigate to CI Class Manager > select a class > Health > Health Inclusion Rules.

An inclusion rule defines a filter. Only CIs matching the filter are evaluated. Common filters:
- install_status = 1 (only measure active CIs, not retired or on-order)
- discovery_source IS NOT EMPTY (only measure CIs that came from a known source)
- environment = Production (only measure production CIs)

Rules on parent classes cascade to children unless the child has its own rule. A rule on cmdb_ci_hardware that filters to install_status=1 applies to servers, storage, and network gear.

Recommended starting classes for health measurement:
- cmdb_ci_server (your most critical infrastructure)
- cmdb_ci_business_app (the bridge between business and technical)
- cmdb_ci_db_instance (databases supporting applications)
- cmdb_ci_service (business services)

Add cmdb-kit custom classes only after you have consistent data quality for the standard classes.

### CI Lifecycle Deep Dive

**install_status** is the primary lifecycle field. It tracks where the CI is in its journey from ordered to retired.

| Value | Label | Meaning | Discovery Behavior |
|---|---|---|---|
| 1 | Installed | Active, in production use | Discovery updates this CI normally |
| 2 | On Order | Ordered but not yet received | Discovery should not find this CI |
| 3 | In Maintenance | Temporarily offline for planned work | Discovery may fail to reach it |
| 4 | Pending Install | Received, being set up | Discovery may partially discover it |
| 5 | Pending Repair | Offline, awaiting repair | Discovery will fail to reach it |
| 6 | In Stock | In inventory, not deployed | Discovery should not find this CI |
| 7 | Retired | Permanently decommissioned | Discovery should not find this CI |
| 8 | Stolen | Reported stolen | Discovery should not find this CI |
| 100 | Absent | Cannot be located | Discovery will fail to reach it |

**operational_status** tracks the current operating state independently of lifecycle:

| Value | Label | Meaning |
|---|---|---|
| 1 | Operational | Running normally |
| 2 | Non-Operational | Down, not functioning |
| 3 | Repair in Progress | Being fixed |
| 4 | DR Standby | Disaster recovery standby |
| 5 | Ready | Provisioned but not yet in service |
| 6 | Retired | Permanently decommissioned |

These two fields are independent. A server can be install_status=1 (Installed) and operational_status=2 (Non-Operational) during an outage. When the server is decommissioned, set both: install_status=7 and operational_status=6.

**CSDM Lifecycle Stages** (newer approach, complementary to install_status):

CSDM v5.0 introduces `life_cycle_stage` and `life_cycle_stage_status` fields that provide a more granular view:

| Stage | Sub-statuses |
|---|---|
| Planning | Proposed, Approved |
| Build | In Development, Testing |
| Deliver | In Deployment, Deployment Complete |
| Operations | Active, DR Standby, Repair |
| End of Life | End of Support, Decommissioning |
| Retired | Retired |

Not all instances use lifecycle stages. It requires configuration and is more common in organizations following CSDM rigorously.

**Retirement process**:

When a CI reaches end of life:

1. Set install_status = 7 (Retired) and operational_status = 6 (Retired)
2. Review all relationships to the retired CI:
   - Other CIs that "Depend on" the retired CI need to be re-pointed or also retired
   - "Contains" relationships to child CIs need the children retired too
   - "Runs on" relationships from applications need the applications moved or retired
3. Do NOT delete the CI record. Retired CIs serve as historical audit records for:
   - Incident investigations ("what server was this running on when it broke?")
   - Change management ("what was the configuration before we decommissioned it?")
   - Compliance and audit ("prove we had this asset and properly decommissioned it")
4. Stop any automated sources from updating the retired CI (remove from discovery schedules, exclude from import jobs)

**Staleness management for cmdb-kit**:

When cmdb-kit runs a sync, it should:
1. Import all CIs from the local data files (creating new, updating existing)
2. Compare the list of CIs in ServiceNow (with discovery_source = "CMDB-Kit") against the local data files
3. CIs in ServiceNow but NOT in local data are "retirement candidates"
4. Log the retirement candidates for admin review
5. Optionally (with a flag like `--retire-missing`), set those CIs to install_status=7

This prevents orphaned CIs that slowly go stale because no source is updating them anymore.

### Data Certification Deep Dive

Navigate to **CMDB > Data Manager > Certification Policies**.

Data Certification is a human review process. Automated tools (Discovery, cmdb-kit) maintain most CI data, but some fields require human verification. Certification creates accountability.

**Creating a certification policy**:

1. Name: "Quarterly Server Ownership Review"
2. Table: cmdb_ci_server
3. Filter: install_status = 1 AND environment = Production
4. Fields to certify: managed_by, support_group, business_criticality, environment
5. Assignee: The group or user who should review (typically the support group lead)
6. Deadline: 14 days from task creation
7. Schedule: Quarterly (every 90 days)

When the policy runs:
- The system generates one certification task per CI (or per batch, depending on configuration)
- The assignee receives the task in CMDB Workspace > My Work > Certification Tasks
- They review each CI's fields and either:
  - **Certify**: "Yes, this data is accurate as of today"
  - **Flag**: "This data is wrong" (creates a remediation task)
- Certified CIs get a timestamp showing when they were last verified

**What to certify**:

Certify fields that automated sources cannot verify:
- Business ownership (managed_by, owned_by)
- Support assignment (support_group, assigned_to)
- Business criticality (business_criticality)
- Environment classification (environment)
- Cost center / department attribution

Do NOT certify fields that Discovery maintains:
- IP address (Discovery is authoritative)
- OS version (Discovery reads it from the device)
- Hardware specs (Discovery reads them from the device)

### Duplicate Management Deep Dive

Navigate to **CMDB > De-duplication** to view and resolve duplicate tasks.

**How duplicates are detected**:

The CMDB Health scheduled job evaluates CIs against identification rules. When it finds two or more CIs that match on the same identifier entry (same serial number, same FQDN+MAC, etc.), it creates a de-duplication task.

The task contains:
- The list of CIs suspected to be duplicates
- The identification rule and entry that detected the match
- The matching attribute values

**Resolving a duplicate task**:

1. Open the task
2. Review the CIs listed. Verify they truly represent the same entity.
3. Choose the **main CI** (the one to keep). Options:
   - Newest updated (sys_updated_on most recent)
   - Oldest created (sys_created_on oldest)
   - Most relationships (the one with the richest context)
   - Most related items (the one referenced by the most other records)
   - Manual selection (you pick)
4. For each duplicate CI, decide:
   - **Merge fields**: Copy non-empty values from the duplicate to the main CI (fills gaps without overwriting)
   - **Discard fields**: Ignore the duplicate's field values
5. **Always merge relationships**. The duplicate's relationships (Depends on, Contains, Runs on, etc.) should be transferred to the main CI. Discarding relationships breaks the dependency graph.
6. Submit. The system updates the main CI, transfers relationships, and either retires or deletes the duplicates.

**De-duplication templates**:

For CI classes with frequent duplicates, create a template that pre-configures the remediation decisions. Navigate to CMDB > De-duplication > Templates.

Template settings:
- CI class (e.g., cmdb_ci_server)
- Main CI selection: "newest updated" (recommended for most classes)
- Field merge strategy: "merge non-empty values from duplicates to main"
- Relationship handling: "merge all relationships to main CI"

With a template, you can resolve duplicate tasks in bulk without making decisions for each one.

**Prevention**:

Preventing duplicates is better than cleaning them up:
- Use compound identification keys (serial_number + type, not just name)
- Add conditions to identifier entries (serial_number IS NOT EMPTY)
- Route all CI writes through the IRE (never bypass with direct Table API for CI records)
- Normalize data before import (different manufacturer spellings create false uniqueness)
- Test identification rules with sample data before running a full import


