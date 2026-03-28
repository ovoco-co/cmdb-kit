#!/usr/bin/env node
/**
 * CSV-to-JSON converter for CMDB Kit data files.
 *
 * Converts CSV files (exported from Excel) into the JSON format expected by
 * adapter import scripts. Type is inferred from the filename
 * (server.csv -> "Server") and validated against schema-structure.json.
 *
 * Usage:
 *   node tools/csv-to-json.js <file.csv> [file2.csv ...]
 *   node tools/csv-to-json.js --outdir schema/base/data schema/csv/*.csv
 *   node tools/csv-to-json.js --dry-run schema/csv/server.csv
 *   node tools/csv-to-json.js --strict schema/csv/server.csv
 *
 * Options:
 *   --schema <dir>   Schema directory (default: schema/base)
 *   --outdir <dir>   Output directory (default: same directory as input CSV)
 *   --dry-run        Validate and show summary without writing files
 *   --strict         Fail on columns not found in schema-attributes.json
 *
 * Zero npm dependencies.
 */

const fs = require('fs');
const path = require('path');
const { mapAttrName } = require('./lib/attr-names');
const { PERSONNEL_TYPES, NESTED_TYPES } = require('./lib/constants');

// ── CLI argument parsing ─────────────────────────────────────────────
const args = process.argv.slice(2);
let schemaDir = null;
let outdir = null;
let dryRun = false;
let strict = false;
const domainDirs = [];
const csvFiles = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (args[i] === '--schema' && i + 1 < args.length) {
    schemaDir = args[++i];
  } else if (args[i] === '--domain' && i + 1 < args.length) {
    domainDirs.push(args[++i]);
  } else if (args[i] === '--outdir' && i + 1 < args.length) {
    outdir = args[++i];
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  } else if (args[i] === '--strict') {
    strict = true;
  } else if (args[i].startsWith('-')) {
    console.error(`Unknown option: ${args[i]}`);
    process.exit(1);
  } else {
    csvFiles.push(args[i]);
  }
}

function printHelp() {
  console.log(`
CMDB Kit CSV-to-JSON Converter

Converts CSV files into JSON format for CMDB import.
Type is inferred from filename (server.csv -> "Server").

Usage:
  node tools/csv-to-json.js [options] <file.csv> [file2.csv ...]

Options:
  --schema <dir>   Schema directory (default: schema/core)
  --domain <dir>   Domain directory to merge (repeatable)
  --outdir <dir>   Output directory (default: same directory as input CSV)
  --dry-run        Validate and show summary without writing files
  --strict         Fail on columns not found in schema-attributes.json
  --help, -h       Show this help message
`);
}

if (csvFiles.length === 0) {
  console.error('Usage: node tools/csv-to-json.js [options] <file.csv> [...]');
  process.exit(1);
}

// ── Resolve paths ────────────────────────────────────────────────────
const projectRoot = path.resolve(__dirname, '..');
if (!schemaDir) schemaDir = path.join(projectRoot, 'schema', 'core');
else schemaDir = path.resolve(schemaDir);

const STRUCTURE_PATH = path.join(schemaDir, 'schema-structure.json');
const ATTRIBUTES_PATH = path.join(schemaDir, 'schema-attributes.json');
const DATA_DIR = path.join(schemaDir, 'data');

// ── Load schema ──────────────────────────────────────────────────────
const structure = JSON.parse(fs.readFileSync(STRUCTURE_PATH, 'utf8'));
const attributes = JSON.parse(fs.readFileSync(ATTRIBUTES_PATH, 'utf8'));

// Merge domain schemas
for (const domDir of domainDirs) {
  const resolved = path.resolve(domDir);
  const domAttrs = path.join(resolved, 'schema-attributes.json');
  if (fs.existsSync(domAttrs)) {
    const da = JSON.parse(fs.readFileSync(domAttrs, 'utf8'));
    for (const [typeName, attrs] of Object.entries(da)) {
      if (!attributes[typeName]) attributes[typeName] = attrs;
      else Object.assign(attributes[typeName], attrs);
    }
  }
}

const validTypes = new Set(structure.map(t => t.name));
const fileToType = {};
for (const t of structure) {
  const kebab = t.name.toLowerCase().replace(/ /g, '-');
  fileToType[kebab] = t.name;
}

// ── RFC 4180 CSV parser ──────────────────────────────────────────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (text.endsWith('\n')) text = text.slice(0, -1);

  const rows = [];
  let i = 0;

  while (i <= text.length) {
    const row = [];
    while (true) {
      if (i >= text.length) { row.push(''); break; }
      if (text[i] === '"') {
        let field = '';
        i++;
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else { field += text[i]; i++; }
        }
        row.push(field);
      } else {
        let field = '';
        while (i < text.length && text[i] !== ',' && text[i] !== '\n') { field += text[i]; i++; }
        row.push(field);
      }
      if (i >= text.length) break;
      if (text[i] === ',') { i++; }
      else if (text[i] === '\n') { i++; break; }
    }
    rows.push(row);
    if (i >= text.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
      rows.pop();
      break;
    }
  }
  return rows;
}

// ── Type coercion ────────────────────────────────────────────────────
function coerceValue(value, attrDef) {
  if (value === '' || value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (str === '') return undefined;
  if (!attrDef) return str;

  if (attrDef.type === 1 && attrDef.max === -1) {
    return str.split(';').map(s => s.trim()).filter(Boolean);
  }
  if (attrDef.type === 0 && attrDef.defaultTypeId === 4) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      console.warn(`    Warning: invalid date format "${str}" (expected YYYY-MM-DD)`);
    }
    return str;
  }
  if (attrDef.type === 0 && attrDef.defaultTypeId === 2) {
    const lower = str.toLowerCase();
    if (['yes', 'true', '1', 'y'].includes(lower)) return true;
    if (['no', 'false', '0', 'n'].includes(lower)) return false;
    console.warn(`    Warning: unrecognized boolean "${str}"`);
    return str;
  }
  if (attrDef.type === 0 && attrDef.defaultTypeId === 1) {
    const num = Number(str);
    if (isNaN(num)) { console.warn(`    Warning: non-numeric value "${str}"`); return str; }
    return String(num);
  }
  return str;
}

// ── Helpers ──────────────────────────────────────────────────────────
function isDisplayNameRow(row, headers) {
  let matches = 0, total = 0;
  for (let i = 0; i < headers.length && i < row.length; i++) {
    const header = headers[i], cell = row[i].trim();
    if (!header || !cell) continue;
    total++;
    const expected = header === 'Name' ? 'Name' : mapAttrName(header);
    if (cell === expected) matches++;
  }
  return total > 0 && matches / total > 0.5;
}

function isTypeHintRow(row) {
  let hintCount = 0, total = 0;
  for (const cell of row) {
    const trimmed = cell.trim();
    if (!trimmed) continue;
    total++;
    if (/^(Text|Date|Boolean|Integer|Ref\s*->|Multi-Ref)/i.test(trimmed)) hintCount++;
  }
  return total > 0 && hintCount / total > 0.5;
}

function detectExistingFormat(typeName) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const possibleFiles = [
    path.join(DATA_DIR, `${safeName}.json`),
    path.join(DATA_DIR, `${safeName}s.json`),
  ];
  // Personnel types may be bundled in person.json
  if (PERSONNEL_TYPES.includes(typeName)) {
    possibleFiles.push(path.join(DATA_DIR, 'person.json'));
  }
  for (const f of possibleFiles) {
    if (fs.existsSync(f)) {
      try {
        const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!Array.isArray(raw) && typeof raw === 'object') return 'nested';
        return 'flat';
      } catch (_e) { /* ignore */ }
    }
  }
  return NESTED_TYPES.has(typeName) ? 'nested' : 'flat';
}

// ── Process one CSV file ─────────────────────────────────────────────
function processFile(csvPath) {
  const basename = path.basename(csvPath, '.csv');
  const typeName = fileToType[basename];

  if (!typeName) {
    console.error(`  ERROR: Cannot infer type from filename "${basename}.csv"`);
    return false;
  }

  const typeAttrs = attributes[typeName];
  if (!typeAttrs) {
    console.error(`  ERROR: Type "${typeName}" has no attributes in schema`);
    return false;
  }

  console.log(`\n  ${basename}.csv -> ${typeName}`);

  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(raw);
  if (rows.length < 2) {
    console.error(`    ERROR: CSV has fewer than 2 rows`);
    return false;
  }

  const headers = rows[0];
  let dataStart = 1;

  if (rows.length > 2 && isDisplayNameRow(rows[1], headers)) {
    dataStart = 2;
    if (rows.length > 3 && isTypeHintRow(rows[2])) dataStart = 3;
  }

  const validAttrs = new Set(['Name', ...Object.keys(typeAttrs)]);
  const unknownCols = headers.filter(h => h && !validAttrs.has(h));
  if (unknownCols.length > 0) {
    const msg = `Unknown columns: ${unknownCols.join(', ')}`;
    if (strict) { console.error(`    ERROR (--strict): ${msg}`); return false; }
    console.warn(`    Warning: ${msg}`);
  }

  const objects = [];
  let skipped = 0;

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    const nameIdx = headers.indexOf('Name');
    if (nameIdx < 0 || !row[nameIdx] || row[nameIdx].trim() === '') { skipped++; continue; }

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      const val = c < row.length ? row[c] : '';
      if (key === 'Name') { obj.Name = val.trim(); continue; }
      const attrDef = typeAttrs[key];
      const coerced = coerceValue(val, attrDef);
      if (coerced !== undefined) obj[key] = coerced;
    }
    objects.push(obj);
  }

  console.log(`    ${objects.length} objects converted` + (skipped > 0 ? `, ${skipped} rows skipped` : ''));
  if (objects.length === 0) { console.warn(`    Warning: no data rows found`); return true; }

  const format = detectExistingFormat(typeName);
  const outputDir = outdir || path.dirname(csvPath);
  const outputFile = path.join(outputDir, `${basename}.json`);

  let content;
  if (format === 'nested') {
    content = JSON.stringify({ [typeName]: objects }, null, 2) + '\n';
  } else {
    content = JSON.stringify(objects, null, 2) + '\n';
  }

  if (dryRun) {
    console.log(`    Would write: ${outputFile} (${format} format)`);
  } else {
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputFile, content, 'utf8');
    console.log(`    Wrote: ${outputFile}`);
  }

  return true;
}

// ── Main ─────────────────────────────────────────────────────────────
console.log('CMDB Kit CSV-to-JSON Converter');
if (dryRun) console.log('  (dry-run mode)');
if (strict) console.log('  (strict mode)');

let hasErrors = false;
for (const csvFile of csvFiles) {
  if (!fs.existsSync(csvFile)) {
    console.error(`\n  ERROR: File not found: ${csvFile}`);
    hasErrors = true;
    continue;
  }
  if (!processFile(csvFile)) hasErrors = true;
}

if (hasErrors) { console.log('\nCompleted with errors.'); process.exit(1); }
else { console.log('\nDone.'); }
