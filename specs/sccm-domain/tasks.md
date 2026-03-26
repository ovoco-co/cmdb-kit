# SCCM Domain Tasks

## Phase 1: Foundation (complete)

- [x] Create `schema/domains/sccm/` directory structure
- [x] Build schema-structure.json with 7 CI types and 3 lookup types
- [x] Build schema-attributes.json with field definitions for all types
- [x] Create example data: sccm-site.json (site hierarchy)
- [x] Create example data: sccm-site-type.json (CAS, Primary, Secondary)
- [x] Create example data: sccm-site-role.json (distribution points, management points)
- [x] Create example data: sccm-role-type.json (role type lookup values)
- [x] Create example data: sccm-collection.json (device and user collections)
- [x] Create example data: sccm-boundary-group.json (network boundaries)
- [x] Create example data: sccm-security-role.json (RBAC roles)
- [x] Create example data: sccm-service-account.json (service accounts)
- [x] Create example data: sccm-finding.json (security findings)
- [x] Create example data: sccm-finding-category.json (finding categories)
- [x] Write `schema/domains/sccm/README.md`
- [x] Write `docs/Extending/sccm-security-assessment.md` usage guide
- [x] Blog post drafted (Post 21 in content strategy)

## Phase 2: Core Integration

- [ ] Update schema-structure.json references from extended types to Core types
- [ ] Update schema-attributes.json reference targets (Server, Network Segment from Core; Assessment, Assessment Status from Compliance domain)
- [ ] Verify SCCM Finding references to Priority lookup resolve against Core
- [ ] Validate SCCM domain loads alongside Core: `node tools/validate.js --schema schema/core --domains schema/domains/sccm`
- [ ] Validate SCCM domain loads alongside Core + Compliance (required dependency)
- [ ] Update README.md to document Core + Compliance dependency
- [ ] Update `docs/Extending/sccm-security-assessment.md` for Core + Domains framing

## Phase 3: Adapter Testing

- [ ] Test SCCM domain import into JSM Assets alongside Core types
- [ ] Verify SCCM object types appear in correct hierarchy in JSM Assets workspace
- [ ] Verify cross-schema references resolve (SCCM Site to Server, Finding to Assessment)
- [ ] Test SCCM domain import into ServiceNow alongside Core types
- [ ] Verify SCCM custom CI classes created correctly (x_cmdbk_sccm_* or equivalent)
- [ ] Verify identification rules created for SCCM CI types
- [ ] Test re-import for deduplication (no duplicate SCCM records on second run)

## Phase 4: Automation Patterns

- [ ] Document ServiceNow automations for SCCM domain in README (scheduled finding review, service account expiration alerts)
- [ ] Document JSM Cloud automation patterns (AQL queries for finding dashboards, expiration tracking)
- [ ] Add DC vs Cloud feasibility notes for each automation
- [ ] Add SCCM finding category dashboard query examples

## Code Review Items (from code-review-260324.md)

- [ ] Fix: SCCM domain references types only available in extended schema (Medium, item 1). Document the Core + Compliance dependency clearly. Add validation check.
