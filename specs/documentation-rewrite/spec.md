# Documentation Rewrite for Core + Domains

**Feature Branch**: documentation-rewrite
**Created**: 2026-03-26
**Status**: Done (PR #3 merged 2026-03-28)
**Input**: Documentation audit, Core + Domains restructure, origin story drafts, blog outline

## User Scenarios and Testing

### P1: New user understands the project and gets started

**Why this priority**: The documentation is the product for an open-source schema kit. If docs describe a three-tier model after the schema moves to Core + Domains, users will be confused and adoption will stall.

**Independent Test**: A person unfamiliar with cmdb-kit reads the docs and successfully installs Core on a test instance.

**Acceptance Scenarios**:

- Given a new user reads the documentation
  When they follow the setup guide
  Then all instructions reference Core + Domains (not base/extended/enterprise)
  And they can install Core schema on their target platform

- Given a user wants to add a domain
  When they read the per-domain README
  Then they understand what the domain provides, what types it adds, and how to install it

### P2: Existing user understands the migration from tiers to domains

**Why this priority**: Users on the old tier-based model need clear guidance on what changed and how to update.

**Independent Test**: Review migration documentation against actual schema differences.

**Acceptance Scenarios**:

- Given a user has the old base/extended schema installed
  When they read the migration section of the docs
  Then they understand how types moved from tiers to Core + Domains

### P3: Marketing content supports product launch

**Why this priority**: Blog posts, whitepaper, and origin story drive community adoption.

**Independent Test**: Review published content for accuracy against current architecture.

**Acceptance Scenarios**:

- Given the blog outline has 21 posts planned
  When blog posts are published
  Then they accurately describe the Core + Domains architecture

## Edge Cases

- Documentation references to legacy tier names (base, extended, enterprise) that were missed during rewrite
- Per-domain docs that reference Core types which changed during restructure
- Screenshots or examples that show old schema structure
- Marketing content that makes claims not yet validated by competitive research

## Requirements

### Functional Requirements

- FR-001: Rewrite all core documentation for Core + Domains framing (Setup, Concepts, Schema Design, Configuration Management, Governance)
- FR-002: Create per-domain documentation (README, type reference, example data guide, adapter notes)
- FR-003: Update integration docs (JSM setup, ServiceNow setup, validation, data management)
- FR-004: Update schema design guide reflecting domain architecture
- FR-005: Complete marketing content (blog posts, whitepaper, origin story)

### Key Entities

- Core documentation: Setup, Concepts, Schema Design, Configuration Management, Governance
- Per-domain docs: README, type reference, example data guide, adapter notes
- Integration docs: JSM setup, ServiceNow setup, validation, data management
- Marketing: 21 blog posts, whitepaper PDF, origin story (short/medium/long)

## Scope

- Core documentation: Setup, Concepts, Schema Design, Configuration Management, Governance
- Per-domain docs: README, type reference, example data guide, adapter notes
- Integration docs: JSM setup, ServiceNow setup, validation, data management
- Marketing: Blog posts, whitepaper, origin story
- API reference: Expand per-domain coverage

## Dependencies

- Blocked by: Core + Domains restructure (can't rewrite docs for a schema that isn't final)
- Blocks: Product launch, marketing campaigns, community adoption

## Success Criteria

- SC-001: No documentation page references the old tier model (base/extended/enterprise) except in migration context
- SC-002: Every domain has its own README with type reference and example data guide
- SC-003: A new user can follow the docs to install Core and at least one domain without external help
- SC-004: Blog outline has 21 posts planned with at least one (Post 21, SCCM domain) drafted

## Assumptions

- Core + Domains schema is finalized before documentation rewrite begins
- The whitepaper will be redesigned with proper layout after content is written
- Blog posts will be published incrementally, not all at once
- Origin story exists in short, medium, and long versions for different contexts
