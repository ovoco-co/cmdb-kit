# Platform Administration

## Access Control and Security

### Roles

ServiceNow CMDB administration uses role-based access control. Key roles:

| Role | What It Allows |
|---|---|
| itil | View CIs, create incidents/changes against CIs |
| cmdb_admin | Full CMDB administration: create/edit/delete CIs, configure identification rules, manage health |
| cmdb_read | Read-only access to all CMDB data |
| sn_cmdb_editor | Create and edit CIs (but not configure identification or health rules) |
| sn_cmdb_data_manager.user | View and act on data certification and de-duplication tasks |
| sn_cmdb_data_manager.operator | Configure certification policies and de-duplication templates |
| discovery_admin | Configure and run Discovery |
| import_admin | Configure Import Sets and Transform Maps |

For cmdb-kit administration, the service account used for API access needs at minimum:
- `sn_cmdb_editor` (create and update CIs)
- `import_admin` (if using Import Sets) or REST API access via `rest_api_explorer` role
- Read access to `cmdb_identifier`, `cmdb_rel_type`, `sys_db_object`, `sys_dictionary` for schema sync
- Write access to `cmdb_identifier` and `cmdb_identifier_entry` for creating identification rules

For day-to-day CMDB governance, the admin needs:
- `cmdb_admin` for identification rules, reconciliation, and health configuration
- `sn_cmdb_data_manager.operator` for certification policies and de-duplication templates

### ACL Rules on CMDB Tables

Access Control Lists (ACLs) control who can read, write, create, and delete records on CMDB tables. OOTB ACLs on `cmdb_ci` and its children are permissive for itil users (read/write) and restrictive for non-itil users.

Custom cmdb-kit tables (`u_cmdbk_*`) inherit ACLs from their parent. Tables extending `cmdb_ci` get the same ACLs as other CI classes. Standalone tables (`u_cmdbk_person`, `u_cmdbk_product_version`) need their own ACLs configured if you want to restrict access.

For security:
- The cmdb-kit service account should have the minimum roles needed (don't use admin)
- API access should use a dedicated integration user, not a personal account
- Consider creating a custom role for cmdb-kit operations if the standard roles are too broad


## Platform Administration

### Scheduled Jobs

Several scheduled jobs run automatically to maintain CMDB health. Navigate to **System Definition > Scheduled Jobs** and filter by "CMDB" or "Health."

| Job | What It Does | Default Frequency |
|---|---|---|
| CMDB Health - Calculate Scores | Calculates Completeness, Correctness, and Compliance scores | Daily |
| CMDB Health - Staleness Check | Identifies CIs not updated within the threshold | Daily |
| CMDB Health - Duplicate Detection | Runs identification rules to find potential duplicates | Daily |
| CMDB Data Manager - Certification | Generates certification tasks based on active policies | Per policy schedule |
| Discovery - Scheduled Discovery | Runs configured Discovery schedules | Per schedule configuration |
| Service Mapping - Scheduled Map | Runs service mapping for configured entry points | Per schedule configuration |
| CMDB - CI Lifecycle | Processes CI lifecycle transitions | As configured |

Monitor these jobs in **System Definition > Scheduled Jobs > Execution History**. If a job fails, check the execution log for errors. Common causes: instance maintenance window, resource constraints, or configuration changes that broke a filter.

### Update Sets and Environment Promotion

ServiceNow configuration changes are tracked in **Update Sets** (System Update Sets > Local Update Sets). When you create an identification rule, reconciliation rule, or health configuration in a sub-production instance, it's captured in the current update set.

**What gets captured**: Table definitions, field definitions, identification rules, reconciliation rules, health inclusion rules, ACL rules, business rules, UI policies, client scripts, scheduled job configurations.

**What does NOT get captured**: CI data records (the actual CIs), relationship data, data source records with instance-specific URLs, Discovery credentials, MID Server configurations.

**Promotion workflow**:
1. Make configuration changes in dev instance
2. Complete the update set (marks it read-only)
3. Retrieve the update set in the test instance
4. Preview (check for conflicts)
5. Commit (apply changes)
6. Test thoroughly
7. Repeat for production

**Clone-back warning**: When production is cloned to dev (a common practice for getting fresh data), all dev configuration changes not yet promoted are overwritten. Always promote or export update sets before a clone.

### Audit and History

Every change to a CI record is tracked in two places:

**sys_audit**: Field-level audit log. Records which field changed, old value, new value, who changed it, and when. Navigate to a CI record > Related Lists > Audit History. Useful for forensic investigation ("who changed the support_group on this server last Tuesday?").

**sys_history_line**: Human-readable activity stream. Shows a chronological list of events: "Jordan Lindsey changed Support Group from 'Network Team' to 'Cloud Team' on 2026-03-15." Navigate to a CI record > Activity tab.

**Configuring audit**: By default, most CI fields are audited. To check or change which fields are audited, navigate to **System Definition > Tables > [table name] > Columns** and check the "Audit" checkbox on each column.

**Audit retention**: Audit records accumulate over time. Large instances may need to archive or purge old audit data. Navigate to **System Archiving** to configure retention policies.

### Performance Tuning

Large CMDBs (500K+ CIs, millions of relationships) can have performance issues.

**Slow list views**: If cmdb_ci_server.LIST takes a long time to load, check whether the query is hitting an index. Navigate to **System Definition > Tables > cmdb_ci_server > Indexes** and verify that fields used in your most common filters (install_status, support_group, location) are indexed.

**Dot-walking performance**: Queries like `cmdb_ci_server.LIST?sysparm_query=location.name=Building A` require a join between cmdb_ci_server and cmn_location. On large tables, this is slow. When possible, denormalize or use sys_id-based filters instead of dot-walking.

**Flattened relationships table**: `cmdb_rel_ci` stores direct relationships. `cmdb_rel_ci_flat` stores the transitive closure (if A depends on B and B depends on C, the flat table also stores A depends on C). The flat table enables faster impact analysis but is expensive to maintain. It is rebuilt by a scheduled job. If impact analysis is slow, check that the flat table is current.

**Table rotation**: For tables with millions of records (especially audit tables and ECC queue), ServiceNow supports table rotation to archive old records. Configure this for CMDB-adjacent tables like sys_audit and ecc_queue to prevent unbounded growth.

### Domain Separation

For managed service providers (MSPs) and large enterprises that need data isolation between business units, ServiceNow supports domain separation.

Under domain separation, CMDB data is partitioned by domain. A CI in Domain A is invisible to users in Domain B. This affects:
- CI visibility in list views and reports
- Relationship creation (cross-domain relationships require explicit configuration)
- Identification rules (can be domain-specific)
- Health scoring (per-domain health dashboards)
- Discovery schedules (scoped to domains)

If your instance uses domain separation, every CMDB operation must be domain-aware. The cmdb-kit adapter would need to set the `sys_domain` field on imported CIs.

### CMDB Workspace

The CMDB Workspace is the newer UI experience that replaces the classic CMDB navigation module. Navigate to it by typing "CMDB Workspace" in the ServiceNow search bar.

The workspace provides:
- **Unified CI view**: A single screen showing the CI record, health status, relationships, associated tasks, and recent changes
- **CMDB 360**: A dashboard-style view of a single CI showing all related data at a glance
- **De-duplication workspace**: A dedicated view for managing duplicate CIs with side-by-side comparison
- **Health dashboard**: Integrated health scores with drill-down capability
- **Task management**: Certification tasks, de-duplication tasks, and remediation tasks in one place

The navigation paths in this training document use classic UI paths (CMDB > CI Class Manager). In the workspace, the same functions are available through different navigation. Both UIs access the same underlying data.

### Backup and Recovery

ServiceNow is a cloud platform. You do not manage database backups directly. However, you need to understand:

**Instance cloning**: ServiceNow allows cloning production to sub-production instances (for testing with real data). Cloning overwrites the target instance completely, including all CMDB data and configuration. Before cloning:
- Export any dev/test configuration changes (update sets) that haven't been promoted
- Understand that all dev/test CMDB data will be replaced with production data
- Data preservation plugins can exclude specific tables from clone, but this requires planning

**No table-level restore**: ServiceNow does not offer "restore cmdb_ci_server to yesterday's state." If a bad import corrupts 10,000 CIs, your options are:
- Fix the data manually or with a script
- Request a full instance restore from ServiceNow (affects ALL data, not just CMDB)
- Restore from a recent clone (if one exists)

This is why testing imports in a sub-production instance before production is critical.

**Export for safety**: Before any major import or schema change, export the affected tables to XML or CSV using **System Import Sets > Export**. This gives you a manual backup you can use for reference or recovery scripting.


## Upgrade-Safe Administration

ServiceNow releases two major upgrades per year (named after cities: Utah, Vancouver, Washington, etc.). Customizations that modify OOTB components can break during upgrades.

### The Rule: Never Modify OOTB

| Never Do This | Do This Instead |
|---|---|
| Edit an OOTB Discovery Pattern | Clone the pattern and modify the clone |
| Modify an OOTB Transform Map script | Create a custom Transform Map targeting the same table |
| Change field definitions on OOTB tables | Add new custom fields with u_ prefix |
| Delete OOTB Identification Rules | Create custom rules with higher order number |
| Modify OOTB Business Rules on CMDB tables | Create custom Business Rules on custom tables |
| Edit OOTB sys_choice entries | Create custom choice list entries |

### Why cmdb-kit is Upgrade-Safe

The adapter follows upgrade-safe patterns:
- Custom tables use `u_cmdbk_` or `x_cmdbk_` prefix (never modifies OOTB tables)
- Custom columns on OOTB tables use `u_` prefix
- Custom identification rules have order 100 (run after OOTB rules, don't override them)
- Custom data source record (doesn't modify OOTB sources)
- Scoped app option (`x_cmdbk_`) keeps everything in an isolated application scope

After a ServiceNow upgrade:
1. Custom tables and fields survive (ServiceNow preserves u_ and x_ prefix objects)
2. Custom identification rules survive (they're separate records, not modifications)
3. Custom data source records survive
4. The only risk is if an upgrade changes API behavior (rare but check release notes)


