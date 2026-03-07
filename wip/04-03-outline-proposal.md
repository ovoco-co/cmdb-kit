# Data Entry and Maintenance - Proposed Outline

The current chapter mixes editing mechanics, data rules, and workflows. This
restructure groups by what the reader is trying to do.


## Current structure (chaotic)

```
JSON Editing Workflow
  Direct Editing of Data Files
  JSON Syntax Rules and Common Pitfalls
  Using Validation to Catch Errors Before Import
CSV and Excel Workflow
  Generating CSV Templates
  Template Columns Match Schema Attributes
  Filtering Templates by Role or Family
  Filling Templates in a Spreadsheet
  Converting Back to JSON
  When CSV Is Better Than Direct JSON Editing
  End-to-End CSV Checklist
Reference Value Consistency
  Exact Name Matching
  Case Sensitivity
  Common Mistakes
Adding, Updating, and Removing CI Records
  Adding: Append to the Array
  Updating: Find by Name and Modify Attributes
  Removing: Delete the Object, Check References First
  Never Include Key or id Fields
Bulk Data Operations
  Using CSV Workflow for Large Batches
  Scripting JSON Transformations
Documentation Quality Standards
  Completeness Audit Methodology
  Document Type Requirements by Product
  Archive and Obsolescence Procedures
Validation Before Every Import
  Always Run tools/validate.js Before Importing
  Fix All Errors Before Running the Import Script
```

Problems:
- Validation appears at both the end of JSON Editing AND as the final section
- "Bulk Data Operations" repeats the CSV workflow in summary form
- Reference rules are sandwiched between record operations and bulk ops
- No mention of exporting from a live database
- No round-trip workflow (export, edit, re-import)
- "Documentation Quality Standards" feels out of place (more of a governance topic)


## Proposed structure

```
Data Entry and Maintenance

# How Data Files Work
  ## File format and naming
  ## The Name field as unique identifier
  ## Never include Key or id fields
  ## Reference values: exact name matching, case sensitivity, semicolons for multi-ref

# Editing JSON Directly
  ## When to use JSON (small changes, scripted generation)
  ## Adding, updating, and removing records
  ## JSON syntax pitfalls (trailing commas, quotes, encoding)

# Spreadsheet Workflow
  ## When to use spreadsheets (bulk entry, non-technical contributors, review cycles)
  ## Generating templates (CSV and XLSX)
  ## Template structure (three header rows, column rules)
  ## Filtering by type, family, or role
  ## Filling data in Excel
  ## Converting back to JSON

# Exporting From a Live Database
  ## Pulling current state to local JSON
  ## Previewing changes with diff
  ## Overwriting local files

# Round-Trip Workflow
  ## Export, generate templates, edit, convert, validate, sync
  ## Quick reference (six commands)
  ## When to use this (bulk updates, team collaboration, data migration, periodic review)

# Validation
  ## Always validate before importing
  ## Common errors and what they mean
  ## The validate-then-import sequence

# Data Quality
  ## Completeness audits
  ## Archive and obsolescence (status to terminal state, never delete)
```

Changes:
- Starts with the data model rules (was scattered across three sections)
- JSON and spreadsheet are parallel "how to edit" sections
- Export gets its own section (was missing entirely)
- Round-trip is a first-class workflow (was missing entirely)
- Validation is one section instead of appearing twice
- "Bulk Data Operations" absorbed into spreadsheet workflow and round-trip
- "Documentation Quality Standards" trimmed to just data quality; doc-type
  requirements moved to the Product Library chapter where they belong
- "Document Type Requirements by Product" table should move to 02-01 (Building
  the Product Library) which already covers documentation suites
