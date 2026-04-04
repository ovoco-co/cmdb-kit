# ServiceNow CMDB Administration Training

A practical guide for administering a ServiceNow CMDB instance that receives data from cmdb-kit and other sources. Covers the concepts, configuration, and daily operations you need to keep the CMDB healthy and trustworthy.

## How the CMDB Works

### Tables and Class Hierarchy

Every configuration item (CI) lives in a table. Tables are organized in an inheritance hierarchy rooted at `cmdb_ci`. When you create a CI class, you are creating a new table that extends an existing one. The child table inherits every field from its parent and adds its own specialized fields.

The full inheritance chain for a server looks like this:

```
cmdb_ci                          (root - all CIs)
  cmdb_ci_hardware               (physical hardware)
    cmdb_ci_computer             (devices that compute)
      cmdb_ci_server             (servers specifically)
        cmdb_ci_linux_server     (Linux servers)
        cmdb_ci_win_server       (Windows servers)
        cmdb_ci_esx_server       (VMware ESXi hosts)
```

Every field defined on `cmdb_ci` (like name, install_status, operational_status, discovery_source, location, managed_by) exists on every CI in the system. Fields defined on `cmdb_ci_hardware` (like serial_number, manufacturer, model_id) exist on every hardware CI but not on application CIs. Fields defined on `cmdb_ci_server` (like os, os_version, cpu_count, ram) exist only on servers and their children.

This matters for administration because:

- **Queries on parent tables return all children.** Running a list view on `cmdb_ci` returns every CI in your CMDB. Running it on `cmdb_ci_hardware` returns servers, storage, network gear, and printers. Always filter by `sys_class_name` when you need a specific type.
- **Fields added to a parent propagate to all children.** If you add a custom field to `cmdb_ci_hardware`, it appears on servers, storage, network devices, and everything else that extends hardware. This is powerful but dangerous. Add fields at the most specific level that needs them.
- **Identification rules defined on a parent apply to all children** unless overridden. A rule on `cmdb_ci_computer` that matches by serial_number applies to servers, laptops, and workstations.

Key tables beyond the CI hierarchy:

| Table | Purpose |
|---|---|
| cmdb_rel_ci | Stores relationships between two CIs (parent, child, type) |
| cmdb_rel_type | Defines relationship types (Contains, Depends on, Runs on, etc.) |
| cmdb_identifier | Identification rules (how IRE matches incoming data to existing CIs) |
| cmdb_identifier_entry | Individual identifier entries within a rule (the actual attribute sets) |
| sys_data_source | Data source definitions (Discovery, SCCM, cmdb-kit, etc.) |
| sys_db_object | Table definitions (used when creating custom tables via API) |
| sys_dictionary | Column/field definitions |
| cmn_location | Locations (referenced by CIs) |
| core_company | Companies/organizations (referenced by CIs) |
| sys_user | Platform users (referenced by assigned_to, managed_by, etc.) |
| sys_user_group | Groups (referenced by support_group, assignment_group) |

Custom tables from cmdb-kit use the prefix `u_cmdbk_` (global scope) or `x_cmdbk_` (scoped app). CI types extend `cmdb_ci`. Non-CI types like Person and Product Version are standalone tables that do not participate in the CI hierarchy.

### CI Class Manager

Navigate to **CMDB > CI Class Manager** to view and manage the class hierarchy.

The CI Class Manager is a visual tool for working with the class hierarchy. When you open it, you see a tree on the left showing every CI class in your instance and a detail panel on the right.

**Viewing hierarchy**: Click any class to see its parent, children, attributes, and configuration. The tree is searchable. Use it to understand where a class sits in the hierarchy and what it inherits.

**Creating a class**: Right-click a parent class and select "Create child class." ServiceNow creates a new table extending the parent. All parent fields are inherited automatically. You define only the fields unique to the new class. Keep new classes as low in the hierarchy as practical. If you need a custom server type, extend `cmdb_ci_server`, not `cmdb_ci`.

**Abstract vs non-abstract classes**: An abstract class exists only as a structural grouping. You cannot create CI records in an abstract class. `cmdb_ci_hardware` is abstract. You create records in its children (cmdb_ci_server, cmdb_ci_storage_device, etc.), not in hardware directly. Mark a class as abstract when it exists only to group related children and share common fields.

**Adding attributes**: Click a class, go to the Attributes tab, and add fields. Remember that fields added here appear on this class and all its children. The field's internal type (string, integer, boolean, reference, date, choice) determines how it behaves in forms, lists, and APIs.

**What CI Class Manager does NOT do**:
- It does not manage CI records (data). For that, navigate to the table directly (e.g., cmdb_ci_server.LIST).
- It does not configure identification rules. Those are in a separate module.
- It does not configure reconciliation rules. Those are in a separate module.
- It does not manage relationships between CIs. Relationships are in cmdb_rel_ci.

### Attributes in Detail

Every field on a CI is an attribute. Understanding attribute types is essential for configuring identification, health, and reconciliation.

**String**: Free text. Name, description, serial number, FQDN. Most identification rules use string attributes. Case sensitivity matters for identification: "WEB-01" and "web-01" are different values.

**Integer**: Whole numbers. CPU count (cpu_count), RAM in megabytes (ram), disk space. Used for capacity reporting. ServiceNow stores RAM in megabytes. If your source data says "32 GB", you must convert to 32768 before import.

**Boolean**: True/false. Is virtual (virtual), is monitored. Stored as "true"/"false" strings in the API. Used for filtering (show only virtual machines, show only monitored CIs).

**Reference**: A pointer to a record in another table. Location (points to cmn_location), assigned_to (points to sys_user), manufacturer (points to core_company), model_id (points to cmdb_model). When importing data, you must resolve reference fields to sys_id values. You cannot pass a name string into a reference field via the API. You must first look up the referenced record by name to get its sys_id, then pass the sys_id.

**Date**: Date or date/time. Install date, warranty expiration, last discovered. ServiceNow stores dates in UTC. Format: "2026-03-15" for date, "2026-03-15 14:30:00" for date/time.

**Choice**: Predefined options. Operational status, install_status. Stored as integer values internally but displayed as labels in the UI. When importing, you pass the integer value (e.g., 1 for "Installed"), not the label.

**Glide list**: A comma-separated list of sys_ids pointing to records in another table. Used for multi-reference fields. In the API, pass as "sys_id_1,sys_id_2,sys_id_3".

Attributes fall into three categories for administration:

**Identification attributes**: Used by the IRE to determine CI uniqueness. These must be accurate. If serial_number is wrong, IRE creates a duplicate. If name is ambiguous, IRE merges different CIs. Common identification attributes by class:

| Class | Primary ID | Secondary ID | Fallback |
|---|---|---|---|
| cmdb_ci_server | serial_number + serial_number_type | fqdn + mac_address | name |
| cmdb_ci_computer | serial_number | name + managed_by_group | name |
| cmdb_ci_db_instance | name + host (reference) | name | - |
| cmdb_ci_appl | name + host (dependent) | - | - |
| cmdb_ci_network_switch | serial_number | ip_address | name |

**Health-tracked attributes**: Measured by the CMDB Health Dashboard for Completeness scoring. If these are empty, your health score drops. The standard health-tracked fields are:

- name (required on every CI)
- serial_number (required for hardware)
- ip_address (recommended for servers)
- os (recommended for servers)
- location (recommended for all CIs)
- support_group (recommended for all CIs)
- managed_by (recommended for all CIs)
- assigned_to (recommended for all CIs)
- model_id (recommended for hardware)
- manufacturer (recommended for hardware)

The exact list is configurable per class in CI Class Manager under Health > Completeness.

**Descriptive attributes**: Everything else. Description, department, cost center, environment, comments. Important for reporting and human context but not measured by health or used for identification.

## Data Ingestion

### How Data Gets Into the CMDB

There are four primary paths:

**Discovery** (automated network scanning)

ServiceNow's Discovery module uses a MID Server (a lightweight agent installed on your network) to probe IP ranges, connect to devices via SSH/WMI/SNMP, and create CIs automatically. Discovery is the most trusted source for infrastructure data because it reads directly from the device.

What Discovery populates: IP address, hostname, OS and version, CPU count and type, RAM, disk, running services and processes, installed software, network interfaces, serial numbers.

What Discovery does NOT populate: Business context. Discovery cannot determine who owns a server, what business service it supports, or how critical it is. That comes from manual entry or integrations like cmdb-kit.

**Service Graph Connectors** (certified external integrations)

SGCs are pre-built integration packages from the ServiceNow Store. They pull data from specific external platforms (AWS, Azure, SCCM, Datadog, Infoblox) and load it into the CMDB following CSDM patterns. Each SGC includes its own identification rules, transform maps, and reconciliation configuration.

SGCs use IntegrationHub ETL (Extract, Transform, Load) as their processing engine. The data flow is: External source > Data source record > Import set (staging table) > Robust Transform Engine > IRE payload > CMDB.

cmdb-kit is not a certified SGC but follows the same API patterns (CMDB Instance API for CI records, Table API for non-CI records).

**Import Sets and Transform Maps** (custom integrations)

For integrations that don't have an SGC, ServiceNow provides Import Sets. An Import Set is a temporary staging table that holds raw incoming data. A Transform Map defines how to move data from the staging table to the target CMDB table, including field mappings and transform scripts.

The transform process has four script hooks:

| Hook | When It Runs | Common Use |
|---|---|---|
| onBefore | Before any field mapping | Data validation, logging, set global variables |
| Field map script | Per field, during mapping | Complex value transformations |
| onAfter | After all field mapping | Create relationships, post-processing |
| onComplete | After all rows processed | Summary logging, cleanup |

The **coalesce** field on a field map determines how Transform Maps find existing records. If coalesce is checked for "name", the transform looks up existing records by name before deciding whether to insert or update. This is the Transform Map equivalent of identification rules.

cmdb-kit does not use Import Sets or Transform Maps. It calls the REST API directly, which routes through the IRE for Tier 2 CI classes.

**Manual entry** (human data entry via ServiceNow UI)

Administrators and CI owners create or update CIs through forms in the ServiceNow UI. Manual entry is the least scalable but the most authoritative for business context fields. A human confirming "yes, this server is owned by the Finance team and supports the payroll service" is more trustworthy than any automated source for that information.

### The IRE Pipeline in Detail

The Identification and Reconciliation Engine processes every CI write that comes through the CMDB Instance API, Import Sets with IRE-enabled transforms, or Discovery.

The full pipeline:

```
Incoming payload
  { source: "CMDB-Kit", attributes: { name: "web-01", serial_number: "SN123", ... } }
      |
      v
  1. SOURCE CHECK
     - Is discovery_source populated? If blank, reconciliation may be bypassed.
     - Resolve data source record for reconciliation rules.
      |
      v
  2. IDENTIFICATION
     - Look up identification rules for the target CI class
     - Evaluate identifier entries in priority order (lowest number first)
     - For each entry:
       a. Are ALL required attributes in the payload non-null?
          If any are null, skip this entry, try next priority
       b. Query CMDB for existing CI matching ALL attributes in this entry
       c. Match found? -> This is an UPDATE to that existing CI. Stop evaluation.
       d. No match? -> Try next priority entry
     - All entries exhausted with no match? -> This is a NEW CI. Create it.
      |
      v
  3. DEPENDENT CHECK (if class is dependent)
     - Does the payload specify the hosting parent CI?
     - Does the parent CI exist in the CMDB?
     - If no parent: REJECT the payload. Dependent CIs cannot be created without a host.
     - If parent exists: Continue with the parent reference linked.
      |
      v
  4. RECONCILIATION (only for updates to existing CIs)
     - For each attribute in the payload:
       a. Is there a reconciliation rule for this attribute on this class?
       b. If yes: Does the incoming source have equal or higher precedence
          than the current source for this attribute?
          - Higher precedence (lower number): Update the attribute
          - Lower precedence: Skip the attribute (keep existing value)
          - Equal precedence: Most recent update wins (by sys_updated_on)
       c. If no reconciliation rule: Update the attribute (last write wins)
      |
      v
  5. CMDB WRITE
     - Insert new CI or update existing CI
     - Set discovery_source on the CI record
     - Set sys_updated_on to current timestamp
      |
      v
  6. HISTORY
     - Log the change in reconciliation history (sys_cmdb_ci_reconciliation)
     - Available for audit and troubleshooting
```

### Identification Rules Deep Dive

Navigate to **CMDB > Identification Rules** to view and edit them.

An identification rule consists of:

**The rule record** (cmdb_identifier table):
- **Name**: Human-readable label (e.g., "Server Identification Rule")
- **Applies to**: The CI class this rule applies to (e.g., cmdb_ci_server). Stored as a reference to sys_db_object.
- **Independent**: True for standalone CIs. False for dependent CIs that require a hosting parent.
- **Active**: Whether the rule is active. Inactive rules are skipped.
- **Description**: Optional documentation.

**The identifier entries** (cmdb_identifier_entry table):
- **Identifier**: Reference to the parent rule
- **Attributes**: Comma-separated list of attribute names that form the compound key (e.g., "serial_number,serial_number_type")
- **Order**: Priority number. Lower = higher priority, evaluated first.
- **Active**: Whether this entry is active.
- **Conditions**: Optional filter (e.g., "serial_number IS NOT EMPTY") to control when this entry is evaluated.

Example: Server identification with three fallback levels.

```
Rule: "Server Identification Rule"
  Applies to: cmdb_ci_server
  Independent: true

  Entry 1 (Order: 100):
    Attributes: serial_number, serial_number_type
    Condition: serial_number IS NOT EMPTY
    -> Matches servers by exact serial number + type
    -> Most reliable because serial numbers are globally unique with type context

  Entry 2 (Order: 200):
    Attributes: fqdn, mac_address
    Condition: fqdn IS NOT EMPTY AND mac_address IS NOT EMPTY
    -> Matches by fully qualified domain name + network interface
    -> Used when serial number is unavailable (cloud VMs, containers)

  Entry 3 (Order: 300):
    Attributes: name
    Condition: (none)
    -> Fallback to name-only matching
    -> Least reliable. Two servers named "web-01" in different environments merge.
    -> Use this only when nothing else is available.
```

**How compound keys work**: When an entry has "serial_number, serial_number_type", the IRE requires BOTH attributes to match the SAME existing CI. It queries: `WHERE serial_number = 'SN123' AND serial_number_type = 'Dell'`. Both must match. This is different from having two separate entries, where each is tried independently.

**How conditions work**: The condition "serial_number IS NOT EMPTY" prevents the IRE from trying this entry when the incoming payload has no serial number. Without the condition, the IRE would search for CIs where serial_number is null, which could match unrelated records.

**Inheritance**: Rules on parent classes apply to all children unless the child has its own rule. A rule on `cmdb_ci_computer` applies to servers, laptops, and workstations. If `cmdb_ci_server` has its own rule, it overrides the parent rule for servers only.

**Common mistakes**:

Mistake: Only using `name` for identification.
Result: Two servers named "db-primary" in production and staging merge into one CI. All attributes flip between environments on each import run.
Fix: Add compound keys using serial_number, IP address, or other unique attributes.

Mistake: Not adding conditions to identifier entries.
Result: Entry with serial_number tries to match when serial_number is null in the payload. Matches a random CI that also has null serial_number.
Fix: Add condition "serial_number IS NOT EMPTY" to entries that use nullable attributes.

Mistake: Creating identification rules for OOTB classes that already have rules.
Result: Two rules compete. The one with lower order wins, which may not be the one you intended.
Fix: Check for existing rules before creating new ones. If extending, use a higher order number.

### Dependent Identification Deep Dive

Dependent CIs require a hosting parent to exist before they can be identified and created. This is how ServiceNow models things like:

- An **application** running on a **server** (cmdb_ci_appl depends on cmdb_ci_server via "Runs on")
- A **network adapter** installed in a **computer** (cmdb_ci_network_adapter depends on cmdb_ci_computer)
- A **virtual machine** running on a **hypervisor** (cmdb_ci_vm_instance depends on cmdb_ci_esx_server)

A dependent identification rule specifies:
- The **dependent class** (the CI that needs a parent)
- The **hosting class** (the parent CI)
- The **relationship type** (e.g., "Runs on::Runs on")
- The **qualifier chain** that links them

When the IRE processes a dependent CI:
1. First, it identifies the hosting parent using the parent's identification rules
2. If the parent is found, it identifies the dependent CI using the dependent's attributes PLUS the parent reference
3. If the parent is NOT found, the payload is rejected

This means you must import independent CIs (servers, network devices) before dependent CIs (applications, network adapters). If you import in the wrong order, the dependent CIs fail.

cmdb-kit's Product type is intentionally independent (not dependent) because product-delivery concepts don't require a hosting relationship. A "Product" can exist without being deployed anywhere. This is a deliberate design choice that differs from cmdb_ci_appl.

### Reconciliation Rules Deep Dive

Navigate to **CMDB > Reconciliation Rules** to configure which data sources own which attributes.

Reconciliation has two components:

**Reconciliation definitions** (which sources can write to which tables/attributes):
- Define a CI class (e.g., cmdb_ci_server)
- Define which data source (e.g., "Discovery", "CMDB-Kit") is authorized
- Optionally restrict to specific attributes

Without a reconciliation definition, any source can write to any attribute on any CI. This is the default and it causes data flipping in multi-source environments.

**Data source precedence** (when two authorized sources conflict, who wins):
- Each data source record has a precedence value
- Lower number = higher priority
- Precedence is evaluated per attribute, not per CI

Recommended precedence configuration for an instance with Discovery and cmdb-kit:

| Source | Precedence | Authoritative For |
|---|---|---|
| Discovery | 10 | ip_address, os, os_version, cpu_count, cpu_type, ram, disk_space, serial_number, mac_address, running_process |
| Service Mapping | 20 | Application dependencies, service relationships |
| cmdb-kit | 50 | name, short_description, managed_by, support_group, assigned_to, company, environment, business_criticality |
| Manual Entry | 80 | comments, u_custom_notes, u_business_justification |

Note: These are recommended conventions, not ServiceNow defaults. Actual values are configured per instance.

**Per-attribute authority example**: A server "web-01" exists in the CMDB.

1. Discovery scans it and sets: ip_address=10.0.1.5, os=Ubuntu, os_version=22.04, ram=32768, serial_number=SN12345
2. cmdb-kit imports and sets: managed_by=Alice Smith, support_group=Web Team, environment=Production, business_criticality=High
3. Discovery scans again and tries to set: managed_by=null (Discovery cannot determine business owner)
4. Reconciliation checks: For managed_by, cmdb-kit (precedence 50) has higher authority than Discovery (precedence 10). Wait, 10 is lower number = higher priority. So Discovery would win.

This is why the recommended configuration gives cmdb-kit higher precedence (lower number) for business fields and Discovery higher precedence for infrastructure fields. You need **attribute-level** reconciliation rules, not just source-level precedence.

Corrected configuration:

| Attribute | Authoritative Source | Reasoning |
|---|---|---|
| ip_address | Discovery | Only the network knows the real IP |
| os, os_version | Discovery | Only the device knows its real OS |
| serial_number | Discovery | Read directly from hardware |
| managed_by | cmdb-kit or Manual | Business decision, not discoverable |
| support_group | cmdb-kit or Manual | Business decision, not discoverable |
| environment | cmdb-kit or Manual | Organizational context |

To implement this, create reconciliation rules that:
1. Authorize Discovery for infrastructure attributes on cmdb_ci_server
2. Authorize cmdb-kit for business context attributes on cmdb_ci_server
3. Do NOT authorize Discovery for business context attributes (this prevents Discovery from overwriting them with null)

**Troubleshooting reconciliation**:

View reconciliation history for a CI: Navigate to the CI record > Related Lists > CI Data Resolution. This shows every source that has written to this CI, what attributes they changed, and what the reconciliation decision was (accepted or rejected).

If a field keeps reverting to an old value, check:
1. Which source is writing the old value (look at CI Data Resolution)
2. What that source's precedence is
3. Whether there's a reconciliation rule authorizing that source for that attribute

### Normalization Deep Dive

Normalization converts variant data values into canonical forms. Without it, reporting and deduplication break.

**Why normalization matters for identification**: If one source sends manufacturer="Dell Inc." and another sends manufacturer="Dell Technologies", the IRE treats these as different values. If your identification rule uses manufacturer as part of a compound key, the same physical server could get two CI records.

**ServiceNow's Normalization Data Services (NDS)**: A built-in library of canonical names for manufacturers, hardware models, software products, and OS versions. When Discovery or an SGC imports a CI, NDS automatically normalizes manufacturer and model fields against its library.

NDS does NOT normalize data imported via the Table API or CMDB Instance API directly. If you use those APIs (as cmdb-kit does), you must normalize before sending the payload.

**Common normalization mappings**:

Manufacturers:
| Variant | Canonical |
|---|---|
| IBM | IBM |
| International Business Machines | IBM |
| International Business Machines Corporation | IBM |
| HP | HP Inc. |
| Hewlett-Packard | HP Inc. |
| Hewlett Packard Enterprise | Hewlett Packard Enterprise |
| HPE | Hewlett Packard Enterprise |
| Dell | Dell Inc. |
| Dell Technologies | Dell Inc. |
| Dell EMC | Dell Inc. |
| VMware | VMware, Inc. |
| VMWare | VMware, Inc. |
| vmware | VMware, Inc. |
| Microsoft | Microsoft Corporation |
| MSFT | Microsoft Corporation |
| Cisco | Cisco Systems, Inc. |
| Red Hat | Red Hat, Inc. |
| RedHat | Red Hat, Inc. |
| redhat | Red Hat, Inc. |

Operating systems:
| Variant | Canonical OS | Canonical Version |
|---|---|---|
| Win10 | Microsoft Windows 10 | 10 |
| Windows 10 Pro | Microsoft Windows 10 | 10 Pro |
| W10 | Microsoft Windows 10 | 10 |
| Ubuntu 22.04 | Ubuntu Linux | 22.04 |
| ubuntu22 | Ubuntu Linux | 22 |
| RHEL 8 | Red Hat Enterprise Linux | 8 |
| CentOS 7 | CentOS | 7 |
| Windows Server 2022 | Microsoft Windows Server 2022 | 2022 |
| Win2022 | Microsoft Windows Server 2022 | 2022 |

**Model-to-manufacturer inference**: When the model name implies the manufacturer, a normalization engine can fill in a blank manufacturer field:
| Model Contains | Inferred Manufacturer |
|---|---|
| PowerEdge | Dell Inc. |
| ProLiant | Hewlett Packard Enterprise |
| ThinkPad, ThinkCentre | Lenovo |
| MacBook, iMac, Mac Pro | Apple Inc. |
| Catalyst, Nexus | Cisco Systems, Inc. |

### Data Source Registration

Every integration should register itself as a named data source in ServiceNow. This enables:
- Reconciliation rules to reference the source
- CMDB Health Dashboard to track data freshness per source
- Audit trail showing which source created or modified each CI
- CI Data Resolution view showing source-to-attribute mapping

To register a data source manually:
1. Navigate to **Configuration > Data Sources > Data Sources**
2. Create a new record
3. Set Name = "CMDB-Kit" (or your integration name)
4. Set Type = "Custom"
5. Save

The adapter should create this record automatically during schema sync.

Every payload sent to the CMDB Instance API must include `source: "CMDB-Kit"` (matching the data source name). Every record created via the Table API should set the `discovery_source` field to "CMDB-Kit".

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

## CSDM Alignment Deep Dive

The Common Service Data Model (CSDM) is ServiceNow's reference architecture for CMDB data. It defines where every CI type belongs in a seven-domain model.

### CSDM Domains

**Foundation**: Reference data shared across the CMDB. Locations, companies, groups, lifecycle definitions, product models. This is the scaffolding everything else attaches to.

Key tables: cmn_location, core_company, sys_user_group, cmdb_model, cmdb_model_category

**Ideation and Strategy** (new in v5.0): Strategic planning artifacts. Product ideas, strategic priorities, goals, planning items. Most organizations don't populate this domain unless they use ServiceNow's Strategic Portfolio Management.

**Design and Planning**: Business architecture. Business capabilities, business applications, information objects. This is where you model what the business does and what applications support it.

Key table: cmdb_ci_business_app (the "Rosetta Stone" of CSDM, connecting business to technical)

**Build and Integration**: Development artifacts. DevOps change data, SDLC components, AI system digital assets. Relevant if you use ServiceNow's DevOps integrations.

**Service Delivery** (Manage Technical Services): The technical infrastructure that delivers services. Technical services, application services, servers, databases, network devices, storage, VMs. This is the largest domain in most CMDBs.

Key tables: cmdb_ci_service_technical, cmdb_ci_service_discovered (application service), cmdb_ci_server, cmdb_ci_db_instance, cmdb_ci_appl

**Service Consumption** (Sell/Consume): What the business sees. Business services, service offerings, catalog items. This is the customer-facing view of IT.

Key tables: cmdb_ci_service, service_offering

**Manage Portfolios**: Service portfolio management. Portfolios, investment management. Used primarily by IT leadership and finance.

### How cmdb-kit Maps to CSDM

| cmdb-kit Type | CSDM Domain | CSDM Equivalent | Notes |
|---|---|---|---|
| Server | Service Delivery | cmdb_ci_server | Direct OOTB mapping (Tier 1) |
| Database | Service Delivery | u_cmdbk_database | Custom CI class (Tier 2). OOTB cmdb_ci_database has hosting dependency (independent=false), so cmdb-kit uses an independent custom class. |
| Virtual Machine | Service Delivery | u_cmdbk_virtual_machine | Custom CI class (Tier 2). OOTB cmdb_ci_vm_instance has hosting dependency (independent=false), so cmdb-kit uses an independent custom class. |
| Network Segment | Service Delivery | cmdb_ci_network | Direct OOTB mapping |
| Product | Design | cmdb_ci_business_app (conceptual) | Custom independent class to avoid dependent hosting |
| Product Component | Design | cmdb_ci_appl_component (conceptual) | Custom class |
| Feature | Design | No direct equivalent | Custom class |
| Assessment | Manage | No direct equivalent | Custom class |
| Product Version | Build | No direct equivalent | Standalone (non-CI) |
| Deployment | Service Delivery | No direct equivalent | Standalone (non-CI) |
| Baseline | Build | No direct equivalent | Standalone (non-CI) |
| Document | Foundation | No direct equivalent | Standalone (non-CI) |
| Person | Foundation | sys_user / cmn_user (conceptual) | Standalone for external contacts |
| Organization | Foundation | core_company | OOTB mapping |
| Location | Foundation | cmn_location | OOTB mapping |

cmdb-kit's Product type maps to the Design domain because it represents "what we build and manage," not the running infrastructure that delivers it. The CSDM equivalent is Business Application, but cmdb-kit uses an independent custom class because:
1. cmdb_ci_business_app has specific CSDM relationships and behaviors that don't fit product-delivery workflows
2. cmdb_ci_appl is dependent (requires hosting server) which doesn't apply to the product catalog concept
3. An independent class allows cmdb-kit data to coexist with an organization's existing CSDM-aligned Business Application records without conflict

### CSDM Maturity Model

ServiceNow recommends a phased CSDM adoption:

**Crawl**: Populate Foundation domain. Get locations, companies, and groups right. Start with Business Applications.

**Walk**: Add Service Delivery domain. Connect applications to infrastructure. Establish "Runs on" and "Depends on" relationships.

**Run**: Add Service Consumption domain. Connect business services to technical services to applications to infrastructure. Enable impact analysis.

**Fly**: Full CSDM adoption across all domains. Automated service mapping, continuous health monitoring, governance.

cmdb-kit is useful in the Crawl and Walk stages, providing product and deployment context that Discovery cannot provide.

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

## Relationships

### Relationship Types

CI relationships define how CIs connect to each other. They are stored in the `cmdb_rel_ci` table. Each relationship has a parent CI, a child CI, and a type.

Navigate to **CMDB > CI Relationship Types** to view all available types.

The relationship type defines the semantic meaning of the connection. ServiceNow uses a "Parent::Child" naming convention where the type name describes both directions:

| Type Name | Parent Example | Child Example | Use Case |
|---|---|---|---|
| Runs on::Runs on | Application | Server | Application hosting |
| Depends on::Used by | Service | Application | Service dependency |
| Contains::Contained by | Rack | Server | Physical containment |
| Connects to::Connected by | Server | Switch | Network connectivity |
| Virtualizes::Virtualized by | ESXi Host | Virtual Machine | Virtualization |
| Manages::Managed by | Load Balancer | Server | Management relationship |
| Sends data to::Receives data from | Application | Database | Data flow |
| Provides::Provided by | Technical Service | Application Service | Service composition |
| Hosted on::Hosts | Application Service | Server | Cloud/container hosting |
| Members of::Member of | Cluster | Server | Cluster membership |

When you read a relationship record, the parent and child fields tell you the direction. "Server A (parent) Contains (type) Disk Array B (child)" means the server physically contains the disk array.

### Relationship Best Practices

**Use the correct type**: "Runs on" means the child is hosted by the parent. "Depends on" means the parent requires the child to function. These have different implications for impact analysis. If a server goes down:
- Everything that "Runs on" that server is directly impacted
- Everything that "Depends on" services running on that server is indirectly impacted
- Everything "Contained by" that server is physically impacted

**Create bidirectional visibility**: When you create a "Depends on" relationship, ServiceNow stores it as a single record. The UI shows it from both sides: the parent sees "Depends on [child]" and the child sees "Used by [parent]". You don't need to create two records.

**Avoid redundant relationships**: If Application A "Runs on" Server B, and Server B "Contains" Disk Array C, you don't need a direct relationship between Application A and Disk Array C. The chain A -> B -> C is implied. Adding redundant direct relationships creates maintenance burden and confuses impact analysis.

**Relationship and impact analysis**: ServiceNow's impact analysis follows relationship chains to determine blast radius. When a CI has an incident, the system walks the relationship graph to find affected services and notify stakeholders. Bad relationships (wrong type, missing links, circular references) break impact analysis.

### Dependent vs Non-Dependent Relationships

Not all relationships make a CI "dependent" in the IRE sense. A server can have a "Contains" relationship to its disk arrays, but the disk arrays are not IRE-dependent on the server. They have their own identification rules (usually by serial number).

IRE dependency is specifically about **identification**. A dependent CI cannot be uniquely identified without its parent. A network adapter's MAC address is only unique within the context of its host computer. Two computers can have adapters with the same MAC address. The adapter is identified by MAC + host, making it dependent.

Most CI types are independent. Servers, databases, network switches, storage devices, and business applications all have attributes that uniquely identify them without needing a parent. Dependent identification is primarily used for:
- Network adapters (depend on host computer)
- Disk partitions (depend on host server)
- IP addresses (depend on host device)
- Some application instances (depend on hosting infrastructure)

### Viewing Relationships

On any CI form, the Related Lists section at the bottom shows all relationships. You can also navigate directly to `cmdb_rel_ci.LIST` and filter by parent or child.

To see the full relationship graph for a CI, use the **Dependency View**: Open the CI record > click the "Dependency Views" related link or navigate to it from the CI's context menu. This shows a visual map of all upstream and downstream dependencies.

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

## Reporting and Dashboards

### Built-in CMDB Reports

ServiceNow provides several OOTB reports and dashboards for CMDB data:

**CMDB Health Dashboard** (covered in Governance section above): Completeness, Correctness, Compliance scores per class.

**CI Count by Class**: Navigate to Reports > Create Report > Table = cmdb_ci > Group by sys_class_name > Type = Bar. Shows the distribution of CIs across classes. Useful for understanding your CMDB composition and identifying classes with unexpectedly high or low counts.

**CIs by Discovery Source**: Group by discovery_source to see how much data comes from each integration. If cmdb-kit shows a declining count, the integration may have stopped running.

**CIs by Location**: Group by location to verify geographic distribution makes sense. A location with zero CIs may indicate missing Discovery schedules or import filters.

**Stale CI Trend**: Create a report on cmdb_ci with filter `install_status=1 AND sys_updated_on < 60 days ago`. Track this weekly to see if staleness is increasing or decreasing.

### Custom Dashboards

Create a CMDB Admin Dashboard in **Self-Service > Dashboards** with these widgets:

1. CMDB Health summary (Completeness + Correctness + Compliance)
2. CI count by discovery_source (bar chart)
3. Open de-duplication tasks (count)
4. Overdue certification tasks (count)
5. CIs created in last 7 days by source (trend)
6. Stale CIs by class (bar chart)
7. CIs by install_status (pie chart)
8. Relationship count by type (bar chart)

This gives you a single view of CMDB health without navigating to multiple modules.

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

## Discovery Configuration

### MID Server

The MID Server is a lightweight Java application installed on a server inside your network. It acts as a proxy between your ServiceNow instance (in the cloud) and your on-premises infrastructure. Discovery probes run through the MID Server to reach devices that are not directly accessible from the internet.

**Installation requirements**:
- A dedicated server (physical or VM) with network access to the devices you want to discover
- Java Runtime Environment (JRE) 11 or later
- Outbound HTTPS (port 443) to your ServiceNow instance
- Inbound access is NOT required (MID Server polls the instance, not the other way around)
- The service account running the MID Server needs local admin rights on Windows or root/sudo on Linux

**MID Server status**: After installation, the MID Server appears in **MID Server > Servers**. It must show status "Up" and validation state "Validated" before it can be used. If validation fails, check:
- Can the MID Server reach the instance URL?
- Is the MID Server user account active in ServiceNow with the `mid_server` role?
- Are there firewall rules blocking outbound HTTPS?

**High availability**: For production environments, install two or more MID Servers in a cluster. ServiceNow distributes work across cluster members. If one MID Server goes down, the others pick up the load.

### Discovery Credentials

Discovery needs credentials to log into devices and read their configuration. Navigate to **Discovery > Credentials** to manage them.

Credential types:
- **SSH** - for Linux/Unix servers. Username + password or username + SSH private key.
- **Windows (WMI/PowerShell)** - for Windows servers. Domain\username + password. Requires WMI and/or WinRM enabled on targets.
- **SNMP** - for network devices (switches, routers, firewalls). Community string (v1/v2c) or username + auth/priv passwords (v3).
- **VMware** - for vCenter/ESXi. Username + password for the vSphere API.
- **CIM** - for storage devices. Username + password for CIM/SMI-S providers.

**Credential affinity**: You can bind credentials to specific MID Servers or IP ranges so that the right credentials are used for the right network segment. This prevents credential lockouts from failed authentication attempts against the wrong devices.

**Credential testing**: After creating a credential, test it from **Discovery > Credentials > Test Credential**. Select a target IP, MID Server, and credential type. The system attempts to connect using the credential and reports success or failure.

**Security**: Credentials are encrypted at rest in ServiceNow. The MID Server decrypts them only when executing a probe. Never store credentials in plain text outside ServiceNow.

### Discovery Schedules

A Discovery Schedule defines what to scan, when, and how. Navigate to **Discovery > Discovery Schedules**.

**Creating a schedule**:
1. Name: "Production Server Discovery - Weekly"
2. MID Server: Select the MID Server or cluster to use
3. Type: IP Range, CI Group, or Single IP
4. IP ranges: Enter CIDR ranges (e.g., 10.0.1.0/24) or IP lists
5. Exclusion list: IPs to skip (e.g., network appliances that crash when probed)
6. Schedule: Frequency (daily, weekly, monthly), time window, timezone
7. Discovery type: Network only (ping sweep) or Configuration (full device interrogation)

**Quick Discovery vs. full Discovery**: Quick Discovery does a fast scan for new devices (ICMP ping + basic classification). Full Discovery connects to each device, reads configuration, and updates all CI attributes. Quick is useful for initial population; full is for ongoing maintenance.

**Shazzam probes**: The initial probe sent to discover what a device is. It tries multiple protocols (SSH, WMI, SNMP) to determine the device type and OS. Based on the result, ServiceNow sends the appropriate classification and exploration probes.

### Discovery Patterns

Patterns are the rules that tell Discovery how to explore a specific device type and extract CI data. Navigate to **Discovery > Patterns**.

ServiceNow ships with hundreds of OOTB patterns for common platforms (Linux, Windows, VMware, Cisco IOS, Palo Alto, NetApp, etc.). Each pattern defines:
- What commands to run on the device (e.g., `cat /proc/cpuinfo`, `wmic os get caption`)
- How to parse the output into CI attributes
- What relationships to create (e.g., server contains network adapters)

**Never modify OOTB patterns**. If you need to customize, clone the pattern and modify the clone. OOTB patterns are updated by ServiceNow during upgrades.

**Custom patterns**: For devices that don't have OOTB support (custom appliances, IoT devices), you can create patterns using the Pattern Designer. This is a visual tool for defining discovery steps.

### Discovery Troubleshooting

**ECC Queue**: All communication between the instance and MID Server goes through the ECC Queue (**MID Server > ECC Queue**). Each Discovery probe creates an "output" record (command sent to MID Server) and an "input" record (response from MID Server). If Discovery fails, check the ECC Queue for errors.

**Discovery Log**: Navigate to **Discovery > Discovery Log** for a record of what happened during each Discovery run. Filter by schedule, device, or status to find failures.

**Device History**: On any CI, the "Discovery" related list shows the history of Discovery scans for that device: when it was last discovered, what changed, and any errors.

**Common issues**:
- "No MID Server available": The selected MID Server is down or not validated
- "Credential failure": Wrong username/password, or the credential type doesn't match the device
- "Connection timeout": Firewall blocking the protocol, device is offline, or wrong IP
- "Classification failed": Device responded but ServiceNow can't determine what it is. May need a custom pattern.
- "Duplicate CI created": Discovery classified the device into a different class than expected, creating a second CI

## Service Mapping

Service Mapping discovers application-to-infrastructure dependencies automatically. While Discovery scans individual devices bottom-up, Service Mapping traces connections top-down starting from an application entry point.

### How Service Mapping Works

1. You define an **entry point** (a URL, TCP port, or tagged resource)
2. Service Mapping connects to the entry point and identifies the application
3. It traces network connections from that application to other processes, servers, databases, and load balancers
4. It creates CIs for each discovered component and "Runs on" / "Depends on" relationships between them
5. The result is an **Application Service** (cmdb_ci_service_discovered) with a full dependency map

### Entry Point Types

| Type | Example | How It Discovers |
|---|---|---|
| URL | https://app.company.com | HTTP connection to load balancer, traces to web servers, then to app servers, then to databases |
| TCP Connection | 10.0.1.50:8080 | Connects to the port, identifies the process, traces its connections |
| Tag-based | AWS tag: app=payroll | Queries cloud provider API for resources with matching tags |
| CI-based | Existing Business Application CI | Uses the CI as the starting point and maps its dependencies |

### Application Service vs Business Service

These are different CSDM entities:

- **Application Service** (cmdb_ci_service_discovered): The technical runtime. "The payroll application as it runs on servers X, Y, Z with database D." Created automatically by Service Mapping. Shows the actual infrastructure dependency graph.
- **Business Service** (cmdb_ci_service): The business-facing service. "Payroll processing for HR." Created manually by business stakeholders. Represents what the business consumes, regardless of how it is implemented.

The link between them is a relationship: Business Service "Depends on" Application Service. This is the bridge between business impact and technical reality.

### Why Service Mapping Matters for CMDB Administration

Service Mapping generates the relationships that make the CMDB operationally valuable. Without it:
- Impact analysis cannot trace from a failed server to affected business services
- Change risk assessment cannot determine which services a server change affects
- Incident routing cannot automatically identify the responsible team for an application outage

With it:
- A server outage immediately shows "these 3 business services are affected"
- A proposed change shows "this change impacts 500 users of the payroll service"
- An application team can see every infrastructure component their application depends on

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
gs.info('Stale CMDB-Kit CIs: ' + gr.getRowCount());
while (gr.next()) {
    gs.info('  ' + gr.name + ' (class: ' + gr.sys_class_name +
            ', last updated: ' + gr.sys_updated_on + ')');
}
```
