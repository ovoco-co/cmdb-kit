# Enterprise Architecture

Enterprise architecture and configuration management serve the same fundamental goal: understanding what your organization has, how it fits together, and how it changes over time. EA frameworks like the Unified Architecture Framework (UAF) provide viewpoints for thinking about an organization's capabilities, services, personnel, and resources. CMDB-Kit's schema provides types for tracking the same things as structured CI records. This section maps between the two disciplines, showing how a well-populated CMDB doubles as a living enterprise architecture repository.


# What Enterprise Architecture Means for the CMDB

## The UAF as an EA Template for the CMDB

The Unified Architecture Framework (UAF), which evolved from the Department of Defense Architecture Framework (DoDAF), organizes enterprise architecture into viewpoints. Each viewpoint asks a different question about the enterprise:

- Capability viewpoint: what can we do?
- Operational viewpoint: how do we do it?
- Services viewpoint: what services do we provide?
- Personnel viewpoint: who does the work?
- Resources viewpoint: what infrastructure supports the work?
- Projects viewpoint: what are we building or changing?
- Standards viewpoint: what rules do we follow?

These are not separate systems. They are different lenses on the same organization. A CMDB that tracks applications, servers, teams, versions, and deployments already holds data that answers many of these questions. The EA framework provides a way to organize and present that data for architectural decision-making.

## UAF Viewpoints and How They Map to Configuration Management

Configuration management tracks the same artifacts that EA viewpoints describe, but with a different emphasis. EA asks "what is our architecture?" CM asks "what is our configuration and how is it changing?"

The overlap is substantial:

| EA Concern | CM Concern | Shared Data |
|-----------|-----------|-------------|
| What capabilities do we have? | What applications and services are deployed? | Product records with status |
| What services do we provide? | What CIs support those services? | Product-to-component relationships |
| Who does the work? | Who owns which CIs? | Person, Team, Organization records |
| What infrastructure supports us? | What servers, databases, networks exist? | Server, Database, Network Segment records |
| What are we building? | What versions are in development? | Product Version records with Beta status |
| What standards apply? | What lookup values constrain our data? | Lookup types as controlled vocabularies |

## The CMDB as the Single Source of Truth for EA Artifacts

Many organizations maintain EA artifacts in dedicated tools (Sparx EA, Cameo Systems Modeler, ArchiMate tools) that are disconnected from operational reality. The architecture diagram says the system has three microservices, but the CMDB shows five. The capability map says the organization can process 10,000 transactions per second, but the actual infrastructure supports half that.

Using the CMDB as the source for EA views eliminates this drift. The architecture is not a diagram someone drew last year. It is the live state of the CI records, queried and presented through an EA lens. When someone adds a new Product record, the architecture view updates automatically.

This does not mean the CMDB replaces all EA tools. Complex architectural modeling (behavioral simulations, what-if scenarios, strategic roadmapping) may still need specialized tools. But those tools should consume CMDB data as input rather than maintaining a separate inventory.


# UAF Grid and CMDB-Kit Branches

## Personnel Viewpoint to Directory Branch

The UAF Personnel viewpoint describes who does the work: organizations, teams, individuals, their roles and qualifications. CMDB-Kit's Directory branch maps directly:

| UAF Personnel Concept | CMDB-Kit Type |
|----------------------|---------------|
| Organization | Organization |
| Organizational Unit | Team |
| Person/Performer | Person |
| Physical Location | Location |
| Facility | Facility |
| Supplier | Vendor |

The Directory branch answers the personnel viewpoint's questions: who are the organizations involved, what teams exist, who works on what, where are they located, and who are our vendors?

## Resources Viewpoint to Product CMDB Branch

The UAF Resources viewpoint describes physical and logical resources that support operations. CMDB-Kit's Product CMDB branch maps to this:

| UAF Resources Concept | CMDB-Kit Type |
|----------------------|---------------|
| Software Resource | Product |
| Computing Resource | Server, Virtual Machine |
| Data Store | Database |
| Network Resource | Network Segment |
| Hardware Resource | Hardware Model |
| Software Component | Product Component |

The Product CMDB branch answers the resources viewpoint's questions: what applications exist, what servers host them, what databases store their data, what networks connect them, and what hardware runs underneath?

## Services Viewpoint and Service Modeling

The UAF Services viewpoint describes what the organization delivers: business services and the technical services that support them. The portfolio mode schema includes a Service type under the Enterprise Architecture branch, with attributes for `serviceType` (referencing Service Type), `owner` (referencing Team), `status` (referencing Product Status), and `capability` (referencing Capability). This enables explicit modeling of business services, technical services, and shared services.

In the OvocoCRM example data, four Service records exist: "Customer Relationship Management" (a business service owned by CRM Platform Team, linked to the Customer Management capability), "CRM Platform Hosting" (a technical service owned by Infrastructure Team), "Analytics and Reporting" (a business service owned by Analytics Platform Team), and "Notification Delivery" (a shared service owned by Infrastructure Team).

## Projects Viewpoint and Release Management

The UAF Projects viewpoint describes what is being built or changed. CMDB-Kit's Product Library branch maps to this:

| UAF Projects Concept | CMDB-Kit Type |
|---------------------|---------------|
| Project Deliverable | Product Version |
| Project Milestone | Baseline |
| Release Package | Product Suite |
| Change Initiative | Change Request |

The Product Library answers the projects viewpoint's questions: what versions are in development, what baselines have been approved, what releases are scheduled, and what changes are in flight?

## Standards Viewpoint and Lookup Types

The UAF Standards viewpoint describes the rules, constraints, and reference data that govern the enterprise. CMDB-Kit's Lookup Types branch maps directly: every status value, every type classification, every severity level is a standard that constrains how CI records are categorized.

Lookup types are the enterprise's controlled vocabulary. When the Product Status lookup contains "Active, Planned, Deprecated, Retired," those four values are the standard lifecycle states that every product must use. This is exactly what the standards viewpoint documents.


# Mapping UAF Domains to CMDB-Kit Types

## Strategic Domain: Capabilities and Services

The strategic domain describes what the organization can do (capabilities) and what it offers (services). The portfolio mode schema includes both Capability and Service types under the Enterprise Architecture branch.

A capability like "Customer Management" is a Capability CI owned by Ovoco Inc. The "Customer Relationship Management" Service references that capability, and it is owned by CRM Platform Team under Ovoco Engineering. Sub-capabilities like "Lead Tracking" and "Account Management" use the `parentCapability` self-reference to build a capability hierarchy. The Capability Status lookup tracks each capability's lifecycle.

## Operational Domain: Processes and Activities

The operational domain describes how work gets done. In CMDB-Kit, operational processes are represented through the Change Request and Incident types (for operational workflows) and through the Deployment type (for release processes).

The operational domain also encompasses the CM processes themselves: identification, control, status accounting, verification, and audit. These processes operate on the CMDB data rather than being stored in it.

## Services Domain: Applications, Components, and Infrastructure

The services domain is where CMDB-Kit has the deepest coverage. The Product, Product Component, Server, Database, Virtual Machine, and Network Segment types directly model the technical services domain.

A complete services view for OvocoCRM traces from the service through the product to its components and infrastructure:

```
Service: Customer Relationship Management (Business Service)
  └── CR Product: CR Core Platform (Active)
        ├── CR Product Component (via product ref)
        ├── CR Product: CR API Gateway (Service)
        ├── CR Product: CR Search Service (Service)
        └── CR Product: CR Authentication Module (Module)
```

Each product has a `productType` classification. CR API Gateway is typed as "Service," while CR Core Platform is typed as "Platform." This classification maps directly to the services domain's distinction between service interfaces and service implementations.

## Personnel Domain: Organizations, Teams, and Persons

The personnel domain maps one-to-one with the Directory branch. Organizations contain Teams. Teams contain Persons. Persons are assigned to Deployment Sites through personnel assignments. Vendors are external organizations that supply products and services.

The OvocoCRM example includes Ovoco Inc (the company) with two divisions (Ovoco Engineering and Ovoco Operations), six teams (CRM Platform Team, Analytics Platform Team, CRM Operations, Analytics Operations, Infrastructure Team, Release Engineering), and individuals on each team including Sarah Chen, Michael Torres, David Park, Emily Rodriguez, James Wilson, Lisa Kim, Alex Chen, Casey Morgan, Morgan Blake, Sam Rivera, and Avery Nguyen.

## Resources Domain: Servers, Databases, Networks, and Hardware

The resources domain maps to the infrastructure types in the Product CMDB branch. Each resource type carries environment and status attributes that describe its current state:

- Servers with operating system, CPU, RAM, storage, and environment
- Databases with engine, version, storage size, and environment
- Virtual Machines with hypervisor, CPU, RAM, and environment
- Network Segments with network type, CIDR, VLAN, and gateway
- Hardware Models with manufacturer, model number, and form factor


# Service Modeling

## Defining Business Services and Technical Services

A business service is something the organization delivers to customers or internal users: "Customer Relationship Management," "Analytics and Reporting," "Notification Delivery." A technical service is the technology that implements it: "CRM Platform Hosting," a hosting service providing compute, storage, and networking for CRM workloads.

The portfolio mode schema includes a Service type under the Enterprise Architecture branch. Each Service record has a `serviceType` reference (to the Service Type lookup, with values like "Business Service," "Technical Service," and "Shared Service"), an `owner` reference to Team, a `status` reference to Product Status, and a `capability` reference to Capability.

In the OvocoCRM example data, four services model both layers: "Customer Relationship Management" is a business service owned by CRM Platform Team, "CRM Platform Hosting" is a technical service owned by Infrastructure Team, "Analytics and Reporting" is a business service owned by Analytics Platform Team, and "Notification Delivery" is a shared service owned by Infrastructure Team.

## Mapping Services to Applications, Components, and Infrastructure

The service model is a chain of references from business intent to physical infrastructure:

```
Service: "Customer Relationship Management" (Business Service)
  └── Capability: "Customer Management"
        ├── Sub-capability: "Lead Tracking"
        └── Sub-capability: "Account Management"

CR Product: "CR Core Platform" (Active)
  ├── CR Product: "CR API Gateway" (Service)
  ├── CR Product: "CR Search Service" (Service)
  └── CR Product: "CR Authentication Module" (Module)
      └── CR Server: (via siteLocation and location refs)
```

Each level answers a different question. The Service level answers "what do we deliver?" The Capability level answers "what business ability does it support?" The Product level answers "what software delivers it?" The infrastructure level answers "what hardware and network supports it?"

## Service Dependencies and Impact Chains

When a server goes down, which services are affected? Impact chains answer this by tracing from infrastructure upward through components to applications to services.

If a CR Server fails, the impact chain runs: the server is at a CR Deployment Site, which references CR Product Version and CR Product, which is part of the "Customer Relationship Management" service linked to the "Customer Management" capability. The business impact: CRM is down.

These chains are built from the reference fields already in the portfolio mode schema. The Service type's `capability` attribute links to a Capability. The CR Product type's `parentProduct` attribute builds the product hierarchy. CR Server's `siteLocation` attribute links to a CR Deployment Site, which references the product version.

## Using References to Build the Service Model

CMDB-Kit's reference system (type 1 attributes in schema-attributes.json) is the mechanism for building service models. Each reference creates a link in the dependency chain. The portfolio mode schema already defines the Service type with references that build the service model:

```json
"Service": {
  "serviceType": { "type": 1, "referenceType": "Service Type" },
  "owner": { "type": 1, "referenceType": "Team" },
  "status": { "type": 1, "referenceType": "Product Status" },
  "capability": { "type": 1, "referenceType": "Capability" }
}
```

The Capability type supports hierarchical decomposition through its self-reference:

```json
"Capability": {
  "status": { "type": 1, "referenceType": "Capability Status" },
  "parentCapability": { "type": 1, "referenceType": "Capability" },
  "owner": { "type": 1, "referenceType": "Organization" }
}
```

Each reference is navigable in both directions through AQL HAVING queries, enabling both "what capabilities support this service?" and "what services depend on this capability?"


# Capability Mapping

## What a Business Capability Is in UAF Terms

A business capability is something the organization can do, independent of how it does it. "Customer Relationship Management" is a capability. "OvocoCRM running on AWS" is an implementation of that capability. Capabilities are stable over time (you always need to manage customer relationships), even as the implementations change (you might switch from OvocoCRM to a different product).

In UAF terms, capabilities decompose hierarchically. The portfolio mode schema supports this through the Capability type's `parentCapability` self-reference. In the OvocoCRM example data:

```
Enterprise Capabilities
├── Customer Management (Active, owner: Ovoco Inc)
│   ├── Lead Tracking (Active)
│   └── Account Management (Active)
├── Platform Operations (Active, owner: Ovoco Operations)
├── Business Intelligence (Active, owner: Ovoco Inc)
├── Customer Communication (Active, owner: Ovoco Inc)
└── EU Data Residency (Planned, owner: Ovoco Inc)
```

## Linking Capabilities to Applications and Teams

Each capability is owned by an Organization and linked to services. The "Customer Management" capability is owned by Ovoco Inc and linked to the "Customer Relationship Management" service (through the Service type's `capability` reference). The "Platform Operations" capability is owned by Ovoco Operations and linked to the "CRM Platform Hosting" service.

In the CMDB, Capability records reference Organizations as owners. Service records reference Capabilities through their `capability` attribute. If a capability has no service referencing it, that represents a gap. If multiple services reference the same capability, it may represent redundancy worth rationalizing.

## When to Use the Capability Type

The portfolio mode schema already includes a Capability type with attributes for `status` (referencing Capability Status), `parentCapability` (self-reference for hierarchy), and `owner` (referencing Organization). Use the Capability type when your organization needs to:

- Maintain a formal capability map for strategic planning
- Identify capability gaps (capabilities with no service referencing them)
- Identify capability redundancy (capabilities referenced by multiple services)
- Report on capability coverage across the portfolio
- Track planned capabilities like "EU Data Residency" that are not yet implemented

## Keeping Capability Maps Aligned With the CMDB

Capability maps drift when they are maintained separately from operational data. A capability map drawn in a presentation might show ten capabilities, but the CMDB shows that two of the implementing applications have been retired.

When capabilities live as CI records in the CMDB, alignment is automatic. The capability record's product references point to live Product records. If a product is retired, the capability's implementation list visibly shrinks.


# Product Portfolio Management

## Using Product Status for Lifecycle Planning

The Product Status lookup (Active, Planned, Deprecated, Retired) is the foundation of portfolio management. A query showing all products by status gives you the portfolio at a glance:

- Active: products currently in production
- Planned: products approved but not yet built
- Deprecated: products being phased out
- Retired: products that have been decommissioned

This four-state lifecycle is a simplified portfolio view. For more detailed lifecycle planning, you can add attributes or custom lookup values.

## TIME Classification (Tolerate, Invest, Migrate, Eliminate)

The Gartner TIME model classifies applications by their strategic disposition:

- Tolerate: the application works but receives minimal investment
- Invest: the application is strategic and receives active development
- Migrate: the application needs to be replaced, migration is planned
- Eliminate: the application should be retired as soon as possible

Adding a "Disposition" attribute to the Product type (referencing a custom "Product Disposition" lookup with these four values) enables TIME-based portfolio reporting. Combined with Product Status, you get a two-dimensional view: an "Active" product with disposition "Eliminate" needs retirement planning. A "Planned" product with disposition "Invest" is a strategic new build.

## Technology Radar: Tracking Technology Choices Across Applications

Applications use technologies: programming languages, frameworks, databases, cloud services. Tracking these technology choices across the portfolio reveals patterns:

- Which technologies are widely adopted (mainstream)
- Which are being trialed (emerging)
- Which are being phased out (sunset)

CMDB-Kit does not have a Technology type in the Core schema, but you can track technology choices through Product Component types (each component has a Component Type) and through text attributes on Product or Server records (e.g., "operatingSystem," "databaseEngine").

For formal technology radar management, add a Technology type with attributes for name, category, status (Adopt, Trial, Assess, Hold), and references to the applications that use it.

## Vendor and License Data as Portfolio Inputs

The Vendor and License types provide financial and contractual context for portfolio decisions:

- Vendor records show supplier relationships and their status (Active, Under Review, Inactive, Terminated)
- License records show licensing models (Per Seat, Per Core, Enterprise, Open Source, SaaS Subscription) with expiration dates

A product portfolio review combines Product records (what exists), License records (what it costs), and Vendor records (who supplies it). A product with an expiring license from a terminated vendor is a high-priority migration candidate.


# Integration Patterns

## The CMDB as EA Repository vs Feeding a Separate EA Tool

Two integration approaches:

CMDB as EA repository. The CMDB holds all EA data. Capabilities, services, and applications are CI types. EA views are generated from CMDB queries. This approach maximizes data accuracy (one source of truth) but may lack the modeling sophistication of dedicated EA tools.

CMDB feeds EA tool. The CMDB holds operational data (applications, servers, components, deployments). A dedicated EA tool imports this data and adds strategic layers (capabilities, business processes, technology roadmaps). This approach gives architects their preferred tools while keeping operational data grounded in reality.

For most organizations using CMDB-Kit, the first approach is simpler and sufficient. Add a few EA-specific types to the schema and generate architectural views from CMDB queries. Reserve the second approach for large enterprises with established EA practices and dedicated architecture teams.

## Export Workflows for UAF-compliant Tools

If your organization uses a UAF-compliant modeling tool (Cameo Systems Modeler, Sparx EA), you can export CMDB data as input. The export workflow:

1. Query the CMDB for the relevant CI types (applications, components, servers, teams)
2. Transform the data into the EA tool's import format (CSV, XML, or API)
3. Import into the EA tool, mapping CI types to UAF elements
4. Maintain the sync on a schedule (weekly or monthly)

CMDB-Kit's `tools/` directory provides export capabilities through the JSM adapter's export script. Custom export scripts can be built for other EA tool formats using the same JSON data files as a source.

## Keeping EA Views in Sync With Operational Reality

The biggest risk in EA is stale data. Architecture diagrams that do not match the deployed reality are worse than no diagrams at all because they create false confidence.

Three practices keep EA views current:

Automated feeds. Export CMDB data to the EA tool on a schedule. Stale data has a maximum age equal to the sync interval.

Change triggers. When significant CI changes occur (new application, retired server, new deployment site), notify the architecture team to update their models.

Periodic reconciliation. Quarterly, compare the EA model to the CMDB. Any discrepancy is either a CMDB gap (operational data not captured) or an EA gap (model not updated).


# Extending the Schema for EA

## Adding Custom Types for UAF Artifacts (Capability, Business Process, Information Object)

To fully support EA in the CMDB, consider adding these types:

A Capability type:

```json
"Capability": {
  "description": { "type": 0 },
  "parentCapability": { "type": 1, "referenceType": "Capability" },
  "owner": { "type": 1, "referenceType": "Organization" },
  "status": { "type": 1, "referenceType": "Capability Status" }
}
```

A Business Process type:

```json
"Business Process": {
  "description": { "type": 0 },
  "capabilities": { "type": 1, "referenceType": "Capability", "max": -1 },
  "owner": { "type": 1, "referenceType": "Team" },
  "products": { "type": 1, "referenceType": "Product", "max": -1 }
}
```

An Information Object type:

```json
"Information Object": {
  "description": { "type": 0 },
  "producer": { "type": 1, "referenceType": "Product" },
  "consumers": { "type": 1, "referenceType": "Product", "max": -1 },
  "dataClassification": { "type": 0 }
}
```

Each type follows CMDB-Kit's standard patterns: camelCase attributes, reference types pointing to existing types, placement in the schema hierarchy. Add them under a new "Enterprise Architecture" parent in schema-structure.json, add their attributes to schema-attributes.json, add them to LOAD_PRIORITY (after the types they reference), create data files, and validate.

## Adding EA-specific Attributes to Existing Types

Sometimes a new type is overkill. Adding attributes to existing types can capture EA data without new types:

On Product: add `businessCapability` (text), `disposition` (reference to a custom lookup), `strategicValue` (text: High/Medium/Low).

On Product Component: add `technologyStack` (text describing the implementation technology).

On Organization: add `functionalDomain` (text describing the organization's EA domain).

These lightweight extensions keep the schema simple while enabling EA queries: "show me all applications with disposition Eliminate" or "show me all components using Python."

## How EA Frameworks Drive Schema Design

Three frameworks converge on the same principle: the CMDB schema is derived from what the organization needs to manage, not from what a platform vendor provides as a default.

**Capability mapping** starts with business capabilities. A capability map defines what the organization does, organized into domains (product realization, customer management, supply chain, workforce). Each capability is assigned to a responsible function, and that function identifies the CIs it needs to track. Market-differentiating capabilities get richer CI tracking with more attributes and deeper relationships. The capability map generates requirements for CI types from the top down.

**YaSM** (Yet another Service Management Model) starts with services. Every CI must support at least one service, and every service must have an owner. The dependency chain runs from business services through technical services to application and infrastructure CIs. YaSM adds attributes that many schemas miss: related service definition, compliance status, security classification, recovery time objectives, and supplier portfolio links.

**APQC PCF** (Process Classification Framework) starts with business processes. It places configuration management under process 8.7.7.1 (Manage Infrastructure Configuration) and reveals which adjacent processes consume CI data: change management (8.6.3) needs relationships and impact paths, compliance (8.3.6) needs assessment dates, asset management (8.7.7.4) needs purchase dates and license counts, and service delivery (8.7.6) needs service-to-infrastructure mappings.

The three approaches converge:

| Framework | Starting Question | Drives |
|-----------|-------------------|--------|
| Capability Mapping | What business capabilities do we execute? | Which CI types exist and how detailed they are |
| YaSM | What services do we deliver and how? | How CIs relate to services and how processes maintain them |
| APQC PCF | What business processes depend on configuration data? | Which attributes and relationships each CI type needs |

The practical design sequence that emerges from this convergence:

- Map business capabilities or list services to determine CI scope
- Identify which processes consume CI data to determine attributes and relationships
- Classify strategic importance to determine depth of tracking
- Implement governance to control schema evolution

For organizations without a formal capability map or service portfolio, the same logic applies at a smaller scale: ask stakeholders what they need to manage, ask process owners what data they need, and build CI types to answer those questions. The capability mapping approach in the previous section shows how this scales to enterprise.

## Balancing EA Detail With Operational Simplicity

The temptation with EA is to model everything: capabilities, processes, information flows, technology standards, strategic initiatives, risk assessments. Each additional type adds schema complexity, data maintenance burden, and potential for stale data.

Start with what you can maintain. If your organization has one person managing the CMDB part-time, adding five EA types creates five types worth of data that will go stale. Start with Product portfolio management (no new types needed, just use Product Status and a disposition attribute). Add Capability only when someone is actively maintaining a capability map. Add Business Process only when process data drives real decisions.

The best EA in a CMDB is the one that stays current. A simple model with accurate data beats a comprehensive model with stale data every time.
