# Schema Reference

This document lists every type and attribute in CMDB-Kit. Core types are always present. Domain types are opt-in.

Attribute type codes: Text is a free-text string. Date is a YYYY-MM-DD string. Integer is a whole number. Reference is a link to one record of the target type. Multi-reference is a link to multiple records of the target type.

## Core Types

### Type Hierarchy

```
Product CMDB
  Product
  Server
  Database
  Product Component
  Feature

Product Library
  Product Version
  Document
  Deployment
  Deployment Site
  Baseline

Directory
  Organization
  Team
  Person

Lookup Types
  Product Status
  Version Status
  Deployment Status
  Environment Type
  Document Type
  Document State
  Component Type
  Priority
  Organization Type
  Deployment Role
  Site Status
  Baseline Type
  Baseline Status
```

### Product

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| productType | Text | |
| technology | Text | |
| owner | Reference | Team |
| status | Reference | Product Status |
| companionProducts | Multi-reference | Product |

### Server

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| hostname | Text | |
| ipAddress | Text | |
| operatingSystem | Text | |
| environment | Reference | Environment Type |
| cpu | Text | |
| ram | Text | |
| storage | Text | |

### Database

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| databaseEngine | Text | |
| version | Text | |
| server | Reference | Server |
| storageSize | Text | |
| environment | Reference | Environment Type |

### Product Component

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| componentType | Reference | Component Type |
| repository | Text | |
| technology | Text | |
| owner | Reference | Team |

### Feature

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| product | Reference | Product |
| version | Reference | Product Version |
| status | Reference | Version Status |
| owner | Reference | Team |

### Product Version

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| versionNumber | Text | |
| releaseDate | Date | |
| status | Reference | Version Status |
| components | Multi-reference | Product Component |
| previousVersion | Reference | Product Version |
| approvedBy | Reference | Person |
| approvalDate | Date | |
| releaseNotes | Text | |

### Document

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| documentType | Reference | Document Type |
| state | Reference | Document State |
| product | Reference | Product |
| version | Reference | Product Version |
| author | Reference | Person |
| publishDate | Date | |
| url | Text | |

### Deployment

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| version | Reference | Product Version |
| environment | Reference | Environment Type |
| deployDate | Date | |
| status | Reference | Deployment Status |
| deployedBy | Reference | Person |

### Deployment Site

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| product | Reference | Product |
| version | Reference | Product Version |
| organization | Reference | Organization |
| environment | Reference | Environment Type |
| status | Reference | Site Status |
| sitePOC | Reference | Person |
| supportTeam | Reference | Team |
| lastDeploymentDate | Date | |
| deployedBy | Reference | Person |
| goLiveDate | Date | |

### Baseline

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| baselineType | Reference | Baseline Type |
| product | Reference | Product |
| version | Reference | Product Version |
| status | Reference | Baseline Status |
| approvedBy | Reference | Person |
| approvalDate | Date | |
| establishedDate | Date | |
| components | Multi-reference | Product Component |
| documents | Multi-reference | Document |

### Organization

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| orgType | Reference | Organization Type |
| website | Text | |
| parentOrganization | Reference | Organization |

### Team

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| organization | Reference | Organization |
| teamLead | Reference | Person |

### Person

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| firstName | Text | |
| lastName | Text | |
| email | Text | |
| phone | Text | |
| jobTitle | Text | |
| role | Text | |
| team | Reference | Team |
| manager | Reference | Person |

### Lookup Types

All lookup types share the same attribute structure.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |

This applies to: Product Status, Version Status, Deployment Status, Environment Type, Document Type, Document State, Component Type, Priority, Organization Type, Deployment Role, Site Status, Baseline Type, Baseline Status.

## Infrastructure Domain

### Type Hierarchy

```
Product CMDB
  Hardware Model
  Network Segment
  Virtual Machine

Directory
  Location
  Facility

Lookup Types
  Network Type
```

### Hardware Model

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| manufacturer | Text | |
| modelNumber | Text | |
| cpu | Text | |
| ram | Text | |
| storage | Text | |
| formFactor | Text | |

### Network Segment

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| networkType | Reference | Network Type |
| cidr | Text | |
| vlan | Text | |
| gateway | Text | |

### Virtual Machine

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| hostname | Text | |
| server | Reference | Server |
| operatingSystem | Text | |
| cpu | Text | |
| ram | Text | |
| environment | Reference | Environment Type |

### Location

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| address | Text | |
| city | Text | |
| country | Text | |
| locationType | Text | |

### Facility

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| location | Reference | Location |
| facilityType | Text | |
| capacity | Text | |

### Network Type

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |

## Compliance Domain

### Type Hierarchy

```
Product CMDB
  Assessment

Product Library
  Certification

Lookup Types
  Assessment Type
  Assessment Status
  Certification Type
  Certification Status
```

### Assessment

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| assessmentType | Reference | Assessment Type |
| assessmentDate | Date | |
| status | Reference | Assessment Status |
| assessor | Reference | Person |
| findings | Text | |

### Certification

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| certificationType | Reference | Certification Type |
| status | Reference | Certification Status |
| issueDate | Date | |
| expirationDate | Date | |
| issuingBody | Text | |

### Compliance Lookup Types

All compliance lookup types share the same attribute structure.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |

This applies to: Assessment Type, Assessment Status, Certification Type, Certification Status.

## Distribution Domain

### Type Hierarchy

```
Product Library
  Documentation Suite
  Product Media
  Product Suite
  Distribution Log
```

### Documentation Suite

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| version | Reference | Product Version |
| documents | Multi-reference | Document |
| state | Reference | Document State |

### Product Media

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| version | Reference | Product Version |
| fileName | Text | |
| fileSize | Text | |
| checksum | Text | |

### Product Suite

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| version | Reference | Product Version |
| media | Multi-reference | Product Media |

### Distribution Log

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| version | Reference | Product Version |
| site | Reference | Deployment Site |
| distributionDate | Date | |
| distributedBy | Reference | Person |

## Licensing Domain

### Type Hierarchy

```
Product CMDB
  License

Product Library
  SLA

Directory
  Vendor

Lookup Types
  License Type
  License Status
  Vendor Status
  SLA Status
```

### License

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| licenseType | Reference | License Type |
| vendor | Reference | Vendor |
| expirationDate | Date | |
| quantity | Integer | |
| status | Reference | License Status |

### SLA

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| product | Reference | Product |
| status | Reference | SLA Status |
| targetUptime | Text | |
| responseTime | Text | |
| reviewDate | Date | |

### Vendor

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| website | Text | |
| contactEmail | Text | |
| status | Reference | Vendor Status |
| contractExpiry | Date | |

### Licensing Lookup Types

All licensing lookup types share the same attribute structure.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |

This applies to: License Type, License Status, Vendor Status, SLA Status.
