#!/usr/bin/env node
/**
 * CMDB Kit ServiceNow CI Migration
 *
 * Moves CI records from one table to another when a type's table mapping
 * changes. Updates relationships and cleans up old records.
 *
 * Usage:
 *   node adapters/servicenow/migrate.js [mode] [options]
 *
 * Modes:
 *   migrate   - Move records from old table to new table (default)
 *   cleanup   - Delete records we created on a table
 *
 * Options:
 *   --from <table>       Source table (e.g., cmdb_ci_appl)
 *   --to <table>         Target table (e.g., u_cmdbk_product)
 *   --type <name>        CMDB-Kit type name (e.g., Product)
 *   --dry-run            Show what would happen without making changes
 *   --delete-old         Delete old records after migration
 *   --help, -h           Show help
 *
 * Environment:
 *   SN_INSTANCE           ServiceNow instance URL
 *   SN_USER               Admin username
 *   SN_PASSWORD           Admin password
 *   SN_TABLE_PREFIX       Custom table prefix (default: u_cmdbk)
 *   DATA_DIR              Data directory (default: schema/base/data)
 *   DEBUG                 Set to 'true' for HTTP debug logging
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig, createApiClient, getClassMap,
  loadDataFile, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, C,
} = require('./lib');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseCli(args) {
  const opts = {
    mode: 'migrate',
    from: null,
    to: null,
    type: null,
    dryRun: false,
    deleteOld: false,
    help: false,
  };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--dry-run') { opts.dryRun = true; }
    else if (a === '--delete-old') { opts.deleteOld = true; }
    else if (a === '--from') { i++; opts.from = args[i]; }
    else if (a === '--to') { i++; opts.to = args[i]; }
    else if (a === '--type' || a === '-t') { i++; opts.type = args[i]; }
    else if (a === 'migrate') { opts.mode = 'migrate'; }
    else if (a === 'cleanup') { opts.mode = 'cleanup'; }
    i++;
  }
  return opts;
}

function printHelp() {
  console.log(`
CMDB Kit ServiceNow CI Migration

Moves CI records between tables when a type's table mapping changes.

Usage:
  node adapters/servicenow/migrate.js [mode] [options]

Modes:
  migrate    Move records from --from table to --to table (default)
  cleanup    Delete records we created on --from table

Options:
  --from <table>       Source table
  --to <table>         Target table (required for migrate mode)
  --type <name>        CMDB-Kit type name (required)
  --dry-run            Show plan without making changes
  --delete-old         Delete old records after successful migration
  --help, -h           Show this help

Examples:
  # Dry run: see what would happen moving Product from cmdb_ci_appl to u_cmdbk_product
  node adapters/servicenow/migrate.js --from cmdb_ci_appl --to u_cmdbk_product --type Product --dry-run

  # Migrate for real
  node adapters/servicenow/migrate.js --from cmdb_ci_appl --to u_cmdbk_product --type Product --delete-old

  # Clean up old records only
  node adapters/servicenow/migrate.js cleanup --from cmdb_ci_appl --type Product

Environment:
  SN_INSTANCE, SN_USER, SN_PASSWORD, SN_TABLE_PREFIX, DATA_DIR, DEBUG
`);
}

// ---------------------------------------------------------------------------
// Data file resolution (same as import.js)
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
// Find our records on a table by matching names from local data
// ---------------------------------------------------------------------------
async function findOurRecords(api, table, nameField, localNames) {
  const found = [];
  const allRecords = await api.getAll(`/api/now/table/${table}`, {
    sysparm_fields: `sys_id,${nameField}`,
  });

  for (const rec of allRecords) {
    const name = rec[nameField];
    if (name && localNames.has(name)) {
      found.push({ sys_id: rec.sys_id, name });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Find relationships referencing a set of sys_ids
// ---------------------------------------------------------------------------
async function findRelationships(api, sysIds) {
  const sysIdSet = new Set(sysIds);
  const rels = [];

  // Check as parent
  for (const sysId of sysIds) {
    try {
      const results = await api.getAll('/api/now/table/cmdb_rel_ci', {
        sysparm_query: `parent=${sysId}`,
        sysparm_fields: 'sys_id,parent,child,type',
      });
      for (const r of results) rels.push({ ...r, role: 'parent' });
    } catch (_e) {}
  }

  // Check as child
  for (const sysId of sysIds) {
    try {
      const results = await api.getAll('/api/now/table/cmdb_rel_ci', {
        sysparm_query: `child=${sysId}`,
        sysparm_fields: 'sys_id,parent,child,type',
      });
      for (const r of results) rels.push({ ...r, role: 'child' });
    } catch (_e) {}
  }

  return rels;
}

// ---------------------------------------------------------------------------
// Read record attributes from old table
// ---------------------------------------------------------------------------
async function readRecord(api, table, sysId) {
  try {
    return await api.get(`/api/now/table/${table}/${sysId}`);
  } catch (_e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cleanup mode
// ---------------------------------------------------------------------------
async function runCleanup(api, config, opts) {
  const { from, type, dryRun } = opts;

  console.log(`\n--- Cleanup: ${type} from ${from} ---\n`);

  // Load local data to identify our records
  const dataFile = resolveDataFile(config.dataDir, type);
  if (!dataFile) {
    console.log(`${C.red}No data file found for type ${type}${C.reset}`);
    return;
  }
  const localData = loadDataFile(config.dataDir, dataFile, type);
  const localNames = new Set(localData.map(r => r.Name || r.name).filter(Boolean));
  console.log(`  Local data: ${localNames.size} records in ${dataFile}`);

  // Find our records on the old table
  const nameField = 'name'; // OOTB tables use 'name'
  const ourRecords = await findOurRecords(api, from, nameField, localNames);
  console.log(`  Found on ${from}: ${ourRecords.length} matching records`);

  if (ourRecords.length === 0) {
    console.log(`  Nothing to clean up.`);
    return;
  }

  for (const rec of ourRecords) {
    if (dryRun) {
      console.log(`  ${C.yellow}Would delete:${C.reset} ${rec.name} (${rec.sys_id})`);
    } else {
      // Find and delete relationships first
      const rels = await findRelationships(api, [rec.sys_id]);
      for (const rel of rels) {
        try {
          await api.del(`/api/now/table/cmdb_rel_ci/${rel.sys_id}`);
          console.log(`  ${C.dim}Deleted relationship:${C.reset} ${rel.sys_id}`);
        } catch (_e) {}
      }

      try {
        await api.del(`/api/now/table/${from}/${rec.sys_id}`);
        console.log(`  ${C.green}Deleted:${C.reset} ${rec.name} (${rec.sys_id})`);
      } catch (e) {
        console.log(`  ${C.red}Failed to delete:${C.reset} ${rec.name} - ${e.error?.message || e}`);
      }
    }
  }

  console.log(`\n  ${dryRun ? 'Would delete' : 'Deleted'}: ${ourRecords.length} records`);
}

// ---------------------------------------------------------------------------
// Migrate mode
// ---------------------------------------------------------------------------
async function runMigrate(api, config, opts) {
  const { from, to, type, dryRun, deleteOld } = opts;
  const classMap = getClassMap(config.tablePrefix);
  const mapping = classMap[type];

  if (!mapping) {
    console.log(`${C.red}Type "${type}" not found in class-map${C.reset}`);
    return;
  }

  console.log(`\n--- Migrate: ${type} from ${from} to ${to} ---\n`);

  // Load local data
  const dataFile = resolveDataFile(config.dataDir, type);
  if (!dataFile) {
    console.log(`${C.red}No data file found for type ${type}${C.reset}`);
    return;
  }
  const localData = loadDataFile(config.dataDir, dataFile, type);
  const localNames = new Set(localData.map(r => r.Name || r.name).filter(Boolean));
  console.log(`  Local data: ${localNames.size} records in ${dataFile}`);

  // Find our records on the old table
  const oldNameField = 'name';
  const oldRecords = await findOurRecords(api, from, oldNameField, localNames);
  console.log(`  Found on ${from}: ${oldRecords.length} matching records`);

  if (oldRecords.length === 0) {
    console.log(`  No records to migrate. Run the import to create them on ${to}.`);
    return;
  }

  // Check what already exists on the new table
  const newNameField = mapping.tier === 3 ? 'u_name' : 'name';
  const existingNew = await findOurRecords(api, to, newNameField, localNames);
  const existingNewNames = new Set(existingNew.map(r => r.name));
  console.log(`  Already on ${to}: ${existingNew.length} records`);

  // Build old sys_id to name map
  const oldSysIdToName = {};
  for (const rec of oldRecords) {
    oldSysIdToName[rec.sys_id] = rec.name;
  }

  // Find all relationships referencing old records
  const oldSysIds = oldRecords.map(r => r.sys_id);
  const relationships = await findRelationships(api, oldSysIds);
  console.log(`  Relationships referencing old records: ${relationships.length}`);

  // Phase 1: Create records on new table for any that don't already exist
  console.log(`\n  Phase 1: Create on ${to}`);
  const newSysIdByName = {};

  // Index existing new records
  for (const rec of existingNew) {
    newSysIdByName[rec.name] = rec.sys_id;
  }

  for (const oldRec of oldRecords) {
    if (existingNewNames.has(oldRec.name)) {
      console.log(`  ${C.dim}Already exists:${C.reset} ${oldRec.name}`);
      continue;
    }

    // Read full record from old table
    const fullRecord = await readRecord(api, from, oldRec.sys_id);
    if (!fullRecord) {
      console.log(`  ${C.red}Could not read:${C.reset} ${oldRec.name}`);
      continue;
    }

    // Build payload for new table using the current class-map mapping
    const payload = {};
    const { attrMap, nameField: targetNameField } = mapping;

    // Set name
    const actualNameField = (mapping.tier === 3 && targetNameField === 'name') ? 'u_name' : targetNameField;
    if (!mapping.autoName) {
      payload[actualNameField] = oldRec.name;
    }

    // Copy attributes that exist on both tables
    // Use short_description (inherited from cmdb_ci) as a safe bet
    if (fullRecord.short_description) payload.short_description = fullRecord.short_description;

    // Copy mapped attributes from the old record
    for (const [localKey, attrMapping] of Object.entries(attrMap)) {
      const targetCol = typeof attrMapping === 'string' ? attrMapping : attrMapping.column;
      if (!targetCol) continue;

      // Try to get the value from the old record
      // For OOTB fields inherited from cmdb_ci, the column name is the same
      const oldValue = fullRecord[targetCol];
      if (oldValue && oldValue !== '') {
        // For reference fields, the old record has sys_ids which are still valid
        payload[targetCol] = typeof oldValue === 'object' ? (oldValue.value || oldValue) : oldValue;
      }
    }

    if (dryRun) {
      console.log(`  ${C.yellow}Would create:${C.reset} ${oldRec.name} on ${to}`);
    } else {
      try {
        const result = await api.post(`/api/now/table/${to}`, payload);
        const newSysId = result.sys_id;
        newSysIdByName[oldRec.name] = newSysId;
        console.log(`  ${C.green}Created:${C.reset} ${oldRec.name} (${newSysId})`);
      } catch (e) {
        console.log(`  ${C.red}Failed:${C.reset} ${oldRec.name} - ${e.error?.message || e}`);
      }
    }
  }

  // Phase 2: Update relationships
  if (relationships.length > 0) {
    console.log(`\n  Phase 2: Update relationships`);

    for (const rel of relationships) {
      const parentSysId = typeof rel.parent === 'object' ? rel.parent.value : rel.parent;
      const childSysId = typeof rel.child === 'object' ? rel.child.value : rel.child;
      const typeSysId = typeof rel.type === 'object' ? rel.type.value : rel.type;

      const parentName = oldSysIdToName[parentSysId];
      const childName = oldSysIdToName[childSysId];

      // Determine new sys_ids
      let newParent = parentSysId;
      let newChild = childSysId;

      if (parentName && newSysIdByName[parentName]) {
        newParent = newSysIdByName[parentName];
      }
      if (childName && newSysIdByName[childName]) {
        newChild = newSysIdByName[childName];
      }

      // Only update if at least one side changed
      if (newParent === parentSysId && newChild === childSysId) continue;

      if (dryRun) {
        console.log(`  ${C.yellow}Would recreate relationship:${C.reset} ${parentName || parentSysId} -> ${childName || childSysId}`);
      } else {
        // Create new relationship
        try {
          await api.post('/api/now/table/cmdb_rel_ci', {
            parent: newParent,
            child: newChild,
            type: typeSysId,
          });
          console.log(`  ${C.green}Created relationship:${C.reset} ${parentName || newParent} -> ${childName || newChild}`);
        } catch (e) {
          if (e.status === 409) {
            console.log(`  ${C.dim}Relationship exists:${C.reset} ${parentName || newParent} -> ${childName || newChild}`);
          } else {
            console.log(`  ${C.red}Failed:${C.reset} ${e.error?.message || e}`);
          }
        }

        // Delete old relationship
        try {
          await api.del(`/api/now/table/cmdb_rel_ci/${rel.sys_id}`);
        } catch (_e) {}
      }
    }
  }

  // Phase 3: Delete old records
  if (deleteOld) {
    console.log(`\n  Phase 3: Delete old records from ${from}`);

    for (const oldRec of oldRecords) {
      if (dryRun) {
        console.log(`  ${C.yellow}Would delete:${C.reset} ${oldRec.name} (${oldRec.sys_id})`);
      } else {
        try {
          await api.del(`/api/now/table/${from}/${oldRec.sys_id}`);
          console.log(`  ${C.green}Deleted:${C.reset} ${oldRec.name} from ${from}`);
        } catch (e) {
          console.log(`  ${C.red}Failed to delete:${C.reset} ${oldRec.name} - ${e.error?.message || e}`);
        }
      }
    }
  } else if (!dryRun) {
    console.log(`\n  Old records on ${from} were NOT deleted. Use --delete-old to remove them.`);
  }

  // Summary
  const migrated = oldRecords.length - existingNewNames.size;
  const skipped = existingNewNames.size;
  console.log(`\n  Summary:`);
  console.log(`    ${dryRun ? 'Would migrate' : 'Migrated'}: ${migrated}`);
  console.log(`    Skipped (already on ${to}): ${skipped}`);
  console.log(`    Relationships updated: ${relationships.length}`);
  if (deleteOld) console.log(`    Old records ${dryRun ? 'would be' : ''} deleted: ${oldRecords.length}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseCli(process.argv.slice(2));
  if (opts.help) { printHelp(); process.exit(0); }

  if (!opts.type) {
    console.error(`${C.red}Error:${C.reset} --type is required`);
    process.exit(1);
  }
  if (!opts.from && opts.mode === 'cleanup') {
    console.error(`${C.red}Error:${C.reset} --from is required for cleanup mode`);
    process.exit(1);
  }
  if (opts.mode === 'migrate' && (!opts.from || !opts.to)) {
    console.error(`${C.red}Error:${C.reset} --from and --to are required for migrate mode`);
    process.exit(1);
  }

  const config = loadConfig({ requireAuth: true, requireSchema: false });
  const api = createApiClient(config, { timeout: 30000, maxRetries: 2 });

  const startTime = Date.now();

  console.log('');
  console.log('='.repeat(50));
  console.log(`  CMDB Kit ServiceNow Migration - ${opts.mode.toUpperCase()}${opts.dryRun ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(50));
  console.log(`  Instance: ${config.instanceUrl}`);
  console.log(`  Type:     ${opts.type}`);
  if (opts.from) console.log(`  From:     ${opts.from}`);
  if (opts.to) console.log(`  To:       ${opts.to}`);

  if (opts.mode === 'cleanup') {
    await runCleanup(api, config, opts);
  } else {
    await runMigrate(api, config, opts);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Elapsed: ${elapsed}s\n`);
}

main().catch(err => {
  if (err.status !== undefined) {
    console.error(`\n${C.red}Fatal error:${C.reset} HTTP ${err.status} on ${err.path}`);
    const detail = typeof err.error === 'string' ? err.error : JSON.stringify(err.error, null, 2);
    if (detail) console.error(`  ${detail}`);
  } else {
    console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  }
  process.exit(2);
});
