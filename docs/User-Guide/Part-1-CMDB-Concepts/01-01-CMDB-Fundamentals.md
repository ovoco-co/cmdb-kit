# CMDB Fundamentals

A Configuration Management Database is a structured repository of configuration items and their relationships. It answers questions that spreadsheets and tribal knowledge cannot: what do we have, how does it connect, what state is it in, and who is responsible for it? This chapter introduces the concepts that the rest of the training guide builds on: what a CMDB is, how it fits into ITIL service management, what problem CMDB-Kit solves, and when you actually need one.


# What a CMDB Is and Why It Matters

## The Difference Between a CMDB and an Inventory Spreadsheet

A spreadsheet lists things. A CMDB models them.

A spreadsheet row says: "Server CRM-DB-PROD-01, Dell PowerEdge R750, 512GB RAM, US-East datacenter." It is a flat list of attributes with no connections to anything else. You cannot ask "what applications run on this server?" because the spreadsheet does not encode relationships. You cannot ask "what version of OvocoCRM is deployed at Acme Corp?" because the deployment site, the version, and the customer are in different spreadsheets (or different tabs, or different people's heads).

A CMDB encodes relationships as first-class data. The Server record references the Application it hosts. The Application references the Product Version currently deployed. The Deployment Site references the Product Version, the Organization (the customer), and the Location. From any single record, you can navigate the relationship graph to answer cross-cutting questions.

The practical difference: when an incident takes down a server, the CMDB tells you which applications are affected, which customers run those applications, what SLAs apply, and who to notify. A spreadsheet tells you the server's RAM.

## Configuration Items vs Assets

In ITIL terminology, a configuration item (CI) is any component that needs to be managed in order to deliver an IT service. CIs include software (applications, modules, versions), infrastructure (servers, databases, network segments), documentation (design documents, release notes), organizations (teams, vendors), and people (points of contact, administrators).

An asset is a broader term: anything of value to the organization. A desk, a building, a software license. All CIs are assets, but not all assets are CIs. A desk is an asset but does not need to be tracked in the CMDB because it does not affect IT service delivery. A server license is both an asset and a CI because its expiration could disrupt service.

CMDB-Kit focuses on CIs: the components that matter for configuration management, service delivery, and operational decisions. The CI Selection chapter covers how to decide what to track.

## Relationships as First-class Data

The defining feature of a CMDB is its relationship model. In CMDB-Kit, relationships are reference attributes: one CI's attribute points to another CI's record.

A Deployment Site references a Product Version, an Organization, and a Location. A Product Version references its Components and its Previous Version. A Team references its Organization and its Team Lead (a Person).

These references create a navigable graph:

```
Organization: Acme Corp
  <- Deployment Site: CR Acme Corp US-East
     -> Product Version: OvocoCRM 2.4.0
        -> Product Component: CR Core Platform
        -> Product Component: CR Authentication Module
     -> Location: US-East Datacenter
```

From the Organization, you can find all deployment sites. From a deployment site, you can find the installed version and its components. From a component, you can find all versions that include it and all sites running those versions.

This navigability is what makes the CMDB useful for impact analysis, change management, and incident response. Without relationships, you have a database of isolated records.


# ITIL 4 Service Configuration Management

## The CMS and Where a CMDB Fits

ITIL defines a layered model for configuration management:

The Configuration Management System (CMS) is the comprehensive system of tools, data, and information used to support service configuration management. It includes the CMDB, the Definitive Media Library (DML), knowledge management tools, and the processes that maintain them.

The CMDB is the structured database of CI records and relationships within the CMS. It is the authoritative source for "what exists and how it connects."

The DML stores the controlled artifacts: release packages, approved documents, installation media. The CMDB catalogs what is in the DML. The DML stores the actual files.

Knowledge management tools (Confluence, wikis, documentation systems) provide the narrative context: why decisions were made, how processes work, what the architecture looks like. The CMDB provides the structured data. The knowledge tools provide the prose.

CMDB-Kit occupies the CMDB layer. It defines the CI types, attributes, and relationships. The adapters push this data to a target database (JSM Assets, ServiceNow, or a custom platform). The DML and knowledge tools are separate systems that integrate with the CMDB through references (URL attributes, DML path attributes).

## Configuration Management Activities

ITIL defines four configuration management activities. Each maps to specific CMDB-Kit operations:

Identification: deciding what to track, defining the schema types and attributes, establishing naming conventions. In CMDB-Kit terms: editing schema-structure.json and schema-attributes.json.

Control: governing changes to CIs through approval workflows. In CMDB-Kit terms: change requests reviewed by CCBs, schema changes committed separately from data changes, LOAD_PRIORITY ensuring correct import order.

Status accounting: maintaining the current state of all CIs and reporting on it. In CMDB-Kit terms: the data files, the import process, AQL queries, and dashboard gadgets that show deployment status, version adoption, and site inventory.

Verification and audit: checking that the CMDB accurately reflects reality. In CMDB-Kit terms: running validate.js, running validate-import.js, comparing CMDB records against discovery data, and running quarterly data hygiene audits.


# The Problem CMDB-Kit Solves

## Months of Schema Design Eliminated

Building a CMDB from scratch means deciding: what types to create, what attributes each type needs, how types relate to each other, what lookup values to define, and in what order to import everything. For a medium-complexity CMDB (50 or more types), this design work takes weeks or months.

CMDB-Kit provides a ready-made schema with 55 types (extended) or 20 types (base), complete with attributes, reference types, lookup values, and example data. You start from a working schema and customize it rather than starting from a blank canvas.

The schema encodes patterns learned from production CMDB operations: the four-branch taxonomy (Product CMDB, Product Library, Directory, Lookup Types), the product-prefix convention for multi-product environments, the version chain pattern (previousVersion), the two-record site pattern (Site and Deployment Site), and the three-baseline model (Design, Build, Release).

## Database-agnostic Schema

CMDB-Kit's schema is defined in JSON files, not in a database-specific format. schema-structure.json and schema-attributes.json describe the CMDB structure in a vendor-neutral way. Adapters translate this structure to specific target databases.

CMDB-Kit includes adapters for JSM Assets and ServiceNow. The schema files can also be adapted to any database that supports typed objects with reference attributes: Device42, i-doit, or a custom database.

This means the schema design is a one-time investment. If you migrate from one CMDB platform to another, the schema files come with you. Only the adapter changes.

## Version-controlled Schema as Code

The schema and data live in a git repository. Every change is a tracked commit with a message, an author, and a timestamp. You can see the full history of the schema: when types were added, when attributes changed, when lookup values were updated.

This "schema as code" approach provides:

Change tracking: who changed what, when, and why.

Rollback: revert any change by reverting the commit.

Branching: develop schema changes on a feature branch, validate them, and merge when ready.

Promotion: move schema changes from development to staging to production by merging or tagging.

Code review: schema changes can be reviewed by peers before they reach the target database.

No more "someone added a field in the UI and nobody knows why."


# When You Need a CMDB vs When a Spreadsheet Is Fine

## Indicators That You Have Outgrown Spreadsheets

You need a CMDB when:

Multiple teams ask different versions of the same question ("what version is running at site X?" and nobody has a consistent answer).

A change in one system affects other systems, and you cannot reliably identify the blast radius.

You manage more than one product or application with shared infrastructure.

You have compliance or audit requirements that mandate a formal CI inventory.

You spend significant time reconciling spreadsheets, emails, and tribal knowledge to answer operational questions.

You manage deployments across multiple sites and need to track which version is where.

## Cost of Not Having a CMDB

Without a CMDB, operational questions take hours instead of seconds. Impact analysis is guesswork. Changes are approved without knowing what they affect. Incidents escalate because responders do not know which applications depend on the failing component. Auditors ask for documentation that does not exist.

The cost is not just time. It is risk. A change deployed without proper impact analysis breaks an application at a customer site. An incident responder wastes 30 minutes identifying affected systems because there is no relationship map. A compliance audit finds that the organization cannot produce an inventory of its deployed software.

CMDB-Kit reduces this cost by providing the schema, the tooling, and the patterns to stand up a working CMDB in days rather than months. The training guide you are reading covers the rest: how to design it, how to populate it, how to maintain it, and how to integrate it with your operational processes.
