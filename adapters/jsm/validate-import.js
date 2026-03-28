#!/usr/bin/env node
/**
 * CMDB Kit JSM Post-Import Validation
 *
 * Connects to a live JSM Assets instance, fetches remote objects, and
 * compares them field-by-field against local JSON data files.
 *
 * Usage:
 *   node adapters/jsm/validate-import.js [options]
 *
 * Options:
 *   --type <name>       Validate only this type (repeatable/comma-separated)
 *   --skip-fields       Only check record counts and presence, skip field comparison
 *   --verbose           Show all field details for mismatched records
 *   --summary-only      Only print the summary table
 *   --help              Show this help message
 *
 * Environment:
 *   JSM_URL             JSM instance URL (default: http://localhost:8080)
 *   JSM_USER            Admin username (required)
 *   JSM_PASSWORD        Admin password (required)
 *   SCHEMA_KEY          Schema key (default: CMDB)
 *   DATA_DIR            Data directory (default: schema/core/data)
 *   DEBUG               Set to 'true' for HTTP debug logging
 */

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { loadConfig, createApiClient, resolveWorkspaceId, loadJsonFile, loadDataFile, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, C } = require('./lib');

// Fields to skip during comparison (JSM-internal or meta)
const SKIP_FIELDS = new Set([
  'id', 'key', 'Key', 'name', 'Name', 'Created', 'Updated',
  'objectTypeName', 'objectTypeId', 'schemaKey'
]);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseCli(args) {
  const opts = { types: [], skipFields: false, verbose: false, summaryOnly: false, help: false };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--skip-fields') { opts.skipFields = true; }
    else if (a === '--verbose' || a === '-v') { opts.verbose = true; }
    else if (a === '--summary-only') { opts.summaryOnly = true; }
    else if (a === '--type' || a === '-t') {
      i++;
      if (args[i]) {
        // Support comma-separated values
        for (const t of args[i].split(',')) {
          const trimmed = t.trim();
          if (trimmed) opts.types.push(trimmed);
        }
      }
    }
    i++;
  }
  return opts;
}

function printHelp() {
  console.log(`
CMDB Kit JSM Post-Import Validation

Compares local JSON data files against live JSM Assets data.

Usage:
  node adapters/jsm/validate-import.js [options]

Options:
  --type <name>, -t    Validate only this type (repeatable/comma-separated)
  --skip-fields        Only check record counts and presence, skip field comparison
  --verbose, -v        Show all field details for mismatched records
  --summary-only       Only print the summary table
  --help, -h           Show this help message

Environment:
  JSM_URL              JSM instance URL (default: http://localhost:8080)
  JSM_USER             Admin username (required)
  JSM_PASSWORD         Admin password (required)
  SCHEMA_KEY           Schema key (default: CMDB)
  DATA_DIR             Data directory (default: schema/core/data)
  DEBUG                Set to 'true' for HTTP debug logging

Examples:
  # Full validation
  node adapters/jsm/validate-import.js

  # Spot-check a single type
  node adapters/jsm/validate-import.js --type "Product"

  # Quick record-count check only
  node adapters/jsm/validate-import.js --skip-fields --summary-only
`);
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function resolveSchemaId(api, schemaKey) {
  const raw = await api.get('/objectschema/list');
  const list = raw.objectschemas || raw.values || raw;
  if (!Array.isArray(list)) throw new Error('Unexpected response from /objectschema/list');
  const schema = list.find(s => s.objectSchemaKey === schemaKey);
  if (!schema) {
    const available = list.map(s => `${s.objectSchemaKey} (${s.name})`).join(', ');
    throw new Error(`Schema key "${schemaKey}" not found. Available: ${available}`);
  }
  return schema.id;
}

async function cacheTypeIds(api, schemaId) {
  const raw = await api.get(`/objectschema/${schemaId}/objecttypes/flat`);
  const types = Array.isArray(raw) ? raw : (raw.values || raw.objectTypes || []);
  const map = {};
  if (Array.isArray(types)) {
    for (const t of types) map[t.name] = t.id;
  }
  return map;
}

async function fetchTypeAttributes(api, typeId) {
  const raw = await api.get(`/objecttype/${typeId}/attributes`);
  if (Array.isArray(raw)) return raw;
  return raw.values || raw.objectTypeAttributes || [];
}

async function fetchAllObjects(api, config, schemaId, typeId) {
  const all = [];
  let page = 1;
  const aql = `objectTypeId = ${typeId}`;
  while (true) {
    let res;
    if (config.isCloud) {
      const qs = querystring.stringify({ qlQuery: aql, resultPerPage: 500, page });
      res = await api.get(`/aql/objects?${qs}`);
    } else {
      const qs = querystring.stringify({ objectSchemaId: schemaId, iql: aql, resultPerPage: 500, page });
      res = await api.get(`/iql/objects?${qs}`);
    }
    const entries = res.objectEntries || [];
    all.push(...entries);
    if (!entries.length || all.length >= (res.totalFilterCount || res.total || 0)) break;
    page++;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Data file resolution (mirrors import.js logic)
// ---------------------------------------------------------------------------
function resolveDataFile(dataDir, typeName) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');

  if (PERSONNEL_TYPES.includes(typeName)) {
    if (fs.existsSync(path.join(dataDir, 'person.json'))) return 'person.json';
  }

  const candidates = [`${safeName}.json`, `${safeName}s.json`];
  for (const f of candidates) {
    if (fs.existsSync(path.join(dataDir, f))) return f;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Remote object parsing
// ---------------------------------------------------------------------------

function stripKeyPrefix(name) {
  if (name && name.includes(' - ')) return name.substring(name.indexOf(' - ') + 3);
  return name;
}

function extractRemoteValue(attr) {
  const values = attr.objectAttributeValues || [];
  if (!values.length) return null;

  if (values.length > 1) {
    return values.map(v => {
      if (v.referencedObject) return stripKeyPrefix(v.referencedObject.label || v.referencedObject.name || String(v.value));
      return v.displayValue != null ? String(v.displayValue) : String(v.value);
    }).sort();
  }

  const v = values[0];
  if (v.referencedObject) return stripKeyPrefix(v.referencedObject.label || v.referencedObject.name || String(v.value));
  return v.displayValue != null ? String(v.displayValue) : String(v.value);
}

function buildRemoteIndex(entries, attrDefs) {
  // Build ID-to-name lookup from attribute definitions.
  // The Cloud AQL endpoint returns objectTypeAttributeId but not the
  // nested objectTypeAttribute object, so we need to resolve names ourselves.
  const attrIdToName = {};
  if (attrDefs) {
    for (const a of attrDefs) {
      if (a.id) attrIdToName[String(a.id)] = a.name;
    }
  }

  const index = new Map();
  for (const entry of entries) {
    // Extract Name from attributes
    let name = entry.label || entry.name || '';
    // label often includes the key prefix like "CMDB-42 - My Application"
    if (name.includes(' - ')) {
      name = name.substring(name.indexOf(' - ') + 3);
    }

    const record = {};
    for (const attr of (entry.attributes || [])) {
      // Try nested object first (DC), then fall back to ID lookup (Cloud)
      const attrName = attr.objectTypeAttribute
        ? (attr.objectTypeAttribute.name || '')
        : (attrIdToName[String(attr.objectTypeAttributeId)] || '');
      if (!attrName || attrName === 'Name' || attrName === 'Key') continue;
      record[attrName] = extractRemoteValue(attr);
    }
    index.set(name, record);
  }
  return index;
}

// ---------------------------------------------------------------------------
// Value normalization and comparison
// ---------------------------------------------------------------------------

const MONTHS = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                 Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };

function normalizeDate(s) {
  if (!s) return null;
  s = String(s).trim();
  // ISO: 2025-09-15 or 2025-09-15T00:00:00.000Z
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // DD/Mon/YYYY (JSM format, 2 or 4 digit year)
  const dmy = s.match(/^(\d{1,2})\/(\w{3})\/(\d{2,4})/);
  if (dmy && MONTHS[dmy[2]]) {
    let year = dmy[3];
    if (year.length === 2) year = (parseInt(year) >= 70 ? '19' : '20') + year;
    return `${year}-${MONTHS[dmy[2]]}-${dmy[1].padStart(2, '0')}`;
  }
  return s;
}

function normalizeValue(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  return s;
}

function normalizeBoolean(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes') return 'true';
  if (s === 'false' || s === '0' || s === 'no') return 'false';
  return s;
}

function valuesEqual(local, remote, attrDef) {
  // Determine if this is a date field (defaultTypeId 4 in JSM attr defs)
  const isDate = attrDef && (attrDef.defaultType && attrDef.defaultType.id === 4);
  const isBool = attrDef && (attrDef.defaultType && attrDef.defaultType.id === 2);

  // Normalize semicolon-separated strings to arrays for multi-value comparison
  if (typeof local === 'string' && local.includes(';') && Array.isArray(remote)) {
    local = local.split(';').map(s => s.trim());
  }

  // Multi-value comparison
  if (Array.isArray(local) && Array.isArray(remote)) {
    const lSorted = local.map(v => normalizeValue(v)).filter(Boolean).sort();
    const rSorted = remote.map(v => normalizeValue(v)).filter(Boolean).sort();
    if (lSorted.length !== rSorted.length) return false;
    return lSorted.every((v, i) => v === rSorted[i]);
  }

  // If remote is array with 1 element, unwrap
  if (Array.isArray(remote) && remote.length === 1) remote = remote[0];
  if (Array.isArray(local) && local.length === 1) local = local[0];

  let l, r;
  if (isDate) {
    l = normalizeDate(local);
    r = normalizeDate(remote);
  } else if (isBool) {
    l = normalizeBoolean(local);
    r = normalizeBoolean(remote);
  } else {
    l = normalizeValue(local);
    r = normalizeValue(remote);
  }

  if (l === null && r === null) return true;
  if (l === null || r === null) return false;
  return l === r;
}

function compareFieldValues(localRecord, remoteRecord, attrDefs) {
  const mismatches = [];
  const attrDefMap = {};
  for (const a of attrDefs) {
    attrDefMap[a.name.toLowerCase()] = a;
  }

  for (const [key, localVal] of Object.entries(localRecord)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (localVal === null || localVal === undefined) continue;

    // Map camelCase key to Title Case display name
    const displayName = mapAttrName(key);
    const attrDef = attrDefMap[displayName.toLowerCase()];

    // Get remote value by display name
    const remoteVal = remoteRecord[displayName] != null ? remoteRecord[displayName] : null;

    // Skip if remote attr doesn't exist (could be a local-only meta field)
    if (remoteVal === null && !attrDef) continue;

    if (!valuesEqual(localVal, remoteVal, attrDef)) {
      const lDisplay = Array.isArray(localVal) ? localVal.join('; ') : String(localVal);
      const rDisplay = remoteVal === null ? '(empty)'
        : Array.isArray(remoteVal) ? remoteVal.join('; ') : String(remoteVal);
      mismatches.push({ field: displayName, local: lDisplay, remote: rDisplay });
    }
  }
  return mismatches;
}

// ---------------------------------------------------------------------------
// Type validation
// ---------------------------------------------------------------------------

async function validateType(typeName, typeId, schemaId, api, config, options) {
  // Resolve data file
  const dataFile = resolveDataFile(config.dataDir, typeName);
  if (!dataFile) return { typeName, status: 'SKIP', message: 'no data file' };

  const localData = loadDataFile(config.dataDir, dataFile, typeName);
  if (!localData.length) return { typeName, status: 'SKIP', message: 'empty data file' };

  // Fetch remote objects and attribute definitions
  let remoteEntries, attrDefs;
  try {
    [remoteEntries, attrDefs] = await Promise.all([
      fetchAllObjects(api, config, schemaId, typeId),
      fetchTypeAttributes(api, typeId),
    ]);
  } catch (err) {
    return { typeName, status: 'ERROR', message: `API error: ${err.error || err.message || err}` };
  }

  // Build indexes
  const localIndex = new Map();
  for (const rec of localData) {
    const name = rec.Name || rec.name;
    if (name) localIndex.set(name, rec);
  }

  const remoteIndex = buildRemoteIndex(remoteEntries, attrDefs);

  // Compare presence
  const missing = [];
  const extra = [];
  const matched = [];
  const fieldMismatches = [];

  for (const name of localIndex.keys()) {
    if (!remoteIndex.has(name)) {
      missing.push(name);
    } else {
      matched.push(name);
    }
  }
  for (const name of remoteIndex.keys()) {
    if (!localIndex.has(name)) extra.push(name);
  }

  // Field comparison
  if (!options.skipFields) {
    for (const name of matched) {
      const localRec = localIndex.get(name);
      const remoteRec = remoteIndex.get(name);
      const mismatches = compareFieldValues(localRec, remoteRec, attrDefs);
      if (mismatches.length > 0) {
        fieldMismatches.push({ name, mismatches });
      }
    }
  }

  const status = (missing.length === 0 && extra.length === 0 && fieldMismatches.length === 0)
    ? 'PASS' : 'FAIL';

  return {
    typeName, status,
    localCount: localData.length,
    remoteCount: remoteEntries.length,
    matchedCount: matched.length,
    missing, extra, fieldMismatches,
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printTypeResult(result, options) {
  if (options.summaryOnly) return;

  const { typeName, status, localCount, remoteCount, missing, extra, fieldMismatches } = result;
  const label = typeName.padEnd(40, '.');

  if (status === 'PASS') {
    console.log(`  ${label} ${C.green}PASS${C.reset} (${localCount}/${remoteCount})`);
    return;
  }
  if (status === 'SKIP') {
    console.log(`  ${label} ${C.dim}SKIP${C.reset} (${result.message})`);
    return;
  }
  if (status === 'ERROR') {
    console.log(`  ${label} ${C.red}ERROR${C.reset} ${result.message}`);
    return;
  }

  // FAIL
  console.log(`  ${label} ${C.red}FAIL${C.reset}`);
  console.log(`    Records: ${localCount} local, ${remoteCount} remote`);

  if (missing.length > 0) {
    console.log(`    ${C.red}Missing in JSM (${missing.length}):${C.reset}`);
    for (const n of missing) console.log(`      - "${n}"`);
  }
  if (extra.length > 0) {
    console.log(`    ${C.yellow}Extra in JSM (${extra.length}):${C.reset}`);
    for (const n of extra) console.log(`      + "${n}"`);
  }
  if (fieldMismatches && fieldMismatches.length > 0) {
    console.log(`    ${C.yellow}Field mismatches (${fieldMismatches.length}):${C.reset}`);
    for (const { name, mismatches } of fieldMismatches) {
      console.log(`      "${name}"`);
      for (const m of mismatches) {
        if (options.verbose) {
          console.log(`        ${m.field}: local=${C.cyan}"${m.local}"${C.reset} remote=${C.yellow}"${m.remote}"${C.reset}`);
        } else {
          console.log(`        ${m.field}: local="${m.local}" remote="${m.remote}"`);
        }
      }
    }
  }
}

function printSummary(results) {
  let passed = 0, failed = 0, skipped = 0, errors = 0;
  let totalLocal = 0, totalRemote = 0, totalMatched = 0;
  let totalMissing = 0, totalExtra = 0, totalFieldMismatches = 0;

  for (const r of results) {
    if (r.status === 'PASS') passed++;
    else if (r.status === 'FAIL') failed++;
    else if (r.status === 'SKIP') skipped++;
    else errors++;

    totalLocal += r.localCount || 0;
    totalRemote += r.remoteCount || 0;
    totalMatched += r.matchedCount || 0;
    totalMissing += (r.missing || []).length;
    totalExtra += (r.extra || []).length;
    totalFieldMismatches += (r.fieldMismatches || []).length;
  }

  console.log('');
  console.log('==================================================');
  console.log('  Validation Summary');
  console.log('==================================================');
  console.log('');
  console.log(`  Types checked:      ${results.length}`);
  console.log(`  Types passed:       ${C.green}${passed}${C.reset}`);
  if (failed > 0) console.log(`  Types failed:       ${C.red}${failed}${C.reset}`);
  if (errors > 0) console.log(`  Types errors:       ${C.red}${errors}${C.reset}`);
  console.log(`  Types skipped:      ${skipped} (no data file)`);
  console.log('');
  console.log(`  Records local:      ${totalLocal}`);
  console.log(`  Records remote:     ${totalRemote}`);
  console.log(`  Records matched:    ${totalMatched}`);
  if (totalMissing > 0) console.log(`  Records missing:    ${C.red}${totalMissing}${C.reset} (in local, not in JSM)`);
  if (totalExtra > 0)   console.log(`  Records extra:      ${C.yellow}${totalExtra}${C.reset} (in JSM, not in local)`);
  if (totalFieldMismatches > 0) console.log(`  Field mismatches:   ${C.yellow}${totalFieldMismatches}${C.reset} records with differences`);
  console.log('');

  const overall = (failed === 0 && errors === 0) ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`;
  console.log(`  Result: ${overall}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) { printHelp(); process.exit(0); }

  const config = loadConfig({ requireAuth: true, requireSchema: true });
  const api = createApiClient(config, { timeout: 30000, maxRetries: 1 });

  // Header
  console.log('');
  console.log('==================================================');
  console.log('  CMDB Kit JSM Post-Import Validation');
  console.log('==================================================');
  console.log(`  URL:    ${config.jsmUrl}`);
  console.log(`  Schema: ${config.schemaKey}`);

  await resolveWorkspaceId(config, api);

  // Resolve schema
  let schemaId;
  try {
    schemaId = await resolveSchemaId(api, config.schemaKey);
  } catch (err) {
    console.error(`\n${C.red}Error:${C.reset} ${err.message}`);
    process.exit(2);
  }
  console.log(`  Schema ID: ${schemaId}`);

  // Cache type IDs
  let typeIds;
  try {
    typeIds = await cacheTypeIds(api, schemaId);
  } catch (err) {
    console.error(`\n${C.red}Error:${C.reset} Could not fetch object types: ${err.error || err.message || err}`);
    process.exit(2);
  }

  // Filter types
  let typesToValidate = LOAD_PRIORITY;
  if (options.types.length > 0) {
    typesToValidate = LOAD_PRIORITY.filter(t => options.types.includes(t));
    if (typesToValidate.length === 0) {
      console.error(`\n${C.red}Error:${C.reset} None of the specified types found in LOAD_PRIORITY`);
      console.error(`  Requested: ${options.types.join(', ')}`);
      process.exit(2);
    }
  }

  console.log(`  Types:  ${typesToValidate.length} to validate`);
  console.log('');
  if (!options.summaryOnly) {
    console.log('--- Validating Types ---');
    console.log('');
  }

  // Validate each type
  const results = [];
  for (const typeName of typesToValidate) {
    const typeId = typeIds[typeName];
    if (!typeId) {
      const result = { typeName, status: 'ERROR', message: 'type not found in JSM' };
      results.push(result);
      printTypeResult(result, options);
      continue;
    }

    const result = await validateType(typeName, typeId, schemaId, api, config, options);
    results.push(result);
    printTypeResult(result, options);
  }

  // Summary
  printSummary(results);

  // Exit code
  const hasFailures = results.some(r => r.status === 'FAIL' || r.status === 'ERROR');
  process.exit(hasFailures ? 1 : 0);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('  Could not connect to JSM. Check JSM_URL and ensure the server is running.');
  }
  process.exit(2);
});
