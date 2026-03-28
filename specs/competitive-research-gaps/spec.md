# Competitive Research Gaps

**Feature Branch**: `012-competitive-research`
**Status**: Complete (2026-03-28). All 18 tasks evaluated. CSDM 5.0 is the main finding.
**Priority**: High (blocks public claims and LinkedIn posting)
**Created**: 2026-03-28

## The Problem

We built and shipped CMDB-Kit 2.0 (11 PRs, Core + Domains, documentation rewrite) on top of incomplete competitive research. The research plan (competitive-research-needed.md) was written but not fully executed. Multiple items were flagged as "needs deeper investigation" and never followed up. Our public claims ("nobody bridges product delivery with ITSM CMDBs") may be wrong.

This must be resolved before any public positioning (blog posts, LinkedIn, README claims).

## What Was Checked (and how deeply)

| Source | Items Found | Depth | Gaps |
|--------|------------|-------|------|
| Atlassian Marketplace | 19 apps | Title and short description only | 4 apps dismissed without reading feature pages, 15 spot-checked by description only |
| ServiceNow Store | 12 results | Title and short description via Playwright | EY Back to Baseline never evaluated, CSDM v4/v5 not checked |
| GitHub | 23 repos | README-level | Industrace never evaluated |
| Books | 8 read | Thorough | None |
| Boeing GSEP | 9 docs | Thorough | Docs are 2019-2022, may be outdated |
| Google Scholar | 19 papers | Abstract-level | None fully read |
| PLM tools | 0 evaluated | Not started | Arena, Aras, Windchill, Teamcenter |
| ServiceNow plugins | 0 checked | Not started | Platform plugins beyond Store |
| CSDM current state | Not checked | Not started | v4/v5 may have product delivery features |

## Tasks

### Phase 1: Close flagged Atlassian Marketplace gaps

**Task 1.1**: Evaluate Device42 CMDB integration
- Open full marketplace page
- Read feature list
- Answer the 8 evaluation questions from competitive-research-needed.md
- Document findings

**Task 1.2**: Evaluate Simply Asset Management and CMDB (SimplyIT.cloud)
- "Stakeholder value delivery" needs investigation
- Same 8 questions

**Task 1.3**: Evaluate CMDB Change Policy Framework (Adaptavist)
- Check for baseline or configuration status accounting features

**Task 1.4**: Evaluate IT Assets License (DevSamurai)
- Check if it tracks software versions deployed to specific locations

**Task 1.5**: Spot-check top 5 Marketplace apps by install count
- Verify none have hidden product tracking features beyond their short descriptions

**Task 1.6**: Evaluate Configuration Manager for Jira (CMJ)
- What does it actually do? Is it tradition 2 CM on Jira?

### Phase 2: Close flagged ServiceNow gaps

**Task 2.1**: Evaluate EY "Back to Baseline" for ITx
- What does "back to baseline" mean in their context?
- Is it configuration baselines or IT transformation baselines?

**Task 2.2**: Check CSDM v4/v5 documentation
- Has ServiceNow added product delivery concepts since 2022?
- Is there a Product class or Deployment Site equivalent in current CSDM?

**Task 2.3**: Search ServiceNow Community and Share
- Community-built solutions for product delivery tracking
- Shared scoped apps or update sets

**Task 2.4**: Check ServiceNow platform plugins
- Beyond the Store, are there OOTB plugins for release tracking?

### Phase 3: Evaluate PLM tools

**Task 3.1**: Arena PLM
- Does it handle software deployment tracking?
- Does it connect to ServiceNow or JSM?

**Task 3.2**: Aras Innovator
- Same questions
- Has anyone used it for software CM?

**Task 3.3**: Windchill and Teamcenter
- Same questions
- Are these hardware-only or do they cover software delivery?

### Phase 4: Evaluate open source alternatives

**Task 4.1**: Industrace
- Read the full README and schema
- Does it track deployed configurations at sites?
- How does its schema compare to cmdb-kit Core?

**Task 4.2**: Re-search GitHub with refined terms
- "product deployment tracking CMDB"
- "software baseline configuration management"
- "deployment site version tracking"

### Phase 5: Current state refresh

**Task 5.1**: Check ITIL 4 SACM practice guide
- Has it been updated with product delivery concepts?

**Task 5.2**: Search defense-specific CMDB solutions
- NDIA CM Division resources
- CMPIC community
- Defense contractor tools/approaches

**Task 5.3**: Check if any new entrants appeared since our research
- Search "product delivery CMDB" on Google
- Check Product Hunt, Hacker News for recent launches

### Phase 6: Update claims

**Task 6.1**: Revise problem-statement.md based on findings
- Strengthen or weaken claims with new evidence
- If competitors found, document what they do and don't do

**Task 6.2**: Revise README.md if needed
- Adjust positioning based on competitive reality

**Task 6.3**: Update competitive-research-results.md
- Close every "NEEDS" item
- Remove "ASSUMED" qualifiers with verified conclusions

## Evaluation Criteria (for each tool)

From competitive-research-needed.md:
1. Does it track what products exist and what versions have been released?
2. Does it track where products are deployed and what version is at each site?
3. Does it track baselines (approved configurations at a point in time)?
4. Does it work on JSM Assets or ServiceNow?
5. Is it open source?
6. What does it cost?
7. What does it do that CMDB-Kit doesn't?
8. What does CMDB-Kit do that it doesn't?

## Success Criteria

- Every "NEEDS" and "ASSUMED" in competitive-research-results.md is resolved
- Every item in competitive-research-needed.md is evaluated
- Problem statement claims are backed by verified evidence, not assumptions
- If a competitor is found, it's documented honestly
