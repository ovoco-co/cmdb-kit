# ServiceNow CMDB Fundamentals

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


