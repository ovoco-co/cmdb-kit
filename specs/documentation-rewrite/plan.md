# Documentation Rewrite Plan

## Architecture Decisions

### Documentation is the product

For an open-source schema kit, the documentation is the primary user interface. If the docs describe a three-tier model after the schema moves to Core + Domains, users will be confused and adoption will stall. The documentation rewrite is as critical as the schema restructure itself.

### Every tier reference must be replaced

Every occurrence of "base", "extended", and "enterprise" in the documentation needs rewriting. The new vocabulary is:

| Old term | New term |
|----------|----------|
| base schema | Core |
| extended schema | Core + domains |
| enterprise schema | Portfolio mode |
| three tiers | Core + Domains |
| "pick a tier" | "start with Core, add domains" |

### Per-domain documentation

Each domain gets its own documentation section with:

- README.md in the domain directory (pitch, types, UAF alignment, platform plugin comparison, example data description)
- Type reference (attributes, relationships, lookup values)
- Adapter notes (platform-specific setup for the domain)
- Automation patterns (what automations to configure for the domain)
- DC vs Cloud feasibility notes per automation

### Documentation structure after rewrite

The current flat topic-based structure stays. The sections reorganize around Core + Domains:

```
docs/
+-- Setup/
|   +-- getting-started.md          (rewrite for Core + Domains)
|   +-- atlassian-cloud.md          (update commands for --schema schema/core)
|   +-- atlassian-data-center.md    (update commands)
|   +-- servicenow.md               (update commands)
|   +-- other-platforms.md          (update references)
+-- Concepts/
|   +-- cmdb-fundamentals.md        (update schema description)
|   +-- ci-selection.md             (update type counts, domain references)
|   +-- taxonomy-design.md          (rewrite for Core + Domains hierarchy)
|   +-- lookup-types.md             (update for Core lookup catalog)
|   +-- service-management-design.md (update for domain mapping)
+-- Schema-Design/
|   +-- building-the-product-library.md  (update for Core)
|   +-- definitive-media-library.md      (update for Distribution domain)
|   +-- designing-site-deployments.md    (update for Core)
|   +-- taxonomy-playbook.md             (rewrite for Core + Domains)
|   +-- schema-assessment.md             (update for domain selection)
|   +-- case-study-ovococrm.md           (update for Core + Domains narrative)
+-- Configuration-Management/          (mostly stable, minor updates)
+-- Governance/
|   +-- enterprise-architecture.md       (update for EA domain)
|   +-- portfolio-and-shared-services.md (update for Portfolio mode)
+-- Data/                              (update commands for --schema schema/core)
+-- Extending/
|   +-- sccm-security-assessment.md     (update for domain structure)
|   +-- writing-custom-adapters.md      (update for domain-aware adapters)
|   +-- multi-product-schema-design.md  (update for Portfolio mode)
+-- Internals/
|   +-- schema-reference.md             (rewrite for Core + Domains)
|   +-- file-naming-and-project-structure.md (rewrite for new directory structure)
|   +-- schema-changes.md              (update for domain workflow)
+-- integration/                       (update platform-specific guides)
```

### Marketing content

- Blog posts: each domain could be its own blog post (domain pitch, plugin comparison, example use case)
- Whitepaper: needs rewrite from three-tier to Core + Domains
- Origin story: three versions ready (short, medium, long), content stable

### Formatting rules

The existing documentation formatting rules stay:

- No em dashes, use hyphen or comma
- No ampersands as "and"
- No horizontal rules
- No numbered sections
- No tables of contents
- No bold in table cells
- Use "section" not "chapter"

## Implementation Approach

### Rewrite strategy

The rewrite is a two-pass process:

**Pass 1: Search and replace.** Find every reference to "base", "extended", "enterprise", tier-based paths (`schema/base/`, `schema/extended/`, `schema/enterprise/`), and tier-based commands (`--schema schema/base`). Replace with Core + Domains equivalents.

**Pass 2: Narrative rewrite.** Pages that explain the schema architecture need full narrative rewrites, not just search-and-replace. These include: getting-started.md, taxonomy-design.md, schema-reference.md, file-naming-and-project-structure.md, case-study-ovococrm.md.

### Cross-reference verification

After the rewrite, all cross-references between pages need verification. The current docs have relative path links that must still resolve after any file renames.

### README rewrite

The main README.md needs a complete rewrite for the Core + Domains pitch. The current README describes three tiers. The new README leads with "Core tracks what you ship and where it goes. Add domains for compliance, licensing, distribution, or whatever your program needs."

### CLAUDE.md update

CLAUDE.md needs updating for:

- New directory structure (schema/core/, schema/portfolio/, schema/domains/)
- New validation commands
- Updated type counts
- Domain-aware import commands
- New schema hierarchy description

## Phases

### Phase 1: Core documentation (blocked by schema restructure)

Rewrite all docs that describe the schema architecture. Update all commands and paths. This is the bulk of the work.

### Phase 2: Domain documentation

Write README.md for each domain. Add domain-specific sections to relevant concept and setup pages.

### Phase 3: Integration docs update

Update JSM Cloud, JSM Data Center, and ServiceNow integration docs for domain-aware workflows.

### Phase 4: Marketing content

Write domain-specific blog posts. Rewrite whitepaper for Core + Domains. Update website landing page copy.

### Phase 5: Quality review

Cross-reference verification. Consistency pass. Heading convention check. Final proofreading.

## Dependencies

- Blocked by: Core + Domains restructure (cannot rewrite docs for a schema that is not final)
- Blocks: Product launch, marketing campaigns, community adoption

## File Paths

All documentation files that need updating:

| Directory | Files | Scope |
|-----------|-------|-------|
| `docs/Setup/` | 5 files | Command and path updates |
| `docs/Concepts/` | 5 files | Architecture narrative rewrites |
| `docs/Schema-Design/` | 6 files | Schema description rewrites |
| `docs/Configuration-Management/` | 4 files | Minor updates |
| `docs/Governance/` | 4 files | EA domain and Portfolio mode updates |
| `docs/Data/` | 4 files | Command updates |
| `docs/Extending/` | 3 files | Domain structure updates |
| `docs/Internals/` | 3 files | Full rewrites for new structure |
| `docs/integration/` | 11 files | Platform-specific updates |
| `docs/whitepaper.md` | 1 file | Full rewrite |
| `docs/marketing/` | Multiple | Blog posts and content |
| `README.md` | 1 file | Full rewrite |
| `CLAUDE.md` | 1 file | Full rewrite |
| `schema/core/README.md` | 1 file (new) | Core schema documentation |
| `schema/portfolio/README.md` | 1 file (new) | Portfolio mode documentation |
| `schema/domains/*/README.md` | 8 files (new) | Per-domain documentation |
