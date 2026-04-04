# ITSM and ITAM Integration

## ITSM Integration with CMDB

The CMDB is not an end in itself. Its value comes from how other ITIL processes consume its data. Understanding these integrations is essential for justifying CMDB investment and prioritizing data quality efforts.

### Incident Management

When an incident is created, the **Configuration item** field links it to a CI. This enables:

**Automatic routing**: If the CI has a `support_group` populated, the incident can be automatically assigned to that group. This is configured via assignment rules that reference the CI's support_group field. If support_group is empty or wrong, the incident gets misrouted.

**Impact calculation**: The CI's `business_criticality` field feeds into the incident's priority calculation. A P1 incident on a business-critical server gets different SLA treatment than a P3 on a dev workstation. If business_criticality is not populated, all incidents get the same default priority.

**Related records**: All incidents, changes, and problems associated with a CI are visible in the CI's related lists. This gives the support team context: "This server has had 5 incidents in the last month, maybe it needs replacement."

**Impact analysis from CI**: When a major incident affects a server, the dependency graph (built by Service Mapping) shows which business services and users are affected. This drives the communications plan.

**What bad CMDB data causes**: Incidents routed to the wrong team (wrong support_group). Impact not calculated correctly (missing business_criticality). No context on the CI's history (CI not linked to incidents).

### Change Management

Changes reference CIs through the **Configuration item** field and the **Affected CIs** related list.

**Change risk assessment**: ServiceNow calculates change risk partly based on the CI's business_criticality and the number of dependent services. A change to a server that 10 business services depend on is higher risk than a change to a standalone dev box. This requires accurate relationships in the CMDB.

**Change collision detection**: When two changes target the same CI or related CIs in the same maintenance window, ServiceNow flags a potential collision. This requires the Affected CIs related list to be populated correctly.

**Change blackout windows**: Certain CIs or services have blackout periods (e.g., no changes to the payroll server during payroll processing). These are tied to CI records or service records in the CMDB.

**Post-implementation verification**: After a change is implemented, the CI's attributes should be updated to reflect the new state (e.g., OS version upgraded, RAM increased). Discovery handles this automatically for discovered attributes. For business context changes, the change implementer should update the CI manually.

### Problem Management

Known errors and root causes are linked to CIs. When a problem affects a specific CI class or a specific CI, the problem record references it. This enables:

- Trend analysis: "This model of server has had 15 problems in the last quarter, suggesting a hardware defect"
- Impact scoping: "How many CIs are affected by this known error?"
- Fix targeting: "Which CIs need the workaround applied?"

### Event Management

Monitoring tools (Datadog, Nagios, SolarWinds, etc.) generate events that ServiceNow's Event Management processes. Events must be mapped to CIs to be actionable.

**Event-to-CI binding**: When an event arrives, ServiceNow looks up the CI using the event's source identifier (hostname, IP address, FQDN). If the lookup fails because the CMDB data doesn't match the monitoring tool's data (e.g., monitoring uses "web01.prod.internal" but CMDB has "web01"), the event goes unassigned.

**Operational status updates**: Events can trigger automatic operational_status changes on CIs. A "host down" event sets operational_status = 2 (Non-Operational). A "host recovered" event sets it back to 1 (Operational).

**Why this matters for CMDB admin**: If monitoring event-to-CI binding is failing at a high rate, it's a CMDB data quality problem. The CMDB admin needs to ensure hostnames, IP addresses, and FQDNs in the CMDB match what monitoring tools report.

## ITAM Integration

IT Asset Management (ITAM) and CMDB overlap significantly. Understanding their relationship prevents confusion and data conflicts.

### CI vs Asset

A CI (cmdb_ci) represents a configuration item from an operational perspective: what it does, where it runs, who supports it.

An asset (alm_hardware, alm_asset) represents the same physical entity from a financial perspective: who owns it, what it cost, when the lease expires, what department it's charged to.

ServiceNow links them with a one-to-one relationship. When Discovery creates a cmdb_ci_server, ServiceNow can automatically create a corresponding alm_hardware record. The two records share the same sys_id for the CI but live in different tables.

| Concern | CI (cmdb_ci) | Asset (alm_asset) |
|---|---|---|
| Managed by | IT Operations / CMDB Admin | IT Finance / Asset Manager |
| Key fields | IP, OS, support_group, relationships | Cost center, purchase order, lease dates, depreciation |
| Lifecycle | install_status (Installed, Retired) | asset_tag, substatus (In use, In stock, Disposed) |
| Source of truth | Discovery, Service Mapping | Procurement system, manual entry |

### Software Asset Management (SAM)

SAM uses Discovery data to track installed software across the estate. Discovery identifies running processes and installed packages, creating software CI records (cmdb_ci_spkg). SAM then compares installed software against license entitlements to determine compliance.

Bad CMDB data affects SAM:
- Missing servers (not discovered) means undercounted installations
- Duplicate servers means overcounted installations
- Wrong OS or software version means incorrect license matching

### Hardware Asset Management (HAM)

HAM tracks the physical hardware lifecycle: procurement, receiving, deployment, maintenance, disposal. The hardware asset record links to the CI record. When a server CI's install_status changes to 7 (Retired), the corresponding asset's substatus should change to "Disposed" or "Returned."


