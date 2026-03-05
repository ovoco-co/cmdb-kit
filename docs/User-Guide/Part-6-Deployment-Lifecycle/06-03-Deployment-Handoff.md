# Deployment Handoff

The handoff from the pipeline tracker to the production CMDB is the pivotal moment in a deployment site's lifecycle. The site stops being a prospect and starts being a managed asset. Records migrate between systems, field values are translated from portfolio-level formats to product-specific formats, and responsibility shifts from business development to engineering and CM. This chapter covers the triggers, steps, and coordination that make the handoff clean.


# Migration Triggers

A site is ready for migration when a combination of conditions is met. No single trigger is sufficient on its own, because each represents a different dimension of readiness.

Funding approved. The contractual and financial commitment is in place. Without funding, hardware cannot be ordered and engineering cannot commit resources.

Hardware ordered or delivered. The physical or virtual infrastructure for the deployment is in procurement or already available. This confirms that the deployment has moved past the planning stage.

Security authorization complete. The customer's security review has approved the deployment, or the security review is proceeding in parallel with installation (if the organization's policy permits). Sites waiting on security authorization that has not yet started are not ready for handoff.

"Ready for Handoff" status set. The business development team has verified all checklist items on the Site Registration issue, confirmed all required fields on the Deployment Site record, and explicitly marked the site as ready. This is the formal signal to the CM team.

In practice, the CM team should not begin migration until the Site Registration issue reaches "Ready for Handoff" even if the other conditions appear to be met. The explicit status change ensures the business development team has completed their due diligence.


# Migration Steps

## Export From the Pipeline

The migration begins with extracting the site record and its dependencies from the pipeline tracker.

Export the Deployment Site record as JSON. If the pipeline tracker supports scripted export, use a script that extracts the record and its linked Organization, Location, and Person records in one operation. This prevents partial migrations where the site record arrives in production but its referenced Organization does not.

The export should produce JSON files that match the production CMDB's import format. At minimum:

- One file for new Organization records (if the customer organization does not yet exist in production)
- One file for new Location records (if the site's location is new to production)
- One file for new Person records (if the site POC is not already in production)
- One file for the Deployment Site record itself

If the pipeline tracker and production CMDB share an import format (as they do in CMDB-Kit, where both use JSON arrays with camelCase field names), the export files can be imported with minimal transformation.

## Import to the Production CMDB

Import follows the same dependency order as any CMDB data load: referenced records first, then the records that reference them.

1. Import new Organization, Location, and Person records. Check whether these records already exist in production before importing to avoid duplicates. An organization that deploys multiple products may already have records from a previous handoff.
2. Route the Deployment Site record to the correct product-specific type. In the pipeline, all products share a single Deployment Site type with a text "product" field. In production, each product has its own type (CR Deployment Site, AN Deployment Site). The product field value determines which type to use.
3. Set production-specific field values:
   - workflowStatus: set to "Ready to Install"
   - siteStatus: set to "Installing"
   - productVersion: set to the target version (reference to the appropriate Product Version record)
   - Any engineering details that production tracks but the pipeline does not
4. Run the import tool to push the records to the production CMDB.
5. Verify the import by querying the production CMDB for the new site record and confirming all fields and references are correct.

## Post-migration Verification

After the import completes:

Verify the Deployment Site record exists in the correct product-specific type with the correct workflowStatus and siteStatus values.

Verify all references resolve correctly. The customerOrganization, primaryLocation, and sitePOC fields should point to valid records in the production CMDB. A broken reference (pointing to a record that was not imported) will show as an empty or invalid value.

Verify the pipeline records are updated. The business development team closes the Site Registration issue with a templated handoff summary. The pipeline Deployment Site record is marked as "Handed Off" (or removed, depending on the organization's retention policy).

Notify the engineering team. The site is now in the production CMDB at "Ready to Install," and engineering can begin the deployment process.


# Data Mapping

Most fields transfer directly between the pipeline and production schemas because they share the same attribute names and types. A few fields require translation during migration.

## Fields That Transfer Directly

These fields have the same name and compatible types in both systems:

- description
- siteName
- seatCount
- address
- deploymentNotes
- deploymentTier (reference, same lookup in both systems)
- implementationType (reference, same lookup in both systems)
- siteType (reference, same lookup in both systems)

If the pipeline and production systems share the same lookup values, these fields need no transformation.

## Fields That Require Translation

| Pipeline Field | Production Field | Translation |
|----------------|-----------------|-------------|
| product (text) | (type routing) | The text value determines which product-specific Deployment Site type to create: "OvocoCRM" routes to CR Deployment Site, "OvocoAnalytics" routes to AN Deployment Site |
| siteStatus | siteStatus | Override to "Installing" regardless of pipeline value |
| workflowStatus | workflowStatus | Override to "Ready to Install" regardless of pipeline value |
| sitePOC (Person reference) | sitePOC (Person reference) | Verify the Person record exists in production; import if missing |
| customerOrganization (Organization reference) | customerOrganization (Organization reference) | Verify the Organization record exists in production; import if missing |

The product field is the most significant translation. In the pipeline, it is a text field because the pipeline uses a single Deployment Site type for all products. In production, the product determines the type. This routing is a one-time transformation during migration.

## Fields That Exist Only in Production

These fields are set during or after migration but do not exist in the pipeline schema:

| Field | Purpose | When Set |
|-------|---------|----------|
| productVersion | Currently installed version (reference to Product Version) | Set to the target version during migration |
| targetVersion | Version being deployed or planned next | Set if an upgrade is planned at deployment time |
| previousVersion | Version installed before the current one | Empty at initial deployment |
| upgradeStatus | Per-release campaign progress | Empty at initial deployment |
| site | Reference to the shared Site record (two-record pattern) | Set during migration if the organization uses the Site type |

These fields are what distinguish a production Deployment Site from a pipeline Deployment Site. They track operational state that has no meaning before the site is deployed.


# Cross-team Coordination

The handoff is not just a data migration. It is a responsibility transfer that involves three teams working in sequence.

## Business Development Closes the Pipeline

When the CM team confirms the production records are created, business development closes out their side:

- Close the Site Registration issue with a handoff summary: what was handed off, the production record identifier, the assigned CM contact
- Update the pipeline Deployment Site record to "Handed Off" status
- Transfer any open issues (incomplete Site Survey items, pending Security Authorization sub-tasks) to the appropriate engineering or CM contact
- Retain the pipeline records for historical reference and reporting

Business development remains available for customer relationship questions but is no longer responsible for the site's lifecycle tracking.

## CM Creates Production Records

CM manages the technical migration:

- Run the export and import process described above
- Verify all references resolve in the production CMDB
- Confirm the site appears correctly in production dashboards and filters
- Notify engineering that the site is ready for installation
- Update any cross-reference documentation (if the organization maintains a mapping between pipeline identifiers and production identifiers)

CM continues to maintain the site's records throughout its production lifecycle.

## Engineering Picks Up at Ready to Install

Engineering receives the site at workflowStatus "Ready to Install" and begins the deployment process:

- Review the deployment design (produced during the Engineering phase in the pipeline)
- Coordinate the installation schedule with the customer
- Advance the workflowStatus as the site progresses: Installation, Testing, Go Live
- Update siteStatus from "Installing" to "Operational" when the site goes live

The Deployment Site record's goLiveDate is set when the site reaches Operational status.


# Go-live Process

The final stages of deployment follow a predictable sequence within the production CMDB.

## Installation

The installation team deploys the product at the customer site according to the engineering design. During installation, the Deployment Site record shows:

- workflowStatus: Installation
- siteStatus: Installing
- productVersion: the version being installed

The installation team updates the record as work progresses, adding the installDate when the installation is complete.

## Testing

After installation, the site undergoes acceptance testing: functional verification, security assessment, and performance validation. The Deployment Site workflowStatus advances to "Testing."

Testing may involve the customer's security team (for security authorization at the installation level), the engineering team (for functional verification), and the O&M team (for operational readiness confirmation).

## Cutover to Operational

When testing passes, the site goes live:

- workflowStatus advances to "Go Live" briefly, then to "Operational"
- siteStatus changes from "Installing" to "Operational"
- goLiveDate is set to the cutover date
- The O&M team assumes responsibility for the site

From this point forward, the site is in the operational phases described in [Upgrade and Distribution Operations](06-04-Upgrade-and-Distribution-Operations.md).
