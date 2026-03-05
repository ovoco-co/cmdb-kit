# Enterprise Schema Extension

The enterprise schema adds financial tracking, enterprise architecture modeling, configuration library management, requirements traceability, and advanced media distribution to the CMDB-Kit extended schema.

## When to Use

Use the enterprise schema when your organization needs:

- **Enterprise Architecture** - Service catalog, capability mapping, business process modeling, and application portfolio management (TIME model)
- **Financial Tracking** - Contract management with vendor links, cost attribution via TBM taxonomy
- **Configuration Library** - Controlled software artifacts with checksums, version chains, and distribution status
- **Requirements Traceability** - Requirements linked to versions with verification methods and priority
- **Advanced Distribution** - Full media request lifecycle with urgency, delivery methods, encryption, and transfer status tracking
- **Asset Lifecycle** - Server lifecycle dates (commission, warranty, EOL/EOS), operational status, and asset tags

## What It Adds

### New Root Branches

| Branch | Types | Purpose |
|--------|-------|---------|
| Enterprise Architecture | Service, Capability, Business Process, Information Object | Service catalog and capability mapping |
| Configuration Library | Library Item | Controlled artifact management |
| Financial | Contract, Cost Category | Contract and cost tracking |

### New Type Under Product Library

| Type | Purpose |
|------|---------|
| Requirement | Traceable requirements with verification |

### New Lookup Types (16)

Enterprise Architecture: Service Type, Capability Status, Disposition

Configuration Library: Library Item Type, Distribution Status

Media Distribution: Delivery Method, Media Urgency, Transfer Status

Requirements: Requirement Type, Requirement Status, Requirement Priority, Verification Method

Financial: Contract Status, Disposal Method

Deployment: Site Type

### Extended Existing Types

| Type | New Attributes |
|------|---------------|
| Application | disposition, businessCapability, services, lifecycleStage |
| Server | serialNumber, assetTag, partNumber, macAddress, commissionDate, decommissionDate, warrantyStartDate, warrantyEndDate, endOfLife, endOfSupport, operationalStatus |
| License | purchaseDate, purchaseOrderNumber, annualCost, licenseMetric, contract |
| Vendor | contractNumber, contractStartDate, contractEndDate, primaryContactName, primaryContactPhone |
| Distribution Log | requestDate, requestor, urgency, deliveryMethod, preparedBy, preparedDate, mediaType, checksum, encryptionMethod, shippedDate, carrierTracking, receivedDate, installedDate, verifiedDate, transferStatus, receiptConfirmed, tamperSealId |
| Deployment Site | siteType, workflowStatus, upgradeStatus, productVersion, targetVersion, previousVersion, seatCount, sitePOC, customerOrganization |
| Change Request | originatorStatus, developerStatus, affectedVersion, fixedVersion, affectedSites, ccbDecision, ccbDate |
| Person | title, officeSymbol, phone |

## Type Count

| Tier | Leaf types | Total (with root branches) |
|------|------------|---------------------------|
| Base | 20 | 24 |
| Extended | 55 | 59 |
| Enterprise | 78 | 85 |

## Validation

```bash
node tools/validate.js --schema schema/enterprise
```

## Cost Category Note

The Cost Category type is stubbed with minimal example data. Populate it with your organization's TBM taxonomy towers and sub-towers when available.
