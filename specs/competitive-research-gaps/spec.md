# Competitive Research Gaps

**Feature Branch**: competitive-research-gaps
**Created**: 2026-03-28
**Status**: Complete (2026-03-28). All 18 tasks evaluated. CSDM 5.0 is the main finding.
**Input**: competitive-research-needed.md, competitive-research-results.md

## User Scenarios and Testing

### P1: Product owner validates public claims before publishing

**Why this priority**: Public claims ("nobody bridges product delivery with ITSM CMDBs") may be wrong. Incorrect positioning undermines credibility and blocks LinkedIn posting and blog content.

**Independent Test**: Review all competitive research sources and evaluate each flagged gap against the 8 evaluation criteria.

**Acceptance Scenarios**:

- Given the Atlassian Marketplace has 19 apps previously reviewed at title level only
  When each flagged app (Device42, SimplyIT, Adaptavist, DevSamurai, CMJ) is evaluated against the 8 evaluation questions
  Then findings are documented with verified conclusions, not assumptions

- Given ServiceNow Store results include unevaluated items (EY Back to Baseline, CSDM v4/v5)
  When each gap is researched through documentation, community, and platform plugins
  Then every "NEEDS" and "ASSUMED" qualifier in competitive-research-results.md is resolved

- Given PLM tools (Arena, Aras, Windchill, Teamcenter) were never evaluated
  When each is checked for software deployment tracking and CMDB integration
  Then findings are documented honestly, including any overlap with cmdb-kit

### P2: Product owner updates positioning based on findings

**Why this priority**: Claims must be backed by evidence before any marketing content ships.

**Independent Test**: Compare revised problem-statement.md and README.md against research findings.

**Acceptance Scenarios**:

- Given all research gaps are closed
  When competitive-research-results.md is updated
  Then every "NEEDS" item is closed and every "ASSUMED" qualifier is replaced with a verified conclusion

- Given a competitor is found (e.g., CSDM 5.0 product delivery features)
  When problem-statement.md is revised
  Then the competitor is documented honestly and claims are adjusted accordingly

## Edge Cases

- A tool may have hidden product tracking features not visible in short descriptions (addressed by Task 1.5 spot-check)
- CSDM v5 may have added product delivery concepts since 2022, changing the competitive landscape
- PLM tools may cover software delivery but not connect to ITSM CMDBs, making them partial competitors
- Defense-specific solutions may exist in closed communities (NDIA, CMPIC) not visible on public search
- New entrants may have appeared since original research was conducted

## Requirements

### Functional Requirements

- FR-001: Evaluate all flagged Atlassian Marketplace apps (Device42, SimplyIT, Adaptavist, DevSamurai, CMJ) against the 8 evaluation criteria
- FR-002: Evaluate EY "Back to Baseline" for ITx on ServiceNow Store
- FR-003: Check CSDM v4/v5 documentation for product delivery concepts
- FR-004: Search ServiceNow Community and Share for community-built solutions
- FR-005: Check ServiceNow platform plugins beyond the Store
- FR-006: Evaluate PLM tools (Arena, Aras, Windchill, Teamcenter) for software deployment tracking
- FR-007: Evaluate Industrace and re-search GitHub with refined terms
- FR-008: Check ITIL 4 SACM practice guide for updates
- FR-009: Search defense-specific CMDB solutions (NDIA, CMPIC)
- FR-010: Check for new entrants since original research
- FR-011: Revise problem-statement.md, README.md, and competitive-research-results.md based on findings

### Key Entities

- Evaluation Criteria (8 questions from competitive-research-needed.md)
- competitive-research-results.md (findings document)
- problem-statement.md (public positioning)

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

## Research Coverage

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

## Success Criteria

- SC-001: Every "NEEDS" and "ASSUMED" in competitive-research-results.md is resolved with verified conclusions
- SC-002: Every item in competitive-research-needed.md is evaluated against the 8 evaluation criteria
- SC-003: Problem statement claims are backed by verified evidence, not assumptions
- SC-004: If a competitor is found, it is documented honestly with what it does and does not do

## Assumptions

- Atlassian Marketplace app pages are publicly accessible without purchase
- ServiceNow CSDM documentation is available through docs.servicenow.com
- PLM vendor websites have sufficient public information for evaluation
- Defense-specific resources (NDIA, CMPIC) have publicly accessible materials
