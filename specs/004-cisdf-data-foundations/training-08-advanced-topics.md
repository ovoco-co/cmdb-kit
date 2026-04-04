# Advanced Topics

## Advanced Topics

### Impact Analysis Configuration

Impact analysis traces the relationship graph to determine what is affected when a CI has an incident or planned change.

**How it works**: Starting from the affected CI, ServiceNow walks "Depends on" and "Runs on" relationships upstream to find business services that depend (directly or transitively) on this CI.

Example impact chain:
```
Business Service: "Online Banking"
  Depends on -> Technical Service: "Web Application Cluster"
    Depends on -> Application Service: "Banking App - Production"
      Runs on -> Server: "web-prod-01" <-- THIS SERVER HAS AN INCIDENT
      Runs on -> Server: "web-prod-02"
      Depends on -> Application Service: "Database Cluster - Production"
        Runs on -> Server: "db-prod-01"
        Runs on -> Server: "db-prod-02"
```

When web-prod-01 has an incident, impact analysis shows:
- Direct impact: Banking App - Production (runs on this server)
- Indirect impact: Online Banking business service (depends on the app)
- Affected users: All users of Online Banking

**Configuring impact rules**: Navigate to **CMDB > Impact Analysis > Rules**. Rules define which relationship types to follow and how far to traverse.

**Testing impact analysis**: Before relying on it, test with a known CI. Open a CI record, click "Show Impact," and verify the dependency chain matches reality. If relationships are missing or wrong, fix them before going live.

### Business Rules on CMDB Tables

Business rules are server-side scripts that execute when records are inserted, updated, deleted, or queried. CMDB tables have several OOTB business rules.

**OOTB business rules on cmdb_ci** (do NOT modify):
- IRE processing rules (handle identification and reconciliation)
- Relationship cascade rules (update related records when a CI changes)
- Health scoring triggers (recalculate health when CI data changes)
- Audit logging rules (record changes to sys_audit)

**Custom business rules on custom tables**: For cmdb-kit custom tables (u_cmdbk_*), you can create business rules to enforce data quality:

Example: Enforce that every Product CI must have an owner before it can be set to install_status = 1:
```javascript
// Before Insert/Update business rule on u_cmdbk_product
// Condition: install_status changes to 1
if (current.install_status == 1 && current.managed_by.nil()) {
    gs.addErrorMessage('A Product CI must have a Managed By value before being set to Installed.');
    current.setAbortAction(true);
}
```

**Performance warning**: Business rules on high-volume CMDB tables can slow down imports significantly. A rule that fires on every update to cmdb_ci affects every Discovery scan, every import, and every manual edit. Use conditions to limit when rules fire, and use async business rules for heavy processing.

### Client Scripts and UI Policies

These control the CI form behavior in the browser when users view or edit CIs.

**UI Policies**: Declarative rules that show/hide fields, make fields mandatory, or make fields read-only based on conditions. No scripting required.

Example: Make support_group mandatory when install_status = 1 (Installed):
1. Navigate to System UI > UI Policies
2. Table: cmdb_ci_server
3. Condition: install_status = 1
4. Action: support_group - Mandatory = true

**Client Scripts**: JavaScript that runs in the browser. Use sparingly because they slow down form load time.

Types:
- **onLoad**: Runs when the form opens. Use for setting defaults or showing messages.
- **onChange**: Runs when a specific field changes. Use for cascading updates (changing environment clears the support_group).
- **onSubmit**: Runs when the user saves. Use for validation.

### CMDB Groups and Query Builder

**CMDB Groups**: Saved CI queries that define reusable populations. Navigate to **CMDB > CMDB Groups**.

Examples:
- "Production Servers" = cmdb_ci_server where install_status=1 AND environment=Production
- "Critical Business Applications" = cmdb_ci_business_app where business_criticality=1

CMDB Groups are used in:
- Health inclusion rules (measure health for this group of CIs)
- Impact analysis (define which CIs are in scope for a service)
- Reports and dashboards (filter data by group)
- Certification policies (certify CIs in this group)

**Query Builder**: A visual tool for building complex CMDB queries that span relationships. Navigate to **CMDB > Query Builder**.

The Query Builder lets you build queries like: "Find all servers that run applications that support the Payroll business service." This requires traversing multiple relationship hops (server -> Runs on -> application -> Depends on -> business service). The Query Builder handles this without writing GlideRecord scripts.

### Suggested Relationships

ServiceNow can automatically suggest relationships based on Discovery and traffic data. Navigate to **CMDB > Suggested Relationships**.

When Discovery detects network connections between devices, or Service Mapping identifies application dependencies, ServiceNow creates suggested relationship records. These are not automatically committed. An admin reviews them, verifies they are correct, and approves or rejects them.

Each suggestion has a **confidence score** indicating how certain ServiceNow is about the relationship. High confidence (detected multiple times via traffic analysis) is usually safe to approve. Low confidence (one-time network connection) may be noise.

For large environments with hundreds of servers, suggested relationships are the only practical way to build the dependency graph without manually entering every relationship.


