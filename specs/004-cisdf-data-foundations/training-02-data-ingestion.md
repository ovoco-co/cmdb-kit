# Data Ingestion and the IRE

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


