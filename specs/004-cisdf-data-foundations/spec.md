# Feature Specification: ServiceNow CMDB Data Foundations

**Feature Branch**: `004-cisdf-data-foundations`
**Created**: 2026-03-31
**Status**: Draft
**Input**: Align the ServiceNow adapter with ServiceNow's CMDB data foundations best practices. Derived from gap analysis against official ServiceNow documentation: IRE identification and reconciliation, CSDM v5.0, CMDB Health Dashboard, CI lifecycle management, data source registration, and duplicate management.

## User Scenarios & Testing

### User Story 1 - Data Source Registration and Discovery Source (Priority: P1)

An admin imports data and every CI is tagged with "CMDB-Kit" as the discovery source. A corresponding data source record exists in ServiceNow so that reconciliation rules can reference it and admins can see in the CMDB Health Dashboard where data came from.

**Why this priority**: Without a registered data source and consistent discovery_source, ServiceNow cannot track where CIs came from, reconciliation rules cannot function, and the CMDB Health Dashboard cannot evaluate data freshness. This is the foundation everything else depends on.

**Independent Test**: Import any CI, then query it in ServiceNow and verify discovery_source = "CMDB-Kit". Navigate to Configuration > Data Sources and verify a "CMDB-Kit" data source record exists.

**Acceptance Scenarios**:

1. **Given** a fresh instance with no CMDB-Kit data source, **When** schema sync runs, **Then** a data source record named "CMDB-Kit" is created with appropriate precedence
2. **Given** any CI import (Tier 1, 2, or 3), **When** the record is created or updated, **Then** the discovery_source field is set to "CMDB-Kit"
3. **Given** a data source record already exists, **When** schema sync runs again, **Then** the existing record is not duplicated

---

### User Story 2 - Compound Identification Keys (Priority: P2)

An admin imports CI data where uniqueness depends on multiple attributes. The adapter creates identification rules with compound keys and fallback priorities so that IRE matches correctly in production environments where name alone is not unique.

**Why this priority**: Single-attribute name matching creates duplicates in real environments where servers share names across environments, hardware has serial numbers that need type context, and network devices are identified by FQDN plus MAC address.

**Independent Test**: Import two servers with the same name but different serial numbers. Verify IRE creates two distinct CIs.

**Acceptance Scenarios**:

1. **Given** a CI type with compound identification configured (e.g., Server: Priority 100 = serial_number + serial_number_type, Priority 200 = name), **When** schema sync runs, **Then** multiple identifier entries are created with correct priority ordering
2. **Given** two records with the same name but different compound key values, **When** data import runs, **Then** IRE creates two distinct CI records
3. **Given** a record matching on the compound key, **When** data import runs, **Then** IRE updates the existing record
4. **Given** a type with no compound key configured, **When** schema sync runs, **Then** the adapter falls back to single-attribute name matching

---

### User Story 3 - Reconciliation Rules and Precedence (Priority: P3)

An admin configures the adapter's data source precedence so that when multiple tools populate the same CI, ServiceNow applies per-attribute reconciliation. The adapter registers reconciliation rules that define which fields CMDB-Kit is authoritative for (business context: owner, support group, criticality) while allowing Discovery to own infrastructure fields (IP, OS version, hardware specs).

**Why this priority**: Without reconciliation rules, any source can overwrite any attribute. A manual correction to the business owner gets overwritten on the next Discovery scan. The precedence system (lower number = higher priority) must be configured per data source.

**Independent Test**: Import a CI with owner = "Alice". Then simulate a lower-precedence source updating owner to "Bob". Verify Alice is preserved.

**Acceptance Scenarios**:

1. **Given** reconciliation configuration in the overlay, **When** schema sync runs, **Then** reconciliation rules are created defining which attributes CMDB-Kit is authoritative for
2. **Given** CMDB-Kit precedence is set to 50, **When** a source with precedence 70 attempts to update a CMDB-Kit-authoritative field, **Then** the update is blocked
3. **Given** a field that CMDB-Kit is NOT authoritative for, **When** a higher-precedence source updates it, **Then** the update succeeds
4. **Given** the discovery_source field is blank or missing on a payload, **When** import runs, **Then** the adapter rejects the payload with an error (blank source bypasses all reconciliation)

---

### User Story 4 - CI Lifecycle and Staleness Prevention (Priority: P4)

The adapter sets install_status = 1 (Installed) on active CIs, properly maps lifecycle transitions from cmdb-kit status values, and ensures sys_updated_on advances on each sync to prevent CMDB Health staleness flags. When a CI is removed from the local data files, the adapter flags it for retirement rather than leaving an orphan.

**Why this priority**: CIs without install_status appear as incomplete in CMDB Health. CIs that stop being updated get flagged as stale (default 60 days). CIs removed from source data become orphans that poison reporting.

**Independent Test**: Import a CI, wait, re-import the same data. Verify sys_updated_on advances. Remove the CI from local data, re-import. Verify the CI is flagged or retired.

**Acceptance Scenarios**:

1. **Given** a CI with status "Active" in cmdb-kit, **When** imported, **Then** install_status = 1 and operational_status = 1
2. **Given** a CI with status "Retired" in cmdb-kit, **When** imported, **Then** install_status = 7 and operational_status = 6
3. **Given** a CI that exists in ServiceNow but is no longer in the local data file, **When** sync mode runs, **Then** the adapter logs these as candidates for retirement
4. **Given** any CI re-import, **When** the data has not changed, **Then** the record is still touched so sys_updated_on advances

---

### User Story 5 - Value Normalization (Priority: P5)

The adapter normalizes manufacturer names, model names, and OS values during import so that variant spellings resolve to canonical values. This prevents false duplicate CIs and broken reporting caused by inconsistent naming.

**Why this priority**: Normalization is foundational for identification accuracy (the wrong manufacturer string creates a false non-match) and CMDB Health correctness scoring.

**Independent Test**: Import a server with manufacturer "Intl Business Machines". Verify it resolves to "IBM" in the imported CI.

**Acceptance Scenarios**:

1. **Given** a normalization map for manufacturer names, **When** a record has "Hewlett Packard Enterprise", **Then** it imports as "Hewlett Packard Enterprise" (canonical) not "HPE" or "HP"
2. **Given** a normalization map for OS values, **When** a record has "Win10", **Then** it imports as "Microsoft Windows 10"
3. **Given** a value not in the normalization map, **When** imported, **Then** the original value passes through and a warning is logged
4. **Given** a model name that implies a manufacturer (e.g., "PowerEdge R740"), **When** the manufacturer field is empty, **Then** the adapter infers and sets manufacturer to "Dell Inc."

---

### User Story 6 - Dependent CI Class Identification (Priority: P6)

When the adapter creates identification rules for dependent CI types (applications, databases), it marks them as dependent and specifies the hosting relationship. IRE requires the parent CI to exist before identifying the dependent CI.

**Why this priority**: Independent identification for dependent types creates orphaned CIs that fail CMDB Health correctness checks (orphan rules) and break impact analysis.

**Independent Test**: Import a Database CI without its hosting Server. Verify it is deferred or rejected, not created as an orphan.

**Acceptance Scenarios**:

1. **Given** a CI type configured as dependent (e.g., Database depends on Server via "Runs on"), **When** schema sync runs, **Then** the identification rule has independent=false with the hosting class and relationship specified
2. **Given** the hosting parent exists, **When** the dependent CI is imported, **Then** IRE matches it to the parent and creates the CI
3. **Given** the hosting parent does not exist, **When** the dependent CI is imported, **Then** the adapter defers the record and retries after independent records are processed

---

### User Story 7 - CMDB Health Completeness (Priority: P7)

The adapter populates CMDB Health required and recommended fields (location, support_group, managed_by, assigned_to, operational_status) when the data is available in cmdb-kit records. The overlay maps cmdb-kit fields to ServiceNow health-tracked attributes.

**Why this priority**: CMDB Health Completeness scoring measures whether required and recommended attributes are populated. CIs missing these fields drag down the health score even if the core data is correct.

**Independent Test**: Import CIs with all mapped fields populated. Check CMDB Health Dashboard Completeness score for the imported CI class.

**Acceptance Scenarios**:

1. **Given** a cmdb-kit record has location, owner, and support group data, **When** imported, **Then** the ServiceNow CI has location, managed_by, and support_group populated
2. **Given** the overlay documents which cmdb-kit fields map to ServiceNow health-tracked attributes, **When** an admin reviews the overlay, **Then** each health-tracked field has a documented mapping or is marked as not applicable
3. **Given** a CI class has health inclusion rules configured, **When** CIs are imported with all mapped fields, **Then** the Completeness score is above 90%

---

### User Story 8 - CSDM Domain Documentation (Priority: P8)

The overlay and documentation map every cmdb-kit type to its CSDM domain and explain the rationale. For types with OOTB CSDM equivalents, the mapping uses those tables. For cmdb-kit-specific types, the documentation explains the CSDM alignment rationale.

**Why this priority**: CSDM compliance is measured by the Health Dashboard. Organizations adopting CSDM need to know how imported data fits the model. This is documentation and mapping, not functional code.

**Independent Test**: Review the overlay and verify every type has a CSDM domain annotation. Verify OOTB types use CSDM-aligned tables.

**Acceptance Scenarios**:

1. **Given** the overlay file, **When** an admin reviews it, **Then** every type has a csdmDomain field (Foundation, Design, Deliver, Consume, Manage)
2. **Given** a type with an OOTB CSDM equivalent (Server, Database, VM), **When** schema sync runs, **Then** that type uses the CSDM-aligned table
3. **Given** a type unique to cmdb-kit (Product, Assessment), **When** the documentation is reviewed, **Then** the CSDM rationale is explained (e.g., Product maps to Business Application concept but uses an independent class to avoid dependent hosting requirements)

---

### Edge Cases

- Blank discovery_source on a payload bypasses all reconciliation. The adapter must never send a blank source.
- A compound key attribute is null for some records. The adapter falls back to the next priority identifier entry.
- Reconciliation rules already exist from another integration. The adapter only creates rules for its own data source, never modifies others.
- A dependent CI's hosting parent exists in a different import batch. The adapter defers and retries within the same run.
- Normalization map has conflicting entries. First match wins in declaration order.
- An instance has IRE disabled (rare). The adapter detects this and warns, falling back to Table API.
- A retired CI in cmdb-kit data gets re-imported. install_status changes from 7 back to 1.
- CMDB Health rules vary per instance. The adapter populates what it can; health configuration is the admin's responsibility.

## Requirements

### Functional Requirements

- **FR-001**: The adapter MUST set discovery_source to a configurable value (default "CMDB-Kit") on every CI it creates or updates, across all tiers
- **FR-002**: The adapter MUST create a data source record in ServiceNow during schema sync with configurable precedence (default 50)
- **FR-003**: The adapter MUST never send a payload with blank or null discovery_source
- **FR-004**: The adapter MUST support compound identification keys with multiple attributes per identifier entry, configurable per CI type in the overlay
- **FR-005**: The adapter MUST create identifier entries with correct priority ordering (lower number = higher priority)
- **FR-006**: The adapter MUST support fallback identification where if the primary compound key fails, the next priority identifier is tried
- **FR-007**: The adapter MUST create reconciliation rules defining which attributes CMDB-Kit is authoritative for, configurable per CI class in the overlay
- **FR-008**: The adapter MUST support configurable source precedence (0-100 scale, lower = higher priority)
- **FR-009**: The adapter MUST set install_status to the appropriate value based on cmdb-kit status mapping (Active=1, Retired=7, On Order=2, In Maintenance=3, Pending Install=4, Pending Repair=5, In Stock=6, Absent=100)
- **FR-010**: The adapter MUST set operational_status when install_status is set (Active -> Operational=1, Retired -> Retired=6)
- **FR-011**: The adapter MUST detect CIs in ServiceNow that are no longer in local data files during sync mode and log them as retirement candidates
- **FR-012**: The adapter MUST normalize manufacturer names using a configurable mapping file
- **FR-013**: The adapter MUST normalize OS values using a configurable mapping file
- **FR-014**: The adapter MUST infer manufacturer from model name when manufacturer is empty and a model-to-manufacturer map exists
- **FR-015**: The adapter MUST log warnings for values not in normalization maps and pass them through unchanged
- **FR-016**: The adapter MUST support marking CI types as dependent with a specified hosting relationship type
- **FR-017**: The adapter MUST create identification rules with independent=false for dependent types
- **FR-018**: The adapter MUST defer dependent CI records when hosting parent is not yet present and retry after independent records complete
- **FR-019**: The adapter MUST populate CMDB Health tracked fields (location, support_group, managed_by, assigned_to) when the data is available in cmdb-kit records
- **FR-020**: The overlay MUST document the CSDM domain for each mapped type
- **FR-021**: All changes MUST be backward-compatible; unconfigured types retain current single-attribute name matching behavior

### Key Entities

- **Data Source Record**: A ServiceNow sys_data_source record identifying CMDB-Kit as an integration, with a precedence value for reconciliation
- **Identifier Entry**: A set of attributes with a priority that defines how a CI type is uniquely identified. Multiple entries per type, evaluated in priority order
- **Reconciliation Rule**: A configuration mapping CMDB-Kit to the CI attributes it is authoritative for, with per-attribute source precedence
- **Normalization Map**: A lookup table mapping variant values to canonical values for manufacturer, model, and OS fields
- **Hosting Dependency**: A declaration that a CI type requires a parent CI via a specific relationship type before it can be identified
- **Retirement Candidate**: A CI that exists in ServiceNow but no longer appears in the local data files, flagged for admin review

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every CI imported by the adapter has discovery_source = "CMDB-Kit" (or configured value)
- **SC-002**: A data source record exists in ServiceNow after schema sync
- **SC-003**: Compound identification keys produce zero duplicate CIs when records share a name but differ on secondary attributes
- **SC-004**: Reconciliation rules prevent lower-precedence sources from overwriting CMDB-Kit-authoritative fields
- **SC-005**: All active CIs have install_status = 1 and operational_status = 1 after import
- **SC-006**: Normalization resolves common manufacturer variants (IBM, HP, HPE, Dell, Microsoft, VMware, Cisco, Oracle, Red Hat) to canonical values
- **SC-007**: Dependent CIs without a hosting parent are deferred, not created as orphans
- **SC-008**: CIs removed from local data are logged as retirement candidates during sync
- **SC-009**: CMDB Health Completeness score for imported CI classes exceeds 80% when health-tracked fields are mapped
- **SC-010**: All existing adapter tests continue to pass with no configuration changes

## Assumptions

- The target ServiceNow instance has IRE enabled (standard on all supported versions)
- Reconciliation rules require the CMDB Reconciliation plugin to be active (standard)
- Normalization maps are static JSON files in the adapter directory, maintained by the cmdb-kit community
- The adapter continues to use REST API (CMDB Instance API and Table API), not Import Sets or Transform Maps
- CSDM domain alignment is documented in the overlay and docs, not enforced programmatically
- Compound keys and reconciliation rules are opt-in via overlay configuration; unconfigured types keep current behavior
- CMDB Health rules and thresholds are instance-specific; the adapter populates fields but health configuration is the admin's responsibility
- Retirement candidate detection is advisory (logged list), not automatic status change
