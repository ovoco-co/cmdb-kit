# CMDB-Kit Problem Statement

**Updated**: 2026-03-27 after competitive research across marketplaces, books, Boeing GSEP docs, military standards, NASA, and scholarly papers.

## The Problem

Three disciplines manage different parts of the same product lifecycle using different tools, different vocabulary, and different communities that don't overlap.

**Software CM (tradition 3)**: Git, CI/CD pipelines, build systems. Manages source code, branching, builds, and releases. Knows what's in a release but not where it's deployed or whether the deployment matches an approved baseline. Tools: Git, Jenkins, ArgoCD, GitHub Actions. Community: developers, DevOps engineers.

**ITIL CMDB (tradition 1)**: ServiceNow, JSM Assets, BMC, iTop. Manages discovered infrastructure: servers, networks, applications, services. Knows what infrastructure exists and what services run on it. Has no concept of a software product version deployed to a customer site, an approved configuration baseline, or a media distribution chain of custody. Tools: ServiceNow Discovery, Tanium, SCCM. Community: IT service managers, CMDB admins, ServiceNow consultants. Books: Your CMDB Mantra, CMDB Systems, Configuration Management Expert Guidance (BCS).

**Defense/Manufacturing CM (tradition 2)**: EIA-649C, MIL-HDBK-61B, NATO ACMP-2009. Defines what needs to be tracked after a product is built: baselines (FBL, ABL, PBL), deployment configurations, change control boards, media distribution, requirements traceability, configuration audits. But this tradition lives in standards documents, spreadsheets, SharePoint lists, and custom solutions. There is no standard digital tool that implements these practices on modern platforms. Tools: spreadsheets, custom databases, paper. Community: defense configuration managers, systems engineers, program managers (NDIA, CMPIC, INCOSE).

## Evidence

### Marketplace research
- **Atlassian Marketplace**: 19 CMDB apps. All infrastructure discovery connectors or IT asset managers. None track software product versions deployed to customer sites.
- **ServiceNow Store**: 12 results for "deployment tracking baseline configuration management." Zero results for "product version release tracking." Closest match: EY Back to Baseline for ITx (IT transformation, not product delivery).
- **GitHub**: 23 open-source CMDB projects. All infrastructure-focused.

### Book research
Every CMDB book reviewed defines CMDB around infrastructure and IT services. CI categories: Server, Application, Database, Network. No Product, Version, Baseline, or Deployment Site. "Configuration Management" means different things in each tradition: defense people hear "baselines and deployment tracking," IT people hear "CMDB and service mapping," developers hear "Git branching."

### Boeing evidence
Boeing operates in all three traditions simultaneously with separate teams, tools, and governance:
- **GSEP** (tradition 1): ServiceNow CMDB with CSDM 3.0, discovery, change management. Explicitly excludes defense CM (PRO-1268) from scope.
- **BPG/CM** (tradition 2): Product baselines, specification trees, configuration identification per EIA-649.
- **GSEP DevSecOps** (tradition 3): ServiceNow platform development with Azure DevOps, Git, CI/CD.
- Boeing's "Product Model" in ServiceNow normalizes hardware catalogs (Dell PowerEdge, Intel Xeon). Not software products deployed to customer sites.
- Boeing's OBCM (capability map) is version-controlled with formal change management on SharePoint, separate from ServiceNow.

### Scholarly research
19 Google Scholar results for CMDB + product delivery (2018-2026). No paper specifically bridges ITIL CMDB with defense CM. Closest parallel: a 2024 LUT University thesis on managing deployed industrial automation equipment installed base data.

## The User

A configuration manager or technical lead on a program that ships software to customer sites. Defense contractor, government agency, or commercial company with on-premises deployments. They use ServiceNow or JSM Assets because that's what their organization runs. They track product versions, baselines, and deployment status in spreadsheets because the CMDB doesn't have these concepts.

## What CMDB-Kit Does

Puts defense CM concepts (Product, Version, Baseline, Deployment Site) into ITSM platforms (ServiceNow, JSM Assets) where they become native CIs connected to the infrastructure data that's already there.

Bridges the three traditions by:
- Starting where Git/CI/CD ends (product is built and released)
- Tracking what happens next (deployed to sites, baselined, approved)
- Storing that tracking where the infrastructure relationships already exist

## When CMDB-Kit is the Right Answer

- The organization already uses ServiceNow or JSM Assets
- They need to see relationships between their products and the infrastructure those products run on
- They ship software to multiple customer sites and need to track version status across the portfolio
- They have formal baseline and change control requirements (defense, government, regulated industries)

## When CMDB-Kit May Not Be the Right Answer

- Small programs with fewer than 10 deployment sites (spreadsheets work fine)
- No infrastructure tracking needed (standalone software packages with no server dependencies)
- The organization doesn't use ServiceNow or JSM Assets
- The team only needs deployment event tracking (ArgoCD, Octopus Deploy handle this)
- The problem is source code management, not post-release tracking (Git handles this)
