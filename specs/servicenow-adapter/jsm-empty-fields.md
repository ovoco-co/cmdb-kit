# JSM Empty Fields: Server CPU/RAM and Document URL

**Status**: Done (2026-03-28). Root cause: attribute name mismatch (Cpu vs CPU, Ram vs RAM, Url vs URL).
**Priority**: High (validation fails)
**Created**: 2026-03-28

## The Problem

After importing Core data to JSM Cloud (CORE schema), Server records have empty CPU and RAM fields, and Document records have empty URL fields. The import reports "updated" but validate-import shows these fields as empty.

Debug logging confirms the PUT request sends the correct values ("8 vCPU", "32 GB", "https://docs.ovoco.dev/...") and the response includes them. But subsequent reads via AQL show empty values.

## Affected Fields

| Type | Field | Schema Key | Value Sent | Stored |
|------|-------|-----------|------------|--------|
| Server | cpu | Text | "8 vCPU" | empty |
| Server | ram | Text | "32 GB" | empty |
| Document | url | Text | "https://docs.ovoco.dev/..." | empty |

All other text fields (description, hostname, ipAddress, etc.) work correctly.

## Analysis Needed

1. Are the JSM attribute definitions for CPU, RAM, and URL created with the correct type?
2. Is the attribute name mapping correct? (attr-names.js maps cpu -> "CPU", ram -> "RAM", url -> "URL")
3. Does JSM treat all-caps attribute names differently?
4. Is the attribute ID in the PUT payload correct for these fields?
5. Are these fields perhaps created as a different type (e.g., integer for RAM) that rejects string values?

## Plan

### Phase 1: Diagnose
- Query JSM API for Server object type attributes: check CPU, RAM attribute definitions (type, name, ID)
- Query JSM API for Document object type attributes: check URL attribute definition
- Compare with working attributes (e.g., Hostname, Description) to see what's different

### Phase 2: Fix
- Based on diagnosis, fix either the attribute creation, the data import, or the validate-import reading

### Phase 3: Verify
- Re-import data
- Validate all 26 types pass

## Success Criteria

- `validate-import.js --type "Server,Document"` passes with 0 mismatches
- Full validation: 26/26 types pass
