# Other Platforms

CMDB-Kit's schema is defined in vendor-neutral JSON files. The adapters for [JSM Assets](03-01-JSM-Assets-Setup.md) and [ServiceNow](03-04-ServiceNow-Setup.md) are the two included adapters, but the same schema files can be loaded into any database that supports typed records with reference attributes. This chapter outlines options to explore.


# Supported Adapters

These adapters are included in CMDB-Kit and documented in the User Guide.

| Adapter | Platform | Setup Guide |
|---------|----------|-------------|
| jsm | JSM Assets (Cloud and Data Center) | [JSM Assets Setup](03-01-JSM-Assets-Setup.md) |
| servicenow | ServiceNow CMDB | [ServiceNow Setup](03-04-ServiceNow-Setup.md) |


# Options to Explore

The following platforms are not supported with included adapters, but CMDB-Kit's schema and data files can be adapted to work with them.

## Relational databases

PostgreSQL, MySQL, and SQLite can host CMDB-Kit data directly. Each object type becomes a table, each attribute becomes a column, and reference attributes become foreign keys. The `schema-structure.json` file defines the type hierarchy (which maps to table inheritance or joined tables), and `schema-attributes.json` defines the columns.

This is a good fit for organizations that want full SQL querying, custom reporting, or integration with existing relational infrastructure. SQLite works well for local development and testing.

## Commercial CMDBs

Platforms like Device42 and i-doit offer REST APIs for CI management. The adapter pattern is the same: read CMDB-Kit's schema files, map types and attributes to the target platform's model, and push records via API. Device42's auto-discovery features can complement CMDB-Kit's manually curated schema by populating infrastructure CIs automatically.

## Graph databases

Neo4j, Amazon Neptune, and similar graph databases are a natural fit for CMDB data because the relationship model maps directly to graph edges. Each CI becomes a node, each reference attribute becomes an edge, and traversal queries (impact analysis, dependency chains) are first-class operations.

CMDB-Kit's `schema-structure.json` defines the node labels (type hierarchy), and the reference attributes in `schema-attributes.json` define the edge types.

## Data analysis

For reporting, auditing, or one-off analysis, CMDB-Kit's JSON data files can be loaded directly into Python with pandas, into R, or into any data analysis tool that reads JSON. No adapter is needed; the data files are the input.

```python
import json, pandas as pd

with open("schema/base/data/application.json") as f:
    apps = pd.DataFrame(json.load(f))
```

This approach is useful for schema audits, data quality checks, and generating reports without connecting to a live CMDB instance.


# Building a Custom Adapter

The [Writing Custom Adapters](../../Developer-Manual/Part-2-Extending/02-01-Writing-Custom-Adapters.md) chapter in the Developer Manual covers the adapter interface, the schema and data file formats, and how to handle type mapping, reference resolution, and import ordering. Use the JSM and ServiceNow adapters as reference implementations.
