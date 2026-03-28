# Domains

## What Is a Domain

A domain is an opt-in schema package for a specialized team. It adds types that reference Core types, but Core never references domain types. Domains can reference other domains only when explicitly declared. You install only the domains your team needs.

Each domain ships as a directory under `schema/domains/` containing its own `schema-structure.json`, `schema-attributes.json`, and `data/` folder. Domain types slot into Core's existing container hierarchy (Product CMDB, Product Library, Directory, Lookup Types), so they appear alongside Core types in your platform rather than in a separate branch.

The rule is one-directional: Core stands alone. If you remove a domain, Core still validates and imports cleanly. If you add a domain, it extends Core without modifying any Core files.

## Available Domains

| Domain | Team | What It Adds | Replaces |
|--------|------|-------------|----------|
| Infrastructure | SRE, Platform Ops | Hardware models, VMs, network segments, locations, facilities | ServiceNow Discovery schema |
| Compliance | Security, Accreditation | Assessments, certifications with type and status tracking | ServiceNow GRC, Atlassian compliance plugins |
| Distribution | CM Library, Media | Media packages, distribution logs, documentation suites | No commercial equivalent (unique to CMDB-Kit) |
| Licensing | Procurement, Finance | Licenses, vendors, SLAs with type and status tracking | ServiceNow SAM, Flexera, Snow License Manager |

### Infrastructure

The Infrastructure domain is for teams that need to track the physical and virtual infrastructure supporting deployments. It adds Hardware Model (approved server configurations and instance types), Virtual Machine (VMs and containers running on servers), Network Segment (network zones with CIDR, VLAN, and gateway details), Location (offices and data centers), and Facility (server rooms and secure areas within locations). Hardware Model, Network Segment, and Virtual Machine land under Product CMDB. Location and Facility land under Directory. The domain also adds a Network Type lookup. Infrastructure references Core's Server type (Virtual Machine runs on a Server) and Environment Type lookup (Virtual Machine has an environment classification).

### Compliance

The Compliance domain is for security teams and accreditation staff tracking assessments and certifications against products and versions. It adds Assessment (with assessor, assessment date, findings, and status) and Certification (with issuing body, issue date, expiration date, and status). Assessment lands under Product CMDB. Certification lands under Product Library. The domain adds four lookup types: Assessment Type, Assessment Status, Certification Type, and Certification Status. Compliance references Core's Person type for the assessor field on Assessment records.

### Distribution

The Distribution domain is for CM librarians and media custodians tracking what was shipped where. It adds Distribution Log (chain of custody for media shipments, tracking who distributed what version to which site and when), Product Media (individual downloadable artifacts with file names, sizes, and checksums), Product Suite (bundled release packages referencing multiple Product Media records), and Documentation Suite (versioned document collections referencing multiple Documents). All four types land under Product Library. Distribution references Core's Product Version, Deployment Site, Person, Document, and Document State types. This capability has no commercial plugin equivalent. Teams managing media distribution and chain of custody typically build custom workflows in their ITSM tool or track shipments in spreadsheets.

### Licensing

The Licensing domain is for procurement and finance teams tracking software licenses, vendor relationships, and service level agreements. It adds License (with license type, vendor, expiration, quantity, and status), Vendor (third-party suppliers with website, contact email, contract expiry, and status), and SLA (service level agreements with target uptime, response time, and review date). License lands under Product CMDB. SLA lands under Product Library. Vendor lands under Directory. The domain adds four lookup types: License Type, License Status, Vendor Status, and SLA Status. Licensing references Core's Product type (SLA tracks service levels for a product) and Organization type is available through the Vendor's directory placement.

## Which Domains Do I Need?

Start with Core. It answers the product delivery questions on its own: what products exist, what versions shipped, where they are deployed, who owns them, and what baselines are approved. Add domains when a specific team needs answers that Core does not provide.

If your SRE team wants to track hardware models, virtual machines, and network topology alongside servers, add the Infrastructure domain. Infrastructure gives you the types to model what runs where at the physical and network layer.

If your security team needs to record assessments and track certifications against products, add the Compliance domain. Compliance gives you structured tracking for assessors, findings, and certification expiration dates.

If your CM team manages media distribution with chain of custody requirements, add the Distribution domain. Distribution gives you the types to track what artifacts were bundled, what documents were versioned together, and who shipped what media to which site.

If your procurement team tracks software licenses and vendor contracts, add the Licensing domain. Licensing gives you the types to record license quantities, expiration dates, vendor relationships, and SLA commitments.

You can combine domains freely. A team running Core plus Infrastructure and Compliance gets product tracking, hardware modeling, and security assessment in one schema. The validator confirms that all cross-domain references resolve before you import.

## Domains That Don't Exist Yet

The domain definitions document identifies four additional domains planned but not yet implemented.

**Requirements** would serve systems engineering teams, adding types for requirements tracking, traceability matrices, and verification records. Requirements would reference Core's Product, Product Version, and Product Component types.

**Personnel** would serve security and HR teams, adding types for clearance tracking, training records, and facility access. Personnel would reference Core's Person and Organization types.

**Asset Lifecycle** would serve operations teams managing retirement and disposal, adding types for asset disposition, disposal records, and sunset tracking. Asset Lifecycle would reference Core's Product, Server, and Deployment Site types.

**Change Control** would formalize documentation patterns for configuration control boards, adding structured workflows around Core's existing Baseline and Document types. Change Control is a documentation pattern domain, not a new-types domain. It would define templates and status flows rather than new object types.

These domains will be built when the community identifies teams that need them. If your team needs one of these, open an issue describing your use case and the types you would expect.
