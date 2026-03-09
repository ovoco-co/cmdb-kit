Changelog

All notable changes to CMDB-Kit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## 0.1.0 - 2026-03-02

Initial public release.

### Schema

- Base schema layer with 20 types (10 CI types, 10 lookups)
- Extended schema layer with 55 types covering change management, incident tracking, licensing, certifications, baselines, and network management
- ITIL 4 aligned type hierarchy with four root branches: Product CMDB, Product Library, Directory, Lookup Types
- OvocoCRM example data for both schema layers

### Tools

- Offline schema and data validation (`tools/validate.js`) with 9 check categories
- CSV template generator (`tools/generate-templates.js`) with role-based filtering and XLSX support
- CSV to JSON converter (`tools/csv-to-json.js`) with format auto-detection
- Deployment readiness checker (`tools/deployment-readiness.js`)
- Data backup script (`tools/backup-data.sh`)

### Adapters

- JSM Assets reference adapter with import, export, and post-import validation
- Schema sync, data sync (create/update/upsert), and dry-run modes
- Export with diff comparison capability
- Field audit and configuration tools

### Documentation

- Getting started guide
- Schema reference with full type and attribute listing
- ITIL 4 practice mapping
- CSV workflow guide for Excel-based data entry
- Adapter development guide
