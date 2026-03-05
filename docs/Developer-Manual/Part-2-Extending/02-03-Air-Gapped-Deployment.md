# Air-Gapped and Offline Deployment

Not every CMDB target lives on a network with internet access. Classified environments, isolated production networks, and compliance-restricted systems may have no outbound connectivity. CMDB-Kit's JSON-based schema and data files are designed to be portable: you can transfer them on physical media, import them through the target platform's scripting console, or bundle the entire import toolkit into a self-contained package. This chapter covers the deployment scenarios, the import methods available, the media transfer procedures, and the verification steps for offline environments.


# Deployment Scenarios

## Connected Environments

In a connected environment, the development workstation has network access to the target JSM instance. The standard workflow applies: edit files locally, validate, run the import script over the network. The import script connects to JSM's REST API using environment variables for URL, credentials, and schema key.

This is the simplest scenario and does not require any special handling. The tools/ and adapters/ directories work as documented.

## Air-gapped and Classified Environments

In an air-gapped environment, the target JSM instance has no network path to the development workstation. The CMDB runs on a classified network (SIPR, JWICS, or a standalone enclave) that is physically isolated from unclassified networks where development occurs.

This means the import script cannot connect directly. The schema files and data must be transferred through an approved media transfer process: encrypted USB drives, optical media, or cross-domain transfer mechanisms. Once on the classified network, the import runs using whatever tools are available on that network.

## When Each Applies

Connected: development and staging environments, cloud-hosted CMDB instances, any environment where the workstation can reach the target API.

Air-gapped: classified government networks, isolated production environments, compliance-restricted systems where no external tools can be installed, environments where API access is restricted to the local network only.

Many organizations have both. Development runs on a connected network, and production runs on an air-gapped network. The schema and data are developed and validated on the connected side, then transferred to the air-gapped side for import.


# Import Method Comparison

## Method 1: ScriptRunner Groovy Scripts

ScriptRunner is a Jira add-on that allows Groovy scripts to run inside the Jira JVM. Because the script runs inside Jira itself, it does not need any external network access or additional software. This makes it the best option for air-gapped environments where you cannot install Node.js or other tools.

The Groovy script reads JSON data (embedded in the script or loaded from a local file path on the Jira server), calls the JSM Assets API internally, and creates or updates objects directly.

Advantages: runs entirely inside Jira, no external tools needed, no network access required, leverages existing Jira admin permissions.

Disadvantages: requires ScriptRunner license, script size is limited by JVM memory, large data sets need batching, debugging is done through Jira's script console.

## Method 2: Portable Node.js Package

Build a self-contained package that includes the Node.js runtime, the import scripts, and all schema and data files. Transfer this package to the air-gapped network, unpack it, and run the import locally on a machine that has network access to the target JSM instance within the classified network.

The package is typically 80 to 150 MB (mostly the Node.js binary). It runs on any machine with the right operating system, with no installation required.

Advantages: uses the same import scripts as connected environments, full validation and error reporting, familiar workflow for developers.

Disadvantages: requires a machine on the air-gapped network that can run Node.js, requires network access from that machine to the JSM instance, the Node.js binary must pass security review for the classified network.

## Method 3: cURL and REST API

Use cURL or PowerShell commands to call the JSM Assets REST API directly. This method works on any machine that has cURL or PowerShell and network access to JSM. The JSON data is sent as request bodies to the API endpoints.

Advantages: no special tools beyond cURL or PowerShell, works on any operating system, minimal footprint.

Disadvantages: requires scripting the API calls for each type and record, no built-in reference resolution (you must resolve object IDs manually), error handling is manual, no validation step.

## Choosing the Right Method

If ScriptRunner is available on the target Jira instance, use Method 1. It has the smallest footprint and the fewest external dependencies.

If ScriptRunner is not available but you can get Node.js approved for the classified network, use Method 2. It gives you the full CMDB-Kit toolchain.

If neither ScriptRunner nor Node.js is available, use Method 3 as a last resort. It works but requires significantly more manual effort.


# ScriptRunner Import

## Groovy Script Structure for Schema Import

The schema import script creates object types and attributes in JSM Assets. The script structure:

1. Define the schema structure as a Groovy data structure (converted from schema-structure.json)
2. Define the attributes (converted from schema-attributes.json)
3. Define the LOAD_PRIORITY order
4. For each type in order: create the object type if it does not exist, then create or update its attributes

The script uses JSM's internal Java API rather than REST, which means it runs faster and handles authentication automatically (it runs as the Jira admin who executes the script).

## Groovy Script Structure for Data Import

The data import script creates or updates object records:

1. Define LOAD_PRIORITY
2. For each type in order: load the data (embedded JSON or file path), iterate records
3. For each record: check if an object with that Name already exists, create or update accordingly
4. For reference fields: resolve the referenced object by searching for its Name in the target type

Reference resolution is the most complex part. The script must query JSM for each referenced value to get its internal object ID. Caching resolved IDs avoids repeated queries for the same value.

## Configuration: Auth, JSM Paths, and Logging

ScriptRunner scripts run as the logged-in Jira admin, so authentication is implicit. Configuration is embedded in the script:

The schema key (e.g., "CMDB") identifies which JSM Assets schema to target.

The workspace ID identifies the JSM Assets workspace. Query the API to find it, or hard-code it from the admin UI.

Logging uses Jira's built-in logger. Include progress messages ("Processing type 14 of 55: Product Version") and error counts ("Import complete: 247 created, 12 updated, 3 errors").

## Running Scripts in the ScriptRunner Console

Navigate to Jira Administration, then ScriptRunner, then Script Console. Paste the script and execute. The console displays output and any errors.

For large imports, break the script into multiple runs: lookup types first, then Directory types, then Product CMDB types, then Product Library types. This follows the LOAD_PRIORITY order and keeps each script execution manageable.


# Portable Package Import

## Building the Portable Package

On the connected development machine:

1. Download the Node.js binary for the target operating system (e.g., linux-x64 or win-x64)
2. Copy the CMDB-Kit repository (or just the needed directories: adapters/, tools/, schema/)
3. Run `npm install` to download dependencies (if any)
4. Package everything into a tar.gz or zip archive

```bash
tar czf cmdb-kit-portable.tar.gz node adapters/ tools/ schema/ package.json
```

The resulting archive is self-contained. No internet access is needed to run it.

## Import Directory Setup and Permissions

On the air-gapped machine, unpack the archive and set environment variables:

```bash
tar xzf cmdb-kit-portable.tar.gz
export JSM_URL=https://jira.classified.local:8080
export JSM_USER=admin
export JSM_PASSWORD=<password>
export SCHEMA_KEY=CMDB
export SCHEMA_DIR=schema/extended
export DATA_DIR=schema/extended/data
```

Verify connectivity to the JSM instance from the air-gapped machine. The machine must be on the same network as JSM, even though neither has internet access.

## Running the Import Offline

The import commands are the same as in a connected environment:

```bash
./node tools/validate.js --schema schema/extended
./node adapters/jsm/import.js schema
./node adapters/jsm/import.js sync
./node adapters/jsm/validate-import.js
```

The only difference is that `./node` points to the bundled Node.js binary rather than a system-installed one.


# Media Transfer Procedures

## Encrypted USB and Physical Media Procedures for Disconnected Networks

Transferring files to an air-gapped network follows the organization's approved media transfer procedure. The general process:

1. Prepare the transfer package on the development workstation (the portable package or the schema/data files for ScriptRunner)
2. Calculate checksums (SHA-256 or SHA-512) for every file in the package
3. Copy the package to approved transfer media (encrypted USB, write-once optical disc, or approved cross-domain transfer mechanism)
4. Document the transfer: manifest listing every file with its checksum, the source system, the destination system, the transfer date, and the person performing the transfer
5. Transport the media to the classified environment following physical security procedures
6. On the classified side, verify checksums before unpacking
7. Import using the chosen method

## Classification Marking Requirements

If the schema or data files contain classified information (site names, deployment details, personnel data), the files and the transfer media must be marked with the appropriate classification level. The transfer manifest must include the classification of each file.

In many cases, the schema files themselves are unclassified (they define types and attributes, not operational data). The data files may be classified if they contain real deployment site names, personnel names, or operational details. The OvocoCRM example data is unclassified.

Separate unclassified schema files from classified data files in the transfer package. This allows the schema to be reviewed and approved at a lower classification level.

## Chain of Custody Documentation

Maintain a chain of custody record for the transfer media:

Who prepared the media.
When it was prepared.
What files it contains (manifest with checksums).
Who transported it.
When it arrived at the classified facility.
Who received it.
When it was imported.
When the media was sanitized or destroyed after import.

This documentation is required for audit purposes and may be required by the organization's security procedures.


# Verification After Import

## Spot-checking Imported Objects

After import, manually verify a sample of records in the target JSM Assets instance:

Open a few lookup types and verify the values match the data files.

Open a few CI records (an Application, a Product Version, a Deployment Site) and verify the attributes match.

Check reference fields: does the Deployment Site's Product Version field point to the correct version record?

Spot-checking catches systemic issues (all references broken, all dates in wrong format) without requiring a full automated validation.

## Relationship Validation

Verify that reference relationships resolved correctly. In JSM Assets, open a Product Version record and check that its Components field shows the linked Product Component records. Open a Deployment Site and verify its Product Version, Organization, and Location references.

Broken references appear as empty fields or "(not found)" indicators. A systematic pattern of broken references (all Deployment Site productVersion references are empty) indicates that Product Version records were not imported before Deployment Site records, or that the Name values do not match.

## Comparing Expected vs Actual Record Counts

For each type, compare the number of records in the data file against the number of records in the target database. If the data file has 12 Deployment Site records and JSM shows 10, two records failed to import.

If the portable Node.js package is available, run the post-import validator:

```bash
./node adapters/jsm/validate-import.js
```

This automates the comparison and reports missing records, extra records, and field mismatches per type.

## Handling Import Failures in Offline Environments

In a connected environment, you can fix a data error, re-validate, and re-import immediately. In an air-gapped environment, a failure may require a new media transfer cycle.

Minimize this risk by validating thoroughly on the connected side before transfer:

Run `node tools/validate.js` and fix all errors.

Do a test import to a connected staging environment that mirrors the air-gapped target.

Only transfer to the air-gapped environment after the staging import succeeds.

If failures occur on the air-gapped side despite pre-validation, diagnose the issue locally (check the script output, spot-check records, compare expected vs actual counts), fix the data files on the air-gapped machine if possible, and re-import. Document any changes made on the air-gapped side and back-port them to the development repository on the connected side during the next update cycle.
