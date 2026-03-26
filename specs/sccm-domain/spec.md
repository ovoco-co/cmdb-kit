# SCCM Domain

**Status**: Done (foundation)
**Updated**: 2026-03-26
**Priority**: Medium

### What's done
- 7 CI types: SCCM Site, SCCM Finding, SCCM Collection, SCCM Boundary Group, SCCM Security Role, SCCM Service Account, SCCM Role Type
- 3 lookup types: SCCM Site Type, SCCM Site Role, SCCM Finding Category
- Example data files with realistic SCCM hierarchy
- Domain README with usage guide
- Blog post drafted (Post 21 in content strategy)

### What's pending
- Integration with Core after restructure lands
- Update type references to use Core naming conventions
- Adapter testing (import SCCM domain into JSM and ServiceNow alongside Core)

## Overview

First opt-in domain for cmdb-kit. Models Microsoft SCCM infrastructure as CMDB configuration items for security assessment and site management. Designed for organizations that need to track SCCM site hierarchies, distribution points, service accounts, and security findings alongside their product-delivery CMDB.

## Why

SCCM is a common attack surface in enterprise environments. Site hierarchies, distribution points, and service accounts are rarely tracked in the CMDB, which means security teams can't trace findings back to specific infrastructure components. This domain bridges that gap.

## Schema

Located in `schema/domains/sccm/`. Each type has a JSON schema file defining attributes, and example data files demonstrating realistic SCCM configurations.

The domain connects to Core through the Server and Organization types: SCCM Sites run on Servers, and Service Accounts belong to Organizations.

## Dependencies

- Blocked by: Core + Domains restructure (for final integration path)
- Blocks: Nothing (proof of concept is self-contained)
