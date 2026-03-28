# Core + Domains Schema Restructure

**Status**: Done (PR #2 merged 2026-03-28)
**Updated**: 2026-03-28
**Priority**: Critical (blocks all other work)

### What's done
- Design complete: replace base/extended/enterprise tiers with Core + Domains architecture
- Constitution ratified (2026-03-24) with 13 principles
- Spec Kit installed (v0.4.1) for structured development workflow
- SCCM domain built as proof of concept (7 CI types, 3 lookups, example data)
- UAF viewpoint alignment documented

### What's pending
- Core schema extraction (Products, Servers, Databases, Versions, Deployments, Baselines)
- Migration path from current tier-based schema files
- Adapter updates (JSM and ServiceNow) to handle domain-aware imports
- Documentation rewrite for new structure
- Per-domain README and data file templates

## Overview

Replace the current three-tier schema model (base 20 types, extended 55 types, enterprise) with a Core + Domains architecture. Core contains the product-delivery CMDB essentials that every deployment needs. Domains are opt-in packages for specialized concerns.

## Why

The tier model forces users to pick a size. A small team that needs compliance tracking has to jump from base (20 types) to extended (55 types) just to get 3 compliance-related types. The domain model lets them install Core and add only the Compliance domain.

Each domain aligns to a UAF viewpoint and maps to paid platform plugins it replaces. This makes the value proposition concrete: "install this free domain instead of buying that $5k/year plugin."

## Core Types

Products, Product Versions, Product Components, Features, Deployments, Deployment Sites, Baselines, Servers, Databases, Documents, VMs, Hardware Models, Network Segments, Organizations, Teams, Persons, Locations, Facilities, Vendors, plus standard lookup types.

## Domains Identified

| Domain | Concern | UAF Viewpoint | Types |
|--------|---------|---------------|-------|
| Compliance | Audit, assessment, findings | Security | Assessment, Finding, Control, Evidence |
| Licensing | Software licensing, entitlements | Resource | License, Entitlement, License Pool |
| EA (Services/Capability) | Service modeling, capability mapping | Services | Business Service, Application Service, Capability |
| Distribution | Media prep, shipment, chain of custody | Operational | Distribution Request, Media, Shipment |
| Requirements | Requirement traceability | Requirements | Requirement, Allocation, Trace Link |
| Financial | Cost tracking, TBM tower mapping | Resource | Cost Center, Budget Line, Tower |
| SCCM | Microsoft SCCM site management, security | Security | SCCM Site, Finding, Collection, Boundary Group, Security Role, Service Account |

## Dependencies

- Nothing blocks this work
- This blocks: ServiceNow adapter propagation, documentation rewrite, Forge app, drift detection, all future domains

## Success Criteria

- Core schema imports cleanly into both JSM Assets and ServiceNow CMDB
- Any domain can be added independently without breaking Core
- Existing base/extended users have a documented migration path
- Each domain has its own directory with schema files, example data, and README
