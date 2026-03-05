# Enterprise Architecture

Enterprise architecture and configuration management serve the same fundamental goal: understanding what your organization has, how it fits together, and how it changes over time. EA frameworks like the Unified Architecture Framework (UAF) provide viewpoints for thinking about an organization's capabilities, services, personnel, and resources. CMDB-Kit's schema provides types for tracking the same things as structured CI records. This chapter maps between the two disciplines, showing how a well-populated CMDB doubles as a living enterprise architecture repository.


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
| What capabilities do we have? | What applications and services are deployed? | Application records with status |
| What services do we provide? | What CIs support those services? | Application-to-component relationships |
| Who does the work? | Who owns which CIs? | Person, Team, Organization records |
| What infrastructure supports us? | What servers, databases, networks exist? | Server, Database, Network Segment records |
| What are we building? | What versions are in development? | Product Version records with Beta status |
| What standards apply? | What lookup values constrain our data? | Lookup types as controlled vocabularies |

## The CMDB as the Single Source of Truth for EA Artifacts

Many organizations maintain EA artifacts in dedicated tools (Sparx EA, Cameo Systems Modeler, ArchiMate tools) that are disconnected from operational reality. The architecture diagram says the system has three microservices, but the CMDB shows five. The capability map says the organization can process 10,000 transactions per second, but the actual infrastructure supports half that.

Using the CMDB as the source for EA views eliminates this drift. The architecture is not a diagram someone drew last year. It is the live state of the CI records, queried and presented through an EA lens. When someone adds a new Application record, the architecture view updates automatically.

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
| Software Resource | Application |
| Computing Resource | Server, Virtual Machine |
| Data Store | Database |
| Network Resource | Network Segment |
| Hardware Resource | Hardware Model |
| Software Component | Product Component |

The Product CMDB branch answers the resources viewpoint's questions: what applications exist, what servers host them, what databases store their data, what networks connect them, and what hardware runs underneath?

## Services Viewpoint and Service Modeling

The UAF Services viewpoint describes what the organization delivers: business services and the technical services that support them. CMDB-Kit does not have a dedicated Service type in the base schema, but the Application type with its relationships serves as a foundation.

An Application record with status "Active" and references to its components, servers, and databases describes a technical service. The missing piece is the explicit link between a business service ("customer relationship management") and the technical services that deliver it ("CRM web application, CRM API, CRM database cluster").

Adding a Service type to the schema (covered later in this chapter) bridges this gap.

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

Lookup types are the enterprise's controlled vocabulary. When the Application Status lookup contains "Active, Planned, Deprecated, Retired," those four values are the standard lifecycle states that every application must use. This is exactly what the standards viewpoint documents.


# Mapping UAF Domains to CMDB-Kit Types

## Strategic Domain: Capabilities and Services

The strategic domain describes what the organization can do (capabilities) and what it offers (services). CMDB-Kit does not have Capability or Service types in the base schema, but the Application type combined with Organization and Team records provides the raw data.

A capability like "Customer Relationship Management" is delivered by the OvocoCRM application, which is owned by the CRM Team, which belongs to the Product Engineering department. The capability is implicit in the relationships between these existing types.

For organizations that need explicit capability tracking, adding a Capability type is straightforward (covered in the Extending the Schema section below).

## Operational Domain: Processes and Activities

The operational domain describes how work gets done. In CMDB-Kit, operational processes are represented through the Change Request and Incident types (for operational workflows) and through the Deployment type (for release processes).

The operational domain also encompasses the CM processes themselves: identification, control, status accounting, verification, and audit. These processes operate on the CMDB data rather than being stored in it.

## Services Domain: Applications, Components, and Infrastructure

The services domain is where CMDB-Kit has the deepest coverage. The Application, Product Component, Server, Database, Virtual Machine, and Network Segment types directly model the technical services domain.

A complete services view for OvocoCRM traces from the application through its components to the infrastructure:

```
Application: OvocoCRM (Active)
  ├── Product Component: Contact Manager (Service)
  ├── Product Component: Deal Pipeline (Service)
  ├── Product Component: Email Integration (Service)
  ├── Product Component: REST API (Gateway)
  ├── Product Component: Webhook Service (Service)
  └── Product Component: Report Generator (Service)
```

Each component has a Component Type classification. The REST API is typed as "Gateway," while the Contact Manager is typed as "Service." This classification maps directly to the services domain's distinction between service interfaces and service implementations.

## Personnel Domain: Organizations, Teams, and Persons

The personnel domain maps one-to-one with the Directory branch. Organizations contain Teams. Teams contain Persons. Persons are assigned to Deployment Sites through personnel assignments. Vendors are external organizations that supply products and services.

The OvocoCRM example includes Ovoco Inc (the company), multiple teams (Platform Engineering, Frontend, Backend, DevOps, QA, Security, Support), and individuals on each team.

## Resources Domain: Servers, Databases, Networks, and Hardware

The resources domain maps to the infrastructure types in the Product CMDB branch. Each resource type carries environment and status attributes that describe its current state:

- Servers with operating system, CPU, RAM, storage, and environment
- Databases with engine, version, storage size, and environment
- Virtual Machines with hypervisor, CPU, RAM, and environment
- Network Segments with network type, CIDR, VLAN, and gateway
- Hardware Models with manufacturer, model number, and form factor


# Service Modeling

## Defining Business Services and Technical Services

A business service is something the organization delivers to customers or internal users: "Customer Relationship Management," "Analytics and Reporting," "User Authentication." A technical service is the technology that implements it: "CRM Web Application," "Analytics Data Pipeline," "OAuth2 Authentication Service."

In CMDB-Kit, Application records represent technical services. The Application's description, components, and status tell you what the service is and whether it is running. What the base schema does not capture is the business service layer: the business-language name for what the application delivers.

To model both layers, you have two options:

Option 1: Use Application descriptions to capture the business service name. The Application "OvocoCRM" has a description "Customer relationship management platform." This is lightweight and requires no schema changes.

Option 2: Add a Service type that sits above Application. A Service record named "Customer Relationship Management" references one or more Application records that implement it. This is more formal and enables business service catalogs.

## Mapping Services to Applications, Components, and Infrastructure

The service model is a chain of references from business intent to physical infrastructure:

```
Service: "Customer Relationship Management"
  └── Application: "OvocoCRM"
        ├── Component: "Contact Manager" (Service)
        │     └── Server: "crm-app-01" (Production)
        ├── Component: "REST API" (Gateway)
        │     └── Server: "crm-api-01" (Production)
        └── Component: "Deal Pipeline" (Service)
              └── Database: "crm-db-primary" (Production)
```

Each level answers a different question. The Service level answers "what do we deliver?" The Application level answers "what application delivers it?" The Component level answers "what parts make it work?" The infrastructure level answers "what hardware and network supports it?"

## Service Dependencies and Impact Chains

When a server goes down, which services are affected? Impact chains answer this by tracing from infrastructure upward through components to applications to services.

If `crm-db-primary` fails, the impact chain runs: Database "crm-db-primary" is used by Component "Deal Pipeline" and Component "Contact Manager," which are parts of Application "OvocoCRM," which implements Service "Customer Relationship Management." The business impact: CRM is down.

These chains are built from the reference fields already in the schema. The Application's components attribute lists its Product Components. Adding server and database references to components (or to the application directly) completes the chain.

## Using References to Build the Service Model

CMDB-Kit's reference system (type 1 attributes in schema-attributes.json) is the mechanism for building service models. Each reference creates a link in the dependency chain:

```json
"Application": {
  "components": { "type": 1, "referenceType": "Product Component", "max": -1 }
}
```

To extend this for service modeling, you might add:

```json
"Application": {
  "servers": { "type": 1, "referenceType": "Server", "max": -1 },
  "databases": { "type": 1, "referenceType": "Database", "max": -1 }
}
```

And for the service layer:

```json
"Service": {
  "applications": { "type": 1, "referenceType": "Application", "max": -1 },
  "owner": { "type": 1, "referenceType": "Team" }
}
```

Each reference is navigable in both directions through AQL HAVING queries, enabling both "what infrastructure supports this service?" and "what services depend on this server?"


# Capability Mapping

## What a Business Capability Is in UAF Terms

A business capability is something the organization can do, independent of how it does it. "Customer Relationship Management" is a capability. "OvocoCRM running on AWS" is an implementation of that capability. Capabilities are stable over time (you always need to manage customer relationships), even as the implementations change (you might switch from OvocoCRM to a different product).

In UAF terms, capabilities decompose hierarchically:

```
Enterprise Capabilities
├── Customer Management
│   ├── Customer Relationship Management
│   ├── Customer Support
│   └── Customer Analytics
├── Product Development
│   ├── Requirements Management
│   ├── Software Engineering
│   └── Quality Assurance
└── Operations
    ├── Infrastructure Management
    ├── Release Management
    └── Configuration Management
        ├── Configuration Identification
        ├── Configuration Control
        ├── Status Accounting
        └── Verification and Audit
```

## Linking Capabilities to Applications and Teams

Each capability is delivered by one or more applications and owned by one or more teams. The "Customer Relationship Management" capability is delivered by the OvocoCRM application and owned by the CRM Team.

In the CMDB, this means a Capability record references Applications (what implements it) and Teams (who owns it). If a capability is not delivered by any application, it represents a gap. If a capability is delivered by multiple applications, it may represent redundancy worth rationalizing.

## When to Add a Capability Type to the Schema

Add a Capability type when your organization needs to:

- Maintain a formal capability map for strategic planning
- Identify capability gaps (capabilities with no implementing application)
- Identify capability redundancy (capabilities implemented by multiple applications)
- Report on capability coverage across the portfolio

Do not add a Capability type if your only use is labeling applications. In that case, a text attribute on Application (e.g., "businessCapability") is simpler and sufficient.

## Keeping Capability Maps Aligned With the CMDB

Capability maps drift when they are maintained separately from operational data. A capability map drawn in a presentation might show ten capabilities, but the CMDB shows that two of the implementing applications have been retired.

When capabilities live as CI records in the CMDB, alignment is automatic. The capability record's application references point to live Application records. If an application is retired, the capability's implementation list visibly shrinks.


# Application Portfolio Management

## Using Application Status for Lifecycle Planning

The Application Status lookup (Active, Planned, Deprecated, Retired) is the foundation of portfolio management. A query showing all applications by status gives you the portfolio at a glance:

- Active: applications currently in production
- Planned: applications approved but not yet built
- Deprecated: applications being phased out
- Retired: applications that have been decommissioned

This four-state lifecycle is a simplified portfolio view. For more detailed lifecycle planning, you can add attributes or custom lookup values.

## TIME Classification (Tolerate, Invest, Migrate, Eliminate)

The Gartner TIME model classifies applications by their strategic disposition:

- Tolerate: the application works but receives minimal investment
- Invest: the application is strategic and receives active development
- Migrate: the application needs to be replaced, migration is planned
- Eliminate: the application should be retired as soon as possible

Adding a "Disposition" attribute to the Application type (referencing a custom "Application Disposition" lookup with these four values) enables TIME-based portfolio reporting. Combined with Application Status, you get a two-dimensional view: an "Active" application with disposition "Eliminate" needs retirement planning. A "Planned" application with disposition "Invest" is a strategic new build.

## Technology Radar: Tracking Technology Choices Across Applications

Applications use technologies: programming languages, frameworks, databases, cloud services. Tracking these technology choices across the portfolio reveals patterns:

- Which technologies are widely adopted (mainstream)
- Which are being trialed (emerging)
- Which are being phased out (sunset)

CMDB-Kit does not have a Technology type in the base schema, but you can track technology choices through Product Component types (each component has a Component Type) and through text attributes on Application or Server records (e.g., "operatingSystem," "databaseEngine").

For formal technology radar management, add a Technology type with attributes for name, category, status (Adopt, Trial, Assess, Hold), and references to the applications that use it.

## Vendor and License Data as Portfolio Inputs

The Vendor and License types provide financial and contractual context for portfolio decisions:

- Vendor records show supplier relationships and their status (Active, Under Review, Inactive, Terminated)
- License records show licensing models (Per Seat, Per Core, Enterprise, Open Source, SaaS Subscription) with expiration dates

An application portfolio review combines Application records (what exists), License records (what it costs), and Vendor records (who supplies it). An application with an expiring license from a terminated vendor is a high-priority migration candidate.


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
  "applications": { "type": 1, "referenceType": "Application", "max": -1 },
  "owner": { "type": 1, "referenceType": "Team" },
  "status": { "type": 1, "referenceType": "Application Status" }
}
```

A Business Process type:

```json
"Business Process": {
  "description": { "type": 0 },
  "capabilities": { "type": 1, "referenceType": "Capability", "max": -1 },
  "owner": { "type": 1, "referenceType": "Team" },
  "applications": { "type": 1, "referenceType": "Application", "max": -1 }
}
```

An Information Object type:

```json
"Information Object": {
  "description": { "type": 0 },
  "producer": { "type": 1, "referenceType": "Application" },
  "consumers": { "type": 1, "referenceType": "Application", "max": -1 },
  "dataClassification": { "type": 0 }
}
```

Each type follows CMDB-Kit's standard patterns: camelCase attributes, reference types pointing to existing types, placement in the schema hierarchy. Add them under a new "Enterprise Architecture" parent in schema-structure.json, add their attributes to schema-attributes.json, add them to LOAD_PRIORITY (after the types they reference), create data files, and validate.

## Adding EA-specific Attributes to Existing Types

Sometimes a new type is overkill. Adding attributes to existing types can capture EA data without new types:

On Application: add `businessCapability` (text), `disposition` (reference to a custom lookup), `strategicValue` (text: High/Medium/Low).

On Product Component: add `technologyStack` (text describing the implementation technology).

On Organization: add `functionalDomain` (text describing the organization's EA domain).

These lightweight extensions keep the schema simple while enabling EA queries: "show me all applications with disposition Eliminate" or "show me all components using Python."

## Balancing EA Detail With Operational Simplicity

The temptation with EA is to model everything: capabilities, processes, information flows, technology standards, strategic initiatives, risk assessments. Each additional type adds schema complexity, data maintenance burden, and potential for stale data.

Start with what you can maintain. If your organization has one person managing the CMDB part-time, adding five EA types creates five types worth of data that will go stale. Start with Application portfolio management (no new types needed, just use Application Status and a disposition attribute). Add Capability only when someone is actively maintaining a capability map. Add Business Process only when process data drives real decisions.

The best EA in a CMDB is the one that stays current. A simple model with accurate data beats a comprehensive model with stale data every time.
