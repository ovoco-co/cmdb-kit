# Using the CMDB

The schema exists to answer questions. A CMDB that nobody queries is a spreadsheet with extra steps. This document shows how to answer each of the Core Questions using the imported data, with every example grounded in the OvocoCRM records that ship with CMDB-Kit.

## Is This Site Current or Behind?

This is the most important query you can run against a product-delivery CMDB. It compares the version deployed at each site to the current Product Version and surfaces any sites that are behind.

In the OvocoCRM example data, the current version is OvocoCRM 2.3.1 (a hotfix for a contact import race condition, released 2026-02-10). Looking at the Deployment Site records:

- US East (Virginia) is running OvocoCRM 2.3.1. Current.
- US West (Oregon) is running OvocoCRM 2.3.1. Current.
- Globex Corp Production is running OvocoCRM 2.3.1. Current.
- Acme Corp Production is running OvocoCRM 2.3.0. One version behind.
- EU West (Frankfurt) has no version assigned. Status is Provisioning.
- Initech Production has no version assigned. Status is Provisioning.

Acme Corp is the site that needs attention. It is running the previous release and has not received the hotfix. The two provisioning sites are not yet live and can be ignored for version compliance purposes.

In JSM Assets, you can find this with an AQL query:

```
objectType = "Deployment Site" AND Version != "OvocoCRM 2.3.1" AND Status = "Active"
```

This returns Acme Corp Production, which is the only active site not running the current version. The provisioning sites are excluded because their status is not Active.

## What Changed Since the Last Baseline?

Baselines capture a snapshot of the approved configuration at a point in time. Comparing two baselines tells you what changed between releases.

The example data includes two baselines: OvocoCRM 2.3.1 Release Baseline and OvocoCRM 2.3.0 Release Baseline. Both contain the same six components: Contact Manager, Deal Pipeline, Email Integration, REST API, Webhook Service, and Report Generator. No components were added or removed in the hotfix release.

The difference is in the documents. The 2.3.1 baseline includes "CRM Deployment Runbook" and "v2.3.1 Release Notes". The 2.3.0 baseline includes "CRM Deployment Runbook" and "CRM API Architecture". Both share the deployment runbook, but the hotfix baseline swapped in the release notes document while the previous baseline referenced the API architecture document.

The v2.3.1 Release Notes document describes the fix for the contact import race condition that caused duplicate records under concurrent requests. This is the substantive change between the two baselines: a targeted bug fix with no component-level changes.

If you were auditing the 2.3.1 release, the baseline comparison tells you the release scope was narrow. Same components, same architecture, just a single defect fix documented in the release notes.

## Who Do I Call?

When a site has a problem, you need to know who to contact. Start from the Deployment Site record and follow the references.

For Acme Corp Production, the `sitePOC` field points to Drew Santos. Looking up Drew's Person record:

- Job title: DevOps Engineer
- Phone: 555-0109
- Email: drew.santos@ovoco.dev
- Team: SRE
- Manager: Casey Morgan

Drew is the first person to call. If you need to escalate, Drew's manager is Casey Morgan, who is the SRE Lead (phone 555-0102, email casey.morgan@ovoco.dev). Casey is also the site POC for US East (Virginia), so Casey has direct operational context for the production environment.

The `supportTeam` field on the Deployment Site tells you which team owns ongoing support. For Acme Corp Production, the support team is SRE. For the two provisioning sites (EU West and Initech), the support team is Platform Engineering, because those sites are still being stood up by the platform team rather than operating in steady state under SRE.

## What Version Is at Each Site?

This is a reporting query rather than a diagnostic one. It gives you a fleet-wide view of version distribution.

Querying all Deployment Site records and showing the version field for each:

| Site | Version | Status |
|------|---------|--------|
| US East (Virginia) | OvocoCRM 2.3.1 | Active |
| US West (Oregon) | OvocoCRM 2.3.1 | Active |
| Acme Corp Production | OvocoCRM 2.3.0 | Active |
| Globex Corp Production | OvocoCRM 2.3.1 | Active |
| EU West (Frankfurt) | (none) | Provisioning |
| Initech Production | (none) | Provisioning |

Three of four active sites are on the current version. One active site is one version behind. Two sites are provisioning and have no version yet. This is a healthy fleet with one lagging deployment that needs a rollout scheduled.

In a real CMDB with dozens or hundreds of sites, this query becomes the primary dashboard for release management. You can group by version to see how many sites are on each release, or filter by organization to see which customers are behind.

## Who Approved This Release?

The `approvedBy` field on Product Version tells you who signed off on each release. In the OvocoCRM example data:

- OvocoCRM 2.0.0 was approved by Morgan Blake (Product Manager) on 2025-06-14
- OvocoCRM 2.1.0 was approved by Morgan Blake on 2025-08-30
- OvocoCRM 2.2.0 was approved by Morgan Blake on 2025-11-14
- OvocoCRM 2.3.0 was approved by Morgan Blake on 2026-01-19
- OvocoCRM 2.3.1 was approved by Alex Chen (Principal Engineer) on 2026-02-09

The pattern is clear: Morgan Blake, the Product Manager, approves planned releases. But OvocoCRM 2.3.1, the hotfix, was approved by Alex Chen, the Principal Engineer. This tells you the hotfix went through an emergency approval path rather than the standard product management sign-off.

This is exactly the kind of anomaly a CMDB should surface. If an auditor asks "who approved this release and why was the normal approver bypassed," the answer is in the data. Alex Chen approved it because it was an emergency hotfix for a race condition causing duplicate records in production. The standard approval process was not appropriate for an urgent defect fix.

## What Documents Apply to This Version?

Documents in the CMDB are tied to either a specific version, a product, or both. You can query at different levels depending on what you need.

To find documents for a specific version, query Document where `version` equals "OvocoCRM 2.3.1". This returns one record: "v2.3.1 Release Notes", authored by Morgan Blake, published 2026-02-10. This is the only document scoped to the hotfix release.

To find all documents for the product regardless of version, query Document where `product` equals "CRM Core". This returns all five documents in the example data:

- CRM Deployment Runbook (Runbook, authored by Jordan Lee)
- Incident Response SOP (SOP, authored by Casey Morgan)
- CRM API Architecture (Architecture, authored by Alex Chen)
- Database Migration Guide (Runbook, authored by Sam Rivera)
- v2.3.1 Release Notes (Release Notes, authored by Morgan Blake)

The first four documents are product-level documentation that applies across all versions. The CRM Deployment Runbook is referenced by both baselines, confirming it is the canonical deployment procedure for every release. The Incident Response SOP and Database Migration Guide have no version field, meaning they apply to the product as a whole rather than any specific release. The CRM API Architecture document references version OvocoCRM 2.0.0, the release where the API was originally built.

This two-level query pattern (version-specific and product-wide) lets you assemble the complete documentation set for any deployment. If you are deploying OvocoCRM 2.3.1 to Acme Corp, you need the v2.3.1 Release Notes for change context and the CRM Deployment Runbook for the actual procedure. The version-level query gives you the first, and the product-level query gives you the second.

## Combining Queries

The real power of the CMDB appears when you chain these questions together. Starting from "Acme Corp is behind," you can walk the graph:

1. Acme Corp Production is running OvocoCRM 2.3.0, one version behind the current 2.3.1.
2. The difference between 2.3.0 and 2.3.1 is a hotfix for a contact import race condition (from the baseline comparison).
3. The site POC is Drew Santos (555-0109), who reports to Casey Morgan (555-0102).
4. The deployment procedure is in the CRM Deployment Runbook, and the change details are in the v2.3.1 Release Notes.
5. The hotfix was approved by Alex Chen through an emergency approval path.

Five questions, answered in seconds, with full traceability. That is the value of a product-delivery CMDB.
