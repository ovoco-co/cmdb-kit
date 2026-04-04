---
name: validate
description: Run CMDB-Kit schema validation against a specified schema directory
disable-model-invocation: true
argument-hint: [schema-path, e.g. schema/core or schema/domains/sccm]
allowed-tools: Bash, Read
---

Validate a CMDB-Kit schema. If no argument is given, validate all schemas.

## With argument

Run: `node tools/validate.js --schema $ARGUMENTS`

Report the results. If there are errors, read the relevant schema files and suggest fixes.

## Without argument

Run validation against all schema directories:

```bash
for dir in schema/base schema/extended schema/enterprise schema/domains/*/; do
  if [ -f "$dir/schema-structure.json" ]; then
    echo "=== Validating $dir ==="
    node tools/validate.js --schema "$dir"
    echo ""
  fi
done
```

Summarize results in a table: schema path, errors, warnings, pass/fail.
