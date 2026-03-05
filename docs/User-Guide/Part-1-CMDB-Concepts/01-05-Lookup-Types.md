# Lookup Types and Reference Data

Lookup types are the reference data that gives meaning to your CI records. When an Application record has a status of "Active" or a Server record sits in a "Production" environment, those values do not live as free-text strings. They are separate object types in the CMDB, each with a Name and a description, shared by every CI that references them. This chapter explains why CMDB-Kit models reference data this way, how the lookup mechanism works at the schema and import level, how to design your own lookup types, and what the extended schema ships with out of the box.


# Why Status Values Are Separate Object Types

## Shared Reference Tables

In a spreadsheet, you might type "Active" into a status column and hope everyone spells it the same way. In CMDB-Kit, "Active" is a record in the Application Status type. Every Application that needs to say "I am active" points to that single record. This is the same principle behind a foreign key in a relational database or a shared select list in a service management tool.

The payoff is consistency. If you decide to rename "Active" to "Operational," you change one record. Every Application referencing it reflects the change immediately. You do not need to find and update fifty scattered strings across fifty data files.

Lookup types also enable platform features that free-text fields cannot. In JSM Assets, a reference field renders as a dropdown. Users pick from a defined list rather than typing. In AQL queries, you can filter by exact lookup values with confidence that the values are controlled. Dashboards can group CIs by lookup values because every record points to the same shared reference.

## Consistency Across CIs

Several lookup types serve more than one CI type. Environment Type is the clearest example. Servers, Databases, Virtual Machines, Deployments, and Deployment Sites all reference Environment Type. Every one of those types shares the same set of values: Production, Staging, Development, QA, DR. If your organization adds a "Performance Testing" environment, you add it once to Environment Type and it becomes available to all five CI types.

Version Status is another shared lookup. Both Product Version and Feature reference it. A Feature record can have a status of "Current" or "Deprecated" using the exact same values that describe a Product Version. This shared vocabulary means that when a dashboard shows "all items with status Deprecated," it pulls from a single, authoritative list.

The alternative, giving each CI type its own status list, leads to drift. Server Status might have "Live" while Application Status has "Active" and Deployment Status has "Running," all meaning the same thing. Shared lookup types eliminate that fragmentation.

## Adding Descriptions to Explain Usage

Every lookup record carries a description field. This is not optional decoration. It is operational guidance that tells your team exactly when to use each value.

Consider the Deployment Status values:

```json
[
  { "Name": "Planned", "description": "Deployment is scheduled" },
  { "Name": "In Progress", "description": "Deployment is actively running" },
  { "Name": "Completed", "description": "Deployment finished successfully" },
  { "Name": "Rolled Back", "description": "Deployment was reverted" },
  { "Name": "Failed", "description": "Deployment did not complete successfully" }
]
```

The difference between "Rolled Back" and "Failed" matters. A rolled-back deployment was intentionally reverted, perhaps because of a problem detected during validation. A failed deployment did not complete at all. Without descriptions, a new team member might use them interchangeably.

In JSM Assets, descriptions appear in the object detail view and can be surfaced in tooltips. They turn your lookup types into self-documenting reference data.


# How Lookup Types Work in CMDB-Kit

## JSON Format: Name and Description

Every lookup type data file follows the same minimal format: an array of objects, each with a Name and a description.

```json
[
  { "Name": "Value One", "description": "When to use this value" },
  { "Name": "Value Two", "description": "When to use this value" }
]
```

The file lives in the `data/` directory alongside all other data files. Its name follows the standard kebab-case convention: the type "Application Status" becomes `application-status.json`, "Environment Type" becomes `environment-type.json`.

In schema-attributes.json, lookup types declare only a description attribute:

```json
"Application Status": {
  "description": { "type": 0 }
}
```

The Name field is implicit. Every object type in CMDB-Kit has a Name attribute automatically. Lookup types are intentionally simple: a name to reference and a description to explain it.

## How the Import Script Resolves Lookup References

When the import script processes a CI data file, it encounters reference fields like this in a Product Version record:

```json
{
  "Name": "OvocoCRM v3.2.0",
  "versionNumber": "3.2.0",
  "status": "Current",
  "product": "OvocoCRM"
}
```

The `status` field contains the string "Current." The schema-attributes.json definition for Product Version declares:

```json
"status": { "type": 1, "referenceType": "Version Status" }
```

The import script sees `type: 1` and knows this is a reference, not a text value. It reads the `referenceType` to determine the target: Version Status. It then queries the target database for a Version Status object whose Name equals "Current." If it finds one, it stores the internal ID of that object as the reference value. If it does not find one, the field is skipped and a warning is logged.

This is why lookup types must be imported before the CI types that reference them. The LOAD_PRIORITY array in `tools/lib/constants.js` enforces this by listing all 26 lookup types at the top:

```javascript
const LOAD_PRIORITY = [
  // ===== LOOKUP TYPES (no dependencies) =====
  'Application Status',
  'Version Status',
  'Deployment Status',
  'Environment Type',
  // ... all other lookups ...

  // ===== DIRECTORY =====
  'Organization',
  'Team',
  // ... CI types that reference lookups ...
];
```

If you added a lookup type but forgot to put it in LOAD_PRIORITY ahead of the types that reference it, the import would fail to resolve those references. The validation tool catches this: `node tools/validate.js --schema schema/extended` will report a dependency order violation.

## Case Sensitivity

Reference resolution uses exact Name matching. The string in the data file must match the Name field in the lookup record precisely. "Active" matches "Active." "active" does not.

This is the most common source of import warnings. If a Product Version record sets `"status": "active"` but the Version Status lookup has `"Name": "Active"`, the reference will not resolve. The import script logs:

```
    ! Reference lookup failed for "active"
```

The fix is simple: match the case. Use the exact Name values from the lookup data files. When entering data in CSV templates, the generated templates include the valid values as guidance, but they do not enforce case at the file level.


# Designing Your Own Lookup Types

## Naming Pattern

Lookup type names in CMDB-Kit follow a consistent pattern: the thing being classified, followed by a qualifier. The qualifier is usually "Status," "Type," "State," or another descriptive noun.

Status lookups describe where something is in its lifecycle: Application Status, Version Status, Deployment Status, Baseline Status, License Status.

Type lookups classify what something is: Environment Type, Document Type, Component Type, Certification Type, License Type.

State lookups are a variant of status used when the word "status" would be ambiguous: Document State (because "Document Status" could be confused with a workflow status).

Other qualifiers appear when status or type does not fit: Change Impact, Incident Severity, Deployment Role.

When creating a new lookup type, pick a name that makes the relationship clear when read as a sentence: "This Application has an Application Status of Active." "This Server has an Environment Type of Production." If the name reads naturally as "[CI] has a [Lookup Type] of [Value]," you have a good name.

## When to Create a New Lookup Type vs Adding Values

Create a new lookup type when you need a distinct set of values that would not make sense mixed into an existing type. If your organization tracks risk levels on assessments, and the values (Low, Medium, High, Critical) overlap with Change Impact but carry different descriptions and different semantics, create a separate "Risk Level" type rather than reusing Change Impact.

Add values to an existing lookup type when the new value fits the existing concept. If your deployments can now be "Paused" in addition to Planned, In Progress, Completed, Rolled Back, and Failed, add a "Paused" record to Deployment Status with an appropriate description.

The test: would someone browsing the lookup type be confused by the new value? If you added "Paused" to Deployment Status, it fits. If you added "High Risk" to Deployment Status, it does not belong there. That is a signal to create a new lookup type.

## Keeping Lookup Values Minimal and Well-described

Start with fewer values than you think you need. Every value you add is a value that appears in every dropdown, every dashboard filter, and every AQL query. If Application Status had twelve values, most of them would never be used and would clutter every interaction.

The extended schema ships with three to seven values per lookup type. This is intentional. You can always add values later. Removing values that are already referenced by CI records is harder, because you need to update or reassign those references first.

Every value must have a description that answers: "When should I pick this value?" Descriptions like "Active status" are useless. Descriptions like "Application is live and serving traffic" tell the user exactly what the value means. If you cannot write a clear description, the value might not be distinct enough to exist.


# The Complete Lookup Type Catalog

The extended schema includes 26 lookup types organized into three groups: status lookups that track lifecycle position, classification lookups that categorize what something is, and other lookups that capture severity, impact, priority, and role.

## Status Lookups

### Application Status (Application)

Tracks where an application is in its lifecycle, from initial planning through retirement.

| Name | Description |
|------|-------------|
| Active | Application is live and serving traffic |
| Planned | Application is approved but not yet built |
| Deprecated | Application is being phased out |
| Retired | Application has been decommissioned |

An application begins as "Planned" when it is approved. It moves to "Active" at launch. When a replacement is identified, it becomes "Deprecated." After decommissioning, it is "Retired." In the OvocoCRM example, the main application has an Active status, while the legacy reporting module might be Deprecated.

### Version Status (Product Version, Feature)

Tracks the lifecycle of product releases and features.

| Name | Description |
|------|-------------|
| Current | Active production release |
| Beta | Pre-release version under testing |
| Previous | Superseded by a newer release |
| Deprecated | No longer supported |
| Retired | End of life, removed from distribution |

A version enters as "Beta" during testing, becomes "Current" at release, drops to "Previous" when the next version ships, moves to "Deprecated" when support ends, and finally "Retired" when it is removed from distribution entirely. Feature records use the same values: a feature planned for a future release might be "Beta," while a feature shipped in the current release is "Current."

### Deployment Status (Deployment, Change Request)

Tracks execution of deployments and change requests.

| Name | Description |
|------|-------------|
| Planned | Deployment is scheduled |
| In Progress | Deployment is actively running |
| Completed | Deployment finished successfully |
| Rolled Back | Deployment was reverted |
| Failed | Deployment did not complete successfully |

Both Deployment and Change Request types reference this lookup. A change request that has been approved but not yet executed is "Planned." Once execution begins, it is "In Progress." The terminal states are "Completed," "Rolled Back," or "Failed."

### Document State (Document, Documentation Suite)

Tracks where a document is in the authoring and approval process.

| Name | Description |
|------|-------------|
| Draft | Document is being written |
| Review | Document is under peer review |
| Published | Document is approved and available |
| Archived | Document is no longer current |

This type uses "State" rather than "Status" to distinguish from workflow status fields. A document starts as "Draft," moves to "Review" for approval, becomes "Published" when approved, and is "Archived" when superseded. Documentation Suite uses the same values: a suite is "Published" when all its constituent documents are approved.

### Baseline Status (Baseline)

Tracks the approval lifecycle of configuration baselines.

| Name | Description |
|------|-------------|
| Draft | Baseline being defined |
| Approved | Baseline formally approved |
| Superseded | Replaced by newer baseline |

Baselines have a simpler lifecycle than most CIs. A baseline is assembled in "Draft," formally approved by a CCB or equivalent body, and eventually "Superseded" when a new baseline is established.

### Certification Status (Certification)

Tracks compliance certification validity.

| Name | Description |
|------|-------------|
| Active | Certification is current and valid |
| Pending | Certification in progress |
| Expired | Certification has lapsed |
| Revoked | Certification was revoked |

A certification begins as "Pending" during the audit or assessment process, becomes "Active" when granted, and eventually "Expired" if not renewed. "Revoked" handles the unusual case where a certification is withdrawn before its natural expiration.

### Assessment Status (Assessment)

Tracks security and compliance assessment progress.

| Name | Description |
|------|-------------|
| Planned | Assessment is scheduled |
| In Progress | Assessment is underway |
| Complete | Assessment finished |
| Remediation | Findings being addressed |

The "Remediation" status distinguishes between an assessment that is finished with no findings (moves to "Complete" and stays there) and one that produced findings requiring action.

### Incident Status (Incident)

Tracks incident resolution progress.

| Name | Description |
|------|-------------|
| Open | Incident reported, awaiting triage |
| Investigating | Actively being investigated |
| Mitigated | Impact reduced, root cause pending |
| Resolved | Incident fully resolved |
| Closed | Post-mortem complete, incident closed |

The five-status lifecycle separates "Mitigated" (impact reduced but investigation ongoing) from "Resolved" (root cause addressed) and "Closed" (post-mortem documented). This distinction matters for SLA reporting: time-to-mitigate and time-to-resolve are different metrics.

### License Status (License)

Tracks software license validity.

| Name | Description |
|------|-------------|
| Active | License is current |
| Expiring Soon | License expires within 90 days |
| Expired | License has expired |
| Renewed | License recently renewed |

"Expiring Soon" is a trigger state. Automation rules can query for licenses with this status and generate renewal alerts. A license moves from "Active" to "Expiring Soon" (via automation or manual update), then either "Renewed" or "Expired."

### Site Status (Deployment Site)

Tracks deployment site operational state.

| Name | Description |
|------|-------------|
| Active | Site is operational |
| Provisioning | Site is being set up |
| Maintenance | Site is under maintenance |
| Decommissioned | Site has been shut down |

A new deployment site enters as "Provisioning" when the site registration request is submitted. It becomes "Active" at go-live. "Maintenance" indicates a temporary state where the site is not serving traffic. "Decommissioned" is the terminal state.

### Vendor Status (Vendor)

Tracks vendor relationship state.

| Name | Description |
|------|-------------|
| Active | Active vendor relationship |
| Under Review | Vendor under evaluation |
| Inactive | No active engagement |
| Terminated | Relationship ended |

### SLA Status (SLA)

Tracks service level agreement state.

| Name | Description |
|------|-------------|
| Active | SLA is in effect |
| Draft | SLA being negotiated |
| Breached | SLA targets not met |
| Expired | SLA term has ended |

"Breached" is significant: it indicates that the SLA is still in effect but targets have been missed. This is distinct from "Expired," which means the agreement term has ended regardless of compliance.

## Classification Lookups

### Environment Type (Server, Database, Virtual Machine, Deployment, Deployment Site)

Classifies the environment an infrastructure CI operates in.

| Name | Description |
|------|-------------|
| Production | Live customer-facing environment |
| Staging | Pre-production validation environment |
| Development | Developer sandbox environment |
| QA | Quality assurance testing environment |
| DR | Disaster recovery environment |

This is the most widely shared lookup type, referenced by five CI types. When you filter Servers by environment or query for all Production Deployment Sites, you use these values.

### Document Type (Document)

Classifies documents by purpose.

| Name | Description |
|------|-------------|
| Runbook | Operational procedure for routine tasks |
| Architecture | System design and architecture documentation |
| SOP | Standard operating procedure |
| API Reference | API endpoint and usage documentation |
| Post-Mortem | Incident analysis and lessons learned |
| Release Notes | Summary of changes in a release |

### Component Type (Product Component)

Classifies the technical nature of a product component.

| Name | Description |
|------|-------------|
| Service | Backend microservice or API |
| Library | Shared code library or SDK |
| Database | Data storage component |
| Queue | Message queue or event bus |
| Cache | In-memory caching layer |
| Gateway | API gateway or reverse proxy |
| Frontend | User-facing web or mobile application |

In the OvocoCRM example, the CRM has components of several types: a Frontend (the web UI), multiple Services (auth-service, billing-service, notification-service), a Database (the primary PostgreSQL instance), a Cache (Redis session store), and a Gateway (the API gateway).

### Network Type (Network Segment)

Classifies network zones.

| Name | Description |
|------|-------------|
| DMZ | Demilitarized zone, public-facing |
| Application Tier | Internal application network |
| Data Tier | Database and storage network |
| Management | Infrastructure management network |

### Organization Type (Organization)

Classifies organizational entities.

| Name | Description |
|------|-------------|
| Company | Top-level corporate entity |
| Department | Organizational department |
| Division | Business division or unit |
| Vendor | External supplier or partner |

### Baseline Type (Baseline)

Classifies what phase of the product lifecycle a baseline captures.

| Name | Description |
|------|-------------|
| Design | Approved design configuration |
| Build | Verified build configuration |
| Release | Approved release configuration |

These three types correspond to the standard baseline progression. A design baseline captures the approved architecture. A build baseline captures the verified implementation. A release baseline captures the configuration approved for distribution.

### Certification Type (Certification)

Classifies compliance certifications.

| Name | Description |
|------|-------------|
| SOC 2 Type II | Service organization control audit |
| ISO 27001 | Information security management |
| GDPR | General Data Protection Regulation |
| HIPAA | Health Insurance Portability compliance |
| PCI DSS | Payment Card Industry Data Security |

These are example values. Your organization will replace them with the certifications relevant to your products and industry.

### Assessment Type (Assessment)

Classifies security and compliance assessments.

| Name | Description |
|------|-------------|
| Security Audit | Internal security assessment |
| Penetration Test | External penetration testing |
| Compliance Review | Regulatory compliance check |
| Architecture Review | Technical architecture assessment |

### License Type (License)

Classifies software licensing models.

| Name | Description |
|------|-------------|
| Per Seat | Licensed per user seat |
| Per Core | Licensed per CPU core |
| Enterprise | Unlimited enterprise license |
| Open Source | Open source license |
| SaaS Subscription | Cloud subscription license |

### Change Type (Change Request)

Classifies changes by their approval requirements, following ITIL change models.

| Name | Description |
|------|-------------|
| Standard | Pre-approved routine change |
| Normal | Change requiring CAB review |
| Emergency | Urgent change bypassing normal process |

Standard changes follow a pre-approved procedure and do not require individual CAB review. Normal changes go through the full change advisory process. Emergency changes use an expedited path with post-implementation review.

## Other Lookups

### Change Impact (Change Request)

Rates the potential impact of a proposed change.

| Name | Description |
|------|-------------|
| High | Major impact to services or users |
| Medium | Moderate impact, limited scope |
| Low | Minimal impact, no user disruption |

### Incident Severity (Incident)

Rates the severity of an incident using a four-level scale.

| Name | Description |
|------|-------------|
| SEV1 | Complete service outage |
| SEV2 | Major degradation affecting many users |
| SEV3 | Minor issue affecting some users |
| SEV4 | Cosmetic or low-impact issue |

Severity drives SLA targets. A SEV1 incident might require a 15-minute response and 4-hour resolution target, while a SEV4 might allow a 24-hour response and 30-day resolution.

### Priority

A general-purpose priority scale available across multiple contexts.

| Name | Description |
|------|-------------|
| Critical | Immediate action required |
| High | Urgent, address within hours |
| Medium | Important, address within days |
| Low | Minor, address when convenient |

### Deployment Role

Classifies the roles people play in deployment and operations.

| Name | Description |
|------|-------------|
| Developer | Builds and tests code changes |
| Operator | Manages deployments and infrastructure |
| Manager | Approves and oversees releases |
| Architect | Designs system architecture |
| SRE | Site reliability engineering |

## Which Lookup Types Pair With Which CI Types

The following table shows every CI type in the extended schema and the lookup types it references. This is the definitive cross-reference for understanding how lookup types connect to the rest of the CMDB.

| CI Type | Lookup Type References |
|---------|----------------------|
| Application | Application Status |
| Server | Environment Type |
| Database | Environment Type |
| Virtual Machine | Environment Type |
| Product Component | Component Type |
| Network Segment | Network Type |
| License | License Type, License Status |
| Assessment | Assessment Type, Assessment Status |
| Feature | Version Status |
| Product Version | Version Status |
| Document | Document Type, Document State |
| Deployment | Deployment Status, Environment Type |
| Baseline | Baseline Type, Baseline Status |
| Documentation Suite | Document State |
| Certification | Certification Type, Certification Status |
| Deployment Site | Site Status, Environment Type |
| Distribution Log | (no lookup references) |
| Change Request | Change Type, Change Impact, Deployment Status |
| Incident | Incident Severity, Incident Status |
| SLA | SLA Status |
| Organization | Organization Type |
| Vendor | Vendor Status |

Types not listed (Team, Person, Location, Facility, Hardware Model, Product Media, Product Suite) do not reference any lookup types directly.

## Default Values Provided in the Example Data

The extended schema ships with 103 lookup values across the 26 types. These values are designed to be practical starting points, not exhaustive lists. Most organizations will use them as-is for initial setup and then add values as their processes mature.

A few guidelines for working with the defaults:

Keep the existing values even if you do not use all of them immediately. It is easier to ignore an unused value than to add one later and discover that historic reports now have gaps.

Add values when your process requires a distinction the defaults do not capture. If your incident management process distinguishes between "Monitoring" and "Investigating," add "Monitoring" to Incident Status with a clear description.

Remove values only if you are certain no CI references them and no automation rule or AQL query filters on them. The validation tool does not currently check for orphaned lookup references, so verify manually.

When adding values for a multi-product deployment, remember that lookup types are shared. A value added to Site Status appears for every product's deployment sites. If you need product-specific status values, that is a signal to create a product-specific lookup type (for example, "CR Site Status" and "AN Site Status"), though this is rare. Most organizations find that shared status values work across all products.
