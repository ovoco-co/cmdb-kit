# Forge App Tasks

## Phase 1: App Scaffold and Schema Import

- [ ] Install Forge CLI (`npm install -g @forge/cli`)
- [ ] Create Forge app project with `forge create`
- [ ] Configure manifest.yml with JSM Assets module permissions
- [ ] Set up development environment with `forge deploy` and `forge tunnel`
- [ ] Build schema-loader.js: parse schema-structure.json and schema-attributes.json
- [ ] Build domain-loader.js: load Core plus selected domain schema files
- [ ] Build SchemaImport UI component: domain checklist with one-sentence descriptions
- [ ] Implement domain dependency resolution (selecting SCCM auto-selects Compliance)
- [ ] Build type preview panel: show types and attributes before import
- [ ] Implement Assets API calls: create object types via REST API
- [ ] Implement Assets API calls: create attributes on object types
- [ ] Implement reference attribute creation with correct type linking
- [ ] Add progress indicator for schema import
- [ ] Add error handling and failure reporting
- [ ] Store selected domains in Forge Storage
- [ ] Test Core schema import on JSM Cloud Premium instance
- [ ] Test Core + Compliance domain import
- [ ] Test Core + SCCM domain import (with Compliance dependency)

## Phase 2: Data Sync

- [ ] Bundle example data JSON files in the Forge app package
- [ ] Build DataSync UI component: type selection and record preview
- [ ] Implement LOAD_PRIORITY ordering for correct import sequence
- [ ] Implement record creation via Assets REST API (objects endpoint)
- [ ] Implement reference resolution: resolve Name values to object IDs
- [ ] Implement update detection: check for existing records before creating
- [ ] Add progress bar with per-type status (creating, updating, skipped, failed)
- [ ] Add sync summary: total created, updated, skipped, failed per type
- [ ] Store sync history in Forge Storage (timestamp, counts, errors)
- [ ] Test data sync with base example data
- [ ] Test re-sync (update existing records, no duplicates)

## Phase 3: Validation Dashboard

- [ ] Port count comparison logic from `adapters/jsm/validate-import.js`
- [ ] Port field spot-check logic (sample records, field-by-field comparison)
- [ ] Port reference integrity check (verify all references resolve via AQL)
- [ ] Build Validation UI component: run checks button, results display
- [ ] Display results as pass/fail per check with details on failures
- [ ] Implement scheduled validation function (Forge scheduled trigger)
- [ ] Store validation results in Forge Storage for history view
- [ ] Test validation against a clean import (expect all pass)
- [ ] Test validation against a modified instance (expect specific failures)

## Phase 4: Relationship Visualization

- [ ] Build AQL queries for CI relationship traversal (inboundReferences, outboundReferences)
- [ ] Build RelationshipGraph UI component
- [ ] Implement dependency tree rendering (Product to Server to Database chains)
- [ ] Implement impact analysis: select a CI, highlight upstream and downstream
- [ ] Add node click interaction: show CI details on click
- [ ] Test with example data relationships
- [ ] Test with large relationship graphs (performance)

## Phase 5: Automations

- [ ] Register Forge trigger on Jira issue transition (change request resolution)
- [ ] Implement CMDB update on change resolution: update Product Version, Deployment Site
- [ ] Register Forge trigger on Assets object creation/update
- [ ] Implement naming convention enforcement on object creation
- [ ] Implement required field validation on object update
- [ ] Register scheduled function for expiration alerting
- [ ] Implement AQL queries for expiring certifications (Compliance domain)
- [ ] Implement AQL queries for expiring licenses (Licensing domain)
- [ ] Implement AQL queries for stale deployment versions
- [ ] Test automation triggers end-to-end

## Phase 6: Marketplace Listing

- [ ] Write Marketplace listing description
- [ ] Create screenshots of each feature (schema import, data sync, validation, graph)
- [ ] Write installation and configuration documentation
- [ ] Review AGC security requirements for government Cloud compliance
- [ ] Ensure no sensitive data is included in the app package
- [ ] Run Forge security scan (`forge lint`)
- [ ] Submit app to Atlassian Marketplace for review
- [ ] Address review feedback

## Not Started

No Forge app code exists in the codebase. The existing JSM adapter at `adapters/jsm/` provides the reference implementation for API patterns, schema loading, and validation logic that the Forge app will port. The Forge app is a separate project directory, not an extension of the existing adapter.
