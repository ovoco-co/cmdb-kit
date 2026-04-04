---
name: new-domain
description: Scaffold a new CMDB-Kit domain extension directory
disable-model-invocation: true
argument-hint: [domain-name, e.g. compliance]
---

Create a new domain extension at `schema/domains/$ARGUMENTS/`.

## Steps

1. Create the directory structure:
   ```
   schema/domains/$ARGUMENTS/
   ├── schema-structure.json
   ├── schema-attributes.json
   ├── data/
   └── README.md
   ```

2. **schema-structure.json**: Create with a container type and placeholder. Use the domain name title-cased as the container. Example for "compliance":
   ```json
   [
     { "name": "Compliance", "description": "Security assessments and compliance certifications" }
   ]
   ```

3. **schema-attributes.json**: Create empty object `{}`.

4. **data/**: Create empty directory.

5. **README.md**: Create with this template:
   ```markdown
   # [Domain Name] Domain

   [One-sentence pitch.]

   ## Prerequisites

   This domain extends the **core** schema. It references types from core ([list specific types]) so the core schema must be loaded first.

   ## Types

   [List types when added.]

   ## UAF Alignment

   [Which UAF viewpoint or domain this maps to.]

   ## Platform Plugin Mapping

   | Platform | Paid plugin it replaces | What you save |
   |----------|------------------------|---------------|
   | ServiceNow | | |
   | JSM | | |
   ```

6. Ask the user what types they want to add to this domain.
