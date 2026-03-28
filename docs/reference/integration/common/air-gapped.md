# Air-Gapped and Offline Deployment

Not every CMDB target lives on a network with internet access. Isolated production networks, compliance-restricted systems, and high-security enclaves may have no outbound connectivity. CMDB-Kit's JSON-based schema and data files are designed to be portable: you can transfer them on physical media, import them through the target platform's scripting console, or bundle the entire import toolkit into a self-contained package. This section covers deployment scenarios, platform-specific import methods, media transfer procedures, and verification steps for offline environments.


# Deployment Scenarios

## Connected environments

In a connected environment, the development workstation has network access to the target CMDB instance. The standard workflow applies: edit files locally, validate, run the import script over the network. This is the simplest scenario and does not require any special handling.

## Air-gapped environments

In an air-gapped environment, the target CMDB instance has no network path to the development workstation. The instance runs on an isolated network that is physically separated from the network where development occurs.

The import script cannot connect directly. The schema files and data must be transferred through an approved media transfer process: encrypted USB drives, optical media, or an approved cross-domain transfer mechanism. Once on the isolated network, the import runs using whatever tools are available on that network.

## Split environments

Many organizations have both. Development and staging run on a connected network, and production runs on an air-gapped network. The schema and data are developed and validated on the connected side, then transferred to the air-gapped side for import.

```
Connected                            Air-Gapped
(Development/Staging)                (Production)

+-----------------+                  +-----------------+
|  Git Repository |                  |  CMDB Instance  |
|  (schema + data)|                  |  (isolated)     |
+--------+--------+                  +--------^--------+
         |                                    |
         v                                    |
+-----------------+    Approved       +-------+--------+
| Transfer Package|----media-------->| Import Method  |
| (JSON + tools)  |    (USB/DVD)     | (see below)    |
+-----------------+                  +----------------+
```


# General Workflow

Regardless of target platform, the air-gapped deployment workflow follows the same pattern:

1. **Develop and validate** on the connected side. Run `node tools/validate.js` and fix all errors.
2. **Test import** against a connected staging environment that mirrors the air-gapped target. Only transfer after staging succeeds.
3. **Build the transfer package.** Include schema files, data files, and the import tooling appropriate for your target platform.
4. **Calculate checksums** (SHA-256) for every file in the package.
5. **Transfer** via approved media following your organization's procedures.
6. **Verify checksums** on the air-gapped side before unpacking.
7. **Import** using the platform-specific method.
8. **Verify** the import by spot-checking records and comparing expected vs actual counts.

The following sections cover the platform-specific import methods. Each platform has different options depending on what tools are available on the air-gapped network.


# JSM Assets (Data Center)

JSM Assets on Data Center is the most common air-gapped target because many organizations run Jira on isolated networks.

## Method comparison

| Method | Needs CLI access? | Needs add-on? | Best for |
|--------|-------------------|---------------|----------|
| Portable Node.js package | Yes (on Jira server or nearby host) | No | Full CMDB-Kit toolchain offline |
| cURL or PowerShell | Yes | No | Minimal footprint, no add-ons |
| ScriptRunner Groovy | No | Yes (ScriptRunner) | No external tools needed at all |

The portable Node.js package is the recommended approach. It uses the same CMDB-Kit commands as a connected environment, includes built-in validation, and does not require any Jira add-ons. cURL or PowerShell works when you cannot get Node.js approved but have shell access. ScriptRunner is an alternative if your Jira instance already has it installed.

## Portable Node.js package

Bundle the Node.js runtime, the CMDB-Kit import scripts, and all schema and data files into a self-contained archive. Transfer this to the air-gapped network and run it on a machine that has network access to the JSM instance within the isolated network.

This is the recommended method because the commands are identical to the connected workflow. Validation, schema sync, data sync, and post-import checks all work the same way.

### Building the package (connected side)

```bash
# Download Node.js binary for the target OS
# (e.g., node-v20-linux-x64 or node-v20-win-x64)

mkdir -p cmdb-kit-portable
cp -r adapters/jsm cmdb-kit-portable/adapters/jsm
cp -r tools cmdb-kit-portable/tools
cp -r schema/core cmdb-kit-portable/schema/core
# Copy the Node.js binary into the package
cp node cmdb-kit-portable/node

tar czf cmdb-kit-portable.tar.gz cmdb-kit-portable/
```

The resulting archive is typically 80 to 150 MB (mostly the Node.js binary). It runs on any machine with the right operating system, with no installation required.

### Running on the air-gapped side

```bash
tar xzf cmdb-kit-portable.tar.gz
cd cmdb-kit-portable

export JSM_URL=https://jira.isolated.local:8080
export JSM_USER=admin
export JSM_PASSWORD=<password>
export SCHEMA_KEY=CMDB
export SCHEMA_DIR=schema/core
export DATA_DIR=schema/core/data

./node tools/validate.js --schema schema/core
./node adapters/jsm/import.js schema
./node adapters/jsm/import.js sync
./node adapters/jsm/validate-import.js
```

The only difference from a connected environment is `./node` points to the bundled binary rather than a system-installed one.

## cURL or PowerShell

Use cURL (Linux/macOS) or PowerShell (Windows) to call the JSM Assets REST API directly. This works on any machine that has these tools and network access to JSM.

Advantages: no special tools beyond what the OS provides, minimal footprint.

Disadvantages: you must script the API calls for each type and record, handle reference resolution manually (querying for object IDs), and there is no built-in validation step.

A complete PowerShell import script (~220 lines) with object type lookup, attribute mapping, and LOAD_PRIORITY-ordered import is available as a reference implementation.

## Alternative: ScriptRunner Groovy

If the target Jira instance already has the ScriptRunner add-on installed, you can run the import entirely inside the Jira JVM without any external tools or CLI access. This is useful in environments where no workstation on the isolated network can run scripts against the JSM REST API.

ScriptRunner allows Groovy scripts to run inside Jira. Because the script runs in-process, it uses JSM's internal Java API rather than REST, handles authentication automatically (it runs as the logged-in Jira admin), and does not need any external network access.

### Setup

1. Create an import directory on the Jira server:

```bash
mkdir -p /var/atlassian/application-data/jira/import/cmdb-kit/
chmod 755 /var/atlassian/application-data/jira/import/cmdb-kit/
```

2. Transfer the JSON schema and data files to this directory via approved media.

### Schema import

The schema import script creates object types and attributes in JSM Assets:

1. Define the schema structure as a Groovy data structure (converted from schema-structure.json)
2. Define the attributes (converted from schema-attributes.json)
3. Define the LOAD_PRIORITY order
4. For each type in order: create the object type if it does not exist, then create or update its attributes

### Data import

The data import script creates or updates object records:

1. Define LOAD_PRIORITY
2. For each type in order: load the data from the JSON file in the import directory
3. For each record: check if an object with that Name already exists, create or update accordingly
4. For reference fields: resolve the referenced object by querying for its Name in the target type

Reference resolution is the most complex part. The script must query JSM for each referenced value to get its internal object ID. Cache resolved IDs to avoid repeated queries for the same value.

### Running in the ScriptRunner console

Navigate to Jira Administration, then ScriptRunner, then Script Console. Paste the script and execute. The console displays output and any errors.

For large imports, break the script into multiple runs: lookup types first, then Directory types, then Product CMDB types, then Product Library types. This follows the LOAD_PRIORITY order and keeps each script execution manageable.

### Configuration

Configuration values to set in the script:

- **Schema key** (e.g., "CMDB") identifies which JSM Assets schema to target
- **Data directory** (e.g., `/var/atlassian/application-data/jira/import/cmdb-kit/`) where the JSON files were placed
- **Base URL** (e.g., `http://localhost:8080`) for the internal JSM URL

Logging uses Jira's built-in logger. Include progress messages ("Processing type 14 of 20: Product Version") and a summary at the end ("Import complete: 247 created, 12 updated, 3 errors").

### Script reference

A complete Groovy import script (~375 lines) with an API client class, file loader, and main import loop is available as a reference implementation. Adapt it to your LOAD_PRIORITY and schema key.

## JSM native export/import (schema only)

For transferring just the schema structure (not data):

1. Navigate to Assets in the source JSM instance
2. Open Schema Configuration, then Object Types
3. Export the schema (include attribute configurations)
4. Transfer via approved media
5. Import in the target JSM instance via Assets, Schema, Configuration, Import Schema

This is a manual process and does not handle data import or relationship preservation well, but it can bootstrap the schema structure without any scripting.


# ServiceNow

ServiceNow instances on isolated networks use the same adapter commands as connected environments. The import methods parallel the JSM options.

## Method comparison

| Method | Needs CLI access? | Best for |
|--------|-------------------|----------|
| Portable Node.js package | Yes | Full CMDB-Kit toolchain offline |
| cURL or PowerShell | Yes | Minimal footprint, no extras |
| Update sets (schema only) | No | Native SN schema transfer, no scripting |

ServiceNow does not have a ScriptRunner equivalent for running arbitrary scripts inside the instance. However, ServiceNow's Background Scripts feature (System Definition, Scripts - Background) can run JavaScript on the server, which provides a similar capability for administrators.

## Method 1: Portable Node.js package

The same approach as JSM: bundle the Node.js runtime, the ServiceNow adapter, and all schema and data files.

### Building the package (connected side)

```bash
mkdir -p cmdb-kit-portable
cp -r adapters/servicenow cmdb-kit-portable/adapters/servicenow
cp -r tools cmdb-kit-portable/tools
cp -r schema/core cmdb-kit-portable/schema/core
cp node cmdb-kit-portable/node

tar czf cmdb-kit-portable.tar.gz cmdb-kit-portable/
```

### Running on the air-gapped side

```bash
tar xzf cmdb-kit-portable.tar.gz
cd cmdb-kit-portable

export SN_INSTANCE=https://servicenow.isolated.local
export SN_USER=admin
export SN_PASSWORD=<password>
export SCHEMA_DIR=schema/core
export DATA_DIR=schema/core/data

./node adapters/servicenow/import.js --test-connection
./node tools/validate.js --schema schema/core
./node adapters/servicenow/import.js schema
./node adapters/servicenow/import.js sync
./node adapters/servicenow/validate-import.js
```

If the instance does not allow API-based table creation, use `--report-only` on the connected staging side to generate manual creation instructions, then have the ServiceNow admin create the tables manually before running the data import.

## Method 2: cURL or PowerShell

ServiceNow's Table API accepts standard REST calls. Use cURL or PowerShell to create records type by type in LOAD_PRIORITY order.

```bash
# Example: create a lookup value
curl -s -u admin:password \
  -H "Content-Type: application/json" \
  -d '{"name": "Active", "description": "Application is live"}' \
  https://servicenow.isolated.local/api/now/table/u_cmdbk_application_status
```

This works but requires scripting every type and handling reference resolution (querying for sys_ids) manually.

## Method 3: Update sets (schema only)

ServiceNow update sets can capture table and column definitions:

1. On the connected staging instance, create an update set and make your schema changes (create tables, add columns)
2. Export the update set as XML
3. Transfer via approved media
4. Import the update set on the air-gapped instance and commit it

This transfers the schema structure through ServiceNow's native change management mechanism. Data still requires one of the other methods.


# Media Transfer Procedures

## Building the transfer package

The transfer package should include:

- Schema files (schema-structure.json, schema-attributes.json)
- Data files (the `data/` directory)
- Import tooling (adapter scripts, Node.js binary if using the portable package method, or Groovy/PowerShell scripts if using those methods)
- A manifest listing every file with its SHA-256 checksum
- Transfer documentation: source system, destination system, date, preparer

Keep the package minimal. Do not include the full git repository, documentation, or test files. Only include what is needed for the import.

## Checksum verification

Calculate checksums on the connected side:

```bash
find cmdb-kit-portable/ -type f -exec sha256sum {} \; > manifest.sha256
```

Verify on the air-gapped side:

```bash
sha256sum -c manifest.sha256
```

If any checksum fails, do not proceed. The file was corrupted or altered during transfer.

## Physical media procedures

Transferring files to an air-gapped network follows the organization's approved media transfer procedure. The general process:

1. Prepare the transfer package on the development workstation
2. Calculate checksums for every file
3. Copy to approved transfer media (encrypted USB, write-once optical disc, or approved cross-domain transfer mechanism)
4. Document the transfer: manifest with checksums, source system, destination system, transfer date, person performing the transfer
5. Transport the media following physical security procedures
6. On the isolated side, verify checksums before unpacking
7. Import using the chosen method

## Separating schema from data

In some organizations, schema files and data files have different sensitivity levels. The schema files define types and attributes (generally not sensitive). The data files contain actual CI records that may include deployment details, personnel names, or operational information.

Separate the files in the transfer package so they can be reviewed and approved independently. This allows the schema to be cleared at a lower review level while the data files go through a more thorough review if needed.

## Chain of custody

Maintain a record for the transfer media:

- Who prepared the media
- When it was prepared
- What files it contains (manifest with checksums)
- Who transported it
- When it arrived at the destination
- Who received it
- When it was imported
- When the media was sanitized or destroyed after import

This documentation is required for audit purposes and may be required by the organization's security procedures.


# Verification After Import

## Spot-checking imported objects

After import, manually verify a sample of records in the target CMDB:

Open a few lookup types and verify the values match the data files.

Open a few CI records (an Application, a CR Product Version, a CR Deployment Site) and verify the attributes match.

Check reference fields: does the CR Deployment Site's productVersion field point to the correct CR Product Version record?

Spot-checking catches systemic issues (all references broken, all dates in wrong format) without requiring a full automated validation.

## Relationship validation

Verify that reference relationships resolved correctly. Open a CR Product Version record and check that its Components field shows the linked CR Component Instance records. Open a CR Deployment Site and verify its productVersion, customerOrganization, and location references.

Broken references appear as empty fields or error indicators. A systematic pattern of broken references (all CR Deployment Site productVersion references are empty) indicates that CR Product Version records were not imported before CR Deployment Site records, or that the Name values do not match.

## Comparing expected vs actual record counts

For each type, compare the number of records in the data file against the number of records in the target database. If the data file has 12 CR Deployment Site records and the CMDB shows 10, two records failed to import.

If the portable Node.js package is available, run the post-import validator:

```bash
# JSM
./node adapters/jsm/validate-import.js

# ServiceNow
./node adapters/servicenow/validate-import.js
```

This automates the comparison and reports missing records, extra records, and field mismatches per type.

## Handling import failures in offline environments

In a connected environment, you can fix a data error, re-validate, and re-import immediately. In an air-gapped environment, a failure may require a new media transfer cycle.

Minimize this risk by validating thoroughly on the connected side before transfer:

- Run `node tools/validate.js` and fix all errors
- Do a test import to a connected staging environment that mirrors the air-gapped target
- Only transfer after staging succeeds

If failures occur on the air-gapped side despite pre-validation, diagnose the issue locally (check the script output, spot-check records, compare expected vs actual counts), fix the data files on the air-gapped machine if possible, and re-import. Document any changes made on the air-gapped side and back-port them to the development repository on the connected side during the next update cycle.


# Permissions Summary

## JSM Assets

| Permission | Where to grant | Which methods need it |
|---|---|---|
| Assets Schema - Browse, Create, Edit | Assets, Object Schemas, Roles | All methods |
| Jira System Admin | Jira Administration | ScriptRunner, portable package |
| ScriptRunner Console access | Jira Administration | ScriptRunner only |
| Jira server filesystem access | OS-level | ScriptRunner (to place JSON files), portable package |

## ServiceNow

| Permission | Where to grant | Which methods need it |
|---|---|---|
| Admin role | User Administration | All methods |
| glide.rest.create_metadata = true | System Properties | Portable package, cURL/PowerShell (for table creation) |
| Background Scripts access | System Definition | Background Scripts method only |


# Troubleshooting

| Error | Fix |
|---|---|
| Schema not found | Create the schema manually in JSM Assets or verify the `SCHEMA_KEY` value |
| Object type not found | Import schema structure first (`import.js schema`), then data |
| Cannot find referenced object | Import dependencies first (check LOAD_PRIORITY order) |
| 403 Forbidden (JSM) | Ensure the user has Assets Administrator permissions |
| 403 on table creation (ServiceNow) | Set `glide.rest.create_metadata` to true, or use `--report-only` |
| Checksum mismatch after transfer | Re-transfer the file; do not import corrupted data |
| Script timeout in ScriptRunner | Break the import into smaller batches (lookup types, then directory, then CIs, then library) |
