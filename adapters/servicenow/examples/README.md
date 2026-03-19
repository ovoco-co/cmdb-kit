# ServiceNow-Native Example Data

Pre-transformed example data ready for direct import into ServiceNow. The server records have native field formats: RAM in MB integers, disk space in GB decimals, OS split into os and os_version fields, CPU split into cpu_count and cpu_name.

Other data files are identical to the platform-agnostic versions in schema/base/data/ since they don't require ServiceNow-specific formatting.

## Usage

```bash
export DATA_DIR=adapters/servicenow/examples
node adapters/servicenow/import.js sync
```

This imports the pre-transformed data directly. The adapter's data transforms (parseRam, parseDiskSpace, splitOs, splitCpu) still run but produce the same output since the values are already in native format.

## When to use this

Use this example data when demonstrating CMDB-Kit on a ServiceNow instance. The native field formats mean the data appears correctly in ServiceNow views without any formatting issues.

For normal usage, use the platform-agnostic data in schema/base/data/. The adapter handles the transforms automatically.
