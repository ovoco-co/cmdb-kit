# IT Asset Management Lifecycle

IT asset management tracks the full lifecycle of hardware and software assets from initial request through disposal. The CMDB supports this lifecycle by recording each asset's current state, its relationships to other CIs, its financial and compliance attributes, and its ownership chain. This section maps the six-phase asset lifecycle to CMDB-Kit's types, shows which attributes matter at each phase, and covers the discovery and reconciliation patterns that keep the CMDB aligned with reality.


# Six-phase Asset Lifecycle

## Request and Initiation

The lifecycle begins when someone identifies a need. A development team needs additional server capacity. A deployment site needs new workstations. A compliance requirement mandates a new monitoring tool.

At this phase, no CI record exists yet. The need is captured as a work item in the issue tracker (a service request or procurement request). The CMDB provides context for the request: what infrastructure already exists (to avoid duplicate procurement), what capacity is available (to determine if the need can be met by existing assets), and what standards apply (to ensure the requested asset meets organizational requirements).

The request includes: what is needed, why, for which product or service, which location, estimated cost, and the funding source. If the request is approved, it moves to the next phase.

## Requirements and Design

Once approved, the request is refined into specific requirements. A "need for server capacity" becomes "two rack servers with 512 GB RAM and 12 TB storage, Dell PowerEdge R750 or equivalent, for the US-East datacenter."

At this phase, the CMDB's Hardware Model types (CR Hardware Model, AN Hardware Model, SS Hardware Model) provide the specifications for approved hardware. The Location and Facility types identify where the asset will be deployed. The Vendor type identifies approved suppliers (PostgreSQL Global Development Group, Redis Ltd, Twilio, Elastic NV in the enterprise data).

CR Hardware Model attributes that matter during requirements:

| Attribute | Type | Purpose |
|-----------|------|---------|
| description | Text | Human-readable summary of the model |
| manufacturer | Text | Hardware manufacturer (Dell, AWS, Lenovo) |
| modelNumber | Text | Vendor model identifier |
| cpu | Text | Processor specification |
| ram | Text | Memory capacity |
| storage | Text | Disk capacity and type |
| formFactor | Text | Physical form (2U Rack, Cloud Instance, Tower) |

In OvocoCRM's example data, the CR Hardware Model type includes both physical and cloud entries:

```json
{
  "Name": "Dell PowerEdge R750",
  "description": "Enterprise rack server",
  "manufacturer": "Dell",
  "modelNumber": "R750",
  "cpu": "2x Xeon Gold",
  "ram": "512 GB",
  "storage": "12 TB",
  "formFactor": "2U Rack"
}
```

```json
{
  "Name": "r5.4xlarge",
  "description": "AWS memory-optimized instance",
  "manufacturer": "AWS",
  "modelNumber": "r5.4xlarge",
  "cpu": "16 vCPU",
  "ram": "128 GB",
  "formFactor": "Cloud Instance"
}
```

The output of this phase is a procurement specification that references existing CMDB types: the hardware model to be purchased, the facility where it will be installed, the vendor to supply it, and the team that will own it. In the enterprise schema, the Financial branch tracks procurement through Contract CIs like "Ovoco Cloud Infrastructure Agreement" and "Ovoco Support Contract."

## Acquisition and Build

The asset is procured, received, and configured. A License CI record may be created when software licenses are purchased (CR License, AN License, or SS License depending on scope). A Vendor CI is referenced (or created if this is a new supplier). The actual hardware arrives, is inventoried, and receives its initial configuration. In the enterprise schema, Contract CIs in the Financial branch link the procurement to the vendor relationship and track the financial terms.

At this phase, create the CI record in the CMDB. A new CR Server record captures the hostname, IP address, operating system, environment, and hardware specifications:

```json
{
  "Name": "crm-db-03",
  "description": "New database server for OvocoCRM read replicas",
  "hostname": "crm-db-03.ovoco.internal",
  "operatingSystem": "Ubuntu 22.04 LTS",
  "environment": "Production",
  "cpu": "16 vCPU",
  "ram": "64 GB",
  "storage": "2 TB NVMe"
}
```

The CR Server type in the enterprise schema does not include a status attribute. If your organization needs to track provisioning state, extend the Server type with a status reference or use the issue tracker to manage the provisioning workflow. The product that runs on the server tracks its own lifecycle through Product Status.

## Fielding and Fulfillment

The configured asset is deployed to its operational location and handed to the team that will use it. For a server, this means racking it in the datacenter (or launching the cloud instance), connecting it to the network, and running acceptance tests. For software, this means installing it, configuring it, and verifying it works.

Update the CI record with operational details:

```json
{
  "Name": "crm-db-03",
  "description": "New database server for OvocoCRM read replicas",
  "hostname": "crm-db-03.ovoco.internal",
  "ipAddress": "10.0.2.12",
  "operatingSystem": "Ubuntu 22.04 LTS",
  "environment": "Production",
  "cpu": "16 vCPU",
  "ram": "64 GB",
  "storage": "2 TB NVMe"
}
```

The server now has its IP address assigned and is ready for production workloads. The CR Product CI for CR Core Platform or its CR Product Component CIs can reference this server.

## Monitor

The longest phase. A server might be in the Monitor phase for three to five years. During this time:

The CMDB tracks the asset's current state (configuration, environment, relationships).

Incident records link to the asset when problems occur. The Incident type's `affectedProduct` attribute references the Product CI, connecting incidents to the infrastructure chain.

Change requests reference the asset when modifications are needed.

License expiration dates trigger renewal workflows. The License type's `expirationDate` attribute (a date field) enables queries that surface licenses approaching expiration.

Vendor contract renewals are tracked through the Vendor type's `contractEnd` attribute and the Contract CIs in the Financial branch.

Monitoring is not passive. Regular checks verify that the CMDB record matches reality: is the server still at the recorded IP address, still running the recorded operating system version, still owned by the recorded team?

## Sunset and Disposal

When an asset reaches end-of-life, it enters the Sunset phase. The organization decides: replace, repurpose, or retire.

For replacement: a new asset goes through the Request phase while the old asset transitions through decommissioning.

For retirement: the asset is powered down, data is wiped or destroyed according to policy, the physical hardware is disposed of (returned to the vendor, recycled, or destroyed), and the CI record is updated. The Product's status changes to "Retired" in Product Status.

The CI record is not deleted. It remains in the CMDB as a historical record. Audit requirements may mandate retaining asset records for years after disposal.

```json
{
  "Name": "crm-db-03",
  "description": "Decommissioned 2028-06-15. Replaced by crm-db-04.",
  "hostname": "crm-db-03.ovoco.internal",
  "ipAddress": "10.0.2.12",
  "operatingSystem": "Ubuntu 22.04 LTS",
  "environment": "Production",
  "cpu": "16 vCPU",
  "ram": "64 GB",
  "storage": "2 TB NVMe"
}
```

For products that run on decommissioned infrastructure, update the Product Status to "Retired" or "Deprecated" depending on whether the product is being fully retired or migrated to new infrastructure.


# ITAM Data Model Alignment

## Attributes Needed at Each Phase

Different phases require different information:

| Phase | Key Attributes |
|-------|---------------|
| Request | None (work item, not a CI yet) |
| Requirements | Hardware Model (manufacturer, modelNumber, formFactor), Location, Facility |
| Acquisition | Vendor, License (licenseType, vendor, quantity), environment |
| Fielding | hostname, ipAddress, environment, operatingSystem |
| Monitor | All attributes maintained; incident and change history accumulates |
| Sunset | Product Status (Retired or Deprecated), description updated with decommission notes |

Not all lifecycle-tracking attributes exist in the base schema. The enterprise schema adds the Financial branch with Contract and Cost Category types for financial tracking. Attributes like `purchaseDate`, `warrantyExpiry`, and `decommissionDate` are schema extensions. Add them to the types that need them using the process described in the Developer Manual's Schema Changes section.

## Directory Data Across Phases

Directory data is relevant at every phase:

Organization: which department funded the procurement (Request), which vendor supplies it (Acquisition), which team operates it (Monitor).

Location: which datacenter will house it (Requirements), where it is installed (Fielding), where it was when decommissioned (Sunset).

Person: who requested it (Request), who received it (Fielding), who is the current custodian (Monitor), who authorized decommissioning (Sunset).

## Status Transitions Through the Lifecycle

Product Status values map to lifecycle phases:

| Status | Lifecycle Phase |
|--------|----------------|
| Planned | Request and Requirements |
| Active | Acquisition through Monitor |
| Deprecated | Late Monitor (approaching end-of-life) |
| Retired | Sunset |

The enterprise schema's Product Status lookup provides four values: Planned, Active, Legacy, and Retired. These cover the full lifecycle. If your organization needs finer granularity (Provisioning, Testing, Staging as sub-states), extend the lookup type with additional values.

Server CIs in the enterprise schema (CR Server, AN Server, SS Server) do not have their own status attribute. The Server's lifecycle position is inferred from the Product Status of the product it supports and from the environment reference (Production, Staging, etc.). If you need per-server status tracking, add a status reference attribute to the Server type.


# Financial and Compliance Integration

## License Tracking Across the Lifecycle

The License types (CR License, AN License, SS License) track software licenses from acquisition through expiration. The attributes in the enterprise schema are:

| Attribute | Type | Purpose |
|-----------|------|---------|
| description | Text | Human-readable summary |
| licenseType | Reference to License Type | Licensing model (Per Seat, Per Core, Enterprise, Open Source, SaaS Subscription) |
| vendor | Reference to Vendor | The supplier |
| expirationDate | Date | When the license expires (YYYY-MM-DD) |
| quantity | Integer | Number of seats, cores, or instances licensed |
| status | Reference to License Status | Current state (Active, Expiring Soon, Expired, Renewed) |

An OvocoCRM example from the data files:

```json
{
  "Name": "Redis Enterprise",
  "description": "Redis enterprise subscription",
  "licenseType": "SaaS Subscription",
  "vendor": "Redis Ltd",
  "expirationDate": "2027-03-01",
  "quantity": "3",
  "status": "Active"
}
```

The `licenseType` value "SaaS Subscription" matches a Name in the License Type lookup. The `vendor` value "Redis Ltd" matches a Name in the Vendor data. The `status` value "Active" matches a Name in the License Status lookup.

During the Monitor phase, compare active licenses against active assets to verify compliance. For OvocoCRM, the Redis Enterprise license has a quantity of 3, so the infrastructure should have no more than three Redis instances.

During Sunset, determine whether the license can be transferred to a replacement asset or whether it expires with the decommissioned asset.

## Contract Linkage

The enterprise schema adds a dedicated Financial branch with Contract and Cost Category types for tracking commercial relationships. Each Contract CI references a Vendor, has start and end dates, and tracks the contract value and manager:

```json
{
  "Name": "Ovoco Support Contract",
  "description": "Enterprise support contract for Redis and messaging infrastructure",
  "vendor": "Redis Ltd",
  "status": "Active",
  "startDate": "2025-04-01",
  "endDate": "2027-03-01",
  "value": "$48,000/year",
  "contractManager": "Alex Chen"
}
```

Vendor records include contract details and a `status` reference to Vendor Status:

```json
{
  "Name": "Redis Ltd",
  "description": "Redis in-memory data store",
  "website": "https://redis.io",
  "contactEmail": "enterprise@redis.com",
  "status": "Active",
  "contractNumber": "REDIS-ENT-2025-001",
  "contractStart": "2025-04-01",
  "contractEnd": "2027-03-01"
}
```

When a vendor contract approaches expiration, query all License CIs referencing that vendor and all Contract CIs referencing that vendor to understand the impact of non-renewal. The enterprise schema's three contracts (Ovoco Cloud Infrastructure Agreement, Ovoco Support Contract, Ovoco Email Delivery Agreement) connect vendors like Elastic NV, Redis Ltd, and Twilio to the infrastructure they support.

## Cost Attribution to CIs

The enterprise schema includes a Cost Category type in the Financial branch for TBM (Technology Business Management) taxonomy-based cost attribution. TBM organizes IT costs into towers and sub-towers. The following mapping shows how TBM towers relate to CMDB-Kit CI types so you can attribute costs to the right records:

| TBM Tower | Sub-Towers | CMDB CI Types |
|-----------|-----------|---------------|
| Application | Development, Support and Operations, Business Software | Product, Product Component, License, Feature |
| Compute | Servers, Unix, Midrange, Converged Infrastructure | Server, Virtual Machine, Hardware Model |
| Data Center | Enterprise Data Center, Other Facilities | Location, Facility |
| End User | Workspace, Mobile Devices, End User Software | Server (desktops if tracked), License |
| IT Management | Strategic Planning, EA, IT Finance, Vendor Management | Service, Capability, Contract, Vendor, Cost Category |
| Network | LAN/WAN, Voice, Transport | Network Segment |
| Platform | Database, Middleware, Container Orchestration | Database, Product Component (middleware) |
| Security and Compliance | Security, Compliance, Disaster Recovery | Assessment, Certification |
| Storage | Online Storage, Offline Storage | Extend Server or add Storage type if needed |

Some TBM towers describe labor or organizational functions rather than configuration items (Client Management, Operations Center, Help Desk, Deskside Support). Do not create CI types just to have a home for every tower. Use Cost Category records to represent the towers themselves, and attribute costs to the CI types that naturally carry them.

Each Cost Category record represents a TBM tower or sub-tower:

```json
[
  { "Name": "Application Development", "description": "Analysis, design, development, code, test and release packaging" },
  { "Name": "Application Support and Operations", "description": "Operations, support, fix and minor enhancements" },
  { "Name": "Servers", "description": "Physical and virtual servers" },
  { "Name": "Database", "description": "Distributed database services" },
  { "Name": "Security", "description": "Policy, process, breach response, operational security" }
]
```

A Product like "CR Core Platform" is attributed to "Application Development" because development costs support that product. The Server it runs on is attributed to "Servers." The Database it uses is attributed to "Database." This lets finance answer questions like "how much do we spend on Application Development for OvocoCRM?" by querying all CIs attributed to that cost category within the product line.

For organizations that need per-CI cost tracking beyond category attribution, extend the relevant types with attributes like:

```json
"acquisitionCost": { "type": 0 },
"annualMaintenanceCost": { "type": 0 },
"depreciationSchedule": { "type": 0 }
```

These are text fields rather than numeric because cost formats vary (currency symbols, precision, allocation methods). If you need calculated cost rollups, use the export-and-join reporting pattern described in the System Integration Patterns section.

### When to Add a Storage Type

CMDB-Kit does not include a dedicated Storage CI type in any schema layer. Most organizations track storage as an attribute on Server. If your organization manages centralized storage arrays (SAN, NAS) as distinct infrastructure, consider adding a Storage type with attributes for capacity, RAID level, protocol, and location. This is worth doing when storage is managed by a separate team from compute, has its own procurement and lifecycle, needs independent cost reporting, or when multiple servers share the same storage array and you need to track the relationship.


# Discovery and Reconciliation

## Automated Discovery Sources

Many organizations use automated discovery tools that scan the network and report what assets exist: servers, virtual machines, databases, network devices. Discovery tools provide the actual state of the infrastructure.

The CMDB provides the intended state: what should exist, how it should be configured, who owns it.

Reconciling discovery data against CMDB records reveals discrepancies: assets that exist in reality but not in the CMDB (rogue or unregistered assets), assets that exist in the CMDB but not in reality (decommissioned but not updated), and assets where the actual configuration differs from the recorded configuration.

## Reconciling Discovered Assets With CMDB Records

The reconciliation process follows four steps.

Export discovery data, typically as CSV with hostname, IP address, operating system, and hardware model.

Export CMDB data for the same types (CR Server, SS Server, CR Virtual Machine, SS Virtual Machine) using the export tool or the round-trip workflow described in the Exporting and Round-Trip section.

Match by hostname, IP address, or another unique identifier. OvocoCRM servers use a consistent naming convention (crm-app-01, crm-db-01, crm-cache-01) that makes matching reliable.

Report the results in four categories: matched (discovery and CMDB agree), mismatched (discovery and CMDB disagree on attributes), discovered-only (in discovery but not in the CMDB), and CMDB-only (in the CMDB but not discovered).

Discovered-only assets need investigation: are they legitimate assets that were not registered? Rogue systems? Temporary instances?

CMDB-only assets need verification: were they decommissioned without updating the CMDB? Did the discovery tool miss them?

Mismatched assets need correction: update the CMDB if reality is correct, or investigate if the asset's configuration has drifted from its intended state.

## Handling Orphaned and Rogue Assets

An orphaned asset is a CMDB record with no corresponding physical or virtual asset. A rogue asset is a physical or virtual asset with no CMDB record.

For orphaned assets: verify the asset was decommissioned, update the Product Status to "Retired," and note the discovery date of the discrepancy in the description field.

For rogue assets: determine if the asset is legitimate (someone forgot to register it) or unauthorized (a test instance that was never properly provisioned). If legitimate, create a CI record. If unauthorized, follow the organization's security incident process.


# Compliance Frameworks

## Audit Readiness

A well-maintained CMDB supports audit readiness by providing:

A complete inventory of assets with their current status and ownership.

Lifecycle history showing when each asset was acquired, deployed, and (if applicable) decommissioned.

Financial records linking assets to licenses, vendors, contracts, and cost categories. The enterprise schema's Financial branch (Contract, Cost Category) and License types create a navigable chain from infrastructure to commercial agreements.

Compliance evidence showing that assets meet organizational standards (approved hardware models, current software versions, valid licenses).

## Category Management

Assets can be categorized by Component Type (the lookup type in CMDB-Kit) for reporting and management purposes. The CR Product Component and AN Product Component types reference Component Type, enabling portfolio questions like "how many database components do we have?" and "what is the total license cost for all messaging services?" The enterprise schema's Disposition lookup (Tolerate, Invest, Migrate, Eliminate) from the TIME model enables application portfolio rationalization decisions.

## Regulatory Requirements for Asset Tracking

Some industries and government agencies mandate specific asset tracking practices. Defense organizations may require asset records to include acquisition cost, serial number, and disposal certification. Financial institutions may require hardware lifecycle documentation for audit purposes.

CMDB-Kit's schema is extensible to meet these requirements. Add the mandated attributes to the relevant types and include them in data entry workflows. For example, adding `serialNumber` (text) and `disposalCertification` (text) to the Server type covers common defense audit requirements.
