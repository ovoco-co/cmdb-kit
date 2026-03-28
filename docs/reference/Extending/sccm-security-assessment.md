# SCCM Security Assessment

System Center Configuration Manager (SCCM, now Microsoft Configuration Manager or MECM) manages endpoints across most enterprise and government environments. It controls software deployment, OS imaging, patch management, and compliance policy. Despite this scope, SCCM infrastructure itself is rarely tracked in a CMDB. Security teams find SCCM misconfigurations during penetration tests, report them in PDFs, and the findings are forgotten within a quarter.

CMDB-Kit provides an SCCM domain extension (`schema/domains/sccm/`) that models SCCM infrastructure as configuration items so that security findings become persistent, trackable records tied to the specific site, role, or account they affect.


## Why SCCM Belongs in Your CMDB

SCCM is a Tier-0 management plane. If an attacker compromises the primary site server, they can push code to every managed endpoint in the environment. The site hierarchy, its roles, service accounts, and collection scoping are configuration decisions that directly affect your security posture.

Tracking SCCM in the CMDB means:

- Security findings link to the specific CI (a site role, a service account, a collection) rather than sitting in a standalone report
- Remediation progress is visible alongside every other infrastructure change
- Re-assessments can compare current state against previous findings
- Boundary groups and network segments connect SCCM topology to the rest of your infrastructure model


## SCCM CI Types

The SCCM domain extension adds seven CI types under the SCCM Infrastructure container. This is an opt-in domain in `schema/domains/sccm/`, not part of the core extended schema, because SCCM is a specialized domain that not every organization needs.

**SCCM Site** represents a site server in the hierarchy. Attributes include site code, version, and the site type (CAS, Primary, or Secondary). Primary sites can reference a parent site for hierarchies with a central administration site.

**SCCM Site Role** represents the roles installed on site system servers: Distribution Point, Management Point, Software Update Point, SMS Provider, Reporting Services Point, State Migration Point, and Enrollment Point. Each role references the site it belongs to and the server it runs on. The sslEnabled and pxeEnabled flags capture security-relevant configuration.

**SCCM Collection** represents device and user collections. Collections control which endpoints receive deployments, policies, and compliance baselines. The limiting collection self-reference captures the scoping hierarchy that determines effective membership.

**SCCM Security Role** tracks RBAC roles and their scopes. Whether a role is built-in or custom, and what security scope it operates in, determines who can do what across the SCCM hierarchy.

**SCCM Service Account** tracks the service accounts SCCM uses: Network Access Accounts, client push installation accounts, domain join accounts, and others. These accounts are the primary target in SCCM attack paths because their credentials are often recoverable from client policy or task sequence media.

**SCCM Boundary Group** links SCCM's content distribution topology to the network segments already modeled in your CMDB.

**SCCM Finding** records a specific misconfiguration or attack path. Each finding references its category (CRED, ELEVATE, EXEC, RECON, or TAKEOVER), the assessment that discovered it, the site it affects, and a remediation description.


## Misconfiguration Manager Attack Categories

The SCCM Finding Category lookup uses the taxonomy from the Misconfiguration Manager project, which catalogs known SCCM attack techniques:

**CRED** - Credential access. Techniques that harvest accounts or secrets from SCCM. The most common finding is recoverable Network Access Account credentials from client policy (CRED-1).

**ELEVATE** - Privilege escalation. Techniques that abuse SCCM's trust relationships to gain higher privileges, such as relay attacks against site systems or abuse of automatic site assignment.

**EXEC** - Remote code execution. Techniques that use SCCM's deployment mechanisms to execute code on managed endpoints. Client push installation to domain controllers (EXEC-1) is a frequent finding.

**RECON** - Reconnaissance. Techniques that enumerate SCCM infrastructure, collections, deployments, and permissions. Anonymous access to the SMS Provider WMI namespace is a common finding.

**TAKEOVER** - Site takeover. Techniques that compromise the entire SCCM hierarchy, typically by targeting the site server or database.


## Assessment Workflow

1. Create an Assessment record with type "SCCM Security Review"
2. Populate SCCM Site, Site Role, Collection, Security Role, Service Account, and Boundary Group records from the target environment
3. Run your collection tool against the environment
4. Create SCCM Finding records for each discovered misconfiguration, linking each to the specific CI it affects
5. Track remediation through the Assessment Status lifecycle (Planned, In Progress, Complete, Remediation)

Because findings are CI records linked to specific SCCM infrastructure, re-running the assessment on the same environment produces a comparable set of records. You can see which findings persisted, which were remediated, and whether new ones appeared.


## Common Findings

| Technique | Category | Typical Severity | Description |
|-----------|----------|-----------------|-------------|
| CRED-1 | CRED | High | NAA credentials recoverable from client policy |
| CRED-2 | CRED | High | Task sequence media contains domain credentials |
| EXEC-1 | EXEC | Critical | Client push configured with admin rights on DCs |
| EXEC-2 | EXEC | High | Application deployment configured for all systems |
| ELEVATE-1 | ELEVATE | Critical | NTLM relay to SCCM enrollment endpoint |
| RECON-1 | RECON | Medium | Anonymous read access to SMS Provider |
| TAKEOVER-1 | TAKEOVER | Critical | Passive site configured to accept unverified data |


## Mapping ConfigManBearPig Output

ConfigManBearPig (by SpecterOps) maps SCCM misconfigurations and attack paths into BloodHound. Its node types map to CMDB-Kit types:

| ConfigManBearPig Node | CMDB-Kit Type |
|-----------------------|---------------|
| SMS Site | SCCM Site |
| Site System (DP, MP, SUP) | SCCM Site Role |
| Collection | SCCM Collection |
| User / Group (with SCCM role) | SCCM Security Role |
| Client Push Account | SCCM Service Account |

The findings ConfigManBearPig surfaces (credential access paths, relay opportunities, deployment scope issues) map to SCCM Finding records with the appropriate category.


## References

- [Misconfiguration Manager](https://github.com/subat0mik/Misconfiguration-Manager) - SCCM attack technique catalog
- [ConfigManBearPig](https://github.com/yourspecteropscollector) - SCCM attack path collector for BloodHound
- [SCCM Hierarchy Design](https://learn.microsoft.com/en-us/mem/configmgr/core/plan-design/hierarchy/design-a-hierarchy-of-sites) - Microsoft's site hierarchy documentation
