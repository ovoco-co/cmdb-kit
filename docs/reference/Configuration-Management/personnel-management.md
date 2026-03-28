# Personnel Management

People are configuration items too. The CMDB does not replace HR systems, but it needs to know who owns which CIs, who leads which teams, who is the point of contact at which deployment site, and who has the certifications and clearances required for specific roles. This section covers the Directory branch of CMDB-Kit's schema: how to model organizations, teams, and people, how to extend the schema for posts and clearances, and how to use personnel data to drive operational decisions.


# Modeling Personnel in the CMDB

## When Personnel Data Belongs in the CMDB vs HR Systems

The CMDB tracks people in their role as CI stakeholders, not as employees. An HR system tracks salary, benefits, performance reviews, and employment status. The CMDB tracks: who owns this application, who leads this team, who is the site contact for this deployment, who authored this document, and who has the clearance required to access this facility.

The boundary is clear: if the data supports a configuration management or operational question, it belongs in the CMDB. If it supports a human resources question, it stays in the HR system.

In practice, this means Person records in the CMDB contain a subset of what HR knows: name, email, role, and team membership. They do not contain salary, start date, performance ratings, or personal contact information beyond what is needed for operational purposes.

## The Directory Branch: Organization, Team, Person

CMDB-Kit's Directory branch provides three types that model the organizational hierarchy:

Organization represents companies, departments, and divisions. In the Core schema with the directory domain:

```json
{
  "Name": "Ovoco Inc",
  "description": "Parent company for all Ovoco products",
  "orgType": "Company",
  "website": "https://ovoco.example.com",
  "parentOrganization": null
}
```

The `parentOrganization` attribute is self-referential, enabling hierarchical structures. Ovoco Inc is the Company. Ovoco Engineering and Ovoco Operations are Departments with `parentOrganization` set to "Ovoco Inc." This hierarchy can nest as deep as needed: Company, Division, Department, Branch.

Organization Type lookup values (Company, Department, Division, Vendor) classify the organizational unit. Military and government environments extend this with values like Agency, Program Office, Directorate, and Combatant Command.

Team represents functional groups within an organization:

```json
{
  "Name": "CRM Platform Team",
  "description": "Core platform and infrastructure team for OvocoCRM",
  "organization": "Ovoco Engineering",
  "teamLead": "Sarah Chen"
}
```

Team sits between Organization and Person in the hierarchy. A Team belongs to an Organization and has a Person as its team lead. This creates the chain: Organization > Team > Person.

Person represents individual team members:

```json
{
  "Name": "Sarah Chen",
  "description": "CRM Platform Team Lead",
  "firstName": "Sarah",
  "lastName": "Chen",
  "email": "sarah.chen@ovoco.example.com",
  "phone": "555-0101",
  "jobTitle": "Platform Team Lead",
  "role": "Team Lead",
  "team": "CRM Platform Team",
  "manager": "Michael Torres"
}
```

The `Name` attribute (built-in on all types) holds the display name. The `firstName` and `lastName` attributes enable sorting and searching by either name component. The `phone` attribute holds a work contact number for operational purposes. The `jobTitle` attribute records the person's formal title. The `manager` attribute is a self-reference to another Person, enabling reporting-chain queries without duplicating the HR org chart. The `role` attribute is free text in the Core schema, which provides flexibility but limits queryability. Organizations that need to query by role (show me all Engineering Leads) should consider making role a reference to a lookup type.

## Person as the Link Between People and CIs

Person records are referenced throughout the schema. In Core + domains, Person appears as:

- `Team.teamLead`: who leads the team
- `Assessment.assessor`: who performed the assessment (compliance domain)
- `Document.author`: who wrote the document
- `Deployment.deployedBy`: who executed the deployment
- `Distribution Log.distributedBy`: who distributed the media (distribution domain)
- `Product Version.approvedBy`: who approved the version
- `Deployment Site.sitePOC`: site point of contact
- `Deployment Site.deployedBy`: who deployed to the site
- `Baseline.approvedBy`: who approved the baseline

This makes Person the bridge between people and operational data. When you query "what has this person been involved in?", you can find their assessments, documents, deployments, and distributions.


# Posts and Positions

## What a Post Is (a Role That Needs Filling, Not a Person)

A Post is a named position in an organization that exists independently of the person filling it. "Site Lead at Acme Corp US-East" is a post. When Jane Smith fills it, the post has an incumbent. When Jane Smith transfers and the position is temporarily vacant, the post still exists.

This separation matters because organizational structure should survive personnel changes. If CI ownership is assigned to a person and that person leaves, the ownership assignment becomes stale. If CI ownership is assigned to a post and the person filling that post changes, the ownership assignment remains valid.

The Post type does not exist in CMDB-Kit's Core schema or any included domain. It is a schema extension pattern documented here because it is essential for organizations that manage deployment sites, security clearances, or operational roles.

## Modeling Posts as a CI Type

To add Post to the schema, create it under the Directory branch:

```json
{
  "name": "Post",
  "parent": "Directory",
  "description": "Organizational positions and roles"
}
```

With attributes:

```json
"Post": {
  "description": { "type": 0 },
  "team": { "type": 1, "referenceType": "Team" },
  "organization": { "type": 1, "referenceType": "Organization" },
  "postStatus": { "type": 1, "referenceType": "Post Status" },
  "incumbent": { "type": 1, "referenceType": "Person" },
  "requiredClearance": { "type": 0 }
}
```

## Linking Posts to Teams and Organizations

Every Post belongs to either a Team or an Organization (or both). The `team` and `organization` references establish where the position sits in the hierarchy.

A Post for "CM Analyst" might belong to Team "CM Team" and Organization "CMDB Shared Services." A Post for "Site Lead" might belong directly to Organization "Acme Corp" without a team assignment, because the site lead is a customer role rather than an internal team role.

## Tracking Post Status (Vacant, Filled, Frozen)

Post Status is a new lookup type with values:

Filled: a person currently holds this position.

Vacant: the position exists but has no incumbent. The organization is actively seeking to fill it.

Frozen: the position exists on paper but is not currently funded or authorized. No one can be assigned to it.

Proposed: the position has been requested but not yet approved. It appears in planning queries but not in active organizational charts.

## Mapping People to Posts (Person to Post Reference)

The `incumbent` attribute on Post references the Person who currently fills the position. When someone moves to a new role, update the incumbent on both the old post (clear it or set to the replacement) and the new post.

Alternatively, add a `post` reference to the Person type so the relationship is navigable from both directions. The Person record says "I fill this post" and the Post record says "this person fills me."

## Succession Planning: Deputy and Acting Assignments

Extend the Post type with deputy and acting attributes for roles that need continuity:

```json
"deputy": { "type": 1, "referenceType": "Person" },
"actingIncumbent": { "type": 1, "referenceType": "Person" }
```

The `deputy` identifies who takes over if the primary incumbent is unavailable. The `actingIncumbent` identifies someone temporarily filling the role (during a deployment, a leave of absence, or a vacancy). When an acting assignment ends, clear the `actingIncumbent` and the regular `incumbent` resumes.


# Certifications and Qualifications

## Using the Certification Type for Personnel Qualifications

CMDB-Kit's compliance domain includes a Certification type under Product Library. This type is designed for organizational compliance certifications (SOC 2 Type II, ISO 27001, GDPR). To track personnel qualifications (PMP, ITIL, CISSP), you have two options:

Option 1: reuse the existing Certification type and add a Person reference. This is simpler but mixes organizational and personnel certifications in the same type.

Option 2: create a separate Personnel Certification type under Directory. This is cleaner and allows different attributes (a person certification needs a `person` reference and `certificationNumber`, while an organizational certification needs an `issuingBody` and applies to the organization, not a person).

For most organizations, Option 2 is the better choice because organizational and personnel certifications have different lifecycles, different owners, and different reporting needs.

## Professional Certifications (PMP, ITIL, CISSP, Cloud Certs)

Define a Personnel Certification Type lookup with values appropriate to your organization:

| Value | Description |
|-------|-------------|
| CISSP | Certified Information Systems Security Professional |
| Security+ | CompTIA Security+ |
| PMP | Project Management Professional |
| ITIL | ITIL Foundation or higher |
| AWS Solutions Architect | AWS Certified Solutions Architect |
| CKA | Certified Kubernetes Administrator |
| RHCE | Red Hat Certified Engineer |

The specific values depend on your industry. A defense contractor tracks security clearances and CISSP certifications. A cloud-native startup tracks cloud provider certifications and Kubernetes certifications. The pattern is the same. Only the lookup values differ.

## Tracking Certification Expiration and Renewal Dates

The Personnel Certification type needs date tracking:

```json
"Personnel Certification": {
  "person": { "type": 1, "referenceType": "Person" },
  "certificationType": { "type": 1, "referenceType": "Personnel Certification Type" },
  "certificationStatus": { "type": 1, "referenceType": "Personnel Certification Status" },
  "issuedDate": { "type": 0, "defaultTypeId": 4 },
  "expirationDate": { "type": 0, "defaultTypeId": 4 },
  "issuingBody": { "type": 0 },
  "certificationNumber": { "type": 0 }
}
```

The `expirationDate` attribute drives proactive management. A query for certifications expiring within 60 days surfaces renewals that need attention:

```
objectType = "Personnel Certification"
AND "Certification Status" = "Active"
AND "Expiration Date" <= now("+60d")
```

## Linking Certifications to Persons

Each Personnel Certification record references one Person. A person can have multiple certifications (one record per certification). This one-to-many relationship means you query "what certifications does Alex Chen hold?" by filtering Personnel Certification records where `person` = "Alex Chen."

The reverse query is equally useful: "who holds a CISSP certification?" returns all Personnel Certification records where `certificationType` = "CISSP."

## Certification Status Lifecycle (Active, Expiring, Expired, Renewed)

Personnel Certification Status values:

Active: the certification is current and valid.

Pending: the person has applied for or is studying for the certification.

Expired: the certification has passed its expiration date without renewal.

Suspended: the certification is temporarily invalid (continuing education requirements not met, investigation pending).

## Reporting on Certification Coverage Across Teams

Certification reporting answers organizational questions:

Which team members have the required certifications for their role? Cross-reference Personnel Certification records with Post records that specify required certifications.

What is the certification coverage for a specific qualification? Count the number of active certifications of a given type against the number of posts that require it.

Which certifications are expiring in the next quarter? Surface upcoming expirations to plan renewal training or exam scheduling.

These reports combine data from multiple types (Person, Team, Post, Personnel Certification) and demonstrate the value of having personnel data in the CMDB rather than in a separate spreadsheet.


# Security Clearances

## Modeling Clearances as a CI Type or Extending Certification

Security clearances are a specific type of personnel qualification with their own lifecycle, their own lookup values, and their own reporting requirements. Organizations in defense, intelligence, or government typically model clearances as a dedicated type rather than mixing them into Personnel Certification.

Create a Clearance type under Directory:

```json
{
  "name": "Clearance",
  "parent": "Directory",
  "description": "Personnel security clearances"
}
```

With attributes:

```json
"Clearance": {
  "person": { "type": 1, "referenceType": "Person" },
  "clearanceLevel": { "type": 1, "referenceType": "Clearance Level" },
  "clearanceStatus": { "type": 1, "referenceType": "Clearance Status" },
  "investigationType": { "type": 0 },
  "investigationDate": { "type": 0, "defaultTypeId": 4 },
  "adjudicationDate": { "type": 0, "defaultTypeId": 4 },
  "reinvestigationDue": { "type": 0, "defaultTypeId": 4 },
  "sponsoringAgency": { "type": 0 }
}
```

## Clearance Levels and How to Represent Them as Lookup Values

Clearance Level is a new lookup type. For US government environments:

| Value | Description |
|-------|-------------|
| Unclassified | No clearance required |
| Secret | Access to Secret-level information |
| TS | Top Secret clearance |
| TS/SCI | Top Secret with Sensitive Compartmented Information access |

Other countries and organizations have their own clearance systems. The lookup values adapt to the local classification scheme.

## Tracking Clearance Grant Date, Expiration, and Sponsoring Organization

Clearance records track the full lifecycle of a security clearance:

`investigationDate`: when the background investigation began.

`adjudicationDate`: when the clearance was granted.

`reinvestigationDue`: when the periodic reinvestigation is required (typically 5 years for Top Secret, 10 years for Secret).

`sponsoringAgency`: which organization sponsors the clearance. This matters because clearances are sponsored, and transferring to a new organization may require the new organization to pick up the sponsorship.

The `reinvestigationDue` date drives proactive management, just like certification expiration. A query for clearances with reinvestigation due within 90 days surfaces personnel who need to begin the reinvestigation process.

## Linking Clearances to Persons and Posts

A Clearance record references one Person. A Post can specify a required clearance level through its `requiredClearance` attribute. This creates the compliance chain:

Post "Site Lead at Classified Facility X" requires TS/SCI clearance.

Person "Jane Smith" fills that post and has a Clearance record with level TS/SCI and status Active.

If Jane Smith's clearance expires or is suspended, the post's requirement is no longer met, and the organization needs to take action (reassign the post, expedite clearance renewal, or designate an acting incumbent with the required clearance).

## Posts That Require Specific Clearance Levels

The `requiredClearance` attribute on Post (free text or reference to Clearance Level) specifies the minimum clearance level needed to fill the position. A compliance query compares post requirements against incumbent clearances:

Find all posts where the required clearance exceeds the incumbent's actual clearance level. This identifies compliance gaps.

Find all vacant posts that require TS/SCI clearance. This helps HR and security focus clearance processing on candidates for these positions.

## Clearance Status Lifecycle (Pending, Active, Suspended, Expired, Revoked)

Clearance Status values:

Pending: the clearance has been applied for, and the investigation is in progress.

Active: the clearance has been granted and is current.

Suspended: the clearance is temporarily inactive (pending investigation, administrative hold).

Expired: the reinvestigation date has passed without a renewal investigation.

Revoked: the clearance has been permanently removed.


# Role-based CI Ownership

## Assigning CI Ownership to Posts Rather Than People

Instead of saying "Sarah Chen owns the CRM Core application," assign ownership to the post: "CRM Platform Team Lead owns the CRM Core application." The Application's owner reference points to the Post, not the Person.

When Sarah Chen transfers to a new role and someone else becomes the CRM Platform Team Lead, you update the Post's incumbent. Every CI that references the post automatically has a new owner without changing any CI records.

## Why Post-based Ownership Survives Staff Turnover

People leave, transfer, and change roles. In an organization with 50 deployment sites, if each site's point of contact is a direct reference to a Person, every personnel change requires updating the site records. If the point of contact is a Post ("Site Lead for Acme Corp US-East"), personnel changes are absorbed by updating the Post's incumbent.

This pattern is especially important for deployment sites. The site's point of contact is a role, not a person. The Site Personnel Assignment pattern (described in the Designing Site Deployments section) can reference Posts rather than Persons for the same benefit.

## Tracking Who Is Responsible for What Across the CMDB

With post-based ownership, a portfolio-level responsibility query becomes straightforward:

"What does each team own?" Query all CIs where the owner Post belongs to a given Team.

"What is unowned?" Query all CIs where the owner is empty (no post assigned) or the post is vacant.

"What is at risk?" Query all CIs owned by posts where the incumbent's clearance is expiring, or posts that are frozen or vacant.


# Extending the Schema for Personnel

## Adding a Post Type to the Directory Branch

1. Add Post to schema-structure.json under Directory
2. Define Post attributes in schema-attributes.json
3. Create the Post Status lookup type with values (Filled, Vacant, Frozen, Proposed)
4. Add Post and Post Status to LOAD_PRIORITY (Post Status before Post, Post after Person)
5. Create data files: post-status.json and post.json
6. Run validation

## Adding a Clearance Type or Extending Certification

For clearances: add Clearance to schema-structure.json under Directory. Define its attributes. Create Clearance Level and Clearance Status lookup types. Add all three to LOAD_PRIORITY (lookups first, then Clearance after Person).

For personnel certifications: add Personnel Certification under Directory. Define its attributes. Create Personnel Certification Type and Personnel Certification Status lookups. Add to LOAD_PRIORITY.

## Updating LOAD_PRIORITY for New Personnel Types

The import order for personnel types follows the dependency chain:

1. All lookup types first (Post Status, Clearance Level, Clearance Status, Personnel Certification Type, Personnel Certification Status)
2. Organization (no dependencies within Directory)
3. Person (depends on Organization, self-references manager)
4. Team (depends on Organization and Person for teamLead)
5. Post (depends on Team, Organization, and Person for incumbent)
6. Clearance (depends on Person and Clearance Level and Clearance Status)
7. Personnel Certification (depends on Person and its lookup types)
8. Location and Facility (no personnel dependencies, but often imported with Directory)


# Practical Examples

## Modeling an Operations Team With Posts, People, and Clearances

An operations team for OvocoCRM has four posts:

```json
[
  {
    "Name": "CR CM Lead",
    "description": "Configuration Management Lead for OvocoCRM",
    "team": "CM Team",
    "organization": "Platform Department",
    "postStatus": "Filled",
    "incumbent": "Casey Morgan",
    "requiredClearance": "Secret"
  },
  {
    "Name": "CR CM Analyst",
    "description": "Configuration Management Analyst for OvocoCRM",
    "team": "CM Team",
    "organization": "Platform Department",
    "postStatus": "Filled",
    "incumbent": "Drew Santos",
    "requiredClearance": "Secret"
  },
  {
    "Name": "CR Librarian",
    "description": "DML Librarian for OvocoCRM",
    "team": "CM Team",
    "organization": "Platform Department",
    "postStatus": "Vacant",
    "incumbent": null,
    "requiredClearance": "Secret"
  },
  {
    "Name": "CR CCB Chair",
    "description": "CCB Chair for OvocoCRM product CCB",
    "team": "CM Team",
    "organization": "Platform Department",
    "postStatus": "Filled",
    "incumbent": "Alex Chen",
    "requiredClearance": "TS"
  }
]
```

The vacant Librarian post appears in queries for unfilled positions. The CCB Chair post requires TS clearance, which is a higher level than the other posts. If Alex Chen's clearance status changes, the CCB Chair post is flagged for attention.

## Tracking Certification Gaps Before an Audit

Before an annual audit, query for certification and clearance gaps:

Posts with required clearances where the incumbent's clearance is expired or suspended.

Posts that are vacant but have upcoming operational commitments (a deployment scheduled but no one to fill the deployment lead post).

Personnel certifications that have expired since the last audit.

Team members who have no certifications at all but hold posts that require them.

These queries produce an actionable pre-audit checklist. Each gap gets a remediation plan: schedule training, expedite clearance renewal, assign an acting incumbent, or defer the operational commitment until the gap is closed.

## The OvocoCRM Example: Team Structure and Qualifications

Ovoco Inc's CMDB contains the following personnel structure:

Organizations: Ovoco Inc (Company), Ovoco Engineering (Department), Ovoco Operations (Department).

Teams: CRM Platform Team, Analytics Platform Team, CRM Operations, Analytics Operations, Infrastructure Team, Release Engineering. Each team has a lead and belongs to a department.

People: eleven individuals across the teams, each with a role and team assignment (Sarah Chen, Michael Torres, David Park, Emily Rodriguez, James Wilson, Lisa Kim, Alex Chen, Casey Morgan, Morgan Blake, Sam Rivera, Avery Nguyen).

The portfolio mode schema adds two types for site-level personnel tracking. CR Site Personnel Assignment links a Person to a Deployment Site with a Deployment Role, a Team, and optional start and end dates. This records who is assigned to which site in what capacity. Deployment Role values in the portfolio mode schema include Site Commander, Operations Lead, System Administrator, Database Administrator, Network Engineer, Security Officer, Training Coordinator, and Help Desk Lead.

Locations: three office locations (San Francisco, Austin, London) where team members work.

In a multi-product portfolio, the same personnel structure serves both OvocoCRM and OvocoAnalytics. When the organization adds a new product, the existing Directory records do not need to change. The new product's CIs reference the same Organization, Team, and Person records. A person who works on both products appears once in the Directory, referenced by CIs in both product libraries.
