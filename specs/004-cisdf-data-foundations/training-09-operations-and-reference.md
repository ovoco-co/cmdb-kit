# Daily Operations and Reference

## Daily Operations

### Weekly Checklist

- [ ] CMDB Health Dashboard: Check Completeness, Correctness, and Compliance scores for tracked classes
- [ ] De-duplication queue: Open pending tasks and resolve or assign them
- [ ] Stale CI report: Investigate CIs with install_status=1 and no update in 60+ days
- [ ] Import logs: Check cmdb-kit or other integration logs for errors or warnings
- [ ] Relationship integrity: Spot-check a few high-value CIs and verify their relationships are current

### Monthly Checklist

- [ ] Certification tasks: Review completion rates. Escalate overdue certifications.
- [ ] Identification rule audit: Check if any CI classes have high duplicate rates. Strengthen rules.
- [ ] Reconciliation review: Verify the right sources are winning for the right attributes.
- [ ] Completeness trend: Compare this month's score to last month's. Address any class that dropped.
- [ ] Retirement candidates: Review CIs flagged as stale for 60+ days. Retire confirmed decommissions.
- [ ] Data source health: Verify all integrations (Discovery, cmdb-kit, SGCs) have run successfully in the past 30 days.

### After Any Integration Change

- [ ] Verify identification rules are correct for affected CI classes
- [ ] Run a test import with sample data before full import
- [ ] Check CMDB Health scores before and after to ensure no degradation
- [ ] Verify discovery_source is set correctly on imported CIs
- [ ] Confirm reconciliation rules still function (test with a known conflict scenario)
- [ ] Check for new duplicates created by the change

### After Any ServiceNow Upgrade

- [ ] Verify custom tables still exist and function
- [ ] Verify custom identification rules are still active
- [ ] Verify custom reconciliation rules are still active
- [ ] Run cmdb-kit schema check (`node adapters/servicenow/check-schema.js`)
- [ ] Run a test import to verify end-to-end functionality
- [ ] Review CMDB-related release notes for behavior changes
- [ ] Check if any OOTB identification rules changed (compare before/after)
- [ ] Verify health inclusion rules still function


## Troubleshooting

### CI Not Found After Import

Symptoms: You imported data but the CI doesn't appear in the expected table.

Check:
1. **Wrong table**: The CI may have been created in a parent table. Query `cmdb_ci.LIST?sysparm_query=name=<ci_name>` to find it regardless of class.
2. **Identification rule merged it**: The IRE may have matched it to an existing CI with a different name. Check reconciliation history for the expected CI.
3. **Dependent class rejection**: If the CI type is dependent and the parent doesn't exist, the IRE silently rejects the payload. Check import logs for errors.
4. **Discovery source blank**: If discovery_source was blank, the CI may have been created but not tagged, making it hard to find by source filter.

### Duplicate CIs Created

Symptoms: The same physical entity has multiple CI records.

Check:
1. **Identification rule weakness**: Is the rule matching by name only? Add compound keys.
2. **Normalization mismatch**: Are the CIs identical except for manufacturer spelling? Normalize before import.
3. **Different class**: Two CIs with the same serial number but different sys_class_name are not considered duplicates by the IRE (rules are per-class). A server discovered as cmdb_ci_linux_server and imported as cmdb_ci_server are in different classes.
4. **IRE bypassed**: Were CIs created via direct Table API instead of CMDB Instance API? The Table API does not invoke IRE for CI records.

### Field Values Keep Reverting

Symptoms: You update a field on a CI but it reverts to the old value after the next Discovery scan or import.

Check:
1. **Reconciliation**: A higher-precedence source is overwriting your change. Check CI Data Resolution to see which source is winning.
2. **No reconciliation rules**: Without rules, last write wins. Discovery runs more frequently than manual edits, so Discovery always wins.
3. **Discovery setting null**: Discovery may be writing null/empty to a field because it can't determine the value (e.g., business_criticality). Create a reconciliation rule that doesn't authorize Discovery for that field.

### Health Score Dropped

Symptoms: CMDB Health Completeness or Correctness score dropped after an import or change.

Check:
1. **Completeness drop**: Did the import create CIs without populating health-tracked fields? Run a completeness report filtered by discovery_source to find the incomplete CIs.
2. **New duplicates**: Did the import create duplicates that increased the Correctness duplicate count? Check de-duplication tasks.
3. **New orphans**: Did the import create CIs without required relationships? Check orphan rules for the affected class.
4. **Health inclusion rules changed**: Did someone modify the inclusion rules to include more CIs (including low-quality ones)?
5. **New audit rules**: Did someone add a compliance audit rule that existing CIs don't pass?

### Import Errors

Symptoms: cmdb-kit import fails or reports errors.

Common causes:
1. **Authentication failure (401)**: Password changed, account locked, or MFA enabled on the service account. ServiceNow API accounts should not have MFA.
2. **Permission denied (403)**: The service account lacks the required role. Check the role list above.
3. **Table not found (404)**: The custom table doesn't exist yet. Run schema sync before data import.
4. **Rate limited (429)**: Too many API calls too fast. Increase the SN_REQUEST_DELAY setting.
5. **Instance hibernating**: Dev/PDI instances sleep after inactivity. Wake the instance and retry.
6. **Reference not found**: A reference field points to a record that doesn't exist (e.g., location "Building A" doesn't exist in cmn_location). Create the referenced record first.


## Glossary

| Term | Definition |
|---|---|
| CI | Configuration Item. A record in the CMDB representing a managed entity (server, application, service, etc.) |
| CMDB | Configuration Management Database. The ServiceNow database of all CIs and their relationships. |
| CSDM | Common Service Data Model. ServiceNow's reference architecture for organizing CMDB data into domains. |
| IRE | Identification and Reconciliation Engine. The ServiceNow engine that matches incoming data to existing CIs and resolves source conflicts. |
| GIE | Glide Identification Engine. The older name for the identification component of IRE. |
| NDS | Normalization Data Services. ServiceNow's built-in library for standardizing manufacturer, model, and software names. |
| SGC | Service Graph Connector. A certified integration package from the ServiceNow Store. |
| OOTB | Out of the box. ServiceNow features and configurations that come standard with the platform. |
| MID Server | Management, Instrumentation, and Discovery Server. A lightweight agent on your network that Discovery uses to probe devices. |
| sys_id | System ID. A 32-character GUID that uniquely identifies every record in ServiceNow. |
| Coalesce | In Transform Maps, the field(s) used to match incoming records to existing records (equivalent to identification). |
| Discovery source | The discovery_source field on a CI indicating which integration or tool created/updated the record. |
| Precedence | A numeric value on a data source determining its authority level. Lower number = higher priority. |
| Orphan | A CI missing a required relationship (e.g., an application without a hosting server). |
| Stale CI | A CI with install_status = Installed but not updated within the staleness threshold (default 60 days). |
| Health Inclusion Rule | A filter controlling which CIs are evaluated by the CMDB Health Dashboard. |
| De-duplication task | A work item created when the IRE detects potential duplicate CIs. Requires manual review to merge or dismiss. |
| Dependent CI | A CI that cannot be uniquely identified without a hosting parent CI. |
| Independent CI | A CI that can be uniquely identified using only its own attributes. |
| Compound key | An identification entry using multiple attributes that must all match (e.g., serial_number AND serial_number_type). |
| Reconciliation rule | A configuration defining which data source is authorized to update which attributes on a CI class. |
| Business Application | A CSDM entity representing a logical application from the business perspective (cmdb_ci_business_app). |
| Technical Service | A CSDM entity representing an IT-delivered service (cmdb_ci_service_technical). |
| Application Service | A CSDM entity representing a running instance of an application (cmdb_ci_service_discovered). |

## Quick Reference

### Navigation Paths

| What | Where |
|---|---|
| CI Class Manager | CMDB > CI Class Manager |
| Identification Rules | CMDB > Identification Rules |
| Reconciliation Rules | CMDB > Reconciliation Rules |
| CMDB Health Dashboard | CMDB > CMDB Health |
| De-duplication Tasks | CMDB > De-duplication |
| De-duplication Templates | CMDB > De-duplication > Templates |
| Data Certification Policies | CMDB > Data Manager > Certification Policies |
| Certification Tasks | CMDB Workspace > My Work > Certification Tasks |
| Data Sources | Configuration > Data Sources > Data Sources |
| Import Sets | System Import Sets > Import Sets |
| Transform Maps | System Import Sets > Transform Maps |
| CI Relationship Types | CMDB > CI Relationship Types |
| Health Inclusion Rules | CI Class Manager > (select class) > Health > Health Inclusion Rules |
| Completeness Config | CI Class Manager > (select class) > Health > Completeness |
| Orphan Rules | CI Class Manager > (select class) > Health > Correctness > Orphan Rules |

### Useful Queries

Find all CIs from a specific source:
```
cmdb_ci.LIST?sysparm_query=discovery_source=CMDB-Kit
```

Find stale active CIs (not updated in 60 days):
```
cmdb_ci.LIST?sysparm_query=sys_updated_on<javascript:gs.daysAgo(60)^install_status=1
```

Find CIs with missing support group:
```
cmdb_ci_server.LIST?sysparm_query=support_groupISEMPTY^install_status=1
```

Find retired CIs still showing relationships:
```
cmdb_rel_ci.LIST?sysparm_query=parent.install_status=7^ORchild.install_status=7
```

Find duplicate candidates by name:
```
cmdb_ci_server.LIST?sysparm_query=install_status=1^GROUPBYname^HAVINGCOUNTname>1
```

### Background Scripts

Check identification rules for a class:
```javascript
var gr = new GlideRecord('cmdb_identifier');
gr.addQuery('applies_to.name', 'cmdb_ci_server');
gr.query();
while (gr.next()) {
    gs.info('Rule: ' + gr.name + ', Independent: ' + gr.independent);
    var entry = new GlideRecord('cmdb_identifier_entry');
    entry.addQuery('identifier', gr.sys_id);
    entry.orderBy('order');
    entry.query();
    while (entry.next()) {
        gs.info('  Order ' + entry.order + ': ' + entry.attributes);
    }
}
```

Check reconciliation history for a CI:
```javascript
var gr = new GlideRecord('sys_cmdb_ci_reconciliation');
gr.addQuery('ci', 'CI_SYS_ID_HERE');
gr.orderByDesc('sys_updated_on');
gr.setLimit(20);
gr.query();
while (gr.next()) {
    gs.info(gr.source + ' -> ' + gr.attribute + ' = ' + gr.value +
            ' (' + gr.sys_updated_on + ')');
}
```

Count CIs by discovery source:
```javascript
var ga = new GlideAggregate('cmdb_ci');
ga.addQuery('install_status', 1);
ga.addAggregate('COUNT');
ga.groupBy('discovery_source');
ga.query();
while (ga.next()) {
    gs.info(ga.discovery_source + ': ' + ga.getAggregate('COUNT'));
}
```

Find CIs where cmdb-kit is the source but no update in 60 days:
```javascript
var gr = new GlideRecord('cmdb_ci');
gr.addQuery('discovery_source', 'CMDB-Kit');
gr.addQuery('install_status', 1);
gr.addQuery('sys_updated_on', '<', gs.daysAgo(60));
gr.query();
var count = 0;
while (gr.next()) {
    count++;
    gs.info('  ' + gr.name + ' (class: ' + gr.sys_class_name +
            ', last updated: ' + gr.sys_updated_on + ')');
}
gs.info('Stale CMDB-Kit CIs: ' + count);
```

