# Core Schema

The Core schema is the smallest useful CMDB. It covers products, infrastructure, releases, and people with four branches and ten lookup types.

## When to Use

Use Core for proof-of-concept work, small teams, or when you want to learn CMDB-Kit before committing to a larger schema. You can add domains later without losing data.

## Structure

```
Product CMDB
├── Product
├── Server
├── Database
└── Product Component

Product Library
├── Product Version
├── Document
├── Deployment
├── Feature
├── Baseline
└── Deployment Site

Directory
├── Organization
├── Team
└── Person

Lookup Types
├── Product Status, Version Status, Deployment Status
├── Environment Type, Document Type, Document State
├── Component Type, Priority
└── Organization Type, Deployment Role
```

## What Core Does Not Include

- No SLAs
- No certifications or assessments
- No locations, facilities, or vendors
- No licensing or financial tracking
- No service modeling or enterprise architecture

These are added by installing optional domains.

## Validation

```bash
node tools/validate.js --schema schema/core
```
