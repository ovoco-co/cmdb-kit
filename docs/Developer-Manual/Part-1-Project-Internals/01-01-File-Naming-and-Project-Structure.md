# File Naming and Project Structure

CMDB-Kit organizes its files around a simple principle: every file name is derivable from the type name it represents. Schema files define types, attribute files define fields, and data files contain records. This chapter explains the repository layout, the naming conventions, the JSON data formats, and how to keep everything consistent as the schema grows.


# Repository Layout

## schema/

The `schema/` directory contains one or more schema layers. Each layer is a self-contained directory with three things: a structure file, an attributes file, and a data directory.

```
schema/
├── base/
│   ├── schema-structure.json
│   ├── schema-attributes.json
│   └── data/
│       ├── application.json
│       ├── product-version.json
│       └── ...
├── extended/
│   ├── schema-structure.json
│   ├── schema-attributes.json
│   └── data/
│       ├── application.json
│       ├── product-version.json
│       ├── change-request.json
│       └── ...
└── enterprise/
    ├── schema-structure.json
    ├── schema-attributes.json
    ├── README.md
    └── data/
        ├── application.json
        ├── service.json
        ├── contract.json
        ├── requirement.json
        └── ...
```

The `base/` layer contains the minimal schema (20 types). The `extended/` layer contains the full schema (55 types). The `enterprise/` layer adds enterprise architecture, financial tracking, requirements, and configuration library management (78 types). All three layers are independently valid and can be imported separately. Each layer is a superset of the one below it.

## adapters/

The `adapters/` directory contains database-specific import and export scripts. Currently, JSM Assets is the only supported adapter:

```
adapters/
└── jsm/
    ├── import.js
    ├── export.js
    └── validate-import.js
```

## tools/

The `tools/` directory contains vendor-neutral utilities:

```
tools/
├── validate.js
├── generate-templates.js
├── csv-to-json.js
└── lib/
    ├── constants.js
    ├── attr-names.js
    └── file-loader.js
```

`validate.js` checks schema and data integrity offline. `generate-templates.js` creates CSV or XLSX templates for data entry. `csv-to-json.js` converts filled CSV templates back to JSON data files. The `lib/` directory contains shared constants and helper functions.

## docs/

The `docs/` directory contains all documentation, including this training guide:

```
docs/
├── User-Guide/
│   ├── Part-1-CMDB-Concepts/
│   │   └── 01-00-Getting-Started.md
│   ├── Part-2-Schema-Design/
│   ├── Part-3-Platform-Setup/
│   ├── Part-4-Day-to-Day/
│   └── Part-5-Governance/
├── Developer-Manual/
│   ├── Part-1-Project-Internals/
│   └── Part-2-Extending/
└── diagrams/
```

## src/

The `src/` directory contains source material and reference documents that informed the training guide and schema design. This directory is not required for using CMDB-Kit.


# Schema Directory Structure

## schema-structure.json

This file defines the type hierarchy: which types exist and their parent-child relationships. Each type has a name, an optional parent, and a description:

```json
[
  { "name": "Product CMDB", "description": "Infrastructure configuration items" },
  { "name": "Application", "parent": "Product CMDB", "description": "Software applications" },
  { "name": "Server", "parent": "Product CMDB", "description": "Physical or virtual servers" }
]
```

Types without a parent are root branches. Types with a parent are children of that branch. The hierarchy can nest as deep as needed.

## schema-attributes.json

This file defines the fields for each type. Keys are type names, values are objects where each key is an attribute name and each value is an attribute definition:

```json
{
  "Application": {
    "description": { "type": 0 },
    "appStatus": { "type": 1, "referenceType": "Application Status" },
    "owner": { "type": 1, "referenceType": "Team" }
  }
}
```

Attribute names use camelCase in the schema file. The import script converts them to Title Case for display (appStatus becomes App Status). Some conversions need explicit mapping (ipAddress becomes IP Address, not Ip Address), handled by the `ATTR_NAME_MAP` in `tools/lib/attr-names.js`.

## data/

The `data/` directory contains one JSON file per type (with some exceptions for nested types). File names are kebab-case versions of the type name: Product Version becomes product-version.json, Application Status becomes application-status.json.


# Data File Naming Convention

## Type Name to kebab-case

The conversion is mechanical: lowercase the type name and replace spaces with hyphens.

| Type Name | File Name |
|-----------|-----------|
| Application | application.json |
| Product Version | product-version.json |
| Application Status | application-status.json |
| Distribution Log | distribution-log.json |
| Deployment Site | deployment-site.json |
| Documentation Suite | documentation-suite.json |

This conversion is implemented as:

```js
const safeName = typeName.toLowerCase().replace(/ /g, '-');
```

The same formula appears in validate.js, csv-to-json.js, generate-templates.js, and the import script. Consistency is guaranteed because they all use the same algorithm.

## How the Import Script Resolves File Names to Type Names

The import script looks for a data file using a three-step resolution:

1. Exact kebab match: `product-version.json`
2. Plural fallback: `product-versions.json` (adds trailing "s")
3. Personnel types: if the type is in the PERSONNEL_TYPES list, check `person.json`

The first file that exists wins. In practice, use the exact kebab form. The plural fallback exists for backward compatibility.

The PERSONNEL_TYPES list currently contains only "Person." If you extend the schema with personnel-related types (Clearance, Training Record, Facility Access), you can add them to PERSONNEL_TYPES so they resolve from `person.json`. This allows multiple small types to share one data file.


# Document File Naming Standard

## Standard Format: PRODUCT-DOCTYPE-DESCRIPTOR-VERSION-DATE.ext

Controlled documents stored on the DML follow a naming convention that encodes metadata in the filename:

```
OVOCOGRM-SDD-AUTH-2.4.0-20250701.pdf
```

Breaking this down:

OVOCOGRM: product identifier (OvocoCRM shortened to fit naming constraints).

SDD: document type code (Software Design Description).

AUTH: descriptor identifying the specific document (authentication module).

2.4.0: the product version this document relates to.

20250701: the date in YYYYMMDD format.

.pdf: the file extension.

## Document Type Codes and Their Meanings

Common document type codes:

| Code | Document Type |
|------|--------------|
| SDD | Software Design Description |
| SRS | Software Requirements Specification |
| VDD | Version Description Document |
| ICD | Interface Control Document |
| STP | Software Test Plan |
| STR | Software Test Report |
| UG | User Guide |
| AG | Admin Guide |
| IG | Installation Guide |
| RN | Release Notes |

These codes are organization-specific. The important thing is consistency: once you define a code, use it everywhere.

## Version Format Rules

Use semantic versioning in filenames: MAJOR.MINOR.PATCH (2.4.0, not 2.4 or v2.4.0). The version in the filename matches the Product Version record's `versionNumber` attribute.

## Date Format (YYYYMMDD)

Always use YYYYMMDD with no separators in filenames. This ensures chronological sorting when files are listed alphabetically. 20250701 sorts correctly. 07-01-2025 and 2025-07-01 do not sort correctly in all file systems.

## Software Media Naming Conventions

Software release artifacts follow a similar pattern:

```
OVOCOGRM-2.4.0-GOLD-linux-x64.tar.gz
OVOCOGRM-2.4.0-GOLD-win-x64.zip
```

The GOLD designator marks the release candidate that passed all verification. Other designators: GC (government candidate, pre-approval), TR (test release, internal only).


# Product-specific Naming Standards

## Example Product A File Naming

OvocoCRM documents and media use the CR prefix in the CMDB but the full product name in file names:

```
OVOCOGRM-SDD-CORE-2.4.0-20250701.pdf
OVOCOGRM-VDD-2.4.0-20250701.pdf
OVOCOGRM-2.4.0-GOLD-linux-x64.tar.gz
```

## Example Product B File Naming

OvocoAnalytics uses the AN prefix in the CMDB and its own product name in file names:

```
OVOCOAN-SDD-PIPELINE-1.0.0-20250801.pdf
OVOCOAN-VDD-1.0.0-20250801.pdf
OVOCOAN-1.0.0-GOLD-linux-x64.tar.gz
```

## Common Patterns Across Products

All products in the portfolio follow the same structure: PRODUCT-DOCTYPE-DESCRIPTOR-VERSION-DATE.ext. The product identifier changes, but the format is consistent. This consistency enables automated file processing and validation scripts that work across all products.


# JSON Data Formats

## Flat Format: Top-level Array of Objects

Most data files use the flat format: a JSON array of objects at the top level.

```json
[
  {
    "Name": "OvocoCRM 2.3.1",
    "versionNumber": "2.3.1",
    "versionStatus": "Current",
    "releaseDate": "2025-03-15"
  },
  {
    "Name": "OvocoCRM 2.3.0",
    "versionNumber": "2.3.0",
    "versionStatus": "Previous",
    "releaseDate": "2025-01-10"
  }
]
```

## Nested Format: Object With Type Name as Key

Directory types (Organization, Team, Person, Location, Facility, Vendor) use the nested format: an object with the type name as the key and an array of records as the value.

```json
{
  "Organization": [
    {
      "Name": "Ovoco Inc",
      "description": "Parent company",
      "orgType": "Company"
    }
  ]
}
```

The nested format exists because the `person.json` file bundles multiple personnel types in a single file. Each type gets its own key:

```json
{
  "Person": [
    { "Name": "Alex Chen", "email": "alex@ovoco.example.com" }
  ]
}
```

## When Each Format Is Used

The NESTED_TYPES set in `tools/lib/constants.js` defines which types use nested format: Organization, Team, Person, Location, Facility, and Vendor. All other types use flat format.

When creating a new data file, check whether the type is in NESTED_TYPES. If yes, use the nested format. If no, use the flat format. The csv-to-json.js tool handles this automatically by checking the existing file format or falling back to the NESTED_TYPES set.

## Field Names Match schema-attributes.json

Data file keys must match the camelCase attribute names in schema-attributes.json exactly. The import script converts these to Title Case for the target database, but the data files use camelCase:

```json
{
  "Name": "OvocoCRM 2.4.0",
  "versionNumber": "2.4.0",
  "versionStatus": "Current",
  "releaseDate": "2025-07-01",
  "previousVersion": "OvocoCRM 2.3.1"
}
```

`versionNumber` matches the schema. `VersionNumber` or `version_number` would not match and would be flagged by validate.js.

The `Name` field is special: it is always Title Case (capital N) because it is the built-in identifier field, not a user-defined attribute.


# Adding New Files When Extending the Schema

## Create the Data File After Adding the Type

When adding a new type to the schema, create its data file as the last step (after schema-structure.json, schema-attributes.json, and LOAD_PRIORITY). The file name follows the kebab-case convention.

## File Must Follow the kebab-case Convention

If you add a type called "Site Personnel Assignment," the data file must be `site-personnel-assignment.json`. Any other name will not be found by the import script or validation tool.

## Empty Arrays for Types With No Data Yet

If you add a type but do not have data yet, create the file with an empty array:

```json
[]
```

Or for nested types:

```json
{
  "TypeName": []
}
```

This satisfies the validation check for data file existence and prevents import errors.


# Keeping Base and Extended Schemas in Sync

## Schema Layers as Strict Supersets

Each schema layer is a strict superset of the one below it: base is contained in extended, and extended is contained in enterprise. Every type and attribute in a lower layer exists unchanged in the higher layers. Higher layers add types and attributes but never modify or remove anything from lower layers.

This means you can start with the base schema and migrate to extended or enterprise later without breaking existing data.

## When to Backport Changes

If you modify a higher-tier schema in a way that affects types shared with lower tiers (adding an attribute to Application, changing a lookup value), consider whether the change should also apply to lower schemas. If the change is universal (a new status value that every deployment needs), backport it. If the change is specific to that tier's types, do not backport.

## Validation Checks That Catch Drift

Run validation against all three schemas after any change:

```bash
node tools/validate.js --schema schema/base
node tools/validate.js --schema schema/extended
node tools/validate.js --schema schema/enterprise
```

If a reference in a lower schema points to a type that only exists in a higher schema, validation will catch it. These checks prevent schema drift between the layers.
