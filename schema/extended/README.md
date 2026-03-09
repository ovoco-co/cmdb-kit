# Extended Schema

The extended schema adds operational CM capabilities to the base layer: baselines, certifications, assessments, licensing, SLAs, and deployment site tracking. It also adds infrastructure depth (virtual machines, network segments, hardware models) and organizational depth (locations, facilities, vendors).

## When to Use

Use extended when you need a full single-product CMDB that supports compliance tracking, SLA management, and release management. Extended includes everything in base plus the types needed for day-to-day operations.

## Structure

```
Product CMDB
├── Product, Server, Database, Product Component
├── Hardware Model, Network Segment, Virtual Machine
├── License, Assessment, Feature

Product Library
├── Product Version, Document, Deployment
├── Baseline, Documentation Suite, Product Media, Product Suite
├── Certification, Deployment Site, Distribution Log
├── SLA

Directory
├── Organization, Team, Person
├── Location, Facility, Vendor

Lookup Types
```

## What Extended Adds Over Base

**Product CMDB:** Hardware Model, Network Segment, Virtual Machine, License, Assessment, Feature

**Product Library:** Baseline, Documentation Suite, Product Media, Product Suite, Certification, Deployment Site, Distribution Log, SLA

**Directory:** Location, Facility, Vendor

**Lookup Types:** additional lookups for certification, assessment, network, baseline, license, site, vendor, and SLA statuses

## What Extended Does Not Include

- No multi-product prefixing (use enterprise for portfolio management)
- No enterprise architecture (services, capabilities, business processes)
- No financial tracking (contracts, cost categories)
- No configuration library or requirements traceability
- No feature implementation audit records

These are added by the enterprise layer.

## Validation

```bash
node tools/validate.js --schema schema/extended
```
