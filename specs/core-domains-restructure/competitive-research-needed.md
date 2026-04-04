# Competitive Research Needed

Before finalizing the problem statement and domain model, we need to verify our claim that no existing tool solves the product delivery CMDB problem. Research these sources:

## Marketplaces to Search

### Atlassian Marketplace
- Search: CMDB, configuration management, deployment tracking, version tracking, baseline management, product delivery
- Look at JSM Assets apps specifically
- Look at Forge apps for Assets
- Check what Configuration Manager for Jira (CMJ) actually does

### ServiceNow Store
- Search: product delivery, deployment tracking, baseline management, software distribution
- Check what CSDM implementation apps exist
- Check what exists beyond the OOTB CMDB
- Check ServiceNow plugins (not just Store apps) that extend CMDB for product/release tracking

### GitHub
- Search: CMDB, configuration management database, product delivery tracking, deployment tracking, baseline management
- Look for open source projects solving similar problems
- Check if anyone has built JSM Assets schemas or ServiceNow scoped apps for product tracking

## Specific Tools to Evaluate

From the user's competitive landscape list, these are closest to our problem space:

### PLM Tools (software-focused)
- Arena PLM - cloud-native, supply chain config. Does it handle software deployment tracking?
- Aras Innovator - highly customizable. Has anyone used it for software CM?

### ITAM Tools
- Snipe-IT - open source ITAM. How far does it go for software version tracking?
- Deel IT - device config management. Any overlap?

### Requirements + Traceability
- StrictDoc - requirements as code. Does it connect to deployment state?
- Doorstop - YAML requirements in Git. Any CMDB integration?

### IaC + State Management
- Configu - config variable management. Different problem but adjacent.
- Steampipe - cloud config as SQL. Could this be an adapter target?

## What We're Looking For

For each competing tool, answer:
1. Does it track what products exist and what versions have been released?
2. Does it track where products are deployed and what version is at each site?
3. Does it track baselines (approved configurations at a point in time)?
4. Does it work on JSM Assets or ServiceNow?
5. Is it open source?
6. What does it cost?
7. What does it do that CMDB-Kit doesn't?
8. What does CMDB-Kit do that it doesn't?

## Why This Matters

If something already solves this problem well, we should know about it. Either we're competing with it (need to differentiate), complementing it (need to integrate), or it validates that the problem is real (market exists). Claiming "no CMDB does this" without checking is a liability.
