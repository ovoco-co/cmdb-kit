# Spec Gaps to Address

The current spec.md covers the schema reorganization (Core + Domains + Portfolio) but is missing the ServiceNow-specific work that motivated the restructure. These need to be incorporated:

## Missing from spec

### 1. ServiceNow Adapter Tier Model
The adapter uses a three-tier approach that the restructure affects:
- Tier 1 OOTB: Server, VM, Network Segment, Hardware Model map to native ServiceNow tables with existing identification rules
- Tier 2 Custom CI: Product, Feature, Assessment, Product Component are custom CI classes (u_cmdbk_* or x_cmdbk_*) with independent identification rules using CMDB Instance API
- Tier 3 Standalone: Product Version, Document, Deployment, all lookups use Table API (not CIs)

The domain restructure changes which types are Tier 2 custom CIs and how they're organized in the scoped app.

### 2. Overlay Architecture
Both adapters use overlay.json files for platform-specific field mapping. The restructure requires overlay rewrites for Core + domain organization. The overlay must support loading from multiple directories (core + selected domains).

### 3. CSDM Alignment for EA Domain
The EA domain's Service type needs alignment with ServiceNow's Common Service Data Model (CSDM). Key question: does EA need Application Service as a separate type between Business Service and Product CIs? CSDM has this layer. Decision affects whether Service maps to cmdb_ci_service_auto or a custom table.

### 4. Automation-to-Domain Mapping
23 automation patterns documented in automation-audit.md need mapping to domains. Core gets 14, Compliance gets 1, Licensing gets 1, Distribution gets 2. Each domain README should include example automation code. No working code exists yet.

### 5. Plugin Roadmap Changes
- "Select tier" UI becomes "select domains" checklist
- Scoped app creates only custom CI classes for loaded domains
- Store packaging: base app installs Core, domain features could be additional modules
- DC plugin ships Core + government-relevant domains only (distribution, compliance, requirements)

### 6. Identification Rules
Schema sync must create identification rules (cmdb_identifier + cmdb_identifier_entry) for each Tier 2 custom CI class. This is new infrastructure the restructure introduces.

## Source files read
- schema-restructure-plan.md (read in full)
- servicenow-adapter-plan.md (read in full)
- WORK-PLAN.md (read in prior session)
- constitution.md (read in full)
- /tmp/restructure-sources.md (agent summary of all 9+ sources)

## What to do
Rewrite spec.md to incorporate these gaps. The spec should be the single source of truth for the restructure, replacing all the scattered wip files. After the spec is complete, run /speckit.plan and /speckit.tasks to generate the implementation plan and task list.
