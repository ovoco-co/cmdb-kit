# Atlassian Forge App Plan

## Architecture Decisions

### Forge as the only path to Marketplace

As of September 2025, only Forge apps can be submitted to the Atlassian Marketplace for Cloud. Connect apps are no longer accepted for new listings. The Forge runtime hosts app code in Atlassian's infrastructure. This is a non-negotiable platform constraint.

### JavaScript/TypeScript runtime

Forge runs JavaScript/TypeScript, which is the same stack as the existing JSM adapter (`adapters/jsm/`). Core logic from the adapter (schema parsing, data file loading, AQL query construction, reference resolution) can be reused in the Forge app. The adapter port is straightforward because there is no language change.

### UI Kit for interfaces

Forge provides UI Kit, a set of React-like components for building interfaces within Jira. The app uses UI Kit for all user-facing screens (schema import, data sync, validation dashboard, relationship visualization). No external UI framework needed.

### Forge Storage for state

Forge Storage provides key-value persistence within the app. Used for:

- Selected domains (which domains the user chose to load)
- Sync history (timestamps, record counts, errors from previous imports)
- Configuration preferences (schema key, import options)

### Domain-aware schema selection

The import UI presents a domain checklist instead of a tier picker:

- Core (always selected, required)
- Compliance (optional)
- Licensing (optional)
- Distribution (optional)
- EA (optional)
- Financial (optional)
- Requirements (optional)
- SCCM (optional, shows Compliance as required dependency)

Each domain shows its one-sentence pitch. The user selects which domains to load, previews the types that will be created, and confirms the import.

### Government Cloud considerations

Atlassian Government Cloud (AGC, FedRAMP Moderate) is available. Baseline security requirements for AGC apps took effect March 31, 2026. Annual Cloud App Security Requirements for 2026 include AI security, data protection, and supply chain security provisions. Domain-specific data (compliance findings, requirements, SCCM security data) may contain sensitive information that triggers additional AGC review requirements.

The Forge app should be designed to meet AGC security requirements from the start, not retrofitted later.

## Implementation Approach

### App structure

```
forge-app/
+-- manifest.yml           # Forge app manifest (permissions, modules)
+-- src/
|   +-- index.js           # Entry point
|   +-- resolvers/
|   |   +-- schema.js      # Schema import resolver
|   |   +-- sync.js        # Data sync resolver
|   |   +-- validate.js    # Validation resolver
|   |   +-- graph.js       # Relationship graph resolver
|   +-- ui/
|   |   +-- SchemaImport.jsx    # Domain selection and import UI
|   |   +-- DataSync.jsx        # Data sync with progress
|   |   +-- Validation.jsx      # Validation dashboard
|   |   +-- RelationshipGraph.jsx  # CI dependency visualization
|   +-- lib/
|   |   +-- schema-loader.js    # Parse schema JSON (reuse from tools/)
|   |   +-- assets-client.js    # JSM Assets API wrapper (reuse from adapters/jsm/)
|   |   +-- aql-builder.js      # AQL query construction
+-- static/                # Static assets
+-- package.json
```

### Feature set

**Schema Import (Module 1)**

1. User opens the app in Jira
2. App presents Core + domain checklist with descriptions
3. User selects domains, app previews type definitions
4. User confirms, app creates object types and attributes in JSM Assets workspace
5. Progress indicator shows type-by-type creation
6. Error reporting for any failures

**Data Sync (Module 2)**

1. User selects which types to populate
2. App loads data from bundled JSON files (embedded in the Forge app package)
3. Preview shows sample records before import
4. Import runs with progress bar and per-type status
5. Summary shows created, updated, skipped, and failed counts

**Validation (Module 3)**

1. Runs the same checks as `tools/validate.js` and `adapters/jsm/validate-import.js`
2. Count comparison: expected records vs actual in Assets
3. Field spot check: sample records with field-by-field comparison
4. Reference integrity: verify all references resolve
5. Results displayed in a dashboard panel

**Relationship Graph (Module 4)**

1. Queries JSM Assets via AQL for CI relationships
2. Renders dependency map: Product to Server to Database chains
3. Impact analysis view: select a CI, see upstream and downstream dependencies
4. This is the feature the CLI cannot provide - visual relationship exploration

### Automations to include

Forge apps can register triggers, scheduled functions, and UI actions:

- Scheduled validation function: runs checks periodically, reports results in dashboard
- Trigger on Assets object creation/update: enforce naming conventions and required fields
- Trigger on issue transition: when a change request resolves, update Product Version and Deployment Site CIs
- Scheduled expiration alerting: AQL queries for expiring certifications, licenses, deployment versions

### Reusable code from existing adapter

These modules from `adapters/jsm/` can be adapted for Forge:

- `lib/` API client patterns (needs Forge-native fetch instead of node-fetch)
- AQL query construction patterns
- Schema parsing logic from `tools/lib/`
- Reference resolution logic
- Validation check logic from `validate-import.js`

## Phases

### Phase 1: App scaffold and schema import

Set up the Forge project, manifest, and development environment. Build the schema import module with domain selection. Get Core schema importing into a JSM Assets workspace.

### Phase 2: Data sync

Build the data sync module. Bundle example data files in the app. Import records with progress tracking and error reporting.

### Phase 3: Validation dashboard

Port validation logic from the CLI tools. Build the results dashboard. Add scheduled validation function.

### Phase 4: Relationship visualization

Build the AQL-powered relationship graph. Implement impact analysis view.

### Phase 5: Automations

Add issue transition triggers for CMDB updates. Add scheduled expiration alerting. Add object creation/update validation triggers.

### Phase 6: Marketplace listing

Documentation, screenshots, listing copy. Security review for AGC compliance. Submit to Marketplace.

## Dependencies

- Blocked by: Core + Domains restructure (schema must be final before building the import UI)
- Blocks: Atlassian Marketplace distribution, Cloud customer adoption

## File Paths

| File | Purpose |
|------|---------|
| `adapters/jsm/import.js` | Existing JSM import (reference for Forge port) |
| `adapters/jsm/validate-import.js` | Existing validation (reference for Forge port) |
| `adapters/jsm/lib/` | Existing JSM API patterns (reference for Forge port) |
| `adapters/jsm/overlay.json` | JSM platform overlay (reusable in Forge) |
| `tools/lib/file-loader.js` | Schema file loader (reference for Forge port) |
| `tools/validate.js` | Offline validation (reference for Forge port) |
