# Core Schema Definition

**Purpose**: Map every Core Question from the constitution to the types and attributes that answer it. If a question can't be answered, identify what's missing.

**Method**: Start from questions, derive types. Not from existing schema, derive questions.

## Product Identity

| Question | Type | Attributes Needed | Currently Exists? |
|----------|------|-------------------|-------------------|
| What products do we manage? | Product | name, description, status, owner | Yes (base) but no owner attribute |
| What components make up each product? | Product Component | name, type, product (ref), description | Yes (base) but product ref needs verification |
| Who owns each product? | Product | owner (ref to Person or Team) | Missing. No owner attribute on Product. |

**Gaps**: Product has no owner attribute. Need to add owner (ref to Person) or owningTeam (ref to Team).

## Version and Release

| Question | Type | Attributes Needed | Currently Exists? |
|----------|------|-------------------|-------------------|
| What is the current version of this product? | Product Version | name, product (ref), status, releaseDate | Yes (base) |
| What versions have been released? | Product Version | (query by product ref) | Yes |
| What changed between this version and the last one? | Product Version | releaseNotes or changelog | Missing. No way to describe what changed. |
| What features are included in this version? | Feature | name, product (ref), version (ref), description | Exists in extended but Feature has no product ref (schema-critique #5) |
| Who approved this release? | Product Version | approvedBy (ref to Person), approvalDate | Missing. No approval tracking on versions. |

**Gaps**: No releaseNotes/changelog on Product Version. Feature is disconnected from Product. No approval tracking (approvedBy, approvalDate) on Product Version.

## Deployment

| Question | Type | Attributes Needed | Currently Exists? |
|----------|------|-------------------|-------------------|
| Where is this product deployed? | Deployment Site | name, location, organization | Extended only. Not in base. |
| What version is running at each site? | Deployment Site | version (ref to Product Version), product (ref) | Extended only |
| What environment is each deployment? | Deployment | environment (ref to Environment Type) | Yes (base) but Deployment is not Deployment Site |
| What infrastructure supports each deployment? | Relationships | Server/Database/VM linked to Deployment Site | No native relationship mechanism in base |
| When was the last deployment? | Deployment Site | lastDeploymentDate | Missing |
| Who performed the deployment? | Deployment Site | deployedBy (ref to Person) | Missing |
| Is this site current or behind? | Deployment Site | version + comparison to current Product Version | Requires query logic, not just attributes |

**Gaps**: Deployment Site is not in base. Deployment (base) tracks "a version deployed to an environment" but not "a version deployed to a customer site." Missing: lastDeploymentDate, deployedBy. No way to determine if a site is current without comparing version refs.

**Critical issue**: Base schema has Deployment (version + environment) but not Deployment Site (customer location where the product lives). These are different concepts. A Deployment is an event. A Deployment Site is a persistent record of what's installed where.

## Baselines

| Question | Type | Attributes Needed | Currently Exists? |
|----------|------|-------------------|-------------------|
| What is the approved configuration at this point in time? | Baseline | name, type, status, product (ref), version (ref) | Extended only. Not in base. |
| What's in the baseline? | Baseline | components (ref list), documents (ref list) | Missing. Baseline has no content refs. |
| When was the baseline established? | Baseline | establishedDate | Missing |
| Who approved the baseline? | Baseline | approvedBy (ref to Person), approvalDate | Missing |
| What changed since the last baseline? | Baseline | (comparison query between baselines) | Requires query logic |

**Gaps**: Baseline is not in base. Even in extended, Baseline has no content references (what versions, components, and documents it contains). No approval tracking. No establishment date distinct from creation date.

## Dependencies

| Question | Type | Attributes Needed | Currently Exists? |
|----------|------|-------------------|-------------------|
| What does this product depend on? | Relationships | Product depends on Product/Database/Service | No relationship mechanism in schema files |
| What depends on this product? | Relationships | reverse query | Same |
| If this server goes down, what products are affected? | Relationships | Product runs on Server | Same |
| If this database goes down, what deployments break? | Relationships | Product depends on Database | Same |

**Gaps**: The schema defines types and attributes but has no native way to express relationships. Relationships are defined in adapter-specific files (relationships.json for ServiceNow). JSM Assets expresses relationships as reference attributes. This is a platform-specific concept that the schema layer doesn't capture.

**Question for the plan**: Should Core define relationships in schema files, or leave them to adapters?

## People and Responsibility

| Question | Type | Attributes Needed | Currently Exists? |
|----------|------|-------------------|-------------------|
| Who is responsible for this product? | Product | owner (ref to Person) | Missing |
| Who is the POC at each deployment site? | Deployment Site | sitePOC (ref to Person) | Extended only, and POC attribute needs verification |
| What team supports this deployment? | Deployment Site | supportTeam (ref to Team) | Missing |
| Who do I call when something breaks? | Deployment Site | sitePOC + phone/email on Person | Person has no phone or jobTitle (schema-critique #6) |

**Gaps**: Product has no owner. Person is thin (missing phone, jobTitle, manager). Deployment Site needs POC and support team refs. All in extended, not base.

## Documents

| Question | Type | Attributes Needed | Currently Exists? |
|----------|------|-------------------|-------------------|
| What controlled documents exist for this product? | Document | name, type, state, product (ref) | Yes (base) but product ref needs verification |
| What version of the document applies to this release? | Document | version (ref to Product Version) | Missing. Documents aren't linked to product versions. |
| Is the document current or superseded? | Document | state (ref to Document State) | Yes (base) |

**Gaps**: Documents exist in base but aren't linked to specific product versions. A document should reference both the product it belongs to and the version it applies to.

## Summary of What Core Needs

### Types that must be in Core (currently missing from base)
- **Deployment Site** (from extended) - persistent record of what's installed at a customer location
- **Baseline** (from extended) - approved configuration at a point in time

### Attributes missing from existing types
- Product: owner (ref to Person or Team)
- Product Version: approvedBy, approvalDate, releaseNotes
- Feature: product (ref to Product) - schema-critique #5
- Person: phone, jobTitle, manager (self-ref) - schema-critique #6
- Deployment Site: sitePOC, supportTeam, lastDeploymentDate, deployedBy
- Baseline: approvedBy, approvalDate, establishedDate, content refs (versions, components, documents)
- Document: version (ref to Product Version)

### Structural gaps
- No relationship definitions in the schema layer (relationships are adapter-specific)
- Deployment (event) vs Deployment Site (persistent state) confusion
- Baseline has no way to express what it contains

### What can stay out of Core (domain material)
- License, Certification, Assessment (compliance/licensing domains)
- SLA, Distribution Log, Product Media (specialized domains)
- Enterprise Architecture types (Service, Capability)
- Financial types (Contract, Cost Category)
- Requirements types (Requirement, Verification Method)
