# Feature Specification: Documentation Rewrite

**Feature Branch**: `003-documentation-rewrite`
**Created**: 2026-03-28
**Status**: Planning. New journey docs written. Reference docs need substantive updates, not mechanical find-and-replace.

## The Problem

The documentation suite (47 reference docs, ~17,800 lines) was written for the base/extended/enterprise tier model. The 002-core-domains-restructure work changed the schema architecture to Core + Domains. The docs are wrong in ways that a find-and-replace cannot fix:

- Types moved between tiers (Feature, Deployment Site, Baseline promoted to Core)
- Types gained new attributes (Product Version +approvedBy/approvalDate/releaseNotes, Person +phone/jobTitle/manager, Document +product/version)
- The tier comparison model no longer exists (there are no "three layers" to compare)
- Domain-specific types are organized by team, not by tier level
- Example data changed (new customer orgs, enriched records)

## What Was Done Already

- 10 new journey docs written (problem-statement through extending, plus schema-reference)
- CHANGELOG.md created
- 2 blog post drafts created
- Old docs moved to docs/reference/
- 4 agents launched to do mechanical terminology replacement (insufficient)

## What Needs to Be Done

Each reference doc needs to be read completely, analyzed for what's substantively wrong (not just terminology), and updated with accurate content.

### Analysis Needed Per File

For each of the 47 reference docs, determine:
1. What specific claims about types, tiers, or attributes are now wrong?
2. What tables or lists need restructuring (not just word replacement)?
3. What examples reference types that moved or gained attributes?
4. What sections describe the tier upgrade path that no longer exists?
5. What content is still perfectly accurate and should not be touched?

### Categories of Work

**Category A: Path-only** - File only has `schema/base` in commands. Replace with `schema/core`. No content changes.

**Category B: Terminology** - File mentions "base/extended/enterprise" in passing. Replace with "Core/domains/portfolio mode". Content is otherwise accurate.

**Category C: Structural** - File has tables, lists, or sections organized around the tier model. These need to be restructured around Core + Domains. Types that moved need their descriptions updated.

**Category D: Rewrite section** - Specific sections within the file are built on the tier model and need substantial rewriting while preserving the domain knowledge.

## Plan

### Phase 1: Analyze

Read every reference doc. Categorize each as A, B, C, or D. For C and D files, list the specific sections that need work and what the correct content should be.

### Phase 2: Execute Category A and B

Batch the easy files. These are mechanical.

### Phase 3: Execute Category C

One file at a time. Read the file, identify the structural changes, make them carefully.

### Phase 4: Execute Category D

The hard ones. taxonomy-design.md, portfolio-and-shared-services.md, schema-reference.md, case-study-ovococrm.md. Each needs careful work to preserve the knowledge while updating the framing.

### Phase 5: Verify

Read every updated doc to confirm accuracy against the current schema files.

## Dependencies

- Schema files at schema/core/ and schema/domains/ (the source of truth)
- core-definition.md (what questions Core answers)
- domain-definitions.md (what types are in which domain)
- The 4 background agents that are doing mechanical replacement right now (their work needs review)
