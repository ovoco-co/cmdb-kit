Contributing to CMDB-Kit

Thank you for your interest in contributing. This guide explains how to get involved.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install optional dependencies: `npm install`
4. Run validation to confirm everything works: `npm run validate:base`

Node.js 18 or later is required.

## Ways to Contribute

### Report Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Which schema layer (base, extended, or enterprise) and adapter you were using

### Suggest New Types or Attributes

If the schema is missing a CI type, lookup, or attribute that your use case needs, open an issue describing:
- The type name and where it fits in the hierarchy (Product CMDB, Product Library, Directory, or Lookup Types)
- The attributes it needs
- Which ITIL practice it relates to (if applicable)

### Add or Improve Data

The example data models a fictional SaaS CRM called OvocoCRM. Contributions that make the example richer or more realistic are welcome.

### Write an Adapter

New adapters for other CMDB platforms (Device42, i-doit, etc.) are especially valued. See [Writing Custom Adapters](docs/Developer-Manual/Part-2-Extending/02-01-Writing-Custom-Adapters.md) for the interface guide.

### Fix Bugs or Improve Tooling

Bug fixes, validation improvements, and tooling enhancements are always welcome.

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Run validation on all schema layers:
   ```bash
   node tools/validate.js --schema schema/base
   node tools/validate.js --schema schema/extended
   node tools/validate.js --schema schema/enterprise
   ```
4. Commit with a clear message (see conventions below)
6. Open a pull request against `main`

## Adding a New Type

Follow these steps in order:

1. Add the type to `schema-structure.json` under the appropriate parent
2. Add attribute definitions to `schema-attributes.json`
3. Add the type to `LOAD_PRIORITY` in `tools/lib/constants.js`, placing it after any types it depends on
4. Create a data file in the `data/` directory (kebab-case filename, e.g., `product-version.json`)
5. Run validation to confirm everything is consistent

## Conventions

### Naming

| Thing | Convention | Example |
|-------|------------|---------|
| Object type | Title Case | Product Version |
| JSON data file | kebab-case | product-version.json |
| Attribute (schema) | camelCase | versionNumber |
| Attribute (display) | Title Case | Version Number |

### Commits

- Commit schema changes separately from data changes
- Use clear, descriptive messages: "Add Network Segment type to extended schema"
- Keep commits focused on a single logical change

### Code Style

- No external runtime dependencies (the kit is dependency-free by design)
- Use `const` and `let`, not `var`
- Include `--help` output for any new CLI tool
- Exit with non-zero status on errors
- Use the shared `C` color codes from `tools/lib/constants.js` for terminal output

### Documentation

- No em dashes (use hyphens or commas)
- No ampersands as "and" (proper acronyms are fine)
- No horizontal rules, numbered sections, or tables of contents
- No bold text in table cells

## Pull Requests

- Reference any related issue in the PR description
- Include validation output showing all three schemas pass
- For new types, include example data in the OvocoCRM style
- For new adapters, include a README.md with setup instructions

## Questions?

Open an issue for any questions about contributing.
