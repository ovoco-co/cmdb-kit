#!/usr/bin/env node
/**
 * CMDB Kit JSM Export
 *
 * Exports live JSM Assets data to local JSON files in the exact format
 * consumed by the import script.  Supports exporting to a separate
 * directory, overwriting local files, and diffing JSM vs local state.
 *
 * Usage:
 *   node adapters/jsm/export.js [options]
 *
 * Options:
 *   --outdir <dir>      Output directory (default: objects-export)
 *   --type <name>       Export only this type (repeatable/comma-separated)
 *   --diff              Compare exported data against local files, report differences
 *   --overwrite         Write directly to data dir (overwrite local files)
 *   --help              Show this help message
 *
 * Environment:
 *   JSM_URL             JSM instance URL (default: http://localhost:8080)
 *   JSM_USER            Admin username (required)
 *   JSM_PASSWORD        Admin password (required)
 *   SCHEMA_KEY          Schema key (default: CMDB)
 *   DATA_DIR            Data directory (default: schema/base/data)
 *   DEBUG               Set to 'true' for HTTP debug logging
 */

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { loadConfig, createApiClient, resolveWorkspaceId, loadJsonFile, loadDataFile, ATTR_NAME_MAP, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, NESTED_TYPES, C } = require('./lib');

// JSM-internal fields to exclude from exported records
const SKIP_ATTRS = new Set(['Key', 'Created', 'Updated']);

// ---------------------------------------------------------------------------
// Reverse attribute name mapping
// ---------------------------------------------------------------------------
const REVERSE_ATTR_MAP = {};
for (const [camel, display] of Object.entries(ATTR_NAME_MAP)) {
  REVERSE_ATTR_MAP[display] = camel;
}

/**
 * Convert JSM display name (Title Case) to camelCase local key.
 */
function reverseAttrName(displayName) {
  if (REVERSE_ATTR_MAP[displayName]) return REVERSE_ATTR_MAP[displayName];
  // "Product Status" -> "productStatus"
  return displayName
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toLowerCase());
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseCli(args) {
  const opts = { types: [], diff: false, overwrite: false, outdir: '', help: false };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--diff') { opts.diff = true; }
    else if (a === '--overwrite') { opts.overwrite = true; }
    else if (a === '--outdir') { i++; opts.outdir = args[i] || ''; }
    else if (a === '--type' || a === '-t') {
      i++;
      if (args[i]) {
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
CMDB Kit JSM Export

Exports live JSM Assets data to local JSON files matching the import format.

Usage:
  node adapters/jsm/export.js [options]

Options:
  --outdir <dir>      Output directory (default: objects-export)
  --type <name>, -t   Export only this type (repeatable/comma-separated)
  --diff              Compare JSM data against local files instead of exporting
  --overwrite         Write directly to data dir (overwrite local files)
  --help, -h          Show this help message

Environment:
  JSM_URL             JSM instance URL (default: http://localhost:8080)
  JSM_USER            Admin username (required)
  JSM_PASSWORD        Admin password (required)
  SCHEMA_KEY          Schema key (default: CMDB)
  DATA_DIR            Data directory (default: schema/base/data)
  DEBUG               Set to 'true' for HTTP debug logging

Examples:
  # Export all types to objects-export/
  node adapters/jsm/export.js

  # Export a single type
  node adapters/jsm/export.js --type "Product"

  # Compare JSM vs local files
  node adapters/jsm/export.js --diff

  # Overwrite local files with JSM data
  node adapters/jsm/export.js --overwrite
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
// Date normalization
// ---------------------------------------------------------------------------
const MONTHS = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                 Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };

function normalizeDate(s) {
  if (!s) return null;
  s = String(s).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = s.match(/^(\d{1,2})\/(\w{3})\/(\d{4})/);
  if (dmy && MONTHS[dmy[2]]) {
    return `${dmy[3]}-${MONTHS[dmy[2]]}-${dmy[1].padStart(2, '0')}`;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Convert JSM entries to local JSON format
// ---------------------------------------------------------------------------

/**
 * Extract a single attribute value from JSM format.
 * Returns a string, array, boolean, or null.
 */
function extractValue(attr, attrDef) {
  const values = attr.objectAttributeValues || [];
  if (!values.length) return null;

  const isDate = attrDef && attrDef.defaultType && attrDef.defaultType.id === 4;
  const isBool = attrDef && attrDef.defaultType && attrDef.defaultType.id === 2;
  const isRef = attrDef && attrDef.type === 1;
  const isMulti = isRef && attrDef.maximumCardinality === -1;

  // Reference fields: extract the referenced object's Name
  if (isRef) {
    const refs = values
      .map(v => {
        if (v.referencedObject) {
          let label = v.referencedObject.label || v.referencedObject.name || '';
          // Strip key prefix: "CMDB-42 - My Application" -> "My Application"
          if (label.includes(' - ')) {
            label = label.substring(label.indexOf(' - ') + 3);
          }
          return label;
        }
        return v.displayValue || String(v.value || '');
      })
      .filter(Boolean);

    if (isMulti) {
      return refs.length > 0 ? refs.join(';') : null;
    }
    return refs.length > 0 ? refs[0] : null;
  }

  // Single-value fields
  const v = values[0];
  const raw = v.displayValue != null ? v.displayValue : v.value;

  if (isBool) {
    const s = String(raw).toLowerCase().trim();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
    return raw;
  }

  if (isDate) {
    return normalizeDate(raw);
  }

  return raw != null ? String(raw) : null;
}

/**
 * Convert an array of JSM object entries into local JSON records.
 */
function convertToLocalFormat(entries, attrDefs) {
  // Build attrDef lookup by name
  const attrDefMap = {};
  for (const a of attrDefs) {
    attrDefMap[a.name] = a;
  }

  const records = [];

  for (const entry of entries) {
    const record = {};

    // Extract Name
    let name = entry.label || entry.name || '';
    if (name.includes(' - ')) {
      name = name.substring(name.indexOf(' - ') + 3);
    }
    record.Name = name;

    // Extract attributes
    for (const attr of (entry.attributes || [])) {
      const displayName = attr.objectTypeAttribute
        ? (attr.objectTypeAttribute.name || '')
        : '';
      if (!displayName || displayName === 'Name' || SKIP_ATTRS.has(displayName)) continue;

      const attrDef = attrDefMap[displayName];
      const value = extractValue(attr, attrDef);
      if (value === null || value === undefined) continue;
      if (typeof value === 'string' && value.trim() === '') continue;

      const localKey = reverseAttrName(displayName);
      record[localKey] = value;
    }

    records.push(record);
  }

  // Sort by Name for stable output
  records.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));

  return records;
}

// ---------------------------------------------------------------------------
// Output file resolution
// ---------------------------------------------------------------------------

function resolveOutputFile(typeName, outdir) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  return path.join(outdir, `${safeName}.json`);
}

/**
 * Determine whether a type should use nested format.
 * Check existing local file first (to match its format), then fall back to defaults.
 */
function detectFormat(typeName, dataDir) {
  // Check if existing local file uses nested format
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const candidates = [`${safeName}.json`, `${safeName}s.json`];
  if (PERSONNEL_TYPES.includes(typeName)) candidates.push('person.json');

  for (const f of candidates) {
    const filePath = path.join(dataDir, f);
    if (fs.existsSync(filePath)) {
      const raw = loadJsonFile(filePath);
      if (raw && !Array.isArray(raw) && typeof raw === 'object') return 'nested';
      return 'flat';
    }
  }

  // Default based on NESTED_TYPES
  return NESTED_TYPES.has(typeName) ? 'nested' : 'flat';
}

// ---------------------------------------------------------------------------
// Export a single type
// ---------------------------------------------------------------------------

async function exportType(typeName, typeId, schemaId, api, config, outdir, dataDir) {
  let entries, attrDefs;
  try {
    [entries, attrDefs] = await Promise.all([
      fetchAllObjects(api, config, schemaId, typeId),
      fetchTypeAttributes(api, typeId),
    ]);
  } catch (err) {
    return { typeName, status: 'ERROR', message: `API error: ${err.error || err.message || err}`, records: [] };
  }

  if (!entries.length) {
    return { typeName, status: 'EMPTY', records: [], count: 0 };
  }

  const records = convertToLocalFormat(entries, attrDefs);
  return { typeName, status: 'OK', records, count: records.length };
}

// ---------------------------------------------------------------------------
// Write output files
// ---------------------------------------------------------------------------

function writeExportFile(filePath, typeName, records, format) {
  // Ensure output directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content;
  if (format === 'nested') {
    // Read existing file to preserve other types (e.g., person.json bundle)
    let existing = {};
    if (fs.existsSync(filePath)) {
      const raw = loadJsonFile(filePath);
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) existing = raw;
    }
    existing[typeName] = records;
    content = JSON.stringify(existing, null, 2) + '\n';
  } else {
    content = JSON.stringify(records, null, 2) + '\n';
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// ---------------------------------------------------------------------------
// Diff mode
// ---------------------------------------------------------------------------

function diffType(typeName, remoteRecords, dataDir) {
  // Resolve local data file
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  let dataFile = null;

  if (PERSONNEL_TYPES.includes(typeName)) {
    if (fs.existsSync(path.join(dataDir, 'person.json'))) dataFile = 'person.json';
  }
  if (!dataFile) {
    const candidates = [`${safeName}.json`, `${safeName}s.json`];
    dataFile = candidates.find(f => fs.existsSync(path.join(dataDir, f)));
  }

  if (!dataFile) {
    return { typeName, status: 'NO_LOCAL', remoteCount: remoteRecords.length };
  }

  const localData = loadDataFile(dataDir, dataFile, typeName);

  // Build indexes by Name
  const localIndex = new Map();
  for (const rec of localData) {
    const name = rec.Name || rec.name;
    if (name) localIndex.set(name, rec);
  }

  const remoteIndex = new Map();
  for (const rec of remoteRecords) {
    if (rec.Name) remoteIndex.set(rec.Name, rec);
  }

  const added = [];   // in JSM, not local
  const removed = []; // in local, not JSM
  const changed = []; // present in both but different

  for (const [name, rec] of remoteIndex) {
    if (!localIndex.has(name)) {
      added.push(name);
    } else {
      // Compare fields
      const localRec = localIndex.get(name);
      const diffs = [];
      // Check all remote fields against local
      for (const [key, rVal] of Object.entries(rec)) {
        if (key === 'Name') continue;
        const lVal = localRec[key];
        if (!fieldEqual(lVal, rVal)) {
          diffs.push({ field: key, local: lVal, remote: rVal });
        }
      }
      // Check local fields not in remote
      for (const [key, lVal] of Object.entries(localRec)) {
        if (key === 'Name' || key === 'name' || key === 'description') continue;
        if (!(key in rec) && lVal !== null && lVal !== undefined && lVal !== '') {
          // Only flag if the local value is non-empty
          diffs.push({ field: key, local: lVal, remote: undefined });
        }
      }
      if (diffs.length > 0) changed.push({ name, diffs });
    }
  }

  for (const name of localIndex.keys()) {
    if (!remoteIndex.has(name)) removed.push(name);
  }

  const match = added.length === 0 && removed.length === 0 && changed.length === 0;
  return {
    typeName, status: match ? 'MATCH' : 'DIFF',
    localCount: localData.length, remoteCount: remoteRecords.length,
    added, removed, changed,
  };
}

function fieldEqual(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb;
}

function normalize(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return String(v);
  const s = String(v).trim();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  return s;
}

// ---------------------------------------------------------------------------
// Diff output
// ---------------------------------------------------------------------------

function printDiffResult(result) {
  const dots = '.'.repeat(Math.max(1, 35 - result.typeName.length));

  if (result.status === 'ERROR') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.red}ERROR${C.reset} ${result.message}`);
    return;
  }
  if (result.status === 'EMPTY') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.dim}EMPTY${C.reset} (0 records in JSM)`);
    return;
  }
  if (result.status === 'NO_LOCAL') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.yellow}NO LOCAL${C.reset} (${result.remoteCount} in JSM, no local file)`);
    return;
  }
  if (result.status === 'MATCH') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.green}MATCH${C.reset} (${result.localCount} records)`);
    return;
  }

  // DIFF
  console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.yellow}DIFF${C.reset}`);

  if (result.added.length > 0) {
    for (const n of result.added) {
      console.log(`    ${C.green}+ "${n}"${C.reset} (in JSM, not local)`);
    }
  }
  if (result.removed.length > 0) {
    for (const n of result.removed) {
      console.log(`    ${C.red}- "${n}"${C.reset} (in local, not JSM)`);
    }
  }
  if (result.changed.length > 0) {
    for (const { name, diffs } of result.changed) {
      console.log(`    ${C.yellow}~ "${name}"${C.reset}`);
      for (const d of diffs) {
        const lStr = d.local != null ? `"${d.local}"` : '(empty)';
        const rStr = d.remote != null ? `"${d.remote}"` : '(empty)';
        console.log(`        ${d.field}: ${lStr} -> ${rStr}`);
      }
    }
  }
}

function printDiffSummary(results) {
  let matched = 0, diffed = 0, noLocal = 0, empty = 0, errors = 0;
  for (const r of results) {
    if (r.status === 'MATCH') matched++;
    else if (r.status === 'DIFF') diffed++;
    else if (r.status === 'NO_LOCAL') noLocal++;
    else if (r.status === 'EMPTY') empty++;
    else errors++;
  }

  console.log('');
  console.log('==================================================');
  console.log('  Diff Summary');
  console.log('==================================================');
  console.log('');
  console.log(`  Types checked:    ${results.length}`);
  console.log(`  Matching:         ${C.green}${matched}${C.reset}`);
  if (diffed > 0) console.log(`  Different:        ${C.yellow}${diffed}${C.reset}`);
  if (noLocal > 0) console.log(`  No local file:    ${C.dim}${noLocal}${C.reset}`);
  if (empty > 0)   console.log(`  Empty in JSM:     ${C.dim}${empty}${C.reset}`);
  if (errors > 0)  console.log(`  Errors:           ${C.red}${errors}${C.reset}`);
  console.log('');

  const overall = diffed === 0 && errors === 0
    ? `${C.green}IN SYNC${C.reset}`
    : `${C.yellow}OUT OF SYNC${C.reset}`;
  console.log(`  Result: ${overall}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// Export output
// ---------------------------------------------------------------------------

function printExportSummary(results, outdir) {
  let exported = 0, empty = 0, errors = 0;
  let totalRecords = 0;
  for (const r of results) {
    if (r.status === 'OK') { exported++; totalRecords += r.count; }
    else if (r.status === 'EMPTY') empty++;
    else errors++;
  }

  console.log('');
  console.log('==================================================');
  console.log('  Export Summary');
  console.log('==================================================');
  console.log('');
  console.log(`  Output directory:   ${outdir}`);
  console.log(`  Types exported:     ${C.green}${exported}${C.reset}`);
  console.log(`  Total records:      ${totalRecords}`);
  if (empty > 0) console.log(`  Empty types:        ${C.dim}${empty}${C.reset}`);
  if (errors > 0) console.log(`  Errors:             ${C.red}${errors}${C.reset}`);
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

  // Determine output directory
  let outdir;
  if (options.outdir) {
    outdir = path.resolve(options.outdir);
  } else if (options.overwrite) {
    outdir = config.dataDir;
  } else {
    outdir = path.resolve(path.join(path.dirname(config.dataDir), 'objects-export'));
  }

  const modeLabel = options.diff ? 'Diff' : 'Export';

  // Header
  console.log('');
  console.log('==================================================');
  console.log(`  CMDB Kit JSM ${modeLabel}`);
  console.log('==================================================');
  console.log(`  URL:    ${config.jsmUrl}`);
  console.log(`  Schema: ${config.schemaKey}`);

  await resolveWorkspaceId(config, api);

  if (!options.diff) {
    console.log(`  Output: ${outdir}`);
    if (options.overwrite) console.log(`  ${C.yellow}WARNING: Overwriting local files${C.reset}`);
  }

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
  let typesToProcess = LOAD_PRIORITY;
  if (options.types.length > 0) {
    typesToProcess = LOAD_PRIORITY.filter(t => options.types.includes(t));
    if (typesToProcess.length === 0) {
      console.error(`\n${C.red}Error:${C.reset} None of the specified types found in LOAD_PRIORITY`);
      console.error(`  Requested: ${options.types.join(', ')}`);
      process.exit(2);
    }
  }

  console.log(`  Types:  ${typesToProcess.length} to ${modeLabel.toLowerCase()}`);
  console.log('');
  console.log(`--- ${modeLabel}ing Types ---`);
  console.log('');

  // Process each type
  const results = [];
  const personnelBundle = {}; // Accumulate personnel types for bundled write

  for (const typeName of typesToProcess) {
    const typeId = typeIds[typeName];
    if (!typeId) {
      const result = { typeName, status: 'ERROR', message: 'type not found in JSM' };
      results.push(result);
      if (options.diff) printDiffResult(result);
      else console.log(`  ${typeName} ... ${C.red}ERROR${C.reset} (type not found in JSM)`);
      continue;
    }

    const exportResult = await exportType(typeName, typeId, schemaId, api, config, outdir, config.dataDir);
    results.push(exportResult);

    if (options.diff) {
      // Diff mode: compare against local files
      if (exportResult.status === 'ERROR') {
        printDiffResult(exportResult);
        continue;
      }
      const diffResult = diffType(typeName, exportResult.records, config.dataDir);
      // Replace the export result with diff result for summary
      results[results.length - 1] = diffResult;
      printDiffResult(diffResult);
    } else {
      // Export mode: write files
      if (exportResult.status === 'ERROR') {
        console.log(`  ${typeName} ... ${C.red}ERROR${C.reset} ${exportResult.message}`);
        continue;
      }
      if (exportResult.status === 'EMPTY') {
        console.log(`  ${typeName} ... ${C.dim}EMPTY${C.reset}`);
        continue;
      }

      // Personnel types accumulate into person.json
      if (PERSONNEL_TYPES.includes(typeName)) {
        personnelBundle[typeName] = exportResult.records;
        console.log(`  ${typeName} ... ${C.green}${exportResult.count} records${C.reset} (bundled -> person.json)`);
      } else {
        const format = detectFormat(typeName, config.dataDir);
        const filePath = resolveOutputFile(typeName, outdir);
        writeExportFile(filePath, typeName, exportResult.records, format);
        console.log(`  ${typeName} ... ${C.green}${exportResult.count} records${C.reset} -> ${path.basename(filePath)}`);
      }
    }
  }

  // Write personnel bundle if any types were collected
  if (!options.diff && Object.keys(personnelBundle).length > 0) {
    const personPath = path.join(outdir, 'person.json');
    const dir = path.dirname(personPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const content = JSON.stringify(personnelBundle, null, 2) + '\n';
    fs.writeFileSync(personPath, content, 'utf8');
  }

  // Summary
  if (options.diff) {
    printDiffSummary(results);
    const hasDiff = results.some(r => r.status === 'DIFF' || r.status === 'ERROR');
    process.exit(hasDiff ? 1 : 0);
  } else {
    printExportSummary(results, outdir);
  }
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('  Could not connect to JSM. Check JSM_URL and ensure the server is running.');
  }
  process.exit(2);
});
