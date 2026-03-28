# Cloud vs Data Center Reference

A comparison reference for Atlassian Cloud and Data Center (DC) as they relate to CMDB-Kit. The two platforms have diverged significantly since Atlassian began its cloud-first strategy, and the gap continues to widen. Terminology, features, APIs, and UI navigation all differ in ways that affect schema design, adapter configuration, and day-to-day administration.

This page exists for three audiences:

- Teams choosing between Cloud and DC for a new CMDB-Kit deployment
- Teams migrating an existing CMDB-Kit instance from DC to Cloud (or the reverse)
- Teams operating CMDB-Kit on both platforms simultaneously and needing a quick reference for the differences

The examples reference OvocoCRM, the fictional SaaS CRM that ships with CMDB-Kit's example data.


# Terminology Mapping

Atlassian has renamed many core concepts on Cloud. Some renames are cosmetic, but others signal genuine behavioral differences. The table below maps every term that differs between the two platforms, followed by explanations where the change is more than superficial.

| Cloud term | DC term | Explanation |
|---|---|---|
| Work item | Issue | Cloud documentation now uses "work item" for the internal agent-facing record. The underlying Jira data model still stores issues, and URLs still reference "issue" in many places. CMDB-Kit adapters do not need to account for this rename because the API layer has not changed. |
| Work type | Issue type | The type that defines fields and workflow. Cloud renamed it to distinguish from request types. The API still uses `issuetype` internally. |
| Request | Request / Issue | Both platforms use "request" for the customer-facing view. Cloud draws a sharper line: "request" is what the customer sees, "work item" is what the agent sees. On DC, "issue" serves both roles. |
| Service space | Service project | Cloud uses "space" wherever DC uses "project." Breadcrumbs, sidebar labels, and admin pages all say "space." Most API endpoints still accept `projectKey`, so CMDB-Kit adapters work without modification. |
| Space template | Project template | Cloud offers more built-in templates (IT, General, Customer, HR, Facilities, Legal, Finance, Marketing, Analytics, Sales, Design, Blank). DC has fewer. Neither affects CMDB-Kit directly because Assets schemas are independent of project/space templates. |
| Space roles | Project roles | Same permission model, renamed to match "space" terminology. |
| Work categories | Ticket categories | The grouping mechanism that sorts requests into Incidents, Changes, Problems, and Service Requests queues. Renamed on Cloud but functionally identical. |
| AQL | IQL / AQL | DC originally used "IQL" (Insight Query Language) when the product was called Insight. DC 5.x documentation now also says "AQL," but older scripts, custom fields, and ScriptRunner references still use "IQL." Cloud uses "AQL" exclusively. The query syntax itself is identical on both platforms. |
| Assets | Insight / Assets | DC's product was called "Insight" until JSM DC 4.15+. Cloud has used "Assets" since the rebrand. ScriptRunner documentation still references "Insight" alongside "Assets." |
| Help center | Customer portal (site-level) | Cloud uses "help center" for the site-wide portal that aggregates all service spaces. DC uses "customer portal" more generically. |
| Service Collection | JSM license tier | Cloud bundles JSM into Service Collection plans (Free, Standard, Premium, Enterprise). DC uses traditional per-agent licensing. This affects cost modeling but not CMDB-Kit configuration. |
| Collaborator | Collaborator | Same concept on both. Cloud defines it more explicitly as a licensed user in the Service Desk Team role who can only add internal comments, not work on items directly. |
| Stakeholder | (no equivalent) | Cloud Premium and Enterprise adds a Stakeholder role for incident observers who do not consume agent licenses. DC has no built-in equivalent. |

## The Ongoing Rename

Atlassian's rename from DC terminology to Cloud terminology is not complete. Cloud documentation, URLs, API responses, and UI labels sometimes use the old terms. For example, a Cloud URL might contain `/issue-types/` while the page heading says "Work types." API responses still return fields named `issueType` rather than `workType`. This inconsistency is expected to persist for some time.

When reading Atlassian documentation, treat both old and new terms as equivalent. When writing internal documentation for your team, pick one set of terms and use it consistently. CMDB-Kit documentation uses the DC terms (issue, project, IQL) in most places because the API layer has not changed.

## When Terminology Affects Configuration

Most renames are cosmetic and do not affect CMDB-Kit. Two exceptions matter:

**AQL vs IQL in automation rules and custom fields.** If you have existing DC automation rules or ScriptRunner scripts that use `iqlFunction()` as a JQL function, you must replace every occurrence with `aqlFunction()` when migrating to Cloud. The query syntax inside the function call stays the same. Only the function name changes.

**Assets custom field type names.** DC has three distinct custom field types for Assets: Default, Referenced, and Read-only. Cloud simplifies these into a single "Assets object" field type with configuration options. When migrating, you need to recreate each field on Cloud and configure its behavior through the field settings rather than by choosing a different field type.


# Cloud-Only Features

These features exist on Cloud but have no DC equivalent. Each entry includes a note on whether it affects CMDB-Kit usage.

## Data Manager

Cloud Premium and Enterprise plans include Data Manager, a full ETL pipeline with five stages: Raw, Transformed, Cleansed, Reconciled, and Schema Objects. Data Manager ingests data from 20+ adapters (Active Directory, Azure VM, Entra ID, Defender, CrowdStrike Falcon, SCCM, Intune, Jamf, ServiceNow, Snow, Qualys, Tenable, and others). A locally installed Adapters Client handles on-premises data sources by running PowerShell, SQL, flat-file, and API-based jobs and pushing results to Cloud.

Data Manager's reconciliation stage merges multiple data sources into "golden records" before importing them to an Assets schema. This is the Cloud replacement for DC's built-in database and LDAP importers.

CMDB-Kit relevance: Data Manager operates alongside CMDB-Kit's schema. If you use CMDB-Kit to define your type hierarchy and attributes, Data Manager can populate those types with discovered data. The two approaches complement each other, with CMDB-Kit handling schema design and reference data while Data Manager handles automated CI population.

## Virtual Service Agent

An AI-powered chatbot that handles customer requests automatically. Usage limits and billing depend on the plan tier.

CMDB-Kit relevance: minimal. The virtual agent interacts with the service desk layer, not with Assets schemas directly.

## Built-in Incident Management

Cloud JSM has a dedicated Incidents sidebar with escalation to major incidents, incident swarming, stakeholder updates, and post-incident reviews. This integrates with Opsgenie, which is included in Premium and Enterprise plans. DC handles incidents as standard issue types without a dedicated UI.

CMDB-Kit relevance: if you link CIs to incidents (a common ITIL practice), the Cloud incident UI provides a better experience for impact analysis. The underlying linking mechanism is the same on both platforms.

## Platform-Level Assets

Cloud Assets is accessible from any Jira app through the app switcher, not just from JSM service spaces. This means a Jira Software team can view and link to Assets objects without needing JSM licenses.

CMDB-Kit relevance: significant for organizations where development teams need read access to the CMDB. On DC, Assets access requires JSM.

## Service Registry

Cloud has a first-class Services section for registering services, assigning owner teams, and linking change approvers. DC has no built-in service registry. On DC, services are typically modeled as an object type in Assets.

CMDB-Kit relevance: CMDB-Kit's extended and enterprise schemas include their own Service type. On Cloud, you can choose between the built-in service registry and CMDB-Kit's Service type, or use both with cross-references. The built-in registry is read-only from an Assets perspective, as it is auto-populated from the service space configuration.

## Other Cloud-Only Features

| Feature | Description |
|---|---|
| Compass | Developer portal for tracking services, components, and software catalog. Cloud-only product. |
| Forge apps | Cloud app framework running in Atlassian's infrastructure with OAuth 2.0 scopes. Replaces DC's server-side P2 plugins. |
| Connect apps | Cloud app framework using JWT authentication. DC uses Atlassian SDK plugins instead. |
| Container tokens | Assets-specific tokens for API authentication, granting import permissions. DC uses session-based or basic auth. |
| Deployment gating | Gate deployments through approval workflows integrated with CI/CD tools. |
| Embeddable widget | Embed a request form on external websites. |
| Smart Links for Assets | Display Assets objects via Atlassian Smart Links in Jira and Confluence. |
| Dynamic Forms | Built-in form builder with conditional logic, field validation, tables, and rich formatting. DC requires ProForma or similar plugins. |
| ML-powered bulk operations | Cloud adds machine learning suggestions for bulk categorize, link, and transition actions. |


# DC-Only Features

These features exist on DC but have no Cloud equivalent, or have been replaced by a fundamentally different mechanism.

## ScriptRunner and Groovy Scripting

DC's most significant advantage for CMDB-Kit administrators is the depth of Groovy scripting available through ScriptRunner and Assets-native workflow functions. The following capabilities have no direct Cloud equivalent:

- **Behaviours** - client-side form behaviors that show, hide, or set field values dynamically based on other field values
- **Custom REST endpoints** - create arbitrary REST endpoints backed by Groovy scripts
- **Escalation Services** - automated issue escalation based on elapsed time using JQL and cron schedules
- **Listeners** - server-side event listeners that fire Groovy scripts on issue events
- **Script Fields** - custom calculated fields powered by Groovy
- **Workflow functions** - custom conditions, validators, and post-functions written in Groovy
- **HAPI** - a high-level API for scripting against Jira and Assets in Groovy
- **Assets workflow post-functions** - create objects, update attributes, and set values during workflow transitions using Groovy

Cloud ScriptRunner offers "partial parity" for several of these features, but the Groovy runtime is not available. All Groovy-based automations must be redesigned using Cloud Automation rules, Forge apps, or external scripts calling the REST API.

CMDB-Kit relevance: if your DC deployment uses Groovy scripts to automate CI lifecycle management (for example, creating a Server object when a provisioning issue transitions to "Done"), those scripts cannot migrate to Cloud as-is. Plan for a rewrite using Cloud Automation rules or a Forge app.

## Standalone Assets Discovery

Assets Discovery is available on both Cloud and DC. On DC, it works standalone with built-in importers that scan the network and import results directly into the schema. On Cloud, Discovery feeds into Data Manager, which adds cleansing and reconciliation stages before the data reaches the schema.

CMDB-Kit relevance: DC's direct Discovery-to-schema pipeline is simpler to set up. Cloud's Data Manager pipeline is more powerful but requires additional configuration.

## Built-in Importers

DC Assets ships with six built-in import types configured directly in the schema UI: CSV, Database, JSON, LDAP, Jira Users, and Object Schema. Cloud supports CSV and JSON import through the UI but routes database, LDAP, and advanced imports through Data Manager.

CMDB-Kit relevance: CMDB-Kit's JSM adapter uses the REST API for both platforms, so the built-in importers are not required. However, if you plan to supplement CMDB-Kit data with imports from other sources, DC's built-in importers offer a simpler path for database and LDAP data.

## Other DC-Only Features

| Feature | Description |
|---|---|
| Direct database access | Query the Assets database directly for reporting or troubleshooting. |
| Label and QR code templates | Built-in label template editor with HTML source editing for printing physical asset labels. |
| Object type-level permissions | Set role permissions at the individual object type level, overriding schema-level permissions. |
| Referenced Assets custom field | A cascading custom field where one field's value depends on another Assets field's value. |
| Read-only Assets custom field | A dedicated read-only custom field type. Cloud handles this through field configuration. |
| Global Assets settings | Exposed settings for reindex frequency, cache sizes, and attachment handling. Cloud manages these automatically. |
| Full schema XML export/import | Export and import complete schema structures as XML files. Cloud relies on API-based schema management. |
| Performance tuning | Tunable JVM settings, database connections, and cache configuration. Cloud abstracts this entirely. |


# API Differences

The API differences between Cloud and DC are the most important for CMDB-Kit adapter configuration. The JSM adapter in CMDB-Kit handles these differences internally, but understanding them helps with troubleshooting and custom integrations.

Understanding the API differences is essential if you are building custom integrations, troubleshooting the CMDB-Kit adapter, or writing scripts that interact with Assets directly.

## Base URL and Authentication

Cloud and DC use completely different URL patterns and authentication mechanisms.

| Aspect | Cloud | DC |
|---|---|---|
| Base URL | `https://api.atlassian.com/jsm/assets/workspace/{workspaceId}/v1/` | `https://{host}/rest/insight/1.0/` or `https://{host}/rest/assets/1.0/` |
| Primary auth | Email + API token (basic auth), OAuth 2.0 (3LO) | Username + password (basic auth), personal access tokens |
| Token source | https://id.atlassian.com/manage-profile/security/api-tokens | Generated locally on the DC instance |
| Workspace ID | Required in all API paths; found in Assets admin settings | Not applicable |

The Cloud base URL requires a workspace ID, which is a UUID specific to your Assets workspace. You can find it in Assets settings or by calling the workspace API. DC connects directly to the instance without any workspace concept.

CMDB-Kit's `.env` file handles this through separate variables: `CLOUD_OR_DC` (set to `cloud` or `dc`), `SITE_URL`, `WORKSPACE_ID` (Cloud only), `EMAIL`, and `API_TOKEN`.

## Endpoint Differences

Most endpoint paths are identical after the base URL, with a few notable exceptions.

| Endpoint | Cloud | DC |
|---|---|---|
| Query objects | `/aql/objects` | `/iql/objects` (older) or `/aql/objects` (5.x+) |
| Object CRUD | `/object/{id}` | `/object/{id}` |
| Schema list | `/objectschema/list` | `/objectschema/list` |
| Import source | `/importsource` | Managed through UI, limited API |
| Connected tickets | `/objectconnectedtickets` (dedicated) | Queried through object endpoints |

## Pagination and Rate Limiting

Cloud enforces rate limits on all API endpoints. The specific limits depend on the endpoint and your plan tier. CMDB-Kit's adapter includes retry logic with exponential backoff for rate-limited requests.

Cloud uses cursor-based pagination on some endpoints, while DC uses offset-based pagination throughout. The adapter handles both styles transparently.

DC has no rate limiting because it is self-hosted. If you are running large imports against DC, the bottleneck is your instance's hardware and JVM configuration rather than API quotas.

## Error Response Formats

Cloud and DC return errors in slightly different JSON structures. Cloud errors typically include a `message` field and sometimes an `errorMessages` array. DC errors may include a `message` field, an `errorMessages` array, or a `errors` object with field-specific messages. CMDB-Kit's adapter normalizes both formats into a consistent error output, but if you are debugging API calls directly, expect the raw responses to differ.

## Workspace ID Lookup

Cloud requires a workspace ID in every Assets API call. To find your workspace ID:

1. Open Assets in your Cloud site
2. Go to any object schema
3. Look at the URL, which contains the workspace ID as a UUID segment
4. Alternatively, call `GET https://{site}.atlassian.net/rest/servicedeskapi/assets/workspace` to retrieve it programmatically

Set this value in your `.env` file as `WORKSPACE_ID`. DC does not use workspace IDs.


# UI Navigation Differences

Finding the same feature in Cloud and DC often means looking in completely different places. This table covers the most common navigation paths for CMDB-Kit administrators.

| Task | Cloud path | DC path |
|---|---|---|
| Open Assets | App switcher (top nav), available from any Jira app | Top nav bar: Assets > Object schemas |
| Assets configuration | Settings icon within Assets, or admin Settings > Products | Top nav: Assets > Configure |
| Create a schema | Assets home > Create schema | Assets > Object schemas > Create object schema |
| Schema settings | Within schema > gear icon | Within schema > Object Schema dropdown > Configure |
| AQL/IQL search | Assets > AQL search bar | Assets > advanced search / IQL search bar |
| Import configuration | Assets > schema > Import (or Data Manager) | Assets > schema > Object Schema > Import configurations |
| Automation rules | Settings > Automation (Jira-level) | Within schema > Object Schema > Configure > Automation tab |
| Custom fields | Settings > Issues > Custom fields | Administration > Issues > Custom fields |
| Screens | Managed automatically through field configuration | Administration > Issues > Screens (manual assignment) |
| Workflow editor | Project settings > Workflows (visual editor) | Administration > Workflows (text and diagram editor) |
| Services | Project sidebar > Services | No built-in equivalent |
| Data Manager | Assets > Data Manager (left nav) | Not available |
| Knowledge base | Project sidebar > Knowledge base | Project sidebar > Knowledge base |

The most significant navigation difference is automation. On DC, Assets-specific automation rules live inside the schema configuration with their own WHEN/IF/THEN builder and cron scheduling. On Cloud, all automation runs through Jira Automation at the site or space level, using a component-based rule builder. The trigger model differs, particularly for scheduled rules that act on Assets objects.


# Assets Behavior Differences

Beyond terminology and navigation, the two platforms differ in how Assets features actually work.

## Custom Field Types

DC offers three distinct Assets custom field types:

- Default - a standard picker that lets users search and select Assets objects
- Referenced - a cascading field where the available objects depend on another Assets field's value
- Read-only - displays an Assets object without allowing edits

Cloud replaces all three with a single "Assets object" field type. You configure read-only behavior and filtering through the field's settings rather than by choosing a different type. This simplification means fewer field types to manage, but you lose the explicit cascading behavior of DC's Referenced field.

## Automation Models

DC Assets has its own automation engine built into the schema configuration. Rules follow a WHEN/IF/THEN pattern with triggers on object creation, update, deletion, and cron schedules. Post-functions can create objects, update attributes, and execute Groovy scripts during workflow transitions.

Cloud uses Jira Automation for everything, including Assets operations. You can create rules that trigger on object changes, but the rule builder is different and does not support Groovy. Complex multi-step automations that were straightforward in DC's native engine may require creative workarounds using Cloud Automation's component model.

## AQL Placeholders

Both platforms support placeholders in AQL queries used in custom field filters, but DC supports a richer placeholder syntax. DC allows issue-context placeholders like `${MyCustomField${0}}` that reference other custom field values. Cloud's placeholder support is more limited. If your CMDB-Kit deployment relies on dynamic AQL filtering in custom fields, test the specific placeholder syntax on Cloud before migrating.

## Schema Backup and Portability

DC supports full XML export and import of schema structures. You can export a schema, modify the XML, and import it into another DC instance. This is useful for promoting schema changes between environments (development, staging, production).

Cloud has no XML export. Schema management is API-based. CMDB-Kit's adapter handles schema creation through the API on both platforms, so this gap primarily affects manual schema management outside of CMDB-Kit.


# Confluence Differences

Confluence is relevant to CMDB-Kit because many teams use it for CMDB documentation, knowledge base articles, and runbooks linked from CI records.

Cloud Confluence and DC Confluence share the same core editing experience (the Atlassian editor), but differ in administration, app support, and integration depth.

| Aspect | Cloud | DC |
|---|---|---|
| Terminology | Spaces | Spaces (same) |
| Editor | Atlassian editor (default), legacy editor available | Atlassian editor (default in newer versions), legacy editor |
| Macros | Cloud-specific macro set, some DC macros unavailable | Full macro library including user macros |
| User macros | Not available; use Forge/Connect apps | Supported with Velocity templates |
| Space permissions | Managed through site admin or space settings | Managed through space settings or global admin |
| App framework | Forge and Connect apps | Atlassian SDK P2 plugins |
| Smart Links | Assets objects render as Smart Links in pages | No Smart Link rendering for Assets objects |

The Smart Links capability on Cloud is particularly relevant. When a Confluence page references an Assets object URL, Cloud renders it as an inline card showing the object's name, type, and status. DC renders the same URL as a plain hyperlink. This makes Cloud Confluence a better fit for teams that maintain runbooks or architecture documentation with frequent references to CMDB objects.


# User Administration Differences

User and group management works fundamentally differently on the two platforms.

Cloud uses centralized Atlassian account management through id.atlassian.com. Users authenticate with Atlassian accounts, and administrators manage users, groups, and permissions through admin.atlassian.com. SCIM provisioning is available for identity providers like Okta, Azure AD, and OneLogin.

DC uses a local user directory by default, with optional connections to LDAP, Atlassian Crowd, or Active Directory for centralized authentication. User management happens within the DC instance's administration console.

This difference matters for CMDB-Kit's Directory schema types (Person, Team, Organization). On Cloud, you might populate Person records from your identity provider through SCIM and Data Manager. On DC, you might use the built-in Jira Users importer to pull user data directly into Assets. CMDB-Kit's data files work the same way on both platforms, but the automated population strategy differs.


# Licensing and Cost

Cloud and DC use different licensing models that affect how you plan a CMDB-Kit deployment.

Cloud uses Service Collection plans priced by user tier for the entire site. Assets is included in all paid JSM plans (Standard, Premium, Enterprise). Data Manager and Atlassian Analytics require Premium or Enterprise. The cost scales with total licensed users across the site, not just agents.

DC uses traditional per-agent licensing for JSM. Assets is bundled with JSM DC (since version 4.15). You buy licenses for the number of concurrent agents, and the cost does not scale with the number of end users or portal customers.

For CMDB-Kit specifically, the licensing difference means that Cloud Premium or Enterprise is the practical minimum if you want both the schema management features and automated data population through Data Manager. On DC, the base JSM DC license gives you everything CMDB-Kit needs, including built-in importers and Groovy scripting.


# Choosing Between Cloud and DC

The right platform depends on your organization's constraints, not on which has more features.

## Choose Cloud When

- You want Atlassian to handle infrastructure, patching, and upgrades
- You need Data Manager for automated CI population from multiple discovery sources
- Your development teams need Assets access without JSM licenses (platform-level Assets)
- You are starting fresh with no existing Groovy scripts or custom plugins to migrate
- You want built-in incident management with Opsgenie integration
- Your organization is moving toward Atlassian's cloud ecosystem for other products

## Choose DC When

- You need Groovy scripting for complex automation (ScriptRunner, Assets workflow functions)
- Regulatory or security requirements mandate on-premises data residency
- You need direct database access for reporting or integration
- You rely on DC-specific plugins that have no Cloud equivalent
- You need granular object type-level permissions
- You want standalone Assets Discovery without the Data Manager pipeline
- You need full XML schema export/import for environment promotion

## CMDB-Kit Works on Both

CMDB-Kit's JSM adapter supports both platforms through the same codebase. The `.env` configuration determines which platform the adapter targets. Schema definitions, data files, and the import process are identical regardless of platform. The adapter handles URL patterns, authentication, pagination, and endpoint differences internally.

If you are migrating from DC to Cloud, CMDB-Kit simplifies the process: export your schema definition from CMDB-Kit's JSON files (not from DC's XML), point the adapter at Cloud, and re-import. The schema structure and data will be recreated on Cloud without manual translation.

The main work in a migration is not the schema itself but the surrounding automation. Groovy scripts, custom workflows, and DC-specific integrations all need Cloud equivalents. CMDB-Kit handles the schema and data layer, but the automation layer is your responsibility.

## Migration Checklist

If you are moving a CMDB-Kit deployment from DC to Cloud, work through these items:

- Verify your Cloud plan includes the features you need (Premium for Data Manager, Enterprise for advanced analytics)
- Obtain your Cloud workspace ID and generate an API token
- Update your `.env` file with Cloud connection details
- Run `node adapters/jsm/import.js schema` to create the schema on Cloud
- Run `node adapters/jsm/import.js sync` to populate data
- Run `node adapters/jsm/validate-import.js` to verify the import
- Audit all DC automation rules and ScriptRunner scripts for Cloud equivalents
- Recreate Assets custom fields on Cloud (single field type replaces DC's three types)
- Update any AQL references from `iqlFunction()` to `aqlFunction()`
- Test AQL placeholder syntax if you use dynamic filtering in custom fields
- Rebuild Confluence user macros as Forge apps if applicable
- Update any external integrations that call the Assets API (new base URL, authentication, pagination)
