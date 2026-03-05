#!/usr/bin/env node
/**
 * CMDB Kit ServiceNow Schema Check
 *
 * Compares local schema definition files against a live ServiceNow instance.
 * Reports differences without making changes.
 *
 * Checks:
 *   - Custom tables exist (tier 2 and 3)
 *   - OOTB tables exist (tier 1)
 *   - Custom columns (u_*) exist on their target tables
 *   - Column types match expected internal_type
 *
 * Usage:
 *   node adapters/servicenow/check-schema.js [options]
 *
 * Options:
 *   --type <name>, -t   Check only this type (repeatable/comma-separated)
 *   --verbose, -v       Show matching items too (not just differences)
 *   --help, -h          Show this help message
 *
 * Environment:
 *   SN_INSTANCE         ServiceNow instance URL
 *   SN_USER             Admin username (required)
 *   SN_PASSWORD         Admin password (required)
 *   SN_TABLE_PREFIX     Custom table prefix (default: u_cmdbk)
 *   SCHEMA_DIR          Schema directory
 *   DEBUG               Set to 'true' for HTTP debug logging
 */

const path = require('path');
const {
  loadConfig, createApiClient, getClassMap,
  loadJsonFile, mapAttrName, C,
} = require('./lib');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseCli(args) {
  const opts = { types: [], verbose: false, help: false };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--verbose' || a === '-v') { opts.verbose = true; }
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
CMDB Kit ServiceNow Schema Check

Compares local schema definitions against a live ServiceNow instance.
Reports differences without making changes.

Usage:
  node adapters/servicenow/check-schema.js [options]

Options:
  --type <name>, -t   Check only this type (repeatable/comma-separated)
  --verbose, -v       Show matching items too (not just differences)
  --help, -h          Show this help message

Environment:
  SN_INSTANCE         ServiceNow instance URL
  SN_USER             Admin username
  SN_PASSWORD         Admin password
  SN_TABLE_PREFIX     Custom table prefix (default: u_cmdbk)
  SCHEMA_DIR          Schema directory
  DEBUG               Set to 'true' for HTTP debug logging
`);
}

// ---------------------------------------------------------------------------
// Table and column checks
// ---------------------------------------------------------------------------

async function tableExists(api, tableName) {
  try {
    const result = await api.get('/api/now/table/sys_db_object', {
      sysparm_query: `name=${tableName}`,
      sysparm_fields: 'sys_id,name,label,super_class',
      sysparm_limit: 1,
    });
    const records = Array.isArray(result) ? result : [];
    return records.length > 0 ? records[0] : null;
  } catch (_err) {
    return null;
  }
}

async function getColumns(api, tableName) {
  try {
    const result = await api.get('/api/now/table/sys_dictionary', {
      sysparm_query: `name=${tableName}^elementISNOTEMPTY`,
      sysparm_fields: 'element,internal_type,column_label',
    });
    return Array.isArray(result) ? result : [];
  } catch (_err) {
    return [];
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) { printHelp(); process.exit(0); }

  const config = loadConfig({ requireAuth: true, requireSchema: true });
  const api = createApiClient(config, { timeout: 30000, maxRetries: 2 });
  const classMap = getClassMap(config.tablePrefix);

  console.log('');
  console.log('='.repeat(50));
  console.log('  CMDB Kit ServiceNow Schema Check');
  console.log('='.repeat(50));
  console.log(`  Instance: ${config.instanceUrl}`);
  console.log(`  Prefix:   ${config.tablePrefix}`);

  // Load local schema
  const structurePath = path.join(config.schemaDir, config.structureFile);
  const attrPath = path.join(config.schemaDir, config.attrFile);
  const localStructure = loadJsonFile(structurePath);
  const localAttrs = loadJsonFile(attrPath);

  if (!localStructure) {
    console.error(`\n${C.red}Error:${C.reset} Could not load ${structurePath}`);
    process.exit(2);
  }
  if (!localAttrs) {
    console.error(`\n${C.red}Error:${C.reset} Could not load ${attrPath}`);
    process.exit(2);
  }

  console.log(`  Local types:      ${localStructure.length}`);
  console.log(`  Local attributes: ${Object.keys(localAttrs).length} type definitions`);

  // Check tables
  console.log('\n--- Table Check ---\n');

  let tablesOk = 0, tablesMissing = 0, tablesSkipped = 0;

  for (const typeDef of localStructure) {
    if (options.types.length > 0 && !options.types.includes(typeDef.name)) continue;

    const mapping = classMap[typeDef.name];
    if (!mapping || !mapping.table) {
      if (options.verbose) console.log(`  ${C.dim}${typeDef.name}${C.reset} ... container (no table)`);
      tablesSkipped++;
      continue;
    }

    const existing = await tableExists(api, mapping.table);
    if (existing) {
      if (options.verbose) console.log(`  ${C.green}OK${C.reset}      ${typeDef.name} -> ${mapping.table}`);
      tablesOk++;
    } else {
      console.log(`  ${C.red}MISSING${C.reset} ${typeDef.name} -> ${mapping.table}`);
      tablesMissing++;
    }
  }

  // Check columns
  console.log('\n--- Column Check ---\n');

  let columnsOk = 0, columnsMissing = 0, columnsMismatch = 0;

  for (const [typeName, attrs] of Object.entries(localAttrs)) {
    if (options.types.length > 0 && !options.types.includes(typeName)) continue;

    const mapping = classMap[typeName];
    if (!mapping || !mapping.table) continue;

    // Get remote columns for this table
    const remoteColumns = await getColumns(api, mapping.table);
    const remoteByName = {};
    for (const col of remoteColumns) {
      if (col.element) remoteByName[col.element] = col;
    }

    let typeIssues = 0;
    const issues = [];

    for (const [attrKey, attrDef] of Object.entries(attrs)) {
      const attrMapping = mapping.attrMap[attrKey];
      if (!attrMapping) continue;

      const column = typeof attrMapping === 'string' ? attrMapping : attrMapping.column;
      if (!column) continue;

      // Only check custom columns for existence
      if (!column.startsWith('u_')) {
        if (options.verbose) {
          const remoteCol = remoteByName[column];
          if (remoteCol) {
            issues.push(`    ${C.green}OK${C.reset}       ${column} (OOTB)`);
            columnsOk++;
          }
        }
        continue;
      }

      const remoteCol = remoteByName[column];
      if (!remoteCol) {
        issues.push(`    ${C.red}MISSING${C.reset}  ${column} (expected: ${snInternalType(attrDef)})`);
        columnsMissing++;
        typeIssues++;
      } else {
        const expectedType = snInternalType(attrDef);
        const actualType = remoteCol.internal_type;
        if (actualType && actualType !== expectedType) {
          issues.push(`    ${C.yellow}MISMATCH${C.reset} ${column}: expected ${expectedType}, got ${actualType}`);
          columnsMismatch++;
          typeIssues++;
        } else {
          columnsOk++;
          if (options.verbose) issues.push(`    ${C.green}OK${C.reset}       ${column}`);
        }
      }
    }

    if (typeIssues > 0 || options.verbose) {
      const statusLabel = typeIssues > 0
        ? `${C.yellow}${typeIssues} issues${C.reset}`
        : `${C.green}OK${C.reset}`;
      console.log(`  ${typeName} (${mapping.table}) ... ${statusLabel}`);
      for (const line of issues) console.log(line);
    } else {
      console.log(`  ${typeName} ... ${C.green}OK${C.reset}`);
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(50));
  console.log('  Schema Check Summary');
  console.log('='.repeat(50));
  console.log('');
  console.log('  Tables:');
  console.log(`    Present:    ${C.green}${tablesOk}${C.reset}`);
  if (tablesMissing > 0) console.log(`    Missing:    ${C.red}${tablesMissing}${C.reset}`);
  if (tablesSkipped > 0) console.log(`    Skipped:    ${C.dim}${tablesSkipped}${C.reset}`);
  console.log('');
  console.log('  Columns:');
  console.log(`    Matching:   ${C.green}${columnsOk}${C.reset}`);
  if (columnsMissing > 0) console.log(`    Missing:    ${C.red}${columnsMissing}${C.reset}`);
  if (columnsMismatch > 0) console.log(`    Mismatch:   ${C.yellow}${columnsMismatch}${C.reset}`);
  console.log('');

  const totalIssues = tablesMissing + columnsMissing + columnsMismatch;
  const overall = totalIssues === 0
    ? `${C.green}ALIGNED${C.reset}`
    : `${C.yellow}${totalIssues} issues found${C.reset}`;
  console.log(`  Result: ${overall}\n`);

  process.exit(totalIssues > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('  Could not connect to ServiceNow. Check SN_INSTANCE.');
  }
  process.exit(2);
});
