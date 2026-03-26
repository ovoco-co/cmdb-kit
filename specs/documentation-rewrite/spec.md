# Documentation Rewrite for Core + Domains

**Status**: Blocked
**Updated**: 2026-03-26
**Priority**: High
**Blocked by**: Core + Domains restructure

### What's done
- Current docs complete for tier-based model (Setup, Concepts, Schema Design, Configuration Management, Governance, Data, Internals)
- Documentation audit complete
- Doc separation done (core CMDB vs integration)
- Outline v3 started
- Origin story ready (short, medium, long versions)
- Blog outline: 21 posts planned, Post 21 (SCCM domain) drafted
- Whitepaper PDF generated (needs design)

### What's pending
- Full rewrite of all docs for Core + Domains framing
- Per-domain documentation (one README per domain)
- Updated schema design guide reflecting domain architecture
- Marketing content: 20 remaining blog posts
- Whitepaper redesign with proper layout

## Overview

Comprehensive documentation restructure to reflect the Core + Domains architecture. Every doc that references "base/extended/enterprise" needs rewriting. The new docs explain Core as the starting point and domains as opt-in additions, with each domain getting its own documentation section.

## Why

The documentation is the product for an open-source schema kit. If the docs still describe a three-tier model after the schema moves to Core + Domains, users will be confused and adoption will stall. The docs rewrite is as critical as the schema restructure itself.

## Scope

- Core documentation: Setup, Concepts, Schema Design, Configuration Management, Governance
- Per-domain docs: README, type reference, example data guide, adapter notes
- Integration docs: JSM setup, ServiceNow setup, validation, data management
- Marketing: Blog posts, whitepaper, origin story
- API reference: Expand per-domain coverage

## Dependencies

- Blocked by: Core + Domains restructure (can't rewrite docs for a schema that isn't final)
- Blocks: Product launch, marketing campaigns, community adoption
