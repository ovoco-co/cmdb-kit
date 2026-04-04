# Documentation Rewrite Plan

**Purpose**: Map every existing doc to its disposition (keep, update, rewrite, move, delete) and identify new docs needed for the Core + Domains architecture.

## Disposition Key

- **KEEP** - Content is correct, no changes needed
- **PATH** - Only needs schema/base to schema/core path updates
- **UPDATE** - Content is sound but needs terminology and example updates for Core + Domains
- **REWRITE** - Structure or framing is wrong for Core + Domains, needs significant changes
- **MOVE** - File should be relocated to match new doc structure
- **NEW** - Does not exist yet, needs to be created
- **DELETE** - No longer relevant

## Existing Files

### docs/README.md (doc index)
**Disposition**: REWRITE
**Reason**: Organizes docs around base/extended/enterprise tiers. Needs to organize around Core, Domains, Platform Setup, and Developer sections matching the documentation-outline.md.

### Setup (docs/Setup/)

| File | Disposition | Work |
|------|------------|------|
| getting-started.md | UPDATE | Replace schema/base with schema/core. Replace "choose a tier" with "start with Core, add domains." Update commands. |
| atlassian-cloud.md | PATH | Replace schema/base paths. Otherwise accurate. |
| atlassian-data-center.md | PATH | Replace schema/base paths. Otherwise accurate. |
| servicenow.md | PATH | Replace schema/base paths. Update tier mapping table. |
| servicenow-scoped-app-guide.md | KEEP | ServiceNow-specific, no schema refs. |
| other-platforms.md | KEEP | Platform-agnostic guidance. |

### Concepts (docs/Concepts/)

| File | Disposition | Work |
|------|------------|------|
| cmdb-fundamentals.md | UPDATE | Replace "three schema tiers" with Core + Domains. Update "guidance gap" framing to "three traditions" framing. |
| ci-selection.md | UPDATE | Replace base/extended examples with Core/domain examples. |
| taxonomy-design.md | REWRITE | Heavily built around base/extended/enterprise tier comparisons. Rewrite around Core branch structure + how domains extend it. |
| lookup-types.md | UPDATE | Replace "base (10) and extended (22)" with Core lookups + domain lookups. Update catalog table. |
| service-management-design.md | UPDATE | Replace extended schema type examples with Core + domain references. |

### Schema Design (docs/Schema-Design/)

| File | Disposition | Work |
|------|------------|------|
| case-study-ovococrm.md | UPDATE | Update iterations to reflect Core + Domains. The design story is still valid but the output changed. |
| building-the-product-library.md | UPDATE | Product Library is in Core now. Update references. |
| designing-site-deployments.md | UPDATE | Deployment Site is in Core now. Remove "extended only" language. |
| definitive-media-library.md | MOVE+UPDATE | This is now the Distribution domain. Update to reference schema/domains/distribution/. |
| taxonomy-playbook.md | KEEP | Methodology is schema-agnostic. |
| schema-assessment.md | KEEP | Assessment methodology is schema-agnostic. |

### Data (docs/Data/)

| File | Disposition | Work |
|------|------------|------|
| data-files-and-rules.md | PATH | Replace schema/base paths only. |
| editing-data.md | PATH | Replace schema/base paths. |
| exporting-and-round-trip.md | KEEP | Process-focused, no schema refs. |
| validation-and-troubleshooting.md | UPDATE | Add --domain flag documentation. Replace schema/base default. |

### Configuration Management (docs/Configuration-Management/)

| File | Disposition | Work |
|------|------------|------|
| cm-operations.md | UPDATE | Replace enterprise schema examples with Core examples. The four CM pillars mapping is correct. |
| change-control-governance.md | KEEP | Governance patterns are schema-agnostic. |
| personnel-management.md | UPDATE | Person now has phone, jobTitle, manager in Core. Update to reflect enriched Person. |
| requirements-management.md | UPDATE | Feature is now in Core with product ref. Update accordingly. |

### Governance (docs/Governance/)

| File | Disposition | Work |
|------|------------|------|
| portfolio-and-shared-services.md | REWRITE | Built around enterprise schema with product prefixes. Needs rewrite explaining that portfolio mode (schema/enterprise/) is the legacy approach and how Core + Domains handles multi-product. |
| enterprise-architecture.md | REWRITE | References enterprise-specific types (Service, Capability, Business Process). These aren't in Core or any current domain. Rewrite as aspirational/roadmap or as guidance for extending. |
| it-asset-lifecycle.md | UPDATE | Lifecycle patterns are sound. Update type references (License is now in licensing domain, Hardware Model in infrastructure domain). |
| scaling-and-governance.md | KEEP | Data quality practices are schema-agnostic. |

### Internals (docs/Internals/)

| File | Disposition | Work |
|------|------------|------|
| schema-reference.md | REWRITE | Must regenerate from current Core + domain type trees. This is the authoritative type/attribute reference. |
| file-naming-and-project-structure.md | UPDATE | Add domain directory structure. Update project tree. |
| schema-changes.md | UPDATE | Add guidance for domain-level changes. |

### Extending (docs/Extending/)

| File | Disposition | Work |
|------|------------|------|
| writing-custom-adapters.md | KEEP | Adapter pattern is schema-agnostic. |
| multi-product-schema-design.md | REWRITE | Built around enterprise product-prefix model. Rewrite to explain portfolio mode as an advanced pattern, with Core + Domains as the standard approach. |
| sccm-security-assessment.md | UPDATE | SCCM is now a domain. Update paths and framing. |

### Integration (docs/integration/)

| File | Disposition | Work |
|------|------------|------|
| jsm-cloud/setup.md | PATH | Update schema/base paths. |
| jsm-data-center/setup.md | PATH | Update schema/base paths. |
| common/air-gapped.md | KEEP | Operational, schema-agnostic. |
| common/api-references.md | KEEP | API docs, schema-agnostic. |
| common/change-management.md | KEEP | Process patterns. |
| common/cloud-vs-dc.md | KEEP | Platform comparison. |
| common/deployment-handoff.md | KEEP | Process doc. |
| common/deployment-pipeline.md | KEEP | Process doc. |
| common/dml-operations.md | UPDATE | DML is now the distribution domain. |
| common/integration-patterns.md | KEEP | General patterns. |
| common/site-lifecycle.md | UPDATE | Deployment Site is now in Core. |
| common/upgrade-and-distribution.md | UPDATE | Distribution is now a domain. |
| common/wiki-structure.md | KEEP | Confluence patterns. |

### Whitepaper (docs/whitepaper.md)
**Disposition**: UPDATE
**Work**: Already uses Core + Domains framing. Needs Ovoco contact info decision (constitution says no Ovoco content, but whitepaper is marketing). Standards alignment section is accurate.

### Marketing (docs/marketing/)
**Disposition**: UPDATE
**Work**: Blog outline needs domain entries. Blog posts 01, 04-06 need path updates. Origin story may need framing update.

## New Docs Needed

| Document | Location | Priority | Content |
|----------|----------|----------|---------|
| Core Questions reference | docs/core-questions.md | HIGH | Map every Core Question to types/attributes. Derived from core-definition.md but written for users, not developers. |
| Example data walkthrough | docs/example-data-walkthrough.md | HIGH | Walk through the OvocoCRM story: products, versions, sites, baselines, the "Acme is behind" scenario. |
| Domain selection guide | docs/domain-guide.md | HIGH | Which domains to install, what team uses each, what commercial plugin each replaces. Decision-maker audience. |
| Creating a new domain | docs/Extending/creating-a-domain.md | MEDIUM | Step-by-step: structure, attributes, data, dependency declaration, validation, documentation. |
| Migration from old tiers | docs/migration-from-tiers.md | LOW | For existing users: how base maps to core, how extended splits into domains. Can wait until there are users to migrate. |

## Work Estimates

| Category | Files | Effort |
|----------|-------|--------|
| PATH only (find-replace schema/base) | 8 | Small batch job |
| UPDATE (terminology + examples) | 18 | Medium, mostly mechanical |
| REWRITE (significant structural changes) | 6 | Large, needs careful writing |
| NEW docs | 5 | Large, original content |
| KEEP (no work) | 14 | None |
| MOVE | 1 | Trivial |

## Execution Order

1. PATH updates (batch find-replace across 8 files)
2. schema-reference.md REWRITE (regenerate from current schema)
3. docs/README.md REWRITE (new doc index)
4. NEW: core-questions.md, example-data-walkthrough.md, domain-guide.md
5. taxonomy-design.md REWRITE
6. getting-started.md UPDATE
7. Remaining UPDATE files (batch)
8. portfolio-and-shared-services.md REWRITE
9. enterprise-architecture.md REWRITE
10. multi-product-schema-design.md REWRITE
11. NEW: creating-a-domain.md
12. Marketing updates
