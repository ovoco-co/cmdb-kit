#!/usr/bin/env node
/**
 * CMDB Kit ServiceNow Export
 *
 * Exports live ServiceNow CMDB data to local JSON files in the exact format
 * consumed by the import script. Supports exporting to a separate directory,
 * overwriting local files, and diffing SN vs local state.
 *
 * Usage:
 *   node adapters/servicenow/export.js [options]
 *
 * Options:
 *   --outdir <dir>      Output directory (default: objects-export)
 *   --type <name>       Export only this type (repeatable/comma-separated)
 *   --diff              Compare exported data against local files, report differences
 *   --overwrite         Write directly to data dir (overwrite local files)
 *   --skip-users        Skip Person records
 *   --help              Show this help message
 *
 * Environment:
 *   SN_INSTANCE         ServiceNow instance URL
 *   SN_USER             Admin username (required)
 *   SN_PASSWORD         Admin password (required)
 *   SN_TABLE_PREFIX     Custom table prefix (default: u_cmdbk)
 *   SN_BATCH_SIZE       Records per pagination batch (default: 200)
 *   DATA_DIR            Data directory (default: schema/base/data)
 *   DEBUG               Set to 'true' for HTTP debug logging
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig, createApiClient, getClassMap, resolveGlideListToNames,
  loadJsonFile, loadDataFile, LOAD_PRIORITY, PERSONNEL_TYPES, NESTED_TYPES, C,
  ATTR_NAME_MAP,
} = require('./lib');

// ---------------------------------------------------------------------------
// Reverse attribute name mapping
// ---------------------------------------------------------------------------
const REVERSE_ATTR_MAP = {};
for (const [camel, display] of Object.entries(ATTR_NAME_MAP)) {
  REVERSE_ATTR_MAP[display] = camel;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseCli(args) {
  const opts = { types: [], diff: false, overwrite: false, outdir: '', skipUsers: false, help: false };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--diff') { opts.diff = true; }
    else if (a === '--overwrite') { opts.overwrite = true; }
    else if (a === '--skip-users') { opts.skipUsers = true; }
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
CMDB Kit ServiceNow Export

Exports live ServiceNow CMDB data to local JSON files matching the import format.

Usage:
  node adapters/servicenow/export.js [options]

Options:
  --outdir <dir>      Output directory (default: objects-export)
  --type <name>, -t   Export only this type (repeatable/comma-separated)
  --diff              Compare SN data against local files instead of exporting
  --overwrite         Write directly to data dir (overwrite local files)
  --skip-users        Skip Person records
  --help, -h          Show this help message

Environment:
  SN_INSTANCE         ServiceNow instance URL
  SN_USER             Admin username
  SN_PASSWORD         Admin password
  SN_TABLE_PREFIX     Custom table prefix (default: u_cmdbk)
  SN_BATCH_SIZE       Records per pagination batch (default: 200)
  DATA_DIR            Data directory (default: schema/base/data)
  DEBUG               Set to 'true' for HTTP debug logging
`);
}

// ---------------------------------------------------------------------------
// Reverse mapping: SN record -> local JSON format
// ---------------------------------------------------------------------------

function reverseAttrName(snColumn) {
  // Check explicit reverse map
  for (const [camel, display] of Object.entries(ATTR_NAME_MAP)) {
    const snStyle = display.replace(/\s+(.)/g, (_, c) => '_' + c.toLowerCase()).toLowerCase();
    if (snColumn === snStyle) return camel;
  }
  // snake_case to camelCase
  return snColumn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function buildReverseAttrMap(mapping) {
  const reverse = {};
  for (const [localKey, snMapping] of Object.entries(mapping.attrMap)) {
    const column = typeof snMapping === 'string' ? snMapping : snMapping.column;
    if (column) reverse[column] = { localKey, mapping: snMapping };
  }
  return reverse;
}

async function convertRecord(snRecord, mapping, api) {
  const record = {};
  const { nameField } = mapping;

  // Extract name - Tier 3 standalone custom tables use u_name
  const actualNameField = (mapping.tier === 3 && nameField === 'name') ? 'u_name' : nameField;
  const nameVal = snRecord[actualNameField] || snRecord[nameField];
  if (nameVal) {
    record.Name = typeof nameVal === 'object' ? (nameVal.display_value || nameVal.value) : nameVal;
  }

  const reverseMap = buildReverseAttrMap(mapping);

  for (const [column, val] of Object.entries(snRecord)) {
    if (column === 'sys_id' || column === nameField) continue;

    const reverseEntry = reverseMap[column];
    if (!reverseEntry) continue;

    const { localKey, mapping: attrMapping } = reverseEntry;
    if (localKey === 'description' && !val) continue;

    let value;
    if (typeof attrMapping === 'object' && attrMapping.transform) {
      // Reverse transform
      const reverseTransform = {};
      for (const [k, v] of Object.entries(attrMapping.transform)) {
        reverseTransform[v] = k;
      }
      value = reverseTransform[String(val)] || val;
    } else if (typeof attrMapping === 'object' && attrMapping.multi && attrMapping.ref) {
      // Multi-reference: resolve glide_list sys_ids to names
      // With sysparm_display_value=all, val may be { display_value, value } object
      const rawVal = (val && typeof val === 'object' && !Array.isArray(val))
        ? (val.display_value || val.value || '')
        : val;
      value = await resolveGlideListToNames(rawVal, attrMapping.ref, api);
    } else if (typeof attrMapping === 'object' && attrMapping.ref) {
      // Single reference: use display_value if available
      if (typeof val === 'object' && val !== null) {
        value = val.display_value || val.value;
      } else {
        value = val;
      }
    } else {
      value = typeof val === 'object' && val !== null ? (val.display_value || val.value) : val;
    }

    if (value !== null && value !== undefined && value !== '') {
      record[localKey] = value;
    }
  }

  return record;
}

// ---------------------------------------------------------------------------
// Export a single type
// ---------------------------------------------------------------------------

async function exportType(typeName, mapping, api, config) {
  const { table, nameField } = mapping;

  try {
    // Fetch with display values for references
    const records = await api.getAll(`/api/now/table/${table}`, {
      sysparm_display_value: 'all',
    });

    if (!records.length) {
      return { typeName, status: 'EMPTY', records: [], count: 0 };
    }

    const converted = [];
    for (const rec of records) {
      const localRec = await convertRecord(rec, mapping, api);
      if (localRec.Name) converted.push(localRec);
    }

    // Sort by Name
    converted.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));

    return { typeName, status: 'OK', records: converted, count: converted.length };
  } catch (err) {
    return { typeName, status: 'ERROR', message: `API error: ${err.error?.message || err.message || err}`, records: [] };
  }
}

// ---------------------------------------------------------------------------
// Diff mode
// ---------------------------------------------------------------------------

function diffType(typeName, remoteRecords, dataDir) {
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

  const localIndex = new Map();
  for (const rec of localData) {
    const name = rec.Name || rec.name;
    if (name) localIndex.set(name, rec);
  }

  const remoteIndex = new Map();
  for (const rec of remoteRecords) {
    if (rec.Name) remoteIndex.set(rec.Name, rec);
  }

  const added = [], removed = [], changed = [];

  for (const [name, rec] of remoteIndex) {
    if (!localIndex.has(name)) {
      added.push(name);
    } else {
      const localRec = localIndex.get(name);
      const diffs = [];
      for (const [key, rVal] of Object.entries(rec)) {
        if (key === 'Name') continue;
        const lVal = localRec[key];
        if (normalize(lVal) !== normalize(rVal)) {
          diffs.push({ field: key, local: lVal, remote: rVal });
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

function normalize(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  return s;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function resolveOutputFile(typeName, outdir) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  return path.join(outdir, `${safeName}.json`);
}

function detectFormat(typeName, dataDir) {
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
  return NESTED_TYPES.has(typeName) ? 'nested' : 'flat';
}

function writeExportFile(filePath, typeName, records, format) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let content;
  if (format === 'nested') {
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

function printDiffResult(result) {
  const dots = '.'.repeat(Math.max(1, 35 - result.typeName.length));

  if (result.status === 'ERROR') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.red}ERROR${C.reset} ${result.message}`);
    return;
  }
  if (result.status === 'EMPTY') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.dim}EMPTY${C.reset}`);
    return;
  }
  if (result.status === 'NO_LOCAL') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.yellow}NO LOCAL${C.reset} (${result.remoteCount} in SN)`);
    return;
  }
  if (result.status === 'MATCH') {
    console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.green}MATCH${C.reset} (${result.localCount} records)`);
    return;
  }

  console.log(`  ${result.typeName} ${C.dim}${dots}${C.reset} ${C.yellow}DIFF${C.reset}`);
  if (result.added.length > 0) {
    for (const n of result.added) console.log(`    ${C.green}+ "${n}"${C.reset} (in SN, not local)`);
  }
  if (result.removed.length > 0) {
    for (const n of result.removed) console.log(`    ${C.red}- "${n}"${C.reset} (in local, not SN)`);
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) { printHelp(); process.exit(0); }

  const config = loadConfig({ requireAuth: true, requireSchema: false });
  const api = createApiClient(config, { timeout: 30000, maxRetries: 2 });
  const classMap = getClassMap(config.tablePrefix);

  let outdir;
  if (options.outdir) {
    outdir = path.resolve(options.outdir);
  } else if (options.overwrite) {
    outdir = config.dataDir;
  } else {
    outdir = path.resolve(path.join(path.dirname(config.dataDir), 'objects-export'));
  }

  const modeLabel = options.diff ? 'Diff' : 'Export';

  console.log('');
  console.log('='.repeat(50));
  console.log(`  CMDB Kit ServiceNow ${modeLabel}`);
  console.log('='.repeat(50));
  console.log(`  Instance: ${config.instanceUrl}`);
  console.log(`  Prefix:   ${config.tablePrefix}`);
  if (!options.diff) {
    console.log(`  Output:   ${outdir}`);
    if (options.overwrite) console.log(`  ${C.yellow}WARNING: Overwriting local files${C.reset}`);
  }

  let typesToProcess = LOAD_PRIORITY;
  if (options.types.length > 0) {
    typesToProcess = LOAD_PRIORITY.filter(t => options.types.includes(t));
    if (typesToProcess.length === 0) {
      console.error(`\n${C.red}Error:${C.reset} None of the specified types found in LOAD_PRIORITY`);
      process.exit(2);
    }
  }

  console.log(`  Types:    ${typesToProcess.length} to ${modeLabel.toLowerCase()}`);
  console.log('');
  console.log(`--- ${modeLabel}ing Types ---\n`);

  const results = [];
  const personnelBundle = {};

  for (const typeName of typesToProcess) {
    const mapping = classMap[typeName];
    if (!mapping || !mapping.table || mapping.container) {
      results.push({ typeName, status: 'SKIP', message: 'no table mapping' });
      continue;
    }

    if (options.skipUsers && mapping.skipOnFlag === 'skipUsers') {
      console.log(`  ${typeName} ... ${C.dim}SKIP (--skip-users)${C.reset}`);
      continue;
    }

    const exportResult = await exportType(typeName, mapping, api, config);
    results.push(exportResult);

    if (options.diff) {
      if (exportResult.status === 'ERROR') {
        printDiffResult(exportResult);
        continue;
      }
      const diffResult = diffType(typeName, exportResult.records, config.dataDir);
      results[results.length - 1] = diffResult;
      printDiffResult(diffResult);
    } else {
      if (exportResult.status === 'ERROR') {
        console.log(`  ${typeName} ... ${C.red}ERROR${C.reset} ${exportResult.message}`);
        continue;
      }
      if (exportResult.status === 'EMPTY') {
        console.log(`  ${typeName} ... ${C.dim}EMPTY${C.reset}`);
        continue;
      }

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

  // Write personnel bundle
  if (!options.diff && Object.keys(personnelBundle).length > 0) {
    const personPath = path.join(outdir, 'person.json');
    const dir = path.dirname(personPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(personPath, JSON.stringify(personnelBundle, null, 2) + '\n', 'utf8');
  }

  // Summary
  console.log('');
  console.log('='.repeat(50));
  console.log(`  ${modeLabel} Summary`);
  console.log('='.repeat(50));

  if (options.diff) {
    let matched = 0, diffed = 0, noLocal = 0, empty = 0, errors = 0;
    for (const r of results) {
      if (r.status === 'MATCH') matched++;
      else if (r.status === 'DIFF') diffed++;
      else if (r.status === 'NO_LOCAL') noLocal++;
      else if (r.status === 'EMPTY') empty++;
      else errors++;
    }
    console.log(`  Matching:       ${C.green}${matched}${C.reset}`);
    if (diffed > 0) console.log(`  Different:      ${C.yellow}${diffed}${C.reset}`);
    if (noLocal > 0) console.log(`  No local file:  ${C.dim}${noLocal}${C.reset}`);
    if (errors > 0) console.log(`  Errors:         ${C.red}${errors}${C.reset}`);
    const overall = diffed === 0 && errors === 0 ? `${C.green}IN SYNC${C.reset}` : `${C.yellow}OUT OF SYNC${C.reset}`;
    console.log(`\n  Result: ${overall}\n`);
    process.exit(diffed > 0 || errors > 0 ? 1 : 0);
  } else {
    let exported = 0, empty = 0, skipped = 0, errors = 0, totalRecords = 0;
    for (const r of results) {
      if (r.status === 'OK') { exported++; totalRecords += r.count; }
      else if (r.status === 'EMPTY') empty++;
      else if (r.status === 'SKIP') skipped++;
      else errors++;
    }
    console.log(`  Output:         ${outdir}`);
    console.log(`  Types exported: ${C.green}${exported}${C.reset}`);
    console.log(`  Total records:  ${totalRecords}`);
    if (empty > 0) console.log(`  Empty types:    ${C.dim}${empty}${C.reset}`);
    if (skipped > 0) console.log(`  Skipped:        ${C.dim}${skipped}${C.reset}`);
    if (errors > 0) console.log(`  Errors:         ${C.red}${errors}${C.reset}`);
    console.log('');
  }
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('  Could not connect to ServiceNow. Check SN_INSTANCE.');
  }
  process.exit(2);
});
