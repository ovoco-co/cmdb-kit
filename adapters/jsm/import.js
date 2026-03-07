#!/usr/bin/env node
/**
 * CMDB Kit JSM Import
 *
 * Imports schema structure, attributes, and data into JSM Assets.
 *
 * Modes:
 *   sync   - Create new objects + Update existing (default)
 *   create - Create new objects only, skip existing
 *   update - Update existing objects only, skip not found
 *   schema - Create object types from schema-structure.json only
 *
 * Usage:
 *   node adapters/jsm/import.js [mode] [options]
 *
 * Options:
 *   --type <name>, -t   Import only this type (repeatable/comma-separated)
 *   --dry-run           Show what would be imported without making changes
 *   --help, -h          Show help
 *
 * Environment:
 *   JSM_URL      - JSM instance URL (default: http://localhost:8080)
 *   JSM_USER     - Admin username (required)
 *   JSM_PASSWORD - Admin password (required)
 *   SCHEMA_KEY   - Schema key (default: CMDB)
 *   DATA_DIR     - Data directory (default: schema/base/data)
 */

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { loadConfig, createApiClient, resolveWorkspaceId, loadJsonFile, loadDataFile, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, C } = require('./lib');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const VALID_MODES = ['sync', 'create', 'update', 'schema'];

function parseCli(args) {
  const opts = { mode: 'sync', types: [], dryRun: false, help: false };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--dry-run') { opts.dryRun = true; }
    else if (a === '--type' || a === '-t') {
      i++;
      if (args[i]) {
        for (const t of args[i].split(',')) {
          const trimmed = t.trim();
          if (trimmed) opts.types.push(trimmed);
        }
      }
    } else if (!a.startsWith('-') && VALID_MODES.includes(a)) {
      opts.mode = a;
    } else if (!a.startsWith('-')) {
      console.error(`Invalid mode: ${a}. Valid: ${VALID_MODES.join(', ')}`);
      process.exit(1);
    }
    i++;
  }
  return opts;
}

function printHelp() {
  console.log(`
CMDB Kit JSM Import

Imports schema structure, attributes, and data into JSM Assets.

Usage:
  node adapters/jsm/import.js [mode] [options]

Modes:
  sync      Create new objects + update existing (default)
  create    Create new objects only, skip existing
  update    Update existing objects only, skip not found
  schema    Create/sync object types and attributes only

Options:
  --type <name>, -t   Import only this type (repeatable/comma-separated)
  --dry-run           Show what would be imported without hitting JSM API
  --help, -h          Show this help message

Environment:
  JSM_URL             JSM instance URL (default: http://localhost:8080)
  JSM_USER            Admin username (required)
  JSM_PASSWORD        Admin password (required)
  SCHEMA_KEY          Schema key (default: CMDB)
  DATA_DIR            Data directory (default: schema/base/data)
`);
}

const cliOpts = parseCli(process.argv.slice(2));
if (cliOpts.help) { printHelp(); process.exit(0); }

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
let config, api;
const objectTypeIds = {};
let attrConfig = {};
let totalErrors = 0;

// ---------------------------------------------------------------------------
// Schema operations
// ---------------------------------------------------------------------------
async function getOrCreateSchema() {
  const list = await api.get('/objectschema/list');
  const schemas = list.objectschemas || list.values || [];
  const existing = schemas.find(s => s.objectSchemaKey === config.schemaKey);
  if (existing) return existing.id;

  if (!config.createSchema) {
    throw new Error(`Schema "${config.schemaKey}" not found. Set CREATE_SCHEMA=true to create it.`);
  }

  console.log(`  Creating new schema: ${config.schemaName} (${config.schemaKey})`);
  const newSchema = await api.post('/objectschema/create', {
    name: config.schemaName,
    objectSchemaKey: config.schemaKey,
    description: `${config.schemaName} CMDB Schema`
  });
  return newSchema.id;
}

async function cacheTypeIds(schemaId) {
  const raw = await api.get(`/objectschema/${schemaId}/objecttypes/flat`);
  const types = Array.isArray(raw) ? raw : (raw.values || raw.objectTypes || []);
  types.forEach(t => objectTypeIds[t.name] = t.id);
}

let defaultIconId = null;
let defaultRefTypeId = null;

async function resolveDefaultIcon() {
  if (defaultIconId) return defaultIconId;
  try {
    const icons = await api.get('/icon/global');
    const list = Array.isArray(icons) ? icons : (icons.values || []);
    if (list.length > 0) {
      const icon = list[0];
      defaultIconId = String(icon.id);
      console.log(`  Icon: ${icon.name} (ID: ${defaultIconId})`);
      return defaultIconId;
    }
  } catch (_e) { /* fall through */ }
  return '1';
}

async function resolveDefaultRefType() {
  if (defaultRefTypeId) return defaultRefTypeId;
  try {
    const refTypes = await api.get('/config/referencetype');
    const list = Array.isArray(refTypes) ? refTypes : (refTypes.values || []);
    if (list.length > 0) {
      // Prefer "Dependency" or "Link", fall back to the first available
      const preferred = list.find(r => /dependency|link|reference/i.test(r.name));
      defaultRefTypeId = String((preferred || list[0]).id);
      console.log(`  Reference type: ${(preferred || list[0]).name} (ID: ${defaultRefTypeId})`);
      return defaultRefTypeId;
    }
  } catch (_e) { /* fall through */ }
  return '1';
}

async function createObjectType(schemaId, name, parentName = null, iconId = null, description = '') {
  if (objectTypeIds[name]) {
    if (description) {
      try { await api.put(`/objecttype/${objectTypeIds[name]}`, { description }); } catch (_e) { /* non-fatal */ }
    }
    console.log(`  - Exists: ${name} (icons and settings preserved)`);
    return objectTypeIds[name];
  }

  const payload = { name, objectSchemaId: schemaId };
  // Cloud: global icon IDs from /icon/global cause broken images when assigned via
  // the API. Skip icon assignment and let Cloud use its defaults. Users can customise
  // icons in the UI afterwards; they persist across schema syncs because existing
  // types are never recreated.
  // DC: numeric icon IDs from /icon/global work fine.
  if (!config.isCloud) {
    payload.iconId = iconId || await resolveDefaultIcon();
  }
  if (description) payload.description = description;
  if (parentName && objectTypeIds[parentName]) {
    payload.parentObjectTypeId = objectTypeIds[parentName];
  } else if (parentName && !objectTypeIds[parentName]) {
    console.log(`  ! Warning: Parent "${parentName}" not found for "${name}"`);
  }

  try {
    const res = await api.post('/objecttype/create', payload);
    console.log(`  + Created: ${name} (ID: ${res.id})`);
    objectTypeIds[name] = res.id;
    return res.id;
  } catch (e) {
    const errMsg = e.error?.errorMessages?.join(', ') || e.error?.message || JSON.stringify(e.error) || String(e);
    console.log(`  x Failed to create ${name}: ${errMsg}`);
    return objectTypeIds[name] || null;
  }
}

async function syncStructure(schemaId) {
  console.log('\n--- Syncing Schema Structure ---');
  const structurePath = path.join(config.schemaDir, config.structureFile);
  const structure = loadJsonFile(structurePath);
  if (!structure) { console.log('  No schema-structure.json found'); return; }

  const rootTypes = structure.filter(t => !t.parent);
  const childTypes = structure.filter(t => t.parent);

  console.log(`  Loaded ${structure.length} types`);
  if (config.isCloud) {
    console.log('  Note: Cloud does not support icon assignment via API. Customise icons in the UI; they persist across syncs.');
  }

  console.log('\n  Creating root types...');
  for (const type of rootTypes) {
    await createObjectType(schemaId, type.name, null, type.icon || '1', type.description || '');
  }

  console.log('\n  Creating child types...');
  for (const type of childTypes) {
    await createObjectType(schemaId, type.name, type.parent, type.icon || '1', type.description || '');
  }

  await cacheTypeIds(schemaId);
  console.log(`\n  After sync: ${Object.keys(objectTypeIds).length} total types`);
}

// ---------------------------------------------------------------------------
// Sync attributes
// ---------------------------------------------------------------------------
async function syncAttributes(schemaId) {
  const attrPath = path.join(config.schemaDir, config.attrFile);
  const attrDefs = loadJsonFile(attrPath);
  if (!attrDefs) { console.log('  No schema-attributes.json found'); return; }

  console.log('\n--- Syncing Attributes ---');

  for (const [typeName, attrs] of Object.entries(attrDefs)) {
    const typeId = objectTypeIds[typeName];
    if (!typeId) { console.log(`  Skipping ${typeName} (type not found)`); continue; }

    console.log(`  ${typeName}...`);
    const existingAttrsRaw = await api.get(`/objecttype/${typeId}/attributes`);
    const existingAttrs = Array.isArray(existingAttrsRaw) ? existingAttrsRaw : (existingAttrsRaw.values || existingAttrsRaw.objectTypeAttributes || []);
    const existingByName = {};
    existingAttrs.forEach(a => existingByName[a.name.toLowerCase()] = a);

    let created = 0, updated = 0;
    for (const [attrKey, attrDef] of Object.entries(attrs)) {
      const attrName = mapAttrName(attrKey);
      const existing = existingByName[attrName.toLowerCase()];

      try {
        const typeIdx = attrDef.type || 0;
        const payload = { objectTypeId: typeId, name: attrName, description: attrDef.description || '' };

        if (typeIdx === 1 && attrDef.referenceType) {
          const refTypeId = objectTypeIds[attrDef.referenceType];
          if (refTypeId) {
            payload.type = 1;
            payload.typeValue = refTypeId.toString();
            payload.additionalValue = await resolveDefaultRefType();
          } else {
            console.log(`      ! Ref target "${attrDef.referenceType}" not found, creating as text`);
            payload.type = 0;
            payload.defaultTypeId = 0;
          }
        } else {
          payload.type = 0;
          payload.defaultTypeId = attrDef.defaultTypeId || 0;
        }

        if (existing) {
          const expectedDefaultTypeId = attrDef.defaultTypeId || 0;
          const currentDefaultTypeId = existing.defaultType?.id;
          const currentRefTypeId = String(existing.typeValue || existing.defaultType?.typeValue || '');

          const refMismatch = payload.type === 1 && payload.typeValue && currentRefTypeId !== payload.typeValue;
          const cardMismatch = attrDef.max === -1 && existing.maximumCardinality !== -1;

          if (refMismatch || cardMismatch) {
            await api.del(`/objecttypeattribute/${existing.id}`);
            const created2 = await api.post(`/objecttypeattribute/${typeId}`, payload);
            if (attrDef.max === -1 && created2?.id) {
              const cardPayload = { ...payload, maximumCardinality: -1, minimumCardinality: 0 };
              await api.put(`/objecttypeattribute/${typeId}/${created2.id}`, cardPayload);
            }
            updated++;
          } else if (existing.type !== payload.type ||
              (payload.type === 0 && currentDefaultTypeId !== expectedDefaultTypeId)) {
            await api.put(`/objecttypeattribute/${typeId}/${existing.id}`, payload);
            updated++;
          }
        } else {
          const created2 = await api.post(`/objecttypeattribute/${typeId}`, payload);
          if (attrDef.max === -1 && created2?.id) {
            // Cloud requires the full attribute definition to update cardinality
            const cardPayload = { ...payload, maximumCardinality: -1, minimumCardinality: 0 };
            await api.put(`/objecttypeattribute/${typeId}/${created2.id}`, cardPayload);
          }
          created++;
        }
      } catch (e) {
        console.error(`    ! ${attrName}: ${e.error?.message || JSON.stringify(e.error) || e.status || e}`);
      }
    }

    const parts = [];
    if (created > 0) parts.push(`+${created} created`);
    if (updated > 0) parts.push(`~${updated} updated`);
    if (parts.length > 0) console.log(`    ${parts.join(', ')}`);
  }

  console.log('\n=== Attributes Synced ===');
}

// ---------------------------------------------------------------------------
// Reference resolution
// ---------------------------------------------------------------------------
async function resolveReference(schemaId, targetTypeId, targetName) {
  if (!targetTypeId || !targetName) return null;
  const aql = `objectTypeId = ${targetTypeId} AND Name = "${targetName}"`;
  try {
    let res;
    if (config.isCloud) {
      const qs = querystring.stringify({ qlQuery: aql, page: 1, resultPerPage: 1, includeAttributes: false });
      res = await api.get(`/aql/objects?${qs}`);
    } else {
      const qs = querystring.stringify({ objectSchemaId: schemaId, iql: aql, page: 1, resultPerPage: 1 });
      res = await api.get(`/iql/objects?${qs}`);
    }
    if (res.objectEntries?.[0]) return res.objectEntries[0].id;
  } catch (e) {
    console.error(`    ! Reference lookup failed for "${targetName}": ${JSON.stringify(e.error) || e.status || e}`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Data import
// ---------------------------------------------------------------------------
function resolveDataFile(typeName) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const possibleFiles = [
    `${safeName}.json`,
    `${safeName}s.json`,
    PERSONNEL_TYPES.includes(typeName) ? 'person.json' : ''
  ].filter(Boolean);
  return possibleFiles.find(f => fs.existsSync(path.join(config.dataDir, f))) || null;
}

async function processType(typeName, schemaId, mode) {
  const typeId = objectTypeIds[typeName];
  if (!typeId) return { typeName, status: 'skip', reason: 'type not found in JSM' };

  const dataFile = resolveDataFile(typeName);
  if (!dataFile) return { typeName, status: 'skip', reason: 'no data file' };

  const data = loadDataFile(config.dataDir, dataFile, typeName);
  if (!data.length) return { typeName, status: 'empty', reason: `${dataFile} is empty` };

  console.log(`  Processing ${typeName}...`);
  const errors = await importDataRows(data, typeId, schemaId, typeName, mode);
  totalErrors += errors;
  return { typeName, status: 'processed', count: data.length, errors };
}

async function importDataRows(data, typeId, schemaId, typeName, mode) {
  let added = 0, updated = 0, skipped = 0, errors = 0;
  const attrsDefRaw = await api.get(`/objecttype/${typeId}/attributes`);
  const attrsDef = Array.isArray(attrsDefRaw) ? attrsDefRaw : (attrsDefRaw.values || attrsDefRaw.objectTypeAttributes || []);

  for (const item of data) {
    const name = item.Name || item.name;
    if (!name) continue;

    const existingId = await resolveReference(schemaId, typeId, name);
    if (mode === 'create' && existingId) { skipped++; continue; }
    if (mode === 'update' && !existingId) { skipped++; continue; }

    const attributes = [];
    const nameDef = attrsDef.find(a => a.name === 'Name');
    if (nameDef) {
      attributes.push({ objectTypeAttributeId: nameDef.id, objectAttributeValues: [{ value: name }] });
    }

    for (const [key, val] of Object.entries(item)) {
      if (['id', 'key', 'Key', 'name', 'Name', 'schemaKey', 'objectTypeId', 'objectTypeName'].includes(key)) continue;
      if (val === null || val === undefined) continue;

      const searchName = mapAttrName(key);
      let def = attrsDef.find(a => a.name.toLowerCase() === searchName.toLowerCase());

      if (!def) {
        try {
          const override = attrConfig[typeName]?.[key] || attrConfig[typeName]?.[searchName];
          const typeIdx = override?.type || 0;
          const newAttr = await api.post(`/objecttypeattribute/${typeId}`, {
            objectTypeId: typeId, name: searchName, type: typeIdx, defaultTypeId: typeIdx === 1 ? -1 : 0
          });
          attrsDef.push(newAttr);
          def = newAttr;
        } catch (e) {
          console.error(`    ! Auto-create attr "${searchName}" failed: ${JSON.stringify(e.error) || e.status || e}`);
          continue;
        }
      }

      const values = Array.isArray(val) ? val : (typeof val === 'string' && val.includes(';') && def.type === 1 ? val.split(';').map(s => s.trim()) : [val]);
      const attrValues = [];

      for (let v of values) {
        let finalVal = v;
        if (def.type === 1) {
          const override = attrConfig[typeName]?.[key] || attrConfig[typeName]?.[searchName];
          let targetTypeId = override?.referenceType ? objectTypeIds[override.referenceType] : null;
          if (!targetTypeId) {
            targetTypeId = def.typeValue || def.referenceObjectTypeId
              || (def.defaultType && def.defaultType.typeValue)
              || (def.referenceObjectType && def.referenceObjectType.id)
              || null;
          }
          if (targetTypeId) {
            const refId = await resolveReference(schemaId, targetTypeId, v);
            if (refId) finalVal = refId;
            else continue;
          } else { continue; }
        } else if (def.type === 4) {
          finalVal = (String(v).toLowerCase() === 'true').toString();
        }
        attrValues.push({ value: String(finalVal) });
      }

      if (attrValues.length > 0) {
        attributes.push({ objectTypeAttributeId: def.id, objectAttributeValues: attrValues });
      }
    }

    try {
      if (existingId) { await api.put(`/object/${existingId}`, { attributes }); updated++; }
      else { await api.post(`/object/create`, { objectTypeId: typeId, attributes }); added++; }
    } catch (e) {
      errors++;
      console.error(`    Error: ${name} - ${JSON.stringify(e.error?.errors || e.error || e)}`);
    }
  }

  const parts = [];
  if (added > 0) parts.push(`${added} added`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  if (errors > 0) parts.push(`${C.red}${errors} errors${C.reset}`);
  console.log(`    ${parts.join(', ')}`);
  return errors;
}

// ---------------------------------------------------------------------------
// Dry run
// ---------------------------------------------------------------------------
function dryRunType(typeName) {
  const typeId = objectTypeIds[typeName];
  if (!typeId) { console.log(`  ${typeName} ${C.dim}... SKIP (type not found)${C.reset}`); return { status: 'skip' }; }

  const dataFile = resolveDataFile(typeName);
  if (!dataFile) { console.log(`  ${typeName} ${C.dim}... SKIP (no data file)${C.reset}`); return { status: 'skip' }; }

  const data = loadDataFile(config.dataDir, dataFile, typeName);
  if (!data.length) { console.log(`  ${typeName} ${C.dim}... SKIP (empty)${C.reset}`); return { status: 'empty' }; }

  console.log(`  ${typeName} ... ${C.green}${data.length} records${C.reset} from ${dataFile}`);
  return { status: 'would-import', count: data.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const startTime = Date.now();
  const { mode, types: typeFilter, dryRun } = cliOpts;

  config = loadConfig({ requireSchema: true });
  api = createApiClient(config, { timeout: 30000, maxRetries: 1 });

  console.log('');
  console.log('='.repeat(50));
  console.log(`  CMDB Kit JSM Import - Mode: ${mode.toUpperCase()}${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(50));
  console.log(`  URL:    ${config.jsmUrl}`);
  console.log(`  Schema: ${config.schemaKey}`);

  await resolveWorkspaceId(config, api);

  const attrPath = path.join(config.schemaDir, config.attrFile);
  attrConfig = loadJsonFile(attrPath) || {};

  const schemaId = await getOrCreateSchema();
  console.log(`  Schema ID: ${schemaId}`);

  await cacheTypeIds(schemaId);
  console.log(`  Found ${Object.keys(objectTypeIds).length} object types`);

  let typesToProcess = LOAD_PRIORITY;
  if (typeFilter.length > 0) {
    typesToProcess = LOAD_PRIORITY.filter(t => typeFilter.includes(t));
    if (typesToProcess.length === 0) {
      console.error(`\n${C.red}Error:${C.reset} None of the specified types found in LOAD_PRIORITY`);
      process.exit(2);
    }
    console.log(`  Filtering: ${typesToProcess.length} types`);
  }

  if (mode === 'schema') {
    if (dryRun) {
      const structure = loadJsonFile(path.join(config.schemaDir, config.structureFile));
      const attrDefs = loadJsonFile(path.join(config.schemaDir, config.attrFile));
      console.log(`\n  ${C.yellow}[DRY RUN]${C.reset} Would sync ${(structure || []).length} types and ${Object.keys(attrDefs || {}).length} attribute groups`);
    } else {
      await syncStructure(schemaId);
      console.log('\n=== Schema Structure Synced ===');
      await syncAttributes(schemaId);
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Elapsed: ${elapsed}s`);
    return;
  }

  if (!dryRun) await syncAttributes(schemaId);

  console.log(`\n--- ${dryRun ? 'Dry Run' : 'Importing Data'} ---\n`);

  const results = [];
  if (dryRun) {
    let wouldImport = 0, totalRecords = 0;
    for (const typeName of typesToProcess) {
      const result = dryRunType(typeName);
      results.push({ typeName, ...result });
      if (result.status === 'would-import') { wouldImport++; totalRecords += result.count; }
    }
    console.log(`\n  ${C.yellow}[DRY RUN]${C.reset} ${wouldImport} types with ${totalRecords} total records`);
  } else {
    for (const typeName of typesToProcess) {
      const result = await processType(typeName, schemaId, mode);
      results.push(result);
    }
  }

  const processed = results.filter(r => r.status === 'processed');
  const skipped = results.filter(r => r.status === 'skip');
  const empty = results.filter(r => r.status === 'empty');
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('='.repeat(50));
  console.log(`  Import ${dryRun ? 'Dry Run ' : ''}Complete`);
  console.log('='.repeat(50));
  console.log(`  Types processed:  ${C.green}${processed.length}${C.reset}`);
  if (empty.length > 0) {
    console.log(`  Types empty:      ${C.dim}${empty.length}${C.reset}`);
    empty.forEach(r => console.log(`    - ${r.typeName}: ${r.reason}`));
  }
  if (skipped.length > 0) {
    console.log(`  Types skipped:    ${C.dim}${skipped.length}${C.reset}`);
    skipped.forEach(r => console.log(`    - ${r.typeName}: ${r.reason}`));
  }
  if (totalErrors > 0) console.log(`  Total errors:     ${C.red}${totalErrors}${C.reset}`);
  console.log(`  Elapsed:          ${elapsed}s\n`);

  if (totalErrors > 0) process.exit(1);
}

main().catch(err => {
  if (err.status !== undefined) {
    console.error(`\n${C.red}Fatal error:${C.reset} HTTP ${err.status} on ${err.path}`);
    const detail = typeof err.error === 'string' ? err.error : JSON.stringify(err.error, null, 2);
    if (detail) console.error(`  ${detail}`);
  } else {
    console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  }
  if (err.code === 'ECONNREFUSED' || err.status === 0) {
    console.error('  Could not connect to JSM. Check JSM_URL.');
  }
  process.exit(2);
});
