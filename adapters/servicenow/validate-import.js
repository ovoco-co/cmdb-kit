#!/usr/bin/env node
/**
 * CMDB Kit ServiceNow Post-Import Validation
 *
 * Connects to a live ServiceNow instance, fetches remote records, and
 * compares them field-by-field against local JSON data files.
 *
 * Usage:
 *   node adapters/servicenow/validate-import.js [options]
 *
 * Options:
 *   --type <name>       Validate only this type (repeatable/comma-separated)
 *   --skip-fields       Only check record counts and presence, skip field comparison
 *   --skip-users        Skip Person records
 *   --verbose           Show all field details for mismatched records
 *   --summary-only      Only print the summary table
 *   --help              Show this help message
 *
 * Environment:
 *   SN_INSTANCE         ServiceNow instance URL
 *   SN_USER             Admin username (required)
 *   SN_PASSWORD         Admin password (required)
 *   SN_TABLE_PREFIX     Custom table prefix (default: u_cmdbk)
 *   DATA_DIR            Data directory (default: schema/core/data)
 *   DEBUG               Set to 'true' for HTTP debug logging
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig, createApiClient, getClassMap, resolveTableNames,
  loadDataFile, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, C,
} = require('./lib');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseCli(args) {
  const opts = { types: [], skipFields: false, skipUsers: false, verbose: false, summaryOnly: false, help: false };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--skip-fields') { opts.skipFields = true; }
    else if (a === '--skip-users') { opts.skipUsers = true; }
    else if (a === '--verbose' || a === '-v') { opts.verbose = true; }
    else if (a === '--summary-only') { opts.summaryOnly = true; }
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
CMDB Kit ServiceNow Post-Import Validation

Compares local JSON data files against live ServiceNow CMDB data.

Usage:
  node adapters/servicenow/validate-import.js [options]

Options:
  --type <name>, -t    Validate only this type (repeatable/comma-separated)
  --skip-fields        Only check record counts, skip field comparison
  --skip-users         Skip Person records
  --verbose, -v        Show all field details for mismatched records
  --summary-only       Only print the summary table
  --help, -h           Show this help message

Environment:
  SN_INSTANCE          ServiceNow instance URL
  SN_USER              Admin username
  SN_PASSWORD          Admin password
  SN_TABLE_PREFIX      Custom table prefix (default: u_cmdbk)
  DATA_DIR             Data directory (default: schema/core/data)
  DEBUG                Set to 'true' for HTTP debug logging
`);
}

// ---------------------------------------------------------------------------
// Data file resolution
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
// Value normalization
// ---------------------------------------------------------------------------
function normalizeValue(val) {
  if (val === null || val === undefined) return null;
  // ServiceNow may return reference fields as { link, value, display_value } objects
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    // Prefer display_value, fall back to value
    const resolved = val.display_value || val.value || '';
    return normalizeValue(resolved);
  }
  const s = String(val).trim();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  return s;
}

// ---------------------------------------------------------------------------
// Type validation
// ---------------------------------------------------------------------------
async function validateType(typeName, mapping, api, config, options) {
  const dataFile = resolveDataFile(config.dataDir, typeName);
  if (!dataFile) return { typeName, status: 'SKIP', message: 'no data file' };

  const localData = loadDataFile(config.dataDir, dataFile, typeName);
  if (!localData.length) return { typeName, status: 'SKIP', message: 'empty data file' };

  const { table, nameField, attrMap } = mapping;

  // Fetch remote records
  let remoteRecords;
  try {
    remoteRecords = await api.getAll(`/api/now/table/${table}`, {
      sysparm_display_value: 'all',
    });
  } catch (err) {
    return { typeName, status: 'ERROR', message: `API error: ${err.error?.message || err.message || err}` };
  }

  // Build indexes by name
  const localIndex = new Map();
  for (const rec of localData) {
    const name = rec.Name || rec.name;
    if (name) localIndex.set(name, rec);
  }

  // Tier 3 standalone custom tables use u_name instead of name
  const actualNameField = (mapping.tier === 3 && nameField === 'name') ? 'u_name' : nameField;

  const remoteIndex = new Map();
  for (const rec of remoteRecords) {
    let name = rec[actualNameField];
    // With sysparm_display_value=all, fields are { display_value, value } objects
    if (name && typeof name === 'object') name = name.display_value || name.value;
    if (name) remoteIndex.set(name, rec);
  }

  const missing = [], extra = [], matched = [], fieldMismatches = [];

  for (const name of localIndex.keys()) {
    if (!remoteIndex.has(name)) missing.push(name);
    else matched.push(name);
  }
  for (const name of remoteIndex.keys()) {
    if (!localIndex.has(name)) extra.push(name);
  }

  // Field comparison
  if (!options.skipFields) {
    for (const name of matched) {
      const localRec = localIndex.get(name);
      const remoteRec = remoteIndex.get(name);
      const mismatches = [];

      for (const [localKey, localVal] of Object.entries(localRec)) {
        if (['Name', 'name', 'id', 'key', 'Key'].includes(localKey)) continue;
        if (localVal === null || localVal === undefined) continue;

        const attrMapping = attrMap[localKey];
        if (!attrMapping) continue;

        const column = typeof attrMapping === 'string' ? attrMapping : attrMapping.column;
        if (!column) continue;

        // Skip fields with transforms (e.g., installStatus maps "Active" to "1").
        // The remote value is the transformed version, not comparable to the local value.
        if (typeof attrMapping === 'object' && attrMapping.transform) continue;

        const remoteVal = remoteRec[column];
        const normLocal = normalizeValue(localVal);
        const normRemote = normalizeValue(remoteVal);
        if (normLocal !== normRemote) {
          mismatches.push({
            field: mapAttrName(localKey),
            local: normLocal || '(empty)',
            remote: normRemote || '(empty)',
          });
        }
      }

      if (mismatches.length > 0) fieldMismatches.push({ name, mismatches });
    }
  }

  const status = (missing.length === 0 && extra.length === 0 && fieldMismatches.length === 0)
    ? 'PASS' : 'FAIL';

  return {
    typeName, status,
    localCount: localData.length,
    remoteCount: remoteRecords.length,
    matchedCount: matched.length,
    missing, extra, fieldMismatches,
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printTypeResult(result, options) {
  if (options.summaryOnly) return;

  const { typeName, status } = result;
  const label = typeName.padEnd(40, '.');

  if (status === 'PASS') {
    console.log(`  ${label} ${C.green}PASS${C.reset} (${result.localCount}/${result.remoteCount})`);
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

  console.log(`  ${label} ${C.red}FAIL${C.reset}`);
  console.log(`    Records: ${result.localCount} local, ${result.remoteCount} remote`);

  if (result.missing.length > 0) {
    console.log(`    ${C.red}Missing in SN (${result.missing.length}):${C.reset}`);
    for (const n of result.missing) console.log(`      - "${n}"`);
  }
  if (result.extra.length > 0) {
    console.log(`    ${C.yellow}Extra in SN (${result.extra.length}):${C.reset}`);
    for (const n of result.extra) console.log(`      + "${n}"`);
  }
  if (result.fieldMismatches && result.fieldMismatches.length > 0) {
    console.log(`    ${C.yellow}Field mismatches (${result.fieldMismatches.length}):${C.reset}`);
    for (const { name, mismatches } of result.fieldMismatches) {
      console.log(`      "${name}"`);
      for (const m of mismatches) {
        console.log(`        ${m.field}: local="${m.local}" remote="${m.remote}"`);
      }
    }
  }
}

function printSummary(results) {
  let passed = 0, failed = 0, skipped = 0, errors = 0;
  let totalLocal = 0, totalRemote = 0, totalMatched = 0;

  for (const r of results) {
    if (r.status === 'PASS') passed++;
    else if (r.status === 'FAIL') failed++;
    else if (r.status === 'SKIP') skipped++;
    else errors++;
    totalLocal += r.localCount || 0;
    totalRemote += r.remoteCount || 0;
    totalMatched += r.matchedCount || 0;
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('  Validation Summary');
  console.log('='.repeat(50));
  console.log(`  Types checked:    ${results.length}`);
  console.log(`  Types passed:     ${C.green}${passed}${C.reset}`);
  if (failed > 0) console.log(`  Types failed:     ${C.red}${failed}${C.reset}`);
  if (errors > 0) console.log(`  Types errors:     ${C.red}${errors}${C.reset}`);
  console.log(`  Types skipped:    ${skipped}`);
  console.log(`  Records local:    ${totalLocal}`);
  console.log(`  Records remote:   ${totalRemote}`);
  console.log(`  Records matched:  ${totalMatched}`);

  const overall = (failed === 0 && errors === 0) ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`;
  console.log(`\n  Result: ${overall}\n`);
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

  // Resolve scoped table names
  const resolved = await resolveTableNames(classMap, api);
  if (resolved > 0) {
    console.log(`  Resolved ${resolved} scoped table name(s)`);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('  CMDB Kit ServiceNow Post-Import Validation');
  console.log('='.repeat(50));
  console.log(`  Instance: ${config.instanceUrl}`);
  console.log(`  Prefix:   ${config.tablePrefix}`);

  let typesToValidate = LOAD_PRIORITY;
  if (options.types.length > 0) {
    typesToValidate = LOAD_PRIORITY.filter(t => options.types.includes(t));
    if (typesToValidate.length === 0) {
      console.error(`\n${C.red}Error:${C.reset} None of the specified types found in LOAD_PRIORITY`);
      process.exit(2);
    }
  }

  console.log(`  Types:    ${typesToValidate.length} to validate\n`);
  if (!options.summaryOnly) console.log('--- Validating Types ---\n');

  const results = [];
  for (const typeName of typesToValidate) {
    const mapping = classMap[typeName];
    if (!mapping || !mapping.table || mapping.container) {
      const result = { typeName, status: 'SKIP', message: 'no table mapping' };
      results.push(result);
      printTypeResult(result, options);
      continue;
    }

    if (options.skipUsers && mapping.skipOnFlag === 'skipUsers') {
      const result = { typeName, status: 'SKIP', message: '--skip-users' };
      results.push(result);
      printTypeResult(result, options);
      continue;
    }

    const result = await validateType(typeName, mapping, api, config, options);
    results.push(result);
    printTypeResult(result, options);
  }

  printSummary(results);
  const hasFailures = results.some(r => r.status === 'FAIL' || r.status === 'ERROR');
  process.exit(hasFailures ? 1 : 0);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('  Could not connect to ServiceNow. Check SN_INSTANCE.');
  }
  process.exit(2);
});
