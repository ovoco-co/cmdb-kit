# IT Asset Management Lifecycle

IT asset management tracks the full lifecycle of hardware and software assets from initial request through disposal. The CMDB supports this lifecycle by recording the asset's current state, its relationships to other CIs, its financial and compliance attributes, and its ownership chain. This chapter maps the six-phase asset lifecycle to CMDB-Kit's types, shows which attributes matter at each phase, and covers the discovery and reconciliation patterns that keep the CMDB aligned with reality.


# Six-phase Asset Lifecycle

## Request and Initiation

The lifecycle begins when someone identifies a need. A development team needs additional server capacity. A deployment site needs new workstations. A compliance requirement mandates a new monitoring tool.

At this phase, no CI record exists yet. The need is captured as a work item in the issue tracker (a service request or procurement request). The CMDB provides context for the request: what infrastructure already exists (to avoid duplicate procurement), what capacity is available (to determine if the need can be met by existing assets), and what standards apply (to ensure the requested asset meets organizational requirements).

The request includes: what is needed, why, for which product or service, which location, estimated cost, and the funding source. If the request is approved, it moves to the next phase.

## Requirements and Design

Once approved, the request is refined into specific requirements. A "need for server capacity" becomes "two rack servers with 512GB RAM and 8TB storage, Dell PowerEdge R750 or equivalent, for the US-East datacenter."

At this phase, the CMDB's Hardware Model type provides the specifications for approved hardware. The Location and Facility types identify where the asset will be deployed. The Vendor type identifies approved suppliers.

The output of this phase is a procurement specification that references existing CMDB types: the hardware model to be purchased, the facility where it will be installed, the vendor to supply it, and the team that will own it.

## Acquisition and Build

The asset is procured, received, and configured. A License CI record may be created when software licenses are purchased. A Vendor CI is referenced (or created if this is a new supplier). The actual hardware arrives, is inventoried, and receives its initial configuration.

At this phase, create the CI record in the CMDB. A new Server record captures the hardware model, location, facility, and initial configuration:

```json
{
  "Name": "CRM-DB-PROD-03",
  "description": "Production database server for OvocoCRM",
  "hardwareModel": "Dell PowerEdge R750",
  "environment": "Production",
  "serverStatus": "Provisioning",
  "location": "US-East Datacenter",
  "owner": "SRE"
}
```

The status is "Provisioning" because the server exists physically but is not yet in production service.

## Fielding and Fulfillment

The configured asset is deployed to its operational location and handed to the team that will use it. For a server, this means racking it in the datacenter, connecting it to the network, and running acceptance tests. For software, this means installing it, configuring it, and verifying it works.

Update the CI record:

```json
{
  "Name": "CRM-DB-PROD-03",
  "serverStatus": "Active",
  "ipAddress": "10.0.1.103"
}
```

The status changes from "Provisioning" to "Active." The server is now in production service, and the Application CI for OvocoCRM references it.

## Monitor

The longest phase. A server might be in the Monitor phase for three to five years. During this time:

The CMDB tracks the asset's current state (status, version, configuration).

Incident records link to the asset when problems occur.

Change requests reference the asset when modifications are needed.

The asset's end-of-life (EOL) and end-of-support (EOS) dates are tracked and trigger proactive planning when they approach.

License expiration dates trigger renewal workflows.

Vendor contract renewals are tracked through the Vendor CI.

Monitoring is not passive. Regular checks verify that the CMDB record matches reality: is the server still at the recorded location, still running the recorded operating system version, still owned by the recorded team?

## Sunset and Disposal

When an asset reaches end-of-life, it enters the Sunset phase. The organization decides: replace, repurpose, or retire.

For replacement: a new asset goes through the Request phase while the old asset transitions through decommissioning.

For retirement: the asset is powered down, data is wiped or destroyed according to policy, the physical hardware is disposed of (returned to the vendor, recycled, or destroyed), and the CI record is updated to "Decommissioned" or "Retired."

The CI record is not deleted. It remains in the CMDB as a historical record. Audit requirements may mandate retaining asset records for years after disposal.

```json
{
  "Name": "CRM-DB-PROD-03",
  "serverStatus": "Decommissioned",
  "description": "Decommissioned 2028-06-15. Replaced by CRM-DB-PROD-04."
}
```


# ITAM Data Model Alignment

## Attributes Needed at Each Phase

Different phases require different information:

| Phase | Key Attributes |
|-------|---------------|
| Request | None (work item, not a CI yet) |
| Requirements | hardwareModel, location, facility, estimatedCost |
| Acquisition | vendor, purchaseDate, warrantyExpiry, licenseType |
| Fielding | ipAddress, environment, serverStatus (Active), owner |
| Monitor | All attributes maintained; incident and change history accumulates |
| Sunset | serverStatus (Decommissioned), decommissionDate, disposalMethod |

Not all attributes exist in the base schema. Attributes like `purchaseDate`, `warrantyExpiry`, `estimatedCost`, and `decommissionDate` are schema extensions. Add them to the types that need them using the process in the Schema Changes chapter.

## Organization, Location, and Person Data Across Phases

Directory data is relevant at every phase:

Organization: which department funded the procurement (Request), which vendor supplies it (Acquisition), which team operates it (Monitor).

Location: which datacenter will house it (Requirements), where it is installed (Fielding), where it was when decommissioned (Sunset).

Person: who requested it (Request), who received it (Fielding), who is the current custodian (Monitor), who authorized decommissioning (Sunset).

## Status Transitions Through the Lifecycle

Application Status values map to lifecycle phases:

| Status | Lifecycle Phase |
|--------|----------------|
| Planned | Request and Requirements |
| Development | Acquisition and Build |
| Active | Fielding and Monitor |
| Maintenance | Monitor (planned downtime) |
| Retired | Sunset |

The extended schema's Application Status lookup (Planned, Development, Active, Maintenance, Retired) covers the full lifecycle. If your organization needs finer granularity (Provisioning, Testing, Staging as sub-states of Development), extend the lookup.


# Financial and Compliance Integration

## License Tracking Across the Lifecycle

The License type tracks software licenses from acquisition through expiration:

```json
{
  "Name": "PostgreSQL Enterprise License",
  "licenseType": "Enterprise",
  "vendor": "PostgreSQL Global",
  "expirationDate": "2026-03-15",
  "status": "Active",
  "seats": 10
}
```

During the Monitor phase, compare active licenses against active assets to verify compliance: does the number of PostgreSQL Server CIs exceed the licensed seat count?

During Sunset, determine whether the license can be transferred to a replacement asset or whether it expires with the decommissioned asset.

## Contract Linkage

Vendor contracts often cover multiple assets. The Vendor CI tracks the contract expiration date and status. Assets reference the Vendor, creating a navigable link from "this server is supplied by this vendor under a contract that expires on this date."

When a vendor contract approaches expiration, query all assets referencing that vendor to understand the impact of non-renewal.

## Cost Attribution to CIs

CMDB-Kit's base schema does not include cost attributes. For organizations that need cost tracking in the CMDB, extend the relevant types with attributes like:

```json
"acquisitionCost": { "type": 0 },
"annualMaintenanceCost": { "type": 0 },
"depreciationSchedule": { "type": 0 }
```

These are text fields rather than numeric because cost formats vary (currency symbols, precision, allocation methods). If you need calculated cost rollups, use the export-and-join reporting pattern described in the System Integration Patterns chapter.


# Discovery and Reconciliation

## Automated Discovery Sources

Many organizations use automated discovery tools that scan the network and report what assets exist: servers, virtual machines, applications, network devices. Discovery tools provide the actual state of the infrastructure.

The CMDB provides the intended state: what should exist, how it should be configured, who owns it.

Reconciling discovery data against CMDB records reveals discrepancies: assets that exist in reality but not in the CMDB (rogue or unregistered assets), assets that exist in the CMDB but not in reality (decommissioned but not updated), and assets where the actual configuration differs from the recorded configuration.

## Reconciling Discovered Assets With CMDB Records

The reconciliation process:

1. Export discovery data (typically as CSV: hostname, IP address, OS, hardware model)
2. Export CMDB data for the same types (Server, Virtual Machine, Application)
3. Match by hostname, IP address, or other unique identifier
4. Report: matched (discovery and CMDB agree), mismatched (discovery and CMDB disagree on attributes), discovered-only (in discovery but not CMDB), CMDB-only (in CMDB but not discovered)

Discovered-only assets need investigation: are they legitimate assets that were not registered? Rogue systems? Temporary instances?

CMDB-only assets need verification: were they decommissioned without updating the CMDB? Did the discovery tool miss them?

Mismatched assets need correction: update the CMDB if reality is correct, or investigate if the asset's configuration has drifted from its intended state.

## Handling Orphaned and Rogue Assets

An orphaned asset is a CMDB record with no corresponding physical or virtual asset. A rogue asset is a physical or virtual asset with no CMDB record.

For orphaned assets: verify the asset was decommissioned, update its status to "Retired" or "Decommissioned," and note the discovery date of the discrepancy.

For rogue assets: determine if the asset is legitimate (someone forgot to register it) or unauthorized (a test instance that was never properly provisioned). If legitimate, create a CI record. If unauthorized, follow the organization's security incident process.


# Compliance Frameworks

## Audit Readiness

A well-maintained CMDB supports audit readiness by providing:

A complete inventory of assets with their current status and ownership.

Lifecycle history showing when each asset was acquired, deployed, and (if applicable) decommissioned.

Financial records linking assets to licenses, vendors, and cost centers.

Compliance evidence showing that assets meet organizational standards (approved hardware models, current software versions, valid licenses).

## Category Management

Assets can be categorized by Component Type (the lookup type in CMDB-Kit) for reporting and management purposes. Categories help answer portfolio questions: "how many database servers do we have?" and "what is the total license cost for all monitoring tools?"

## Regulatory Requirements for Asset Tracking

Some industries and government agencies mandate specific asset tracking practices. Defense organizations may require asset records to include acquisition cost, serial number, and disposal certification. Financial institutions may require hardware lifecycle documentation for audit purposes.

CMDB-Kit's schema is extensible to meet these requirements. Add the mandated attributes to the relevant types and include them in data entry workflows.


# Mapping the Lifecycle to CMDB-Kit Types

## License, Vendor, and Hardware Model at Each Phase

| Phase | License | Vendor | Hardware Model |
|-------|---------|--------|---------------|
| Request | Not yet relevant | May reference preferred vendors | May reference approved models |
| Requirements | License type identified | Vendor shortlisted | Model specified |
| Acquisition | License CI created | Vendor CI referenced | Hardware Model CI referenced |
| Fielding | License assigned to asset | Vendor provides support | Model validated against spec |
| Monitor | License expiration tracked | Vendor contract monitored | Model EOL tracked |
| Sunset | License deactivated or transferred | Vendor notified of decommission | Model removed from inventory |

## Using Application Status to Track Lifecycle Position

The Application Status lookup provides the primary lifecycle indicator. Set the status when creating the CI and update it at each phase transition. Queries against Application Status power lifecycle reporting:

```
objectType = "Application" AND "App Status" = "Active"
```

Returns all applications currently in the Monitor phase.

```
objectType = "Application" AND "App Status" = "Retired"
```

Returns all decommissioned applications (useful for historical reporting and audit).

## Extending the Schema for Lifecycle-specific Attributes

The base and extended schemas focus on current-state attributes. For full lifecycle tracking, consider adding:

To Server or Application: `commissionDate` (date), `decommissionDate` (date), `warrantyExpiry` (date), `endOfLife` (date), `endOfSupport` (date).

To License: `purchaseDate` (date), `purchaseOrderNumber` (text), `annualCost` (text).

To Vendor: `contractNumber` (text), `contractStartDate` (date), `primaryContactName` (text), `primaryContactPhone` (text).

These extensions transform the CMDB from a current-state inventory into a full lifecycle management system. Add them only when your processes require the data. Empty attributes add complexity without value.
