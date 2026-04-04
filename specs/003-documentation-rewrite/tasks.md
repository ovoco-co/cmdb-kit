# Documentation Rewrite Tasks

## Completed Prior Work

- [x] Current docs complete for tier-based model (all sections written)
- [x] Documentation audit complete (all passes done)
- [x] Doc separation done (core CMDB docs in docs/, integration docs in docs/integration/)
- [x] Outline v3 started
- [x] Origin story ready (short, medium, long versions in docs/marketing/)
- [x] Blog outline: 21 posts planned (docs/marketing/blog-outline.md)
- [x] Post 21 (SCCM domain) drafted
- [x] Whitepaper PDF generated (docs/whitepaper.md)
- [x] Person docs updated across all files
- [x] Adapter audit: stale cmdb_ci_appl refs fixed, column prefix issues fixed, help text cleanup
- [x] Enumeration removed from all prose

## Phase 1: Core Documentation Rewrite (blocked by schema restructure)

### Full narrative rewrites
- [ ] Rewrite `docs/Setup/getting-started.md` for Core + Domains workflow
- [ ] Rewrite `docs/Concepts/taxonomy-design.md` for Core + Domains hierarchy
- [ ] Rewrite `docs/Internals/schema-reference.md` for new schema structure
- [ ] Rewrite `docs/Internals/file-naming-and-project-structure.md` for new directory layout
- [ ] Rewrite `docs/Schema-Design/case-study-ovococrm.md` for Core + Domains narrative
- [ ] Rewrite `docs/Schema-Design/taxonomy-playbook.md` for domain selection guidance

### Search-and-replace updates
- [ ] Update `docs/Setup/atlassian-cloud.md`: paths from schema/base to schema/core, commands
- [ ] Update `docs/Setup/atlassian-data-center.md`: paths and commands
- [ ] Update `docs/Setup/servicenow.md`: paths and commands
- [ ] Update `docs/Setup/other-platforms.md`: tier references
- [ ] Update `docs/Concepts/cmdb-fundamentals.md`: schema description
- [ ] Update `docs/Concepts/ci-selection.md`: type counts, domain references
- [ ] Update `docs/Concepts/lookup-types.md`: Core lookup catalog
- [ ] Update `docs/Concepts/service-management-design.md`: domain mapping
- [ ] Update `docs/Schema-Design/building-the-product-library.md`: Core references
- [ ] Update `docs/Schema-Design/definitive-media-library.md`: Distribution domain reference
- [ ] Update `docs/Schema-Design/designing-site-deployments.md`: Core references
- [ ] Update `docs/Schema-Design/schema-assessment.md`: domain selection
- [ ] Update `docs/Configuration-Management/cm-operations.md`: minor updates
- [ ] Update `docs/Configuration-Management/change-control-governance.md`: minor updates
- [ ] Update `docs/Configuration-Management/personnel-management.md`: minor updates
- [ ] Update `docs/Configuration-Management/requirements-management.md`: Requirements domain reference
- [ ] Update `docs/Governance/enterprise-architecture.md`: EA domain reference
- [ ] Update `docs/Governance/portfolio-and-shared-services.md`: Portfolio mode terminology
- [ ] Update `docs/Governance/scaling-and-governance.md`: domain-aware governance
- [ ] Update `docs/Governance/it-asset-lifecycle.md`: Licensing domain reference
- [ ] Update `docs/Data/data-files-and-rules.md`: Core paths
- [ ] Update `docs/Data/editing-data.md`: Core paths
- [ ] Update `docs/Data/exporting-and-round-trip.md`: Core paths
- [ ] Update `docs/Data/validation-and-troubleshooting.md`: domain-aware validation commands
- [ ] Update `docs/Extending/sccm-security-assessment.md`: domain structure
- [ ] Update `docs/Extending/writing-custom-adapters.md`: domain-aware adapters
- [ ] Update `docs/Extending/multi-product-schema-design.md`: Portfolio mode terminology

### Top-level files
- [ ] Rewrite `README.md` for Core + Domains pitch
- [ ] Rewrite `CLAUDE.md` for new directory structure, commands, type counts, schema hierarchy

## Phase 2: Domain Documentation

### Core and Portfolio READMEs
- [ ] Write `schema/core/README.md`: Core pitch, type listing, quick start
- [ ] Write `schema/portfolio/README.md`: Portfolio mode explanation, when to use it

### Per-domain READMEs
- [ ] Write `schema/domains/compliance/README.md`: pitch, types, UAF alignment, plugin comparison
- [ ] Write `schema/domains/licensing/README.md`
- [ ] Write `schema/domains/distribution/README.md`
- [ ] Write `schema/domains/sla/README.md`
- [ ] Write `schema/domains/ea/README.md`
- [ ] Write `schema/domains/financial/README.md`
- [ ] Write `schema/domains/requirements/README.md`
- [ ] Update `schema/domains/sccm/README.md` for Core + Compliance dependency
- [ ] Update `schema/domains/README.md` with domain table and dependency map

## Phase 3: Integration Docs Update

- [ ] Update `docs/integration/jsm-cloud/setup.md` for domain-aware imports
- [ ] Update `docs/integration/jsm-data-center/setup.md` for domain-aware imports
- [ ] Update `docs/integration/common/change-management.md` for Core terminology
- [ ] Update `docs/integration/common/deployment-pipeline.md` for Core terminology
- [ ] Update `docs/integration/common/site-lifecycle.md` for Core terminology
- [ ] Update `docs/integration/common/deployment-handoff.md` for Core terminology
- [ ] Update `docs/integration/common/upgrade-and-distribution.md` for Distribution domain
- [ ] Update `docs/integration/common/dml-operations.md` for Distribution domain
- [ ] Update `docs/integration/common/air-gapped.md` for domain paths
- [ ] Update `docs/integration/common/integration-patterns.md` for domain-aware patterns
- [ ] Update `docs/integration/common/wiki-structure.md` for domain documentation
- [ ] Update `docs/integration/common/cloud-vs-dc.md` for domain references
- [ ] Update `docs/integration/common/api-references.md` for domain API patterns
- [ ] Update `docs/Setup/servicenow-scoped-app-guide.md` for domain-aware scoped app

## Phase 4: Marketing Content

- [ ] Write blog post: Core + Domains announcement (why the restructure, what changed)
- [ ] Write blog post: Compliance domain (replaces GRC, Vulnerability Response plugins)
- [ ] Write blog post: Licensing domain (replaces SAM Pro)
- [ ] Write blog post: Distribution domain (capability no CMDB plugin offers)
- [ ] Write blog post: EA domain (replaces CSDM implementation services)
- [ ] Write blog post: Requirements domain (traceability no CMDB offers)
- [ ] Write blog post: Financial domain (replaces ITFM)
- [ ] Rewrite `docs/whitepaper.md` for Core + Domains framing
- [ ] Update whitepaper PDF

## Phase 5: Quality Review

- [ ] Verify all cross-references between pages use correct relative paths
- [ ] Consistency pass: heading conventions, terminology, formatting rules
- [ ] Remove any remaining references to "base", "extended", "enterprise" tiers
- [ ] Remove stale references to Change Request and Incident types (removed from schema)
- [ ] Verify all code examples use correct schema paths (schema/core, not schema/base)
- [ ] Verify all npm script references are current
- [ ] Final proofreading pass

## Non-Doc Files with Stale schema/base References (found 2026-04-04)

These files are outside docs/ but still reference `schema/base` instead of `schema/core`:

- [ ] Fix `package.json` validate:base script (schema/base -> schema/core)
- [ ] Fix `CONTRIBUTING.md` schema/base references
- [ ] Fix `.claude/skills/validate/SKILL.md` schema/base references
- [ ] Fix `adapters/jsm/README.md` schema/base references
- [ ] Fix `adapters/servicenow/README.md` schema/base references
- [ ] Fix `adapters/servicenow/examples/README.md` schema/base references

## Code Review Items (from code-review-260324.md)

- [ ] Fix: docs still reference removed Change Request/Incident types (Medium, item 8). Audit all docs for stale process record references.
