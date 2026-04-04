# CSDM and Relationships

## CSDM Alignment Deep Dive

The Common Service Data Model (CSDM) is ServiceNow's reference architecture for CMDB data. It defines where every CI type belongs in a seven-domain model.

### CSDM Domains

**Foundation**: Reference data shared across the CMDB. Locations, companies, groups, lifecycle definitions, product models. This is the scaffolding everything else attaches to.

Key tables: cmn_location, core_company, sys_user_group, cmdb_model, cmdb_model_category

**Ideation and Strategy** (new in v5.0): Strategic planning artifacts. Product ideas, strategic priorities, goals, planning items. Most organizations don't populate this domain unless they use ServiceNow's Strategic Portfolio Management.

**Design and Planning**: Business architecture. Business capabilities, business applications, information objects. This is where you model what the business does and what applications support it.

Key table: cmdb_ci_business_app (the "Rosetta Stone" of CSDM, connecting business to technical)

**Build and Integration**: Development artifacts. DevOps change data, SDLC components, AI system digital assets. Relevant if you use ServiceNow's DevOps integrations.

**Service Delivery** (Manage Technical Services): The technical infrastructure that delivers services. Technical services, application services, servers, databases, network devices, storage, VMs. This is the largest domain in most CMDBs.

Key tables: cmdb_ci_service_technical, cmdb_ci_service_discovered (application service), cmdb_ci_server, cmdb_ci_db_instance, cmdb_ci_appl

**Service Consumption** (Sell/Consume): What the business sees. Business services, service offerings, catalog items. This is the customer-facing view of IT.

Key tables: cmdb_ci_service, service_offering

**Manage Portfolios**: Service portfolio management. Portfolios, investment management. Used primarily by IT leadership and finance.

### How cmdb-kit Maps to CSDM

| cmdb-kit Type | CSDM Domain | CSDM Equivalent | Notes |
|---|---|---|---|
| Server | Service Delivery | cmdb_ci_server | Direct OOTB mapping |
| Database | Service Delivery | cmdb_ci_db_instance | Direct OOTB mapping |
| Virtual Machine | Service Delivery | cmdb_ci_vm_instance | Direct OOTB mapping |
| Network Segment | Service Delivery | cmdb_ci_network | Direct OOTB mapping |
| Product | Design | cmdb_ci_business_app (conceptual) | Custom independent class to avoid dependent hosting |
| Product Component | Design | cmdb_ci_appl_component (conceptual) | Custom class |
| Feature | Design | No direct equivalent | Custom class |
| Assessment | Manage | No direct equivalent | Custom class |
| Product Version | Build | No direct equivalent | Standalone (non-CI) |
| Deployment | Service Delivery | No direct equivalent | Standalone (non-CI) |
| Baseline | Build | No direct equivalent | Standalone (non-CI) |
| Document | Foundation | No direct equivalent | Standalone (non-CI) |
| Person | Foundation | sys_user / cmn_user (conceptual) | Standalone for external contacts |
| Organization | Foundation | core_company | OOTB mapping |
| Location | Foundation | cmn_location | OOTB mapping |

cmdb-kit's Product type maps to the Design domain because it represents "what we build and manage," not the running infrastructure that delivers it. The CSDM equivalent is Business Application, but cmdb-kit uses an independent custom class because:
1. cmdb_ci_business_app has specific CSDM relationships and behaviors that don't fit product-delivery workflows
2. cmdb_ci_appl is dependent (requires hosting server) which doesn't apply to the product catalog concept
3. An independent class allows cmdb-kit data to coexist with an organization's existing CSDM-aligned Business Application records without conflict

### CSDM Maturity Model

ServiceNow recommends a phased CSDM adoption:

**Crawl**: Populate Foundation domain. Get locations, companies, and groups right. Start with Business Applications.

**Walk**: Add Service Delivery domain. Connect applications to infrastructure. Establish "Runs on" and "Depends on" relationships.

**Run**: Add Service Consumption domain. Connect business services to technical services to applications to infrastructure. Enable impact analysis.

**Fly**: Full CSDM adoption across all domains. Automated service mapping, continuous health monitoring, governance.

cmdb-kit is useful in the Crawl and Walk stages, providing product and deployment context that Discovery cannot provide.


## Relationships

### Relationship Types

CI relationships define how CIs connect to each other. They are stored in the `cmdb_rel_ci` table. Each relationship has a parent CI, a child CI, and a type.

Navigate to **CMDB > CI Relationship Types** to view all available types.

The relationship type defines the semantic meaning of the connection. ServiceNow uses a "Parent::Child" naming convention where the type name describes both directions:

| Type Name | Parent Example | Child Example | Use Case |
|---|---|---|---|
| Runs on::Runs on | Application | Server | Application hosting |
| Depends on::Used by | Service | Application | Service dependency |
| Contains::Contained by | Rack | Server | Physical containment |
| Connects to::Connected by | Server | Switch | Network connectivity |
| Virtualizes::Virtualized by | ESXi Host | Virtual Machine | Virtualization |
| Manages::Managed by | Load Balancer | Server | Management relationship |
| Sends data to::Receives data from | Application | Database | Data flow |
| Provides::Provided by | Technical Service | Application Service | Service composition |
| Hosted on::Hosts | Application Service | Server | Cloud/container hosting |
| Members of::Member of | Cluster | Server | Cluster membership |

When you read a relationship record, the parent and child fields tell you the direction. "Server A (parent) Contains (type) Disk Array B (child)" means the server physically contains the disk array.

### Relationship Best Practices

**Use the correct type**: "Runs on" means the child is hosted by the parent. "Depends on" means the parent requires the child to function. These have different implications for impact analysis. If a server goes down:
- Everything that "Runs on" that server is directly impacted
- Everything that "Depends on" services running on that server is indirectly impacted
- Everything "Contained by" that server is physically impacted

**Create bidirectional visibility**: When you create a "Depends on" relationship, ServiceNow stores it as a single record. The UI shows it from both sides: the parent sees "Depends on [child]" and the child sees "Used by [parent]". You don't need to create two records.

**Avoid redundant relationships**: If Application A "Runs on" Server B, and Server B "Contains" Disk Array C, you don't need a direct relationship between Application A and Disk Array C. The chain A -> B -> C is implied. Adding redundant direct relationships creates maintenance burden and confuses impact analysis.

**Relationship and impact analysis**: ServiceNow's impact analysis follows relationship chains to determine blast radius. When a CI has an incident, the system walks the relationship graph to find affected services and notify stakeholders. Bad relationships (wrong type, missing links, circular references) break impact analysis.

### Dependent vs Non-Dependent Relationships

Not all relationships make a CI "dependent" in the IRE sense. A server can have a "Contains" relationship to its disk arrays, but the disk arrays are not IRE-dependent on the server. They have their own identification rules (usually by serial number).

IRE dependency is specifically about **identification**. A dependent CI cannot be uniquely identified without its parent. A network adapter's MAC address is only unique within the context of its host computer. Two computers can have adapters with the same MAC address. The adapter is identified by MAC + host, making it dependent.

Most CI types are independent. Servers, databases, network switches, storage devices, and business applications all have attributes that uniquely identify them without needing a parent. Dependent identification is primarily used for:
- Network adapters (depend on host computer)
- Disk partitions (depend on host server)
- IP addresses (depend on host device)
- Some application instances (depend on hosting infrastructure)

### Viewing Relationships

On any CI form, the Related Lists section at the bottom shows all relationships. You can also navigate directly to `cmdb_rel_ci.LIST` and filter by parent or child.

To see the full relationship graph for a CI, use the **Dependency View**: Open the CI record > click the "Dependency Views" related link or navigate to it from the CI's context menu. This shows a visual map of all upstream and downstream dependencies.


