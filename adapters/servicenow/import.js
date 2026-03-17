#!/usr/bin/env node
/**
 * CMDB Kit ServiceNow Import
 *
 * Imports schema structure, attributes, and data into ServiceNow CMDB.
 *
 * Modes:
 *   sync   - Create new records + Update existing (default)
 *   create - Create new records only, skip existing
 *   update - Update existing records only, skip not found
 *   schema - Create custom tables and columns only
 *
 * Usage:
 *   node adapters/servicenow/import.js [mode] [options]
 *
 * Options:
 *   --type <name>, -t     Import only this type (repeatable/comma-separated)
 *   --dry-run             Show what would be imported without making changes
 *   --report-only         Generate a report for manual creation (locked-down instances)
 *   --skip-users          Skip Person/sys_user records (for LDAP/SSO environments)
 *   --test-connection     Test ServiceNow connectivity and exit
 *   --help, -h            Show help
 *
 * Environment:
 *   SN_INSTANCE           ServiceNow instance URL (e.g., https://dev12345.service-now.com)
 *   SN_USER               Admin username (required)
 *   SN_PASSWORD            Admin password (required)
 *   SN_TABLE_PREFIX        Custom table prefix (default: u_cmdbk)
 *   SN_LOOKUP_STRATEGY     Lookup handling: table or hybrid (default: table)
 *   SN_BATCH_SIZE          Records per pagination batch (default: 200)
 *   SN_REQUEST_DELAY       Delay between API calls in ms (default: 0)
 *   DATA_DIR               Data directory (default: schema/base/data)
 *   SCHEMA_DIR             Schema directory
 *   DEBUG                  Set to 'true' for HTTP debug logging
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig, createApiClient, getClassMap, getMapping, resolveMultiRef, resolveSysId,
  loadJsonFile, loadDataFile, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, C,
} = require('./lib');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const VALID_MODES = ['sync', 'create', 'update', 'schema'];

function parseCli(args) {
  const opts = { mode: 'sync', types: [], dryRun: false, reportOnly: false, skipUsers: false, testConnection: false, help: false };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--dry-run') { opts.dryRun = true; }
    else if (a === '--report-only') { opts.reportOnly = true; }
    else if (a === '--skip-users') { opts.skipUsers = true; }
    else if (a === '--test-connection') { opts.testConnection = true; }
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
CMDB Kit ServiceNow Import

Imports schema structure, attributes, and data into ServiceNow CMDB.

Usage:
  node adapters/servicenow/import.js [mode] [options]

Modes:
  sync      Create new records + update existing (default)
  create    Create new records only, skip existing
  update    Update existing records only, skip not found
  schema    Create/sync custom tables and columns only

Options:
  --type <name>, -t     Import only this type (repeatable/comma-separated)
  --dry-run             Show what would be imported without hitting SN API
  --report-only         Generate a report for manual creation
  --skip-users          Skip Person/sys_user records
  --test-connection     Test connectivity and exit
  --help, -h            Show this help message

Environment:
  SN_INSTANCE           ServiceNow instance URL
  SN_USER               Admin username
  SN_PASSWORD           Admin password
  SN_TABLE_PREFIX       Custom table prefix (default: u_cmdbk)
  SN_LOOKUP_STRATEGY    table or hybrid (default: table)
  SN_BATCH_SIZE         Records per pagination batch (default: 200)
  SN_REQUEST_DELAY      Delay between API calls in ms (default: 0)
  DATA_DIR              Data directory (default: schema/base/data)
  SCHEMA_DIR            Schema directory
  DEBUG                 Set to 'true' for HTTP debug logging
`);
}

const cliOpts = parseCli(process.argv.slice(2));
if (cliOpts.help) { printHelp(); process.exit(0); }

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
let config, api, classMap;
const sysIdCache = {}; // { table: { name: sys_id } }
let totalErrors = 0;

// ---------------------------------------------------------------------------
// Schema operations: table and column creation
// ---------------------------------------------------------------------------

async function tableExists(tableName) {
  try {
    const result = await api.get('/api/now/table/sys_db_object', {
      sysparm_query: `name=${tableName}`,
      sysparm_fields: 'sys_id,name,label',
      sysparm_limit: 1,
    });
    const records = Array.isArray(result) ? result : [];
    return records.length > 0 ? records[0] : null;
  } catch (_err) {
    return null;
  }
}

async function createTable(tableName, label, superClass = null) {
  const payload = {
    name: tableName,
    label: label,
    is_extendable: 'true',
    create_access_controls: 'true',
  };
  if (superClass) {
    // Zurich+ requires super_class to be a sys_id, not a table name.
    // Look up the sys_id from sys_db_object.
    const superRecord = await tableExists(superClass);
    if (superRecord) {
      payload.super_class = superRecord.sys_id;
    } else {
      payload.super_class = superClass; // Fall back to name for older releases
    }
  }

  try {
    const result = await api.post('/api/now/table/sys_db_object', payload);
    return result;
  } catch (err) {
    if (err.status === 403) {
      console.log(`    ${C.yellow}Permission denied creating table ${tableName}.${C.reset}`);
      console.log(`    Ensure the admin role has the glide.rest.create_metadata property enabled.`);
      return null;
    }
    throw err;
  }
}

async function columnExists(tableName, columnName) {
  try {
    const result = await api.get('/api/now/table/sys_dictionary', {
      sysparm_query: `name=${tableName}^element=${columnName}`,
      sysparm_fields: 'sys_id,element,internal_type',
      sysparm_limit: 1,
    });
    const records = Array.isArray(result) ? result : [];
    return records.length > 0 ? records[0] : null;
  } catch (_err) {
    return null;
  }
}

/**
 * Check if a column is inherited from a parent table in the CI hierarchy.
 * Zurich+ rejects creating columns that already exist via inheritance.
 */
async function columnExistsInHierarchy(columnName) {
  try {
    const result = await api.get('/api/now/table/sys_dictionary', {
      sysparm_query: `element=${columnName}`,
      sysparm_fields: 'sys_id,name,element',
      sysparm_limit: 1,
    });
    const records = Array.isArray(result) ? result : [];
    return records.length > 0;
  } catch (_err) {
    return false;
  }
}

function snInternalType(attrDef) {
  if (!attrDef) return 'string';
  if (attrDef.type === 1) {
    if (attrDef.max === -1) return 'glide_list';
    return 'reference';
  }
  const dtid = attrDef.defaultTypeId || 0;
  if (dtid === 4) return 'glide_date';
  if (dtid === 1) return 'integer';
  if (dtid === 2) return 'boolean';
  return 'string';
}

async function createColumn(tableName, columnName, label, internalType, refTable = null) {
  const payload = {
    name: tableName,
    element: columnName,
    column_label: label,
    internal_type: internalType,
    max_length: internalType === 'string' ? '255' : '',
  };
  if (internalType === 'reference' && refTable) {
    payload.reference = refTable;
  }

  try {
    await api.post('/api/now/table/sys_dictionary', payload);
    return true;
  } catch (err) {
    if (err.status === 403) {
      // Zurich+ business rules can reject column creation on recently-created
      // CI class tables. Retry once after a delay.
      try {
        await new Promise(r => setTimeout(r, 3000));
        await api.post('/api/now/table/sys_dictionary', payload);
        return true;
      } catch (retryErr) {
        if (retryErr.status === 403) {
          console.log(`    ${C.yellow}Permission denied creating column ${columnName} on ${tableName}${C.reset}`);
          return false;
        }
        throw retryErr;
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Identification rule management for CMDB Instance API
// ---------------------------------------------------------------------------

/**
 * Ensure an independent identification rule exists for a custom CI class.
 * The IRE uses these rules to match incoming records against existing CIs
 * and deduplicate automatically.
 */
async function ensureIdentificationRule(tableName, label, attributes) {
  // Check if a rule already exists for this table
  try {
    const existing = await api.get('/api/now/table/cmdb_identifier', {
      sysparm_query: `applies_to=${tableName}^active=true`,
      sysparm_fields: 'sys_id,name',
      sysparm_limit: 1,
    });
    if (existing.length > 0) {
      if (!cliOpts.dryRun) {
        console.log(`  ${C.dim}Identification rule exists:${C.reset} ${label}`);
      }
      return;
    }
  } catch (_e) {}

  if (cliOpts.dryRun || cliOpts.reportOnly) {
    console.log(`  ${C.yellow}Would create identification rule:${C.reset} ${label} (${attributes.join(', ')})`);
    return;
  }

  try {
    // Create the identifier
    const rule = await api.post('/api/now/table/cmdb_identifier', {
      name: `${label} Rule`,
      applies_to: tableName,
      independent: 'true',
      active: 'true',
    });
    console.log(`  ${C.green}+ Identification rule:${C.reset} ${label} Rule`);

    // Create the identifier entry with matching attributes
    await api.post('/api/now/table/cmdb_identifier_entry', {
      identifier: rule.sys_id,
      table: tableName,
      attributes: attributes.join(','),
      active: 'true',
      order: '100',
    });
    console.log(`  ${C.green}+ Identifier entry:${C.reset} match by ${attributes.join(', ')}`);

    // Wait for the IRE to pick up the new rule
    await new Promise(r => setTimeout(r, 5000));
  } catch (err) {
    console.log(`  ${C.yellow}Could not create identification rule for ${label}:${C.reset} ${err.error?.message || err}`);
  }
}

async function syncSchema() {
  console.log('\n--- Syncing Schema (Tables and Columns) ---');

  const structurePath = path.join(config.schemaDir, config.structureFile);
  const structure = loadJsonFile(structurePath);
  if (!structure) { console.log('  No schema-structure.json found'); return; }

  const attrPath = path.join(config.schemaDir, config.attrFile);
  const attrDefs = loadJsonFile(attrPath) || {};

  let tablesCreated = 0, tablesExist = 0, columnsCreated = 0, columnsExist = 0;

  // Process each type that has a table mapping
  for (const typeDef of structure) {
    const mapping = classMap[typeDef.name];
    if (!mapping || !mapping.table) continue;

    const { table, tier, superClass } = mapping;

    // Only create tables for tier 2 and 3 (custom tables)
    if (tier >= 2) {
      const existing = await tableExists(table);
      if (existing) {
        console.log(`  ${C.dim}Table exists:${C.reset} ${table} (${typeDef.name})`);
        tablesExist++;
      } else if (cliOpts.dryRun || cliOpts.reportOnly) {
        console.log(`  ${C.yellow}Would create:${C.reset} ${table} (${typeDef.name})${superClass ? ` extends ${superClass}` : ''}`);
      } else {
        console.log(`  ${C.green}Creating:${C.reset} ${table} (${typeDef.name})`);
        await createTable(table, typeDef.name, superClass || null);
        // ServiceNow needs time to commit new tables before accepting columns,
        // especially for CI class extensions. Wait briefly to avoid 403 errors.
        await new Promise(r => setTimeout(r, 2000));
        // Tier 3 standalone tables don't inherit a name column from cmdb_ci.
        // Create one explicitly so records can be looked up by name.
        // Note: ServiceNow auto-prefixes columns with u_ on global-scope tables,
        // so we create u_name directly.
        if (!superClass) {
          const nameExists = await columnExists(table, 'u_name');
          if (!nameExists) {
            await createColumn(table, 'u_name', 'Name', 'string');
          }
        }
        tablesCreated++;
      }

      // Create identification rule for Tier 2 CI classes that use the CMDB Instance API
      if (mapping.cmdbApi && mapping.identificationAttributes && mapping.superClass) {
        await ensureIdentificationRule(table, typeDef.name, mapping.identificationAttributes);
      }
    } else if (tier === 1) {
      const existing = await tableExists(table);
      if (existing) {
        console.log(`  ${C.dim}OOTB table:${C.reset} ${table} (${typeDef.name})`);
        tablesExist++;
      } else {
        console.log(`  ${C.red}OOTB table missing:${C.reset} ${table} (${typeDef.name})`);
      }
    }

    // Sync columns for this type
    const typeAttrs = attrDefs[typeDef.name];
    if (!typeAttrs) continue;

    for (const [attrKey, attrDef] of Object.entries(typeAttrs)) {
      const attrMapping = mapping.attrMap[attrKey];
      if (!attrMapping) continue;

      // Determine the SN column name
      let columnName, refTable = null;
      if (typeof attrMapping === 'string') {
        columnName = attrMapping;
      } else if (typeof attrMapping === 'object') {
        columnName = attrMapping.column;
        refTable = attrMapping.ref || null;
      } else {
        continue;
      }

      // If schema says this is a reference but class-map has no ref,
      // resolve the target table from the schema's referenceType.
      // Zurich+ requires reference columns to specify their target table.
      if (!refTable && attrDef.type === 1 && attrDef.referenceType) {
        const refMapping = classMap[attrDef.referenceType];
        if (refMapping && refMapping.table) {
          refTable = refMapping.table;
        }
      }

      // Only create u_ columns (custom); skip OOTB columns
      if (!columnName.startsWith('u_')) continue;

      const existing = await columnExists(table, columnName);
      // For CI class extensions, also check if the column is inherited from a parent class
      const inherited = !existing && mapping.superClass
        ? await columnExistsInHierarchy(columnName)
        : false;
      if (existing || inherited) {
        columnsExist++;
      } else if (cliOpts.dryRun || cliOpts.reportOnly) {
        const internalType = snInternalType(attrDef);
        console.log(`    ${C.yellow}Would add column:${C.reset} ${table}.${columnName} (${internalType})`);
      } else {
        const internalType = snInternalType(attrDef);
        const label = mapAttrName(attrKey);
        const created = await createColumn(table, columnName, label, internalType, refTable);
        if (created) {
          columnsCreated++;
          console.log(`    ${C.green}+ Column:${C.reset} ${table}.${columnName} (${internalType})`);
        }
      }
    }
  }

  console.log(`\n  Tables: ${tablesCreated} created, ${tablesExist} existing`);
  console.log(`  Columns: ${columnsCreated} created, ${columnsExist} existing`);
  console.log('\n=== Schema Sync Complete ===');
}

// ---------------------------------------------------------------------------
// Report-only mode: generate creation instructions
// ---------------------------------------------------------------------------

function generateReport() {
  console.log('\n--- Schema Creation Report ---');
  console.log('  Use this report to manually create tables and columns in ServiceNow.\n');

  const attrPath = path.join(config.schemaDir, config.attrFile);
  const attrDefs = loadJsonFile(attrPath) || {};

  for (const [typeName, mapping] of Object.entries(classMap)) {
    if (!mapping.table || mapping.container) continue;
    if (mapping.tier < 2) continue; // Only report custom tables

    console.log(`  Table: ${mapping.table}`);
    console.log(`    Label: ${typeName}`);
    if (mapping.superClass) console.log(`    Extends: ${mapping.superClass}`);

    const typeAttrs = attrDefs[typeName];
    if (typeAttrs) {
      for (const [attrKey, attrDef] of Object.entries(typeAttrs)) {
        const attrMapping = mapping.attrMap[attrKey];
        if (!attrMapping) continue;
        const columnName = typeof attrMapping === 'string' ? attrMapping : attrMapping.column;
        if (!columnName.startsWith('u_')) continue;
        const internalType = snInternalType(attrDef);
        console.log(`      ${columnName}: ${internalType}`);
      }
    }
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Data file resolution
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

// ---------------------------------------------------------------------------
// Build name -> sys_id cache for a table
// ---------------------------------------------------------------------------

async function cacheSysIds(table, nameField = 'name', mapping = null) {
  if (sysIdCache[table]) return;
  sysIdCache[table] = {};

  // Tier 3 standalone custom tables use u_name instead of name
  const actualField = (mapping && mapping.tier === 3 && nameField === 'name') ? 'u_name' : nameField;

  try {
    const records = await api.getAll(`/api/now/table/${table}`, {
      sysparm_fields: `sys_id,${actualField}`,
    });
    for (const rec of records) {
      const name = rec[actualField];
      if (name) sysIdCache[table][name] = rec.sys_id;
    }
  } catch (_err) {
    // Table might not exist yet
  }
}

// ---------------------------------------------------------------------------
// Data transforms: convert human-readable values to ServiceNow-native formats
// ---------------------------------------------------------------------------

/**
 * Parse RAM string like "32 GB" or "16 GB" to integer megabytes.
 * ServiceNow stores ram as an integer in MB.
 * Returns { ram: number } or {} if unparseable.
 */
function parseRam(val) {
  const str = String(val).trim();
  const match = str.match(/^([\d.]+)\s*(TB|GB|MB|KB)?/i);
  if (!match) return {};
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'MB').toUpperCase();
  let mb;
  if (unit === 'TB') mb = Math.round(num * 1024 * 1024);
  else if (unit === 'GB') mb = Math.round(num * 1024);
  else if (unit === 'MB') mb = Math.round(num);
  else if (unit === 'KB') mb = Math.round(num / 1024);
  else mb = Math.round(num);
  return { ram: String(mb) };
}

/**
 * Parse disk space string like "500 GB SSD" or "2 TB NVMe" to decimal GB.
 * ServiceNow stores disk_space as a decimal in GB. Unit suffixes (SSD, NVMe, HDD) are dropped.
 * Returns { disk_space: string } or {} if unparseable.
 */
function parseDiskSpace(val) {
  const str = String(val).trim();
  const match = str.match(/^([\d.]+)\s*(TB|GB|MB)?/i);
  if (!match) return {};
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'GB').toUpperCase();
  let gb;
  if (unit === 'TB') gb = num * 1024;
  else if (unit === 'GB') gb = num;
  else if (unit === 'MB') gb = num / 1024;
  else gb = num;
  return { disk_space: String(gb) };
}

/**
 * Split OS string like "Ubuntu 22.04 LTS" into os and os_version.
 * Strategy: first word is the OS name, remainder is the version string.
 * Returns { os: string, os_version: string }.
 */
function splitOs(val) {
  const str = String(val).trim();
  if (!str) return {};
  const spaceIdx = str.indexOf(' ');
  if (spaceIdx === -1) return { os: str };
  return {
    os: str.substring(0, spaceIdx),
    os_version: str.substring(spaceIdx + 1),
  };
}

/**
 * Split CPU string like "8 vCPU" or "16 vCPU" into cpu_count and cpu_name.
 * Returns { cpu_count: string, cpu_name: string }.
 */
function splitCpu(val) {
  const str = String(val).trim();
  if (!str) return {};
  const match = str.match(/^(\d+)\s*(.*)$/);
  if (!match) return { cpu_name: str };
  const result = { cpu_count: match[1] };
  if (match[2]) result.cpu_name = match[2].trim();
  return result;
}

/**
 * Registry of named data transforms. Each function takes a raw value and
 * returns an object of { snColumnName: transformedValue } pairs.
 * A single input field can produce multiple SN columns (e.g., os -> os + os_version).
 */
const DATA_TRANSFORMS = {
  parseRam,
  parseDiskSpace,
  splitOs,
  splitCpu,
};

// ---------------------------------------------------------------------------
// Data import
// ---------------------------------------------------------------------------

async function buildPayload(item, mapping, typeName) {
  const payload = {};
  const { attrMap, nameField } = mapping;
  const name = item.Name || item.name;

  // Set the name field.
  // Tier 3 standalone custom tables have their name column as u_name
  // (ServiceNow auto-prefixes columns on global-scope custom tables).
  if (nameField && !mapping.autoName) {
    const actualNameField = (mapping.tier === 3 && nameField === 'name') ? 'u_name' : nameField;
    payload[actualNameField] = name;
  }

  // Set vendor flag for Vendor type mapped to core_company
  if (mapping.vendorFlag) {
    payload.vendor = 'true';
  }

  for (const [key, val] of Object.entries(item)) {
    if (['id', 'key', 'Key', 'name', 'Name'].includes(key)) continue;
    if (val === null || val === undefined) continue;

    const attrMapping = attrMap[key];
    if (!attrMapping) continue;

    if (typeof attrMapping === 'string') {
      // Direct value mapping
      payload[attrMapping] = String(val);
    } else if (typeof attrMapping === 'object') {
      const { column, ref, transform, multi } = attrMapping;

      if (transform && typeof transform === 'string' && DATA_TRANSFORMS[transform]) {
        // Named data transform (e.g., splitOs, parseRam) - may produce multiple fields
        const transformed = DATA_TRANSFORMS[transform](val);
        for (const [snCol, snVal] of Object.entries(transformed)) {
          payload[snCol] = String(snVal);
        }
      } else if (transform && typeof transform === 'object') {
        // Value lookup transformation (e.g., install_status map)
        payload[column] = transform[String(val)] || String(val);
      } else if (multi && ref) {
        // Multi-reference: resolve to glide_list
        const resolved = await resolveMultiRef(val, ref, sysIdCache, api);
        if (resolved) payload[column] = resolved;
      } else if (ref) {
        // Single reference: resolve to sys_id
        const sysId = await resolveSysId(String(val), ref, sysIdCache, api);
        if (sysId) payload[column] = sysId;
      } else {
        payload[column] = String(val);
      }
    }
  }

  return payload;
}

async function processType(typeName, mode) {
  const mapping = classMap[typeName];
  if (!mapping || !mapping.table || mapping.container) {
    return { typeName, status: 'skip', reason: 'no table mapping' };
  }

  if (cliOpts.skipUsers && mapping.skipOnFlag === 'skipUsers') {
    return { typeName, status: 'skip', reason: '--skip-users' };
  }

  const dataFile = resolveDataFile(typeName);
  if (!dataFile) return { typeName, status: 'skip', reason: 'no data file' };

  const data = loadDataFile(config.dataDir, dataFile, typeName);
  if (!data.length) return { typeName, status: 'empty', reason: `${dataFile} is empty` };

  console.log(`  Processing ${typeName} (${mapping.table})...`);

  // Ensure sys_id cache is populated for target table and reference tables
  await cacheSysIds(mapping.table, mapping.nameField, mapping);

  const { table, nameField } = mapping;
  let added = 0, updated = 0, skipped = 0, errors = 0;

  for (const item of data) {
    const name = item.Name || item.name;
    if (!name) continue;

    // Check existence
    const existingSysId = sysIdCache[table]?.[name] || null;

    if (mode === 'create' && existingSysId) { skipped++; continue; }
    if (mode === 'update' && !existingSysId) { skipped++; continue; }

    try {
      const payload = await buildPayload(item, mapping, typeName);

      if (mapping.cmdbApi) {
        // CMDB Instance API: IRE handles create vs update automatically
        payload.discovery_source = config.discoverySource;
        const result = await api.cmdbInstance(table, payload, config.discoverySource);
        const sysId = result.attributes?.sys_id || result.sys_id;
        if (sysId) {
          if (!sysIdCache[table]) sysIdCache[table] = {};
          const isNew = !sysIdCache[table][name];
          sysIdCache[table][name] = sysId;
          if (isNew) added++;
          else updated++;
        } else {
          added++; // Assume created if no sys_id in response
        }
      } else if (existingSysId) {
        await api.put(`/api/now/table/${table}/${existingSysId}`, payload);
        updated++;
      } else {
        const result = await api.post(`/api/now/table/${table}`, payload);
        // Cache the new sys_id
        if (result && result.sys_id) {
          if (!sysIdCache[table]) sysIdCache[table] = {};
          sysIdCache[table][name] = result.sys_id;
        }
        added++;
      }
    } catch (err) {
      errors++;
      const detail = err.error?.message || err.error?.detail || JSON.stringify(err.error) || String(err);
      console.error(`    Error: ${name} - ${detail}`);
    }
  }

  const parts = [];
  if (added > 0) parts.push(`${added} added`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  if (errors > 0) parts.push(`${C.red}${errors} errors${C.reset}`);
  console.log(`    ${parts.join(', ')}`);

  totalErrors += errors;
  return { typeName, status: 'processed', count: data.length, errors };
}

// ---------------------------------------------------------------------------
// Dry run
// ---------------------------------------------------------------------------

function dryRunType(typeName) {
  const mapping = classMap[typeName];
  if (!mapping || !mapping.table || mapping.container) {
    console.log(`  ${typeName} ${C.dim}... SKIP (no table mapping)${C.reset}`);
    return { status: 'skip' };
  }

  if (cliOpts.skipUsers && mapping.skipOnFlag === 'skipUsers') {
    console.log(`  ${typeName} ${C.dim}... SKIP (--skip-users)${C.reset}`);
    return { status: 'skip' };
  }

  const dataFile = resolveDataFile(typeName);
  if (!dataFile) {
    console.log(`  ${typeName} ${C.dim}... SKIP (no data file)${C.reset}`);
    return { status: 'skip' };
  }

  const data = loadDataFile(config.dataDir, dataFile, typeName);
  if (!data.length) {
    console.log(`  ${typeName} ${C.dim}... SKIP (empty)${C.reset}`);
    return { status: 'empty' };
  }

  console.log(`  ${typeName} -> ${mapping.table} ... ${C.green}${data.length} records${C.reset} from ${dataFile}`);
  return { status: 'would-import', count: data.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();
  const { mode, types: typeFilter, dryRun, reportOnly, testConnection: testConn } = cliOpts;

  config = loadConfig({ requireAuth: true, requireSchema: true });
  api = createApiClient(config, { timeout: 30000, maxRetries: 2 });
  classMap = getClassMap(config.tablePrefix);

  // Test connection mode
  if (testConn) {
    console.log(`\n  Testing connection to ${config.instanceUrl}...`);
    const result = await api.testConnection();
    if (result.ok) {
      console.log(`  ${C.green}Connection successful${C.reset}`);
    } else {
      console.log(`  ${C.red}Connection failed${C.reset}`);
      const detail = result.error?.error?.message || result.error?.status || JSON.stringify(result.error);
      console.log(`  ${detail}`);
      process.exit(1);
    }
    return;
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`  CMDB Kit ServiceNow Import - Mode: ${mode.toUpperCase()}${dryRun ? ' (DRY RUN)' : ''}${reportOnly ? ' (REPORT ONLY)' : ''}`);
  console.log('='.repeat(50));
  console.log(`  Instance: ${config.instanceUrl}`);
  console.log(`  Prefix:   ${config.tablePrefix}`);
  console.log(`  Lookups:  ${config.lookupStrategy}`);

  // Determine types to process
  let typesToProcess = LOAD_PRIORITY;
  if (typeFilter.length > 0) {
    typesToProcess = LOAD_PRIORITY.filter(t => typeFilter.includes(t));
    if (typesToProcess.length === 0) {
      console.error(`\n${C.red}Error:${C.reset} None of the specified types found in LOAD_PRIORITY`);
      process.exit(2);
    }
    console.log(`  Filtering: ${typesToProcess.length} types`);
  }

  // Schema mode
  if (mode === 'schema') {
    if (reportOnly) {
      generateReport();
    } else {
      await syncSchema();
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Elapsed: ${elapsed}s`);
    return;
  }

  // Data import
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
      const result = await processType(typeName, mode);
      results.push(result);
    }
  }

  // Summary
  const processed = results.filter(r => r.status === 'processed');
  const skippedResults = results.filter(r => r.status === 'skip');
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
  if (skippedResults.length > 0) {
    console.log(`  Types skipped:    ${C.dim}${skippedResults.length}${C.reset}`);
    skippedResults.forEach(r => console.log(`    - ${r.typeName}: ${r.reason}`));
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
    console.error('  Could not connect to ServiceNow. Check SN_INSTANCE.');
  }
  process.exit(2);
});
