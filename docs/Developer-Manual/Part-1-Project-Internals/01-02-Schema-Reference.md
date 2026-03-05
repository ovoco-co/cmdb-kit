# Schema Reference

Complete reference for all object types, attributes, and relationships in CMDB-Kit.

# Schema Hierarchy

## Base Layer (20 types)

```
Product CMDB
├── Application
├── Server
├── Database
└── Product Component

Product Library
├── Product Version
├── Document
└── Deployment

Directory
├── Organization
├── Team
└── Person

Lookup Types
├── Application Status
├── Version Status
├── Deployment Status
├── Environment Type
├── Document Type
├── Document State
├── Component Type
├── Priority
├── Organization Type
└── Deployment Role
```

## Extended Layer (adds 35 types)

```
Product CMDB
├── ... (base types)
├── Hardware Model
├── Network Segment
├── Virtual Machine
├── License
├── Assessment
└── Feature

Product Library
├── ... (base types)
├── Baseline
├── Documentation Suite
├── Product Media
├── Product Suite
├── Certification
├── Deployment Site
├── Distribution Log
├── Change Request
├── Incident
└── SLA

Directory
├── ... (base types)
├── Location
├── Facility
└── Vendor

Lookup Types
├── ... (base lookups)
├── Change Type
├── Change Impact
├── Incident Severity
├── Incident Status
├── Certification Type
├── Certification Status
├── Assessment Type
├── Assessment Status
├── Network Type
├── Baseline Type
├── Baseline Status
├── License Type
├── License Status
├── Site Status
├── Vendor Status
└── SLA Status
```

# CI Types

## Application

Software services and applications.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| applicationType | Text | |
| technology | Text | |
| owner | Reference | Team |
| status | Reference | Application Status |

## Server

Compute instances and hosts.

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

## Database

Database instances.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| databaseEngine | Text | |
| version | Text | |
| server | Reference | Server |
| storageSize | Text | |
| environment | Reference | Environment Type |

## Product Component

Modular parts of a product.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| componentType | Reference | Component Type |
| repository | Text | |
| technology | Text | |
| owner | Reference | Team |

## Product Version

Released software versions.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| versionNumber | Text | |
| releaseDate | Date | |
| status | Reference | Version Status |
| components | Multi-Reference | Product Component |
| previousVersion | Reference | Product Version |

## Document

Controlled documentation.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| documentType | Reference | Document Type |
| state | Reference | Document State |
| author | Reference | Person |
| publishDate | Date | |
| url | Text | |

## Deployment

Version deployed to an environment.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| version | Reference | Product Version |
| environment | Reference | Environment Type |
| deployDate | Date | |
| status | Reference | Deployment Status |
| deployedBy | Reference | Person |

## Organization

Companies and departments.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| orgType | Reference | Organization Type |
| website | Text | |
| parentOrganization | Reference | Organization |

## Team

Engineering and operations teams.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| organization | Reference | Organization |
| teamLead | Reference | Person |

## Person

Team members and contacts.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| firstName | Text | |
| lastName | Text | |
| email | Text | |
| role | Text | |
| team | Reference | Team |

# Extended CI Types

## Hardware Model

Approved hardware and instance types.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| manufacturer | Text | |
| modelNumber | Text | |
| cpu | Text | |
| ram | Text | |
| storage | Text | |
| formFactor | Text | |

## Network Segment

Network zones and segments.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| networkType | Reference | Network Type |
| cidr | Text | |
| vlan | Text | |
| gateway | Text | |

## Virtual Machine

VMs and containers.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| hostname | Text | |
| server | Reference | Server |
| operatingSystem | Text | |
| cpu | Text | |
| ram | Text | |
| environment | Reference | Environment Type |

## License

Software license tracking.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| licenseType | Reference | License Type |
| vendor | Reference | Vendor |
| expirationDate | Date | |
| quantity | Integer | |
| status | Reference | License Status |

## Assessment

Security and compliance assessments.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| assessmentType | Reference | Assessment Type |
| assessmentDate | Date | |
| status | Reference | Assessment Status |
| assessor | Reference | Person |
| findings | Text | |

## Feature

Product features and capabilities.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| version | Reference | Product Version |
| status | Reference | Version Status |
| owner | Reference | Team |

## Baseline

Configuration baselines.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| baselineType | Reference | Baseline Type |
| version | Reference | Product Version |
| status | Reference | Baseline Status |
| approvalDate | Date | |

## Change Request

Change management records.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| changeType | Reference | Change Type |
| impact | Reference | Change Impact |
| requestedBy | Reference | Person |
| requestDate | Date | |
| status | Reference | Deployment Status |

## Incident

Incident records.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| severity | Reference | Incident Severity |
| status | Reference | Incident Status |
| reportedBy | Reference | Person |
| reportDate | Date | |
| resolvedDate | Date | |
| affectedApplication | Reference | Application |

## SLA

Service level agreements.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| application | Reference | Application |
| status | Reference | SLA Status |
| targetUptime | Text | |
| responseTime | Text | |
| reviewDate | Date | |

# Lookup Types

## Base Lookups

| Type | Values |
|------|--------|
| Application Status | Active, Planned, Deprecated, Retired |
| Version Status | Current, Beta, Previous, Deprecated, Retired |
| Deployment Status | Planned, In Progress, Completed, Rolled Back, Failed |
| Environment Type | Production, Staging, Development, QA, DR |
| Document Type | Runbook, Architecture, SOP, API Reference, Post-Mortem, Release Notes |
| Document State | Draft, Review, Published, Archived |
| Component Type | Service, Library, Database, Queue, Cache, Gateway, Frontend |
| Priority | Critical, High, Medium, Low |
| Organization Type | Company, Department, Division, Vendor |
| Deployment Role | Developer, Operator, Manager, Architect, SRE |

## Extended Lookups

| Type | Values |
|------|--------|
| Change Type | Standard, Normal, Emergency |
| Change Impact | High, Medium, Low |
| Incident Severity | SEV1, SEV2, SEV3, SEV4 |
| Incident Status | Open, Investigating, Mitigated, Resolved, Closed |
| Certification Type | SOC 2 Type II, ISO 27001, GDPR, HIPAA, PCI DSS |
| Certification Status | Active, Pending, Expired, Revoked |
| Assessment Type | Security Audit, Penetration Test, Compliance Review, Architecture Review |
| Assessment Status | Planned, In Progress, Complete, Remediation |
| Network Type | DMZ, Application Tier, Data Tier, Management |
| Baseline Type | Design, Build, Release |
| Baseline Status | Draft, Approved, Superseded |
| License Type | Per Seat, Per Core, Enterprise, Open Source, SaaS Subscription |
| License Status | Active, Expiring Soon, Expired, Renewed |
| Site Status | Active, Provisioning, Maintenance, Decommissioned |
| Vendor Status | Active, Under Review, Inactive, Terminated |
| SLA Status | Active, Draft, Breached, Expired |
