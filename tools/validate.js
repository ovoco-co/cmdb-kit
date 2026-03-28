#!/usr/bin/env node
/**
 * CMDB Kit Offline Validation
 *
 * Validates schema structure, attributes, and data files without
 * requiring a live database connection.
 *
 * Checks:
 *   1. Schema structure integrity (parent references, duplicates)
 *   2. Attribute definitions (reference types exist, valid type codes)
 *   3. LOAD_PRIORITY completeness (all leaf types listed)
 *   4. Data file existence for each LOAD_PRIORITY entry
 *   5. Reference value validation (data values match referenced type's records)
 *   6. Undefined field detection (fields not in schema-attributes.json)
 *   7. Null value detection
 *   8. Boolean format validation (true/false, not strings)
 *   9. Date format validation (YYYY-MM-DD)
 *
 * Usage:
 *   node tools/validate.js                          # Validate default schema
 *   node tools/validate.js --schema schema/core               # Validate core schema
 *   node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
 *   node tools/validate.js --schema schema/extended           # Validate extended (legacy)
 */

const fs = require('fs');
const path = require('path');
const { loadJsonFile, loadDataFile, mapAttrName, LOAD_PRIORITY, PERSONNEL_TYPES, C } = require('./lib');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let schemaDir = null;
const domainDirs = [];
let help = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help' || args[i] === '-h') { help = true; }
  else if (args[i] === '--schema' && i + 1 < args.length) { schemaDir = args[++i]; }
  else if (args[i] === '--domain' && i + 1 < args.length) { domainDirs.push(args[++i]); }
}

if (help) {
  console.log(`
CMDB Kit Offline Validation

Validates schema and data files without a live database.

Usage:
  node tools/validate.js [options]

Options:
  --schema <dir>   Schema directory (default: schema/core)
  --domain <dir>   Domain directory to merge (repeatable)
  --help, -h       Show this help message

Examples:
  node tools/validate.js --schema schema/core
  node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
  node tools/validate.js --schema schema/extended
`);
  process.exit(0);
}

// Resolve paths
const projectRoot = path.resolve(__dirname, '..');
if (!schemaDir) schemaDir = path.join(projectRoot, 'schema', 'core');
else schemaDir = path.resolve(schemaDir);

const structurePath = path.join(schemaDir, 'schema-structure.json');
const attributesPath = path.join(schemaDir, 'schema-attributes.json');
const dataDir = path.join(schemaDir, 'data');

// Resolve domain directories (merged on top of base schema)
const resolvedDomains = domainDirs.map(d => path.resolve(d));

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
let errors = 0;
let warnings = 0;

function error(msg) { console.log(`  ${C.red}ERROR${C.reset} ${msg}`); errors++; }
function warn(msg) { console.log(`  ${C.yellow}WARN${C.reset}  ${msg}`); warnings++; }
function ok(msg) { console.log(`  ${C.green}OK${C.reset}    ${msg}`); }

console.log('');
console.log('==================================================');
console.log('  CMDB Kit Validation');
console.log('==================================================');
console.log(`  Schema: ${schemaDir}`);
if (resolvedDomains.length > 0) {
  for (const d of resolvedDomains) console.log(`  Domain: ${d}`);
}
console.log('');

// Step 1: Load and validate schema structure
console.log('--- Schema Structure ---');

const structure = loadJsonFile(structurePath);
if (!structure) {
  error(`Cannot load ${structurePath}`);
  process.exit(1);
}

// Merge domain structures
const domainDataDirs = [];
for (const domDir of resolvedDomains) {
  const domStructure = loadJsonFile(path.join(domDir, 'schema-structure.json'));
  if (domStructure) {
    for (const t of domStructure) {
      if (!structure.find(s => s.name === t.name)) structure.push(t);
    }
  }
  const domAttrsPath = path.join(domDir, 'schema-attributes.json');
  domainDataDirs.push(path.join(domDir, 'data'));
  // Domain attributes merged in step 2 below
}

const typeNames = new Set();
const typeSet = new Set();
const duplicates = [];

for (const t of structure) {
  if (typeSet.has(t.name)) {
    duplicates.push(t.name);
  }
  typeSet.add(t.name);
  typeNames.add(t.name);
}

if (duplicates.length > 0) {
  error(`Duplicate type names: ${duplicates.join(', ')}`);
} else {
  ok(`${structure.length} types, no duplicates`);
}

// Check parent references
const missingParents = structure
  .filter(t => t.parent && !typeNames.has(t.parent))
  .map(t => `${t.name} -> ${t.parent}`);

if (missingParents.length > 0) {
  error(`Missing parent types: ${missingParents.join(', ')}`);
} else {
  ok('All parent references valid');
}

// Check description length (JSM constraint: max 70 chars)
const longDescs = structure.filter(t => t.description && t.description.length > 70);
if (longDescs.length > 0) {
  for (const t of longDescs) {
    warn(`Description too long (${t.description.length} chars): ${t.name}`);
  }
} else {
  ok('All descriptions within 70-char limit');
}

// Step 2: Validate attributes
console.log('\n--- Attributes ---');

const attributes = loadJsonFile(attributesPath);
if (!attributes) {
  error(`Cannot load ${attributesPath}`);
  process.exit(1);
}

// Merge domain attributes
for (const domDir of resolvedDomains) {
  const domAttrs = loadJsonFile(path.join(domDir, 'schema-attributes.json'));
  if (domAttrs) {
    for (const [typeName, attrs] of Object.entries(domAttrs)) {
      if (!attributes[typeName]) attributes[typeName] = attrs;
      else Object.assign(attributes[typeName], attrs);
    }
  }
}

// Check that all attribute types reference valid types
let refErrors = 0;
for (const [typeName, attrs] of Object.entries(attributes)) {
  if (!typeNames.has(typeName)) {
    warn(`Attributes defined for unknown type: ${typeName}`);
  }
  for (const [attrKey, attrDef] of Object.entries(attrs)) {
    if (attrDef.type === 1 && attrDef.referenceType) {
      if (!typeNames.has(attrDef.referenceType)) {
        error(`${typeName}.${attrKey} references non-existent type: ${attrDef.referenceType}`);
        refErrors++;
      }
    }
  }
}

if (refErrors === 0) {
  ok('All reference types exist in schema-structure.json');
}

ok(`${Object.keys(attributes).length} types with attribute definitions`);

// Step 3: LOAD_PRIORITY completeness
console.log('\n--- LOAD_PRIORITY ---');

// Leaf types: types with attributes (not container-only)
const leafTypes = structure
  .filter(t => attributes[t.name])
  .map(t => t.name);

const prioritySet = new Set(LOAD_PRIORITY);
const missingFromPriority = leafTypes.filter(t => !prioritySet.has(t));
const extraInPriority = LOAD_PRIORITY.filter(t => !typeNames.has(t));

if (missingFromPriority.length > 0) {
  for (const t of missingFromPriority) {
    warn(`Leaf type not in LOAD_PRIORITY: ${t}`);
  }
} else {
  ok('All leaf types covered by LOAD_PRIORITY');
}

// extraInPriority types are silently ignored. LOAD_PRIORITY includes
// all types across all tiers; types not in the current schema are
// expected and do not warrant warnings.

// Step 4: Data file existence
console.log('\n--- Data Files ---');

let missingFiles = 0;
let emptyFiles = 0;

const typesInSchema = LOAD_PRIORITY.filter(t => typeNames.has(t));
for (const typeName of typesInSchema) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const possibleFiles = [
    `${safeName}.json`,
    `${safeName}s.json`,
  ];
  if (PERSONNEL_TYPES.includes(typeName)) {
    possibleFiles.push('person.json');
  }

  let foundDir = null;
  let found = possibleFiles.find(f => fs.existsSync(path.join(dataDir, f)));
  if (found) { foundDir = dataDir; }
  else {
    for (const dd of domainDataDirs) {
      found = possibleFiles.find(f => fs.existsSync(path.join(dd, f)));
      if (found) { foundDir = dd; break; }
    }
  }
  if (!found) {
    warn(`No data file for: ${typeName}`);
    missingFiles++;
    continue;
  }

  const data = loadDataFile(foundDir, found, typeName);
  if (data.length === 0) {
    // Empty files are OK for types not yet populated
  }
}

if (missingFiles === 0) {
  ok(`Data files exist for all ${typesInSchema.length} types in this schema`);
}

// Step 5: Reference value validation
console.log('\n--- Reference Values ---');

let refValueErrors = 0;

// Build a cache of all records by type name
const recordCache = {};
for (const typeName of typesInSchema) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const possibleFiles = [`${safeName}.json`, `${safeName}s.json`];
  if (PERSONNEL_TYPES.includes(typeName)) possibleFiles.push('person.json');

  let cacheDir = null;
  let cacheFile = possibleFiles.find(f => fs.existsSync(path.join(dataDir, f)));
  if (cacheFile) { cacheDir = dataDir; }
  else {
    for (const dd of domainDataDirs) {
      cacheFile = possibleFiles.find(f => fs.existsSync(path.join(dd, f)));
      if (cacheFile) { cacheDir = dd; break; }
    }
  }
  if (cacheFile && cacheDir) {
    recordCache[typeName] = loadDataFile(cacheDir, cacheFile, typeName);
  }
}

for (const typeName of typesInSchema) {
  const typeAttrs = attributes[typeName];
  if (!typeAttrs) continue;

  const records = recordCache[typeName] || [];
  if (records.length === 0) continue;

  for (const [attrKey, attrDef] of Object.entries(typeAttrs)) {
    if (attrDef.type !== 1 || !attrDef.referenceType) continue;

    const refRecords = recordCache[attrDef.referenceType];
    if (!refRecords || refRecords.length === 0) continue;

    const validNames = new Set(refRecords.map(r => r.Name || r.name).filter(Boolean));

    for (const record of records) {
      let val = record[attrKey];
      if (val === null || val === undefined) continue;

      // Multi-ref: semicolon-separated
      const values = typeof val === 'string' && attrDef.max === -1
        ? val.split(';').map(s => s.trim())
        : [val];

      for (const v of values) {
        if (!validNames.has(v)) {
          error(`${typeName}."${record.Name}".${attrKey}: "${v}" not found in ${attrDef.referenceType}`);
          refValueErrors++;
        }
      }
    }
  }
}

if (refValueErrors === 0) {
  ok('All reference values match records in referenced types');
}

// Step 6: Undefined field detection
console.log('\n--- Undefined Fields ---');

let undefinedFields = 0;
const META_FIELDS = new Set(['Name', 'name', 'description']);

for (const typeName of typesInSchema) {
  const typeAttrs = attributes[typeName];
  if (!typeAttrs) continue;

  const records = recordCache[typeName] || [];
  const validKeys = new Set([...Object.keys(typeAttrs), ...META_FIELDS]);

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!validKeys.has(key)) {
        warn(`${typeName}."${record.Name}": undefined field "${key}"`);
        undefinedFields++;
      }
    }
  }
}

if (undefinedFields === 0) {
  ok('No undefined fields found in data files');
}

// Step 7: Null value detection
console.log('\n--- Null Values ---');

let nullValues = 0;
for (const typeName of typesInSchema) {
  const records = recordCache[typeName] || [];
  for (const record of records) {
    for (const [key, val] of Object.entries(record)) {
      if (val === null) {
        warn(`${typeName}."${record.Name}".${key}: null value (omit field instead)`);
        nullValues++;
      }
    }
  }
}

if (nullValues === 0) {
  ok('No null values found');
}

// Step 8: Boolean format validation
console.log('\n--- Boolean Format ---');

let boolErrors = 0;
for (const typeName of typesInSchema) {
  const typeAttrs = attributes[typeName];
  if (!typeAttrs) continue;

  const records = recordCache[typeName] || [];
  for (const [attrKey, attrDef] of Object.entries(typeAttrs)) {
    if (attrDef.type !== 0 || attrDef.defaultTypeId !== 2) continue;

    for (const record of records) {
      const val = record[attrKey];
      if (val === undefined || val === null) continue;
      if (val !== true && val !== false) {
        warn(`${typeName}."${record.Name}".${attrKey}: boolean should be true/false, got ${JSON.stringify(val)}`);
        boolErrors++;
      }
    }
  }
}

if (boolErrors === 0) {
  ok('All boolean values use true/false');
}

// Step 9: Date format validation
console.log('\n--- Date Format ---');

let dateErrors = 0;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
for (const typeName of typesInSchema) {
  const typeAttrs = attributes[typeName];
  if (!typeAttrs) continue;

  const records = recordCache[typeName] || [];
  for (const [attrKey, attrDef] of Object.entries(typeAttrs)) {
    if (attrDef.type !== 0 || attrDef.defaultTypeId !== 4) continue;

    for (const record of records) {
      const val = record[attrKey];
      if (val === undefined || val === null) continue;
      if (!dateRegex.test(String(val))) {
        warn(`${typeName}."${record.Name}".${attrKey}: date should be YYYY-MM-DD, got "${val}"`);
        dateErrors++;
      }
    }
  }
}

if (dateErrors === 0) {
  ok('All date values use YYYY-MM-DD format');
}

// Summary
console.log('');
console.log('==================================================');
console.log('  Validation Summary');
console.log('==================================================');
console.log(`  Errors:   ${errors > 0 ? C.red + errors + C.reset : C.green + '0' + C.reset}`);
console.log(`  Warnings: ${warnings > 0 ? C.yellow + warnings + C.reset : C.green + '0' + C.reset}`);
console.log('');

const result = errors === 0
  ? `${C.green}PASS${C.reset}`
  : `${C.red}FAIL${C.reset}`;
console.log(`  Result: ${result}`);
console.log('');

process.exit(errors > 0 ? 1 : 0);
