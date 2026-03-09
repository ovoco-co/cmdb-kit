# Schema Reference

Complete reference for object types, attributes, and relationships in CMDB-Kit.

# Schema Hierarchy

CMDB-Kit provides three schema tiers. Extended includes everything in base plus more types, and enterprise includes everything in extended plus more.

## Base Layer

```
Product CMDB
├── Product
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
├── Product Status
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

## Extended Layer

```
Product CMDB
├── Product
├── Server
├── Database
├── Product Component
├── Hardware Model
├── Network Segment
├── Virtual Machine
├── License
├── Assessment
└── Feature

Product Library
├── Product Version
├── Document
├── Deployment
├── Baseline
├── Documentation Suite
├── Product Media
├── Product Suite
├── Certification
├── Deployment Site
├── Distribution Log
└── SLA

Directory
├── Organization
├── Team
├── Person
├── Location
├── Facility
└── Vendor

Lookup Types
├── Product Status
├── Version Status
├── Deployment Status
├── Environment Type
├── Document Type
├── Document State
├── Component Type
├── Priority
├── Organization Type
├── Deployment Role
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

## Enterprise Layer

The enterprise tier restructures the hierarchy for multi-product management. The root is "Ovoco Portfolio CMDB" with nine top-level branches. Product-specific types use prefixes: CR for OvocoCRM, AN for OvocoAnalytics, SS for Shared Services.

```
Ovoco Portfolio CMDB
├── OvocoCRM CMDB 
│   ├── CR Feature
│   ├── CR Feature Implementation
│   ├── CR Product
│   ├── CR Server
│   ├── CR Hardware Model
│   ├── CR Network Segment
│   ├── CR Product Component
│   ├── CR Component Instance
│   ├── CR Virtual Machine
│   ├── CR Assessment
│   └── CR License
│
├── OvocoAnalytics CMDB
│   ├── AN Feature
│   ├── AN Feature Implementation
│   ├── AN Product
│   ├── AN Server
│   ├── AN Hardware Model
│   ├── AN Network Segment
│   ├── AN Product Component
│   ├── AN Component Instance
│   ├── AN Assessment
│   └── AN License
│
├── Shared Services CMDB
│   ├── SS Product
│   ├── SS Server
│   ├── SS Virtual Machine
│   ├── SS Network Segment
│   ├── SS Hardware Model
│   ├── SS Document
│   ├── SS Certification
│   ├── SS Assessment
│   └── SS License
│
├── Ovoco Library
│   ├── Site
│   ├── OvocoCRM Library
│   │   ├── CR Product Version
│   │   ├── CR Baseline
│   │   ├── CR Document
│   │   ├── CR Documentation Suite
│   │   ├── CR Product Media
│   │   ├── CR Product Suite
│   │   ├── CR Certification
│   │   ├── CR Deployment Site
│   │   ├── CR Site Location Assignment
│   │   ├── CR Site Org Relationship
│   │   ├── CR Site Personnel Assignment
│   │   └── CR Distribution Log
│   ├── OvocoAnalytics Library
│   │   ├── AN Product Version
│   │   ├── AN Baseline
│   │   ├── AN Document
│   │   ├── AN Documentation Suite
│   │   ├── AN Product Media
│   │   ├── AN Product Suite
│   │   ├── AN Certification
│   │   ├── AN Deployment Site
│   │   ├── AN Site Location Assignment
│   │   ├── AN Site Org Relationship
│   │   ├── AN Site Personnel Assignment
│   │   └── AN Distribution Log
│   └── Shared Library
│       ├── SLA
│       └── Requirement
│
├── Enterprise Architecture
│   ├── Service
│   ├── Capability
│   ├── Business Process
│   └── Information Object
│
├── Configuration Library
│   └── Library Item
│
├── Financial
│   ├── Contract
│   └── Cost Category
│
├── Directory
│   ├── Organization
│   ├── Team
│   ├── Person
│   ├── Location
│   ├── Facility
│   └── Vendor
│
└── Lookup Types
    ├── Product Status
    ├── Version Status
    ├── Deployment Status
    ├── Environment Type
    ├── Document Type
    ├── Document State
    ├── Component Type
    ├── Priority
    ├── Organization Type
    ├── Deployment Role
    ├── Certification Type
    ├── Certification Status
    ├── Assessment Type
    ├── Assessment Status
    ├── Network Type
    ├── Baseline Type
    ├── Baseline Status
    ├── Baseline Milestone
    ├── License Type
    ├── License Status
    ├── Site Status
    ├── Site Type
    ├── Site Workflow Status
    ├── Upgrade Status
    ├── Vendor Status
    ├── SLA Status
    ├── Service Type
    ├── Capability Status
    ├── Disposition
    ├── Library Item Type
    ├── Distribution Status
    ├── Delivery Method
    ├── Media Urgency
    ├── Transfer Status
    ├── Build Status
    ├── Sunset Reason
    ├── Implementation Status
    ├── Requirement Type
    ├── Requirement Status
    ├── Requirement Priority
    ├── Verification Method
    ├── Contract Status
    ├── Disposal Method
    └── Media Type
```

## Multi-Product Prefixing Pattern

The enterprise tier uses two-letter prefixes to isolate product-specific types while sharing common infrastructure:

| Prefix | Product | Example Types |
|--------|---------|---------------|
| CR | OvocoCRM | CR Product, CR Server, CR Deployment Site |
| AN | OvocoAnalytics | AN Product, AN Server, AN Deployment Site |
| SS | Shared Services | SS Product, SS Server, SS License |

Unprefixed types are shared across all products: Organization, Team, Person, Location, Site, SLA, Requirement, and all Lookup Types. This lets each product track its own infrastructure independently while sharing reference data and cross-cutting concerns.


# CI Types

## Product

Software products and applications.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| productType | Text | |
| technology | Text | |
| owner | Reference | Team |
| status | Reference | Product Status |
| companionProducts | Multi-Reference | Product |

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

## SLA

Service level agreements.

| Attribute | Type | Reference |
|-----------|------|-----------|
| description | Text | |
| application | Reference | Product |
| status | Reference | SLA Status |
| targetUptime | Text | |
| responseTime | Text | |
| reviewDate | Date | |

# Lookup Types

## Base Lookups

| Type | Values |
|------|--------|
| Product Status | Active, Planned, Deprecated, Retired |
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

## Enterprise-Only Lookups

The enterprise tier adds lookup types not present in the extended tier:

| Type | Purpose |
|------|---------|
| Baseline Milestone | Milestone associated with baseline (SRR, PDR, CDR, TRR) |
| Build Status | Component build and release status |
| Sunset Reason | Reason a product version was sunsetted |
| Implementation Status | Feature implementation lifecycle status |
| Site Type | Deployment site type classification |
| Site Workflow Status | Deployment site lifecycle workflow states |
| Upgrade Status | Per-site upgrade campaign progress |
| Media Type | Distribution media format classification |
| Service Type | Classification of services |
| Capability Status | Lifecycle status for capabilities |
| Disposition | TIME model application disposition |
| Library Item Type | Classification of library items |
| Distribution Status | Distribution lifecycle status |
| Delivery Method | Media delivery methods |
| Media Urgency | Urgency levels for media requests |
| Transfer Status | Status of media transfers |
| Requirement Type | Classification of requirements |
| Requirement Status | Lifecycle status for requirements |
| Requirement Priority | Priority levels for requirements |
| Verification Method | Methods for verifying requirements |
| Contract Status | Lifecycle status for contracts |
| Disposal Method | Asset disposal methods |
