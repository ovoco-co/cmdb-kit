#!/usr/bin/env node
/**
 * CMDB Kit JSM Schema Check
 *
 * Compares local schema definition files against live JSM Assets.
 * Reports differences without making changes.
 *
 * Checks:
 *   - Object types in schema-structure.json vs live JSM types
 *   - Attributes in schema-attributes.json vs live attribute definitions
 *   - Parent/child hierarchy alignment
 *   - Attribute type mismatches (text, reference, date, boolean, integer)
 *   - Missing or extra reference targets
 *
 * Usage:
 *   node adapters/jsm/check-schema.js [options]
 *
 * Options:
 *   --type <name>, -t   Check only this type (repeatable/comma-separated)
 *   --verbose, -v        Show matching items too (not just differences)
 *   --help, -h           Show this help message
 *
 * Environment:
 *   JSM_URL              JSM instance URL (default: http://localhost:8080)
 *   JSM_USER             Admin username (required)
 *   JSM_PASSWORD         Admin password (required)
 *   SCHEMA_KEY           Schema key (default: CMDB)
 *   DEBUG                Set to 'true' for HTTP debug logging
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, createApiClient, resolveWorkspaceId, loadJsonFile, mapAttrName, C } = require('./lib');

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
CMDB Kit JSM Schema Check

Compares local schema definition files against live JSM Assets.
Reports differences without making changes.

Usage:
  node adapters/jsm/check-schema.js [options]

Options:
  --type <name>, -t   Check only this type (repeatable/comma-separated)
  --verbose, -v       Show matching items too (not just differences)
  --help, -h          Show this help message

Environment:
  JSM_URL             JSM instance URL (default: http://localhost:8080)
  JSM_USER            Admin username (required)
  JSM_PASSWORD        Admin password (required)
  SCHEMA_KEY          Schema key (default: CMDB)
  DEBUG               Set to 'true' for HTTP debug logging

Examples:
  # Check entire schema
  node adapters/jsm/check-schema.js

  # Check a single type
  node adapters/jsm/check-schema.js --type "Application"

  # Verbose output (show matching items)
  node adapters/jsm/check-schema.js --verbose
`);
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function resolveSchemaId(api, schemaKey) {
  const schemas = await api.get('/objectschema/list');
  const list = schemas.objectschemas || schemas;
  if (!Array.isArray(list)) throw new Error('Unexpected response from /objectschema/list');
  const schema = list.find(s => s.objectSchemaKey === schemaKey);
  if (!schema) {
    const available = list.map(s => `${s.objectSchemaKey} (${s.name})`).join(', ');
    throw new Error(`Schema key "${schemaKey}" not found. Available: ${available}`);
  }
  return schema.id;
}

async function fetchObjectTypes(api, schemaId) {
  const types = await api.get(`/objectschema/${schemaId}/objecttypes/flat`);
  return Array.isArray(types) ? types : [];
}

async function fetchTypeAttributes(api, typeId) {
  const attrs = await api.get(`/objecttype/${typeId}/attributes`);
  return Array.isArray(attrs) ? attrs : [];
}

// ---------------------------------------------------------------------------
// Attribute type description helpers
// ---------------------------------------------------------------------------

/**
 * Describe the expected local attribute type in human-readable form.
 */
function describeLocalAttrType(attrDef) {
  if (attrDef.type === 1 && attrDef.referenceType) {
    const card = attrDef.max === -1 ? ', multi' : '';
    return `Reference -> ${attrDef.referenceType}${card}`;
  }
  const dtid = attrDef.defaultTypeId || 0;
  if (dtid === 4) return 'Date';
  if (dtid === 2) return 'Boolean';
  if (dtid === 1) return 'Integer';
  return 'Text';
}

/**
 * Describe a live JSM attribute type in human-readable form.
 */
function describeRemoteAttrType(attr, typeNameMap) {
  if (attr.type === 1) {
    const targetId = attr.typeValue || (attr.defaultType && attr.defaultType.typeValue) || '';
    const targetName = typeNameMap[String(targetId)] || `ID:${targetId}`;
    const card = attr.maximumCardinality === -1 ? ', multi' : '';
    return `Reference -> ${targetName}${card}`;
  }
  const dtid = attr.defaultType ? attr.defaultType.id : 0;
  if (dtid === 4) return 'Date';
  if (dtid === 2) return 'Boolean';
  if (dtid === 1) return 'Integer';
  return 'Text';
}

/**
 * Check if local and remote attribute types are compatible.
 */
function attrTypesMatch(localDef, remoteAttr, typeIdToName) {
  const localType = localDef.type || 0;
  const remoteType = remoteAttr.type;

  // Type mismatch (text vs reference)
  if (localType !== remoteType) return false;

  if (localType === 1 && localDef.referenceType) {
    // Check reference target
    const remoteTargetId = remoteAttr.typeValue || (remoteAttr.defaultType && remoteAttr.defaultType.typeValue) || '';
    const remoteTargetName = typeIdToName[String(remoteTargetId)] || '';
    if (remoteTargetName !== localDef.referenceType) return false;

    // Check cardinality
    const localMulti = localDef.max === -1;
    const remoteMulti = remoteAttr.maximumCardinality === -1;
    if (localMulti !== remoteMulti) return false;
  }

  if (localType === 0) {
    // Check defaultTypeId for text subtypes
    const localDtid = localDef.defaultTypeId || 0;
    const remoteDtid = remoteAttr.defaultType ? remoteAttr.defaultType.id : 0;
    if (localDtid !== remoteDtid) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main check logic
// ---------------------------------------------------------------------------

async function checkStructure(localStructure, remoteTypes, options) {
  console.log('\n--- Object Type Structure ---\n');

  const localTypeNames = new Set(localStructure.map(t => t.name));
  const remoteTypeNames = new Set(remoteTypes.map(t => t.name));

  // Build parent maps
  const remoteIdToName = {};
  const remoteTypeMap = {};
  for (const t of remoteTypes) {
    remoteIdToName[t.id] = t.name;
    remoteTypeMap[t.name] = t;
  }

  let missingCount = 0, extraCount = 0, parentMismatch = 0, matchCount = 0;

  // Check for missing types (in local, not in JSM)
  for (const localType of localStructure) {
    if (options.types.length > 0 && !options.types.includes(localType.name)) continue;

    if (!remoteTypeNames.has(localType.name)) {
      console.log(`  ${C.red}MISSING${C.reset} ${localType.name} (in local, not in JSM)`);
      missingCount++;
    } else {
      // Check parent alignment
      const remoteType = remoteTypeMap[localType.name];
      const remoteParentName = remoteType.parentObjectTypeId
        ? remoteIdToName[remoteType.parentObjectTypeId] || null
        : null;
      const localParent = localType.parent || null;

      if (localParent !== remoteParentName) {
        console.log(`  ${C.yellow}PARENT${C.reset}  ${localType.name}: local="${localParent || '(root)'}" remote="${remoteParentName || '(root)'}"`);
        parentMismatch++;
      } else if (options.verbose) {
        console.log(`  ${C.green}OK${C.reset}      ${localType.name}`);
        matchCount++;
      } else {
        matchCount++;
      }
    }
  }

  // Check for extra types (in JSM, not in local)
  if (options.types.length === 0) {
    for (const remoteType of remoteTypes) {
      if (!localTypeNames.has(remoteType.name)) {
        console.log(`  ${C.yellow}EXTRA${C.reset}   ${remoteType.name} (in JSM, not in local)`);
        extraCount++;
      }
    }
  }

  return { matchCount, missingCount, extraCount, parentMismatch };
}

async function checkAttributes(localAttrs, remoteTypes, api, options) {
  console.log('\n--- Attributes ---\n');

  // Build type ID and name maps
  const typeNameToId = {};
  const typeIdToName = {};
  for (const t of remoteTypes) {
    typeNameToId[t.name] = t.id;
    typeIdToName[String(t.id)] = t.name;
  }

  let totalMatch = 0, totalMissing = 0, totalExtra = 0, totalMismatch = 0, totalSkipped = 0;

  for (const [typeName, attrs] of Object.entries(localAttrs)) {
    if (options.types.length > 0 && !options.types.includes(typeName)) continue;

    const typeId = typeNameToId[typeName];
    if (!typeId) {
      console.log(`  ${C.dim}${typeName}${C.reset} ... ${C.red}SKIP${C.reset} (type not found in JSM)`);
      totalSkipped++;
      continue;
    }

    // Fetch remote attributes for this type
    const remoteAttrs = await fetchTypeAttributes(api, typeId);
    const remoteByName = {};
    for (const a of remoteAttrs) {
      remoteByName[a.name.toLowerCase()] = a;
    }

    let typeMatch = 0, typeMissing = 0, typeExtra = 0, typeMismatch = 0;
    const issues = [];

    // Check local attrs against remote
    for (const [attrKey, attrDef] of Object.entries(attrs)) {
      const displayName = mapAttrName(attrKey);
      const remoteAttr = remoteByName[displayName.toLowerCase()];

      if (!remoteAttr) {
        issues.push(`    ${C.red}MISSING${C.reset} ${displayName} (${describeLocalAttrType(attrDef)})`);
        typeMissing++;
      } else if (!attrTypesMatch(attrDef, remoteAttr, typeIdToName)) {
        issues.push(`    ${C.yellow}MISMATCH${C.reset} ${displayName}: local=${describeLocalAttrType(attrDef)} remote=${describeRemoteAttrType(remoteAttr, typeIdToName)}`);
        typeMismatch++;
      } else {
        typeMatch++;
        if (options.verbose) {
          issues.push(`    ${C.green}OK${C.reset}       ${displayName}`);
        }
      }
    }

    // Check remote attrs not in local (excluding built-in Name/Key/Created/Updated)
    const builtIn = new Set(['name', 'key', 'created', 'updated']);
    const localDisplayNames = new Set(
      Object.keys(attrs).map(k => mapAttrName(k).toLowerCase())
    );
    for (const remoteAttr of remoteAttrs) {
      if (builtIn.has(remoteAttr.name.toLowerCase())) continue;
      if (!localDisplayNames.has(remoteAttr.name.toLowerCase())) {
        issues.push(`    ${C.yellow}EXTRA${C.reset}    ${remoteAttr.name} (${describeRemoteAttrType(remoteAttr, typeIdToName)})`);
        typeExtra++;
      }
    }

    // Print type summary
    const hasIssues = typeMissing > 0 || typeExtra > 0 || typeMismatch > 0;
    if (hasIssues || options.verbose) {
      const statusLabel = hasIssues
        ? `${C.yellow}${typeMissing + typeMismatch + typeExtra} issues${C.reset}`
        : `${C.green}${typeMatch} OK${C.reset}`;
      console.log(`  ${typeName} ... ${statusLabel}`);
      for (const line of issues) console.log(line);
    } else {
      console.log(`  ${typeName} ... ${C.green}${typeMatch} OK${C.reset}`);
    }

    totalMatch += typeMatch;
    totalMissing += typeMissing;
    totalExtra += typeExtra;
    totalMismatch += typeMismatch;
  }

  return { totalMatch, totalMissing, totalExtra, totalMismatch, totalSkipped };
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
  console.log('  CMDB Kit JSM Schema Check');
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

  // Load local schema files
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

  console.log(`  Local structure: ${localStructure.length} types`);
  console.log(`  Local attributes: ${Object.keys(localAttrs).length} type definitions`);

  // Fetch remote types
  let remoteTypes;
  try {
    remoteTypes = await fetchObjectTypes(api, schemaId);
  } catch (err) {
    console.error(`\n${C.red}Error:${C.reset} Could not fetch object types: ${err.error || err.message || err}`);
    process.exit(2);
  }
  console.log(`  Remote types: ${remoteTypes.length}`);

  // Check structure
  const structureResult = await checkStructure(localStructure, remoteTypes, options);

  // Check attributes
  const attrResult = await checkAttributes(localAttrs, remoteTypes, api, options);

  // Summary
  console.log('');
  console.log('==================================================');
  console.log('  Schema Check Summary');
  console.log('==================================================');
  console.log('');

  console.log('  Object Types:');
  console.log(`    Matching:         ${C.green}${structureResult.matchCount}${C.reset}`);
  if (structureResult.missingCount > 0) console.log(`    Missing in JSM:   ${C.red}${structureResult.missingCount}${C.reset}`);
  if (structureResult.extraCount > 0)   console.log(`    Extra in JSM:     ${C.yellow}${structureResult.extraCount}${C.reset}`);
  if (structureResult.parentMismatch > 0) console.log(`    Parent mismatch:  ${C.yellow}${structureResult.parentMismatch}${C.reset}`);

  console.log('');
  console.log('  Attributes:');
  console.log(`    Matching:         ${C.green}${attrResult.totalMatch}${C.reset}`);
  if (attrResult.totalMissing > 0)  console.log(`    Missing in JSM:   ${C.red}${attrResult.totalMissing}${C.reset}`);
  if (attrResult.totalExtra > 0)    console.log(`    Extra in JSM:     ${C.yellow}${attrResult.totalExtra}${C.reset}`);
  if (attrResult.totalMismatch > 0) console.log(`    Type mismatch:    ${C.yellow}${attrResult.totalMismatch}${C.reset}`);
  if (attrResult.totalSkipped > 0)  console.log(`    Types skipped:    ${C.dim}${attrResult.totalSkipped}${C.reset}`);

  console.log('');

  const totalIssues = structureResult.missingCount + structureResult.parentMismatch +
    attrResult.totalMissing + attrResult.totalMismatch;
  const overall = totalIssues === 0
    ? `${C.green}ALIGNED${C.reset}`
    : `${C.yellow}${totalIssues} issues found${C.reset}`;
  console.log(`  Result: ${overall}`);
  console.log('');

  process.exit(totalIssues > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset} ${err.message || err}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('  Could not connect to JSM. Check JSM_URL and ensure the server is running.');
  }
  process.exit(2);
});
