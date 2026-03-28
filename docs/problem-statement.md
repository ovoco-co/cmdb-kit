# The Problem CMDB-Kit Solves

## Three Disciplines, One Lifecycle

Three disciplines manage different parts of the same product lifecycle. They use different tools, different vocabulary, and their communities don't overlap.

**Software CM** uses Git, CI/CD pipelines, and build systems. It manages source code, branching, builds, and releases. A CI/CD pipeline can tell you exactly which commits went into build 4.1.3, which tests passed, and when the artifact was published to a registry. But it cannot tell you which customer sites are running that build, whether those sites have been formally approved to operate on it, or whether the deployed configuration matches an approved baseline.

Tools include Git, Jenkins, ArgoCD, and GitHub Actions. The community is developers and DevOps engineers. Their definition of "configuration management" is version control and infrastructure-as-code.

**ITIL CMDB** uses ServiceNow, JSM Assets, BMC, and iTop. It manages discovered infrastructure: servers, networks, applications, services. It knows what infrastructure exists and what services run on it. It has no concept of a software product version deployed to a customer site, an approved configuration baseline, or a media distribution chain of custody.

Tools include ServiceNow Discovery, Tanium, and SCCM. The community is IT service managers, CMDB admins, and ServiceNow consultants. Their definition of "configuration management" is service mapping and change management tied to infrastructure CIs.

**Defense and Manufacturing CM** follows EIA-649C, MIL-HDBK-61B, and NATO ACMP-2009. It defines what needs to be tracked after a product is built: baselines (functional, allocated, product), deployment configurations, change control boards, media distribution, requirements traceability, and configuration audits. But this tradition lives in standards documents, spreadsheets, SharePoint lists, and custom solutions. There is no standard digital tool that implements these practices on modern platforms.

The community is defense configuration managers, systems engineers, and program managers. Their definition of "configuration management" is the one in EIA-649C: establishing and maintaining consistency of a product's attributes with its requirements and design throughout its life.

These three traditions cover the full lifecycle of a software product, from source code through build and release, into infrastructure deployment, and through formal baseline control. But no single tool spans all three. The handoff points between them, the moments when a built product leaves the CI/CD pipeline and enters the world of deployment sites, baselines, and change control boards, are exactly where tracking breaks down.

A development team finishes a release and publishes an artifact. What happens next? On which sites does it get deployed? Is the deployment approved? Does the running configuration match the approved baseline? These questions fall in the gap between the three traditions, and no existing tool answers them.


## The Evidence

A survey of existing tools, platforms, and communities confirms the gap. The evidence comes from marketplace searches, open-source repositories, published literature, and observation of where practitioners actually gather.

Atlassian Marketplace: 19 CMDB apps searched. All are infrastructure discovery connectors or IT asset managers. None track software product versions deployed to customer sites.

ServiceNow Store: 12 results for "deployment tracking baseline configuration management." Zero results for "product version release tracking."

GitHub: 23 open-source CMDB projects. All infrastructure-focused.

Every CMDB book reviewed defines CMDB around infrastructure and IT services. CI categories in the literature are Server, Application, Database, and Network. No Product, Version, Baseline, or Deployment Site.

"Configuration Management" means different things in each tradition. Defense people hear "baselines and deployment tracking." IT people hear "CMDB and service mapping." Developers hear "Git branching." The same two words describe three different practices, which makes it nearly impossible to search for tooling that bridges them. A search for "configuration management software" returns Git clients, CMDB platforms, and document control systems, but nothing that connects release artifacts to deployment sites and baselines.

These communities don't overlap. CMDB forums (r/servicenow, itSMF, HDI) are one tradition. Defense CM forums (NDIA CM Division, CMPIC, INCOSE, SAE) are another. A ServiceNow CMDB person doesn't attend NDIA CM Division meetings. A defense configuration manager doesn't post on r/servicenow. The terminology collision means they rarely even discover each other's tools and practices.

The result is that each tradition has mature tooling for its own concerns, but the space between them, where a built product gets deployed to customer sites and tracked against approved baselines, has no standard tooling at all. The gap persists because no single community owns it. Software CM stops at the release. ITIL CMDB starts at infrastructure discovery. Defense CM defines the requirements but doesn't provide the digital tooling.


## Who This Is For

CMDB-Kit is for a configuration manager or technical lead on a program that ships software to customer sites. Defense contractor, government agency, or commercial company with on-premises deployments. They use ServiceNow or JSM Assets because that's what their organization runs. They track product versions, baselines, and deployment status in spreadsheets because the CMDB doesn't have these concepts.

They know the CMDB has value for infrastructure tracking. They want to connect their product and deployment data to that infrastructure data. But the CMDB schema doesn't have types for what they need to track, and they don't have time to design a schema from scratch.

They may also be facing an audit or a program review where they need to demonstrate configuration control. The CMDB covers the infrastructure side, but the product deployment side is in a spreadsheet that one person maintains and nobody trusts. They need both sides in one system, with real relationships between them.


## What CMDB-Kit Does

CMDB-Kit puts defense CM concepts (Product, Version, Baseline, Deployment Site) into ITSM platforms (ServiceNow, JSM Assets) where they become native CIs connected to the infrastructure data that's already there.

It bridges the three traditions by:

- Starting where Git and CI/CD ends (the product is built and released)
- Tracking what happens next (deployed to sites, baselined, approved)
- Storing that tracking where the infrastructure relationships already exist

The schema is open source, database-agnostic, and designed to layer on top of existing CMDB implementations without replacing them. An organization keeps its current infrastructure discovery and service mapping. CMDB-Kit adds the product lifecycle types that are missing.

A Product Version CI in CMDB-Kit can reference the Application and Server CIs that already exist in the CMDB. A Deployment Site can reference the Location and Network CIs from infrastructure discovery. A Baseline ties a set of versions together and links to the change request that approved it. These are standard CMDB relationships, just applied to types that CMDBs have never included.

The result is that a program manager can query the CMDB and answer questions that previously required opening a spreadsheet: which sites are on the current baseline, which sites have unapproved configurations, and what infrastructure supports each deployment.


## When CMDB-Kit Is the Right Answer

CMDB-Kit fits when several conditions are true at once:

- The organization already uses ServiceNow or JSM Assets
- They need to see relationships between their products and the infrastructure those products run on
- They ship software to multiple customer sites and need to track version status across the portfolio
- They have formal baseline and change control requirements (defense, government, regulated industries)

The common pattern is a program office or engineering team that maintains a product deployed to dozens or hundreds of sites. Each site may be on a different version. Updates go through a formal change control process. The CMDB tracks the servers and networks at each site, but nobody can answer "which sites are still running version 3.2?" without opening a spreadsheet.

This is also the right answer when an organization wants to bring defense CM rigor to their existing ITSM platform. Rather than building a parallel tracking system, they extend the CMDB they already have with types and relationships that match EIA-649C concepts. The CMDB becomes the single source of truth for both infrastructure and product configuration.


## When CMDB-Kit May Not Be the Right Answer

Not every program needs this level of tracking. CMDB-Kit may not be the right fit when:

- Small programs with fewer than 10 deployment sites (spreadsheets work fine)
- No infrastructure tracking is needed (standalone software packages with no server dependencies)
- The organization doesn't use ServiceNow or JSM Assets
- The team only needs deployment event tracking (ArgoCD, Octopus Deploy handle this)
- The problem is source code management, not post-release tracking (Git handles this)

CMDB-Kit is intentionally narrow. It solves one specific problem: bridging the gap between software release and infrastructure deployment tracking inside ITSM platforms. If the problem is upstream (build and release) or the organization doesn't use an ITSM platform, other tools are a better fit. CMDB-Kit does not try to replace Git, CI/CD, or infrastructure discovery. It picks up where those tools leave off.
