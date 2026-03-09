# Enterprise Schema

The enterprise schema models a multi-product portfolio. It uses product-prefixed CI types so each product's infrastructure, releases, and deployments are tracked independently while sharing directory data, lookup types, and cross-product library records.

## When to Use

Use the enterprise schema when your organization:

- Develops or operates more than one product
- Needs product-scoped queries ("show me all CR Servers in Production") without cross-product noise
- Tracks deployment sites where different products may be at different versions
- Requires enterprise architecture modeling (services, capabilities, business processes)
- Needs financial tracking (contracts, TBM cost categories)
- Manages a configuration library of controlled software artifacts
- Traces requirements to product versions with verification methods

## How It Differs from Base and Extended

Base and extended use generic type names (Product, Server, Database). Enterprise prefixes CI types per product line:

- **CR** (OvocoCRM) - CR Product, CR Server, CR Feature, CR Deployment Site, etc.
- **AN** (OvocoAnalytics) - AN Product, AN Server, AN Feature, AN Deployment Site, etc.
- **SS** (Shared Services) - SS Product, SS Server, SS Document, etc.

Directory types (Organization, Team, Person, Location, Facility, Vendor) and Lookup Types are shared across all products.

Enterprise also adds branches that base and extended do not have:

- **Enterprise Architecture** - Service, Capability, Business Process, Information Object
- **Configuration Library** - Library Item (controlled software artifacts with checksums)
- **Financial** - Contract, Cost Category (TBM taxonomy)

## Structure

```
Ovoco Portfolio CMDB (root)
├── OvocoCRM CMDB
│   ├── CR Feature, CR Feature Implementation
│   ├── CR Product, CR Product Component, CR Component Instance
│   ├── CR Server, CR Virtual Machine, CR Hardware Model
│   ├── CR Network Segment, CR Assessment, CR License
│
├── OvocoAnalytics CMDB
│   ├── AN Feature, AN Feature Implementation
│   ├── AN Product, AN Product Component, AN Component Instance
│   ├── AN Server, AN Hardware Model, AN Network Segment
│   ├── AN Assessment, AN License
│
├── Shared Services CMDB
│   ├── SS Product, SS Server, SS Virtual Machine
│   ├── SS Network Segment, SS Hardware Model
│   ├── SS Document, SS Certification, SS Assessment, SS License
│
├── Ovoco Library
│   ├── Site (shared across products)
│   ├── OvocoCRM Library
│   │   ├── CR Product Version, CR Baseline, CR Document
│   │   ├── CR Documentation Suite, CR Product Media, CR Product Suite
│   │   ├── CR Certification, CR Deployment Site
│   │   ├── CR Site Location/Org/Personnel Assignments
│   │   └── CR Distribution Log
│   ├── OvocoAnalytics Library (mirrors CR Library with AN prefix)
│   └── Shared Library
│       ├── SLA, Requirement
│
├── Enterprise Architecture
│   ├── Service, Capability, Business Process, Information Object
│
├── Configuration Library
│   └── Library Item
│
├── Financial
│   ├── Contract, Cost Category
│
├── Directory
│   ├── Organization, Team, Person, Location, Facility, Vendor
│
└── Lookup Types
```

## Key Patterns

**Product prefixing.** Each product gets its own CI types. This enables AQL queries scoped to a single product and prevents cross-product data collision. When adapting this schema, replace the CR/AN/SS prefixes with your own product abbreviations.

**Site vs Deployment Site.** A Site record represents a customer location shared across products. Each product has its own Deployment Site type (CR Deployment Site, AN Deployment Site) to track product-specific deployment details at that location, because different products at the same site may be at different versions with different support teams.

**Feature Implementation.** An immutable audit record linking a Feature to a Product Version. Once a feature is marked as implemented in a release, the record is frozen. This provides an auditable trail of what was delivered in each release.

**Component Instance.** Represents a built and released artifact with checksums, distinct from Product Component which represents the logical component definition. This separation tracks "what it is" vs "what was built."

**Shared Library.** SLAs and Requirements are shared across products rather than prefixed, because these records often span multiple products.

## Adapting for Your Organization

1. Replace OvocoCRM and OvocoAnalytics with your product names
2. Choose product prefixes (2-3 characters each)
3. Add or remove product branches as needed
4. Adjust Shared Services types to match your internal tooling
5. Populate Cost Category with your TBM taxonomy towers
6. Run validation: `node tools/validate.js --schema schema/enterprise`

## Validation

```bash
node tools/validate.js --schema schema/enterprise
```
