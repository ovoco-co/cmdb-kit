---
name: check-refs
description: Find broken references, orphaned data files, and types without data in a CMDB-Kit schema
disable-model-invocation: true
argument-hint: [schema-path, e.g. schema/extended]
allowed-tools: Bash, Read, Grep, Glob
---

Audit a CMDB-Kit schema for reference integrity issues. If no argument, check all schemas.

## Checks to run

### 1. Types without data files
Read schema-structure.json, find all leaf types (types that are not parents of other types). Check that each has a corresponding kebab-case data file in data/. Report any missing.

### 2. Data files without types
List all .json files in data/. Convert each filename from kebab-case to Title Case. Check that each matches a type in schema-structure.json. Report any orphaned data files.

### 3. Broken reference types
Read schema-attributes.json. For every attribute with `"type": 1`, check that the `referenceType` value exists as a type name in schema-structure.json. Report any references to non-existent types. For domain schemas, note which references point to types expected from the parent schema (Core).

### 4. Broken reference values in data
For each data file, check reference attribute values against the records in the referenced type's data file. Report any values that don't match a Name in the target file.

### 5. LOAD_PRIORITY coverage
Read tools/lib/constants.js. Check that every leaf type in the schema is listed in LOAD_PRIORITY. Report any missing.

### 6. Attribute/data alignment
For each data file, check that every field in the records matches an attribute defined in schema-attributes.json for that type. Report any undefined fields.

## Output

Summarize all findings in a table grouped by check type. Distinguish errors (broken references, undefined fields) from warnings (missing data files, LOAD_PRIORITY gaps).
