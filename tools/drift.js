#!/usr/bin/env node
/**
 * CMDB Kit Drift Detection
 *
 * Compares local data files (expected state) against a live platform
 * (actual state) and reports differences as drift.
 *
 * Drift types:
 *   - VERSION_MISMATCH: Deployment Site version differs from expected
 *   - STATUS_MISMATCH: Record status differs from expected
 *   - MISSING_IN_PLATFORM: Record exists locally but not in platform
 *   - EXTRA_IN_PLATFORM: Record exists in platform but not locally
 *   - FIELD_MISMATCH: Any tracked field differs
 *
 * Usage:
 *   node tools/drift.js --platform jsm [options]
 *   node tools/drift.js --platform servicenow [options]
 *
 * Options:
 *   --platform jsm|servicenow   Target platform (required)
 *   --type <name>               Check only this type (repeatable)
 *   --fields <list>             Comma-separated fields to compare (default: all)
 *   --format table|json         Output format (default: table)
 *   --schema <dir>              Schema directory (default: schema/core)
 *   --domain <dir>              Domain directory (repeatable)
 *   --help, -h                  Show help
 *
 * Environment:
 *   JSM_URL, JSM_USER, JSM_PASSWORD, SCHEMA_KEY (for JSM)
 *   SN_INSTANCE, SN_USER, SN_PASSWORD (for ServiceNow)
 */

const fs = require('fs');
const path = require('path');
const { loadDataFile, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, C } = require('./lib');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseCli(args) {
  const opts = {
    platform: null,
    types: [],
    fields: null,
    format: 'table',
    schemaDir: null,
    domainDirs: [],
    help: false,
  };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--platform' && args[i + 1]) opts.platform = args[++i];
    else if ((a === '--type' || a === '-t') && args[i + 1]) {
      for (const t of args[++i].split(',')) {
        const trimmed = t.trim();
        if (trimmed) opts.types.push(trimmed);
      }
    }
    else if (a === '--fields' && args[i + 1]) opts.fields = args[++i].split(',').map(f => f.trim());
    else if (a === '--format' && args[i + 1]) opts.format = args[++i];
    else if (a === '--schema' && args[i + 1]) opts.schemaDir = args[++i];
    else if (a === '--domain' && args[i + 1]) opts.domainDirs.push(args[++i]);
    i++;
  }
  return opts;
}

function printHelp() {
  console.log(`
CMDB Kit Drift Detection

Compares local data files against a live platform and reports drift.

Usage:
  node tools/drift.js --platform jsm [options]
  node tools/drift.js --platform servicenow [options]

Options:
  --platform jsm|servicenow   Target platform (required)
  --type <name>, -t           Check only this type (repeatable/comma-separated)
  --fields <list>             Comma-separated fields to compare (default: all)
  --format table|json         Output format (default: table)
  --schema <dir>              Schema directory (default: schema/core)
  --domain <dir>              Domain directory (repeatable)
  --help, -h                  Show this help message

Environment:
  JSM_URL, JSM_USER, JSM_PASSWORD, SCHEMA_KEY (for JSM platform)
  SN_INSTANCE, SN_USER, SN_PASSWORD (for ServiceNow platform)

Examples:
  node tools/drift.js --platform jsm --type "Deployment Site"
  node tools/drift.js --platform servicenow --type "Product Version" --format json
  node tools/drift.js --platform jsm --fields version,status
`);
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
function resolveDataFile(dataDir, typeName) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const candidates = [`${safeName}.json`, `${safeName}s.json`];
  if (PERSONNEL_TYPES.includes(typeName)) candidates.push('person.json');
  for (const f of candidates) {
    const full = path.join(dataDir, f);
    if (fs.existsSync(full)) return f;
  }
  return null;
}

function loadLocalRecords(dataDirs, typeName) {
  for (const dir of dataDirs) {
    const file = resolveDataFile(dir, typeName);
    if (file) return loadDataFile(dir, file, typeName);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Platform adapters (thin wrappers around existing validate-import logic)
// ---------------------------------------------------------------------------
async function fetchRemoteRecords(platform, typeName, config, api) {
  if (platform === 'jsm') {
    return fetchJsmRecords(typeName, config, api);
  } else if (platform === 'servicenow') {
    return fetchSnRecords(typeName, config, api);
  }
  return [];
}

async function fetchJsmRecords(typeName, config, api) {
  const querystring = require('querystring');

  // Get schema and type IDs
  const raw = await api.get('/objectschema/list');
  const schemas = raw.objectschemas || raw.values || raw;
  const schema = Array.isArray(schemas) ? schemas.find(s => s.objectSchemaKey === config.schemaKey) : null;
  if (!schema) return [];

  const typesRaw = await api.get(`/objectschema/${schema.id}/objecttypes/flat`);
  const types = Array.isArray(typesRaw) ? typesRaw : (typesRaw.values || typesRaw.objectTypes || []);
  const typeObj = types.find(t => t.name === typeName);
  if (!typeObj) return [];

  // Fetch attribute definitions for name mapping
  const attrDefsRaw = await api.get(`/objecttype/${typeObj.id}/attributes`);
  const attrDefs = Array.isArray(attrDefsRaw) ? attrDefsRaw : (attrDefsRaw.values || []);
  const attrIdToName = {};
  for (const a of attrDefs) {
    if (a.id) attrIdToName[String(a.id)] = a.name;
  }

  // Fetch objects via AQL
  const aql = `objectTypeId = ${typeObj.id}`;
  const qs = querystring.stringify({ qlQuery: aql, resultPerPage: 500, page: 1 });
  const res = config.isCloud
    ? await api.get(`/aql/objects?${qs}`)
    : await api.get(`/iql/objects?${qs}`);

  const entries = res.objectEntries || [];
  const records = [];

  for (const entry of entries) {
    let name = entry.label || entry.name || '';
    if (name.includes(' - ')) name = name.substring(name.indexOf(' - ') + 3);

    const record = { Name: name };
    for (const attr of (entry.attributes || [])) {
      const attrName = attr.objectTypeAttribute
        ? (attr.objectTypeAttribute.name || '')
        : (attrIdToName[String(attr.objectTypeAttributeId)] || '');
      if (!attrName || attrName === 'Name' || attrName === 'Key') continue;

      const values = attr.objectAttributeValues || [];
      if (values.length === 0) continue;

      if (values.length > 1) {
        record[attrName] = values.map(v => {
          if (v.referencedObject) {
            let refName = v.referencedObject.label || v.referencedObject.name || String(v.value);
            if (refName.includes(' - ')) refName = refName.substring(refName.indexOf(' - ') + 3);
            return refName;
          }
          return v.displayValue != null ? String(v.displayValue) : String(v.value);
        }).sort().join(';');
      } else {
        const v = values[0];
        if (v.referencedObject) {
          let refName = v.referencedObject.label || v.referencedObject.name || String(v.value);
          if (refName.includes(' - ')) refName = refName.substring(refName.indexOf(' - ') + 3);
          record[attrName] = refName;
        } else {
          record[attrName] = v.displayValue != null ? String(v.displayValue) : String(v.value);
        }
      }
    }
    records.push(record);
  }

  return records;
}

async function fetchSnRecords(typeName, config, api) {
  const { getClassMap, resolveTableNames } = require('../adapters/servicenow/lib');
  const classMap = getClassMap(config.tablePrefix);
  await resolveTableNames(classMap, api);

  const mapping = classMap[typeName];
  if (!mapping || !mapping.table) return [];

  try {
    const results = await api.getAll(`/api/now/table/${mapping.table}`, {
      sysparm_fields: 'sys_id,name,u_name',
    });

    return results.map(r => ({
      Name: r.name || r.u_name || '',
      ...r,
    }));
  } catch (_e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
const MONTHS = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                 Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };

function normalizeDate(s) {
  if (!s) return null;
  s = String(s).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = s.match(/^(\d{1,2})\/(\w{3})\/(\d{2,4})/);
  if (dmy && MONTHS[dmy[2]]) {
    let year = dmy[3];
    if (year.length === 2) year = (parseInt(year) >= 70 ? '19' : '20') + year;
    return `${year}-${MONTHS[dmy[2]]}-${dmy[1].padStart(2, '0')}`;
  }
  return s;
}

function normalizeMultiRef(s) {
  if (!s) return '';
  return String(s).split(';').map(v => v.trim()).sort().join(';');
}

function normalizeValue(local, remote) {
  // Try date normalization
  const ld = normalizeDate(local);
  const rd = normalizeDate(remote);
  if (ld && rd && ld === rd) return true;

  // Try multi-ref normalization
  if (String(local).includes(';') || String(remote).includes(';')) {
    return normalizeMultiRef(local) === normalizeMultiRef(remote);
  }

  return String(local).trim() === String(remote).trim();
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------
function compareRecords(localRecords, remoteRecords, fieldsToCheck) {
  const drift = [];
  const localByName = new Map();
  const remoteByName = new Map();

  for (const r of localRecords) {
    const name = r.Name || r.name;
    if (name) localByName.set(name, r);
  }
  for (const r of remoteRecords) {
    const name = r.Name || r.name;
    if (name) remoteByName.set(name, r);
  }

  // Missing in platform
  for (const [name] of localByName) {
    if (!remoteByName.has(name)) {
      drift.push({ name, type: 'MISSING_IN_PLATFORM', details: 'Exists locally but not in platform' });
    }
  }

  // Extra in platform
  for (const [name] of remoteByName) {
    if (!localByName.has(name)) {
      drift.push({ name, type: 'EXTRA_IN_PLATFORM', details: 'Exists in platform but not locally' });
    }
  }

  // Field mismatches
  for (const [name, localRec] of localByName) {
    const remoteRec = remoteByName.get(name);
    if (!remoteRec) continue;

    for (const [key, localVal] of Object.entries(localRec)) {
      if (['Name', 'name', 'id', 'key', 'Key'].includes(key)) continue;
      if (localVal === null || localVal === undefined) continue;
      if (fieldsToCheck && !fieldsToCheck.includes(key)) continue;

      const displayName = mapAttrName(key);
      const remoteVal = remoteRec[displayName] || remoteRec[key];

      if (remoteVal === undefined || remoteVal === null) continue;

      if (normalizeValue(localVal, remoteVal)) continue;

      const localStr = String(localVal).trim();
      const remoteStr = String(remoteVal).trim();

      if (true) {
        const driftType = key === 'version' ? 'VERSION_MISMATCH'
          : key === 'status' ? 'STATUS_MISMATCH'
          : 'FIELD_MISMATCH';
        drift.push({
          name,
          type: driftType,
          field: displayName,
          expected: localStr,
          actual: remoteStr,
        });
      }
    }
  }

  return drift;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function outputTable(typeName, drift) {
  if (drift.length === 0) {
    console.log(`  ${typeName} ... ${C.green}NO DRIFT${C.reset}`);
    return;
  }

  console.log(`  ${typeName} ... ${C.yellow}${drift.length} drift item(s)${C.reset}`);
  for (const d of drift) {
    if (d.field) {
      console.log(`    ${C.yellow}${d.type}${C.reset} ${d.name}: ${d.field} expected="${d.expected}" actual="${d.actual}"`);
    } else {
      console.log(`    ${C.yellow}${d.type}${C.reset} ${d.name}: ${d.details}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseCli(process.argv.slice(2));
  if (opts.help) { printHelp(); process.exit(0); }

  if (!opts.platform) {
    console.error('Error: --platform is required (jsm or servicenow)');
    process.exit(1);
  }

  // Resolve schema and data directories
  const projectRoot = path.resolve(__dirname, '..');
  const schemaDir = opts.schemaDir
    ? path.resolve(opts.schemaDir)
    : path.join(projectRoot, 'schema', 'core');
  const dataDir = path.join(schemaDir, 'data');
  const dataDirs = [dataDir];
  for (const d of opts.domainDirs) {
    dataDirs.push(path.join(path.resolve(d), 'data'));
  }

  // Load platform config and create API client
  let config, api;

  if (opts.platform === 'jsm') {
    const jsm = require('../adapters/jsm/lib');
    config = jsm.loadConfig({ requireAuth: true, requireSchema: true });
    api = jsm.createApiClient(config, { timeout: 30000, maxRetries: 2 });
    if (config.isCloud) {
      await jsm.resolveWorkspaceId(config, api);
    }
  } else if (opts.platform === 'servicenow') {
    const sn = require('../adapters/servicenow/lib');
    config = sn.loadConfig({ requireAuth: true });
    api = sn.createApiClient(config, { timeout: 30000, maxRetries: 2 });
  } else {
    console.error(`Error: unknown platform "${opts.platform}". Use jsm or servicenow.`);
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('  CMDB Kit Drift Detection');
  console.log('='.repeat(50));
  console.log(`  Platform: ${opts.platform}`);
  console.log(`  Schema:   ${schemaDir}`);
  console.log('');

  // Determine which types to check
  const typesToCheck = opts.types.length > 0
    ? opts.types
    : ['Deployment Site', 'Product Version', 'Product', 'Baseline'];

  console.log('--- Checking Drift ---\n');

  const allDrift = [];
  let totalChecked = 0;

  for (const typeName of typesToCheck) {
    const localRecords = loadLocalRecords(dataDirs, typeName);
    if (localRecords.length === 0) {
      console.log(`  ${typeName} ... ${C.dim}no local data${C.reset}`);
      continue;
    }

    let remoteRecords;
    try {
      remoteRecords = await fetchRemoteRecords(opts.platform, typeName, config, api);
    } catch (err) {
      console.log(`  ${typeName} ... ${C.red}ERROR${C.reset} ${err.error?.message || err.message || err}`);
      continue;
    }

    const drift = compareRecords(localRecords, remoteRecords, opts.fields);
    totalChecked++;

    if (opts.format === 'json') {
      allDrift.push({ typeName, drift });
    } else {
      outputTable(typeName, drift);
    }
  }

  if (opts.format === 'json') {
    console.log(JSON.stringify(allDrift, null, 2));
  }

  // Summary
  console.log('');
  console.log('='.repeat(50));
  console.log('  Drift Summary');
  console.log('='.repeat(50));
  console.log(`  Types checked: ${totalChecked}`);

  const totalDrift = opts.format === 'json'
    ? allDrift.reduce((sum, t) => sum + t.drift.length, 0)
    : 0; // Already printed in table mode

  if (opts.format === 'json') {
    console.log(`  Total drift items: ${totalDrift}`);
  }
  console.log('');
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  process.exit(2);
});
