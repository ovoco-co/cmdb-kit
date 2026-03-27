# SCCM Security Assessment Domain

An opt-in schema extension that models System Center Configuration Manager infrastructure as configuration items, enabling persistent tracking of SCCM security findings.

## Prerequisites

This domain extends the **extended** schema. It references types from extended (Server, Network Segment, Assessment, Assessment Status, Priority, Product Status) so the extended schema must be loaded first.

## Types

**CI types** (under SCCM Infrastructure):
- SCCM Site, SCCM Site Role, SCCM Collection, SCCM Security Role, SCCM Service Account, SCCM Boundary Group, SCCM Finding

**Lookup types** (under SCCM Lookup Types):
- SCCM Site Type, SCCM Role Type, SCCM Finding Category

## Usage

The domain has its own schema-structure.json, schema-attributes.json, and data/ directory. To use it, merge these files with your base schema before import.

For details on the types, attack categories, and assessment workflow, see [SCCM Security Assessment](../../../docs/Extending/sccm-security-assessment.md).
