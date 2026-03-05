#!/usr/bin/env node
/**
 * Template Generator for CMDB Kit data files (CSV or XLSX).
 *
 * Generates CSV or XLSX templates that users can open in Excel, fill with
 * data, and convert to JSON via csv-to-json.js.
 *
 * Usage:
 *   node tools/generate-templates.js                              # All types (CSV)
 *   node tools/generate-templates.js --examples                   # Include sample row
 *   node tools/generate-templates.js --format xlsx --examples     # XLSX workbook
 *   node tools/generate-templates.js --family directory           # Directory types only
 *   node tools/generate-templates.js --role tech-lead             # Engineering types
 *   node tools/generate-templates.js --role cm-analyst            # Library/release types
 *   node tools/generate-templates.js "Server" "Database"          # Specific types
 *
 * Options:
 *   --schema <dir>                             Schema directory (default: schema/base)
 *   --format csv|xlsx                          Output format (default: csv)
 *   --family cmdb|library|directory|lookups|all  Filter by schema branch
 *   --role tech-lead|cm-analyst|all            Filter by user role
 *   --examples                                 Add sample data row from existing JSON
 *   --outdir <dir>                             Output directory (default: csv-templates)
 *
 * CSV mode has zero npm dependencies. XLSX mode requires exceljs.
 */

const fs = require('fs');
const path = require('path');
const { mapAttrName } = require('./lib/attr-names');
const { PERSONNEL_TYPES } = require('./lib/constants');

// ── CLI argument parsing ─────────────────────────────────────────────
const args = process.argv.slice(2);
let schemaDir = null;
let family = 'all';
let role = 'all';
let format = 'csv';
let examples = false;
let outdir = null;
const specificTypes = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--schema' && i + 1 < args.length) {
    schemaDir = args[++i];
  } else if (args[i] === '--family' && i + 1 < args.length) {
    family = args[++i].toLowerCase();
  } else if (args[i] === '--role' && i + 1 < args.length) {
    role = args[++i].toLowerCase();
  } else if (args[i] === '--format' && i + 1 < args.length) {
    format = args[++i].toLowerCase();
  } else if (args[i] === '--examples') {
    examples = true;
  } else if (args[i] === '--outdir' && i + 1 < args.length) {
    outdir = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (args[i].startsWith('-')) {
    console.error(`Unknown option: ${args[i]}`);
    process.exit(1);
  } else {
    specificTypes.push(args[i]);
  }
}

const VALID_FAMILIES = ['cmdb', 'library', 'directory', 'lookups', 'all'];
if (!VALID_FAMILIES.includes(family)) {
  console.error(`Invalid family: ${family}. Valid: ${VALID_FAMILIES.join(', ')}`);
  process.exit(1);
}

const VALID_ROLES = ['tech-lead', 'cm-analyst', 'all'];
if (!VALID_ROLES.includes(role)) {
  console.error(`Invalid role: ${role}. Valid: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

function printHelp() {
  console.log(`
CMDB Kit Template Generator

Generates CSV or XLSX templates for data entry.

Usage:
  node tools/generate-templates.js [options] [type names...]

Options:
  --schema <dir>     Schema directory (default: schema/base)
  --format csv|xlsx  Output format (default: csv)
  --family <name>    Filter: cmdb, library, directory, lookups, all (default: all)
  --role <name>      Filter: tech-lead, cm-analyst, all (default: all)
  --examples         Include sample data row from existing JSON
  --outdir <dir>     Output directory (default: csv-templates)
  --help, -h         Show this help message

Examples:
  node tools/generate-templates.js --schema schema/base --examples
  node tools/generate-templates.js --role tech-lead --family cmdb --examples
  node tools/generate-templates.js --format xlsx --examples
  node tools/generate-templates.js "Server" "Database"
`);
}

// ── Resolve paths ────────────────────────────────────────────────────
const projectRoot = path.resolve(__dirname, '..');
if (!schemaDir) schemaDir = path.join(projectRoot, 'schema', 'base');
else schemaDir = path.resolve(schemaDir);

const STRUCTURE_PATH = path.join(schemaDir, 'schema-structure.json');
const ATTRIBUTES_PATH = path.join(schemaDir, 'schema-attributes.json');
const DATA_DIR = path.join(schemaDir, 'data');
if (!outdir) outdir = path.join(projectRoot, 'csv-templates');

// ── Load schema ──────────────────────────────────────────────────────
const structure = JSON.parse(fs.readFileSync(STRUCTURE_PATH, 'utf8'));
const attributes = JSON.parse(fs.readFileSync(ATTRIBUTES_PATH, 'utf8'));

// Build parent map for hierarchy lookups
const parentMap = {};
for (const t of structure) {
  parentMap[t.name] = t.parent || null;
}

// ── Ancestor helper ─────────────────────────────────────────────────
function isUnder(typeName, ancestor) {
  let current = typeName;
  while (current) {
    if (current === ancestor) return true;
    current = parentMap[current];
  }
  return false;
}

// ── Family filtering ────────────────────────────────────────────────
function matchesFamily(typeName) {
  if (family === 'all') return true;
  if (family === 'cmdb') return isUnder(typeName, 'Product CMDB');
  if (family === 'library') return isUnder(typeName, 'Product Library');
  if (family === 'directory') return isUnder(typeName, 'Directory');
  if (family === 'lookups') return isUnder(typeName, 'Lookup Types');
  return false;
}

// ── Role-based type classification ──────────────────────────────────
// Tech leads work with engineering/operational types (deployed CIs)
// CM analysts work with library/release types (versions, baselines, docs)
const CM_ANALYST_PATTERNS = [
  'Product Version', 'Baseline', 'Document', 'Documentation Suite',
  'Certification', 'Deployment Site', 'Distribution Log',
  'Product Media', 'Product Suite', 'Change Request',
];

function isCMAnalystType(typeName) {
  if (isUnder(typeName, 'Product Library')) return true;
  for (const pattern of CM_ANALYST_PATTERNS) {
    if (typeName.endsWith(pattern)) return true;
  }
  return false;
}

function isTechLeadType(typeName) {
  if (isUnder(typeName, 'Lookup Types')) return false;
  if (isUnder(typeName, 'Directory')) return false;
  if (!attributes[typeName]) return false;
  if (isCMAnalystType(typeName)) return false;
  return true;
}

// ── Determine which types get templates ──────────────────────────────
function getTemplateTypes() {
  if (specificTypes.length > 0) return specificTypes;

  return structure
    .filter(t => attributes[t.name])
    .filter(t => matchesFamily(t.name))
    .filter(t => {
      if (role === 'tech-lead') return isTechLeadType(t.name);
      if (role === 'cm-analyst') return isCMAnalystType(t.name);
      return true;
    })
    .map(t => t.name);
}

// ── CSV helpers ──────────────────────────────────────────────────────
function csvEscape(val) {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(cells) { return cells.map(csvEscape).join(','); }

function typeHint(attrDef) {
  if (!attrDef) return 'Text';
  if (attrDef.type === 1) {
    const ref = attrDef.referenceType || '?';
    return attrDef.max === -1 ? `Multi-Ref -> ${ref} (semicolons)` : `Ref -> ${ref}`;
  }
  if (attrDef.defaultTypeId === 4) return 'Date YYYY-MM-DD';
  if (attrDef.defaultTypeId === 2) return 'Boolean';
  if (attrDef.defaultTypeId === 1) return 'Integer';
  return 'Text';
}

// ── Load example row ─────────────────────────────────────────────────
function loadExampleRow(typeName, attrKeys) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const possibleFiles = [`${safeName}.json`, `${safeName}s.json`];
  if (PERSONNEL_TYPES.includes(typeName)) possibleFiles.push('person.json');

  for (const f of possibleFiles) {
    const filePath = path.join(DATA_DIR, f);
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let rows;
      if (Array.isArray(raw)) rows = raw;
      else if (raw[typeName] && Array.isArray(raw[typeName])) rows = raw[typeName];
      else {
        const keys = Object.keys(raw);
        if (keys.length === 1 && Array.isArray(raw[keys[0]])) rows = raw[keys[0]];
      }
      if (rows && rows.length > 0) {
        const example = rows[0];
        return ['Name', ...attrKeys].map(key => {
          const val = example[key];
          if (val === undefined || val === null) return '';
          if (Array.isArray(val)) return val.join(';');
          return String(val);
        });
      }
    } catch (_e) { /* skip */ }
  }
  return null;
}

// ── Generate one template ────────────────────────────────────────────
function generateTemplate(typeName) {
  const typeAttrs = attributes[typeName];
  if (!typeAttrs) { console.warn(`  Skipping "${typeName}"`); return null; }

  const attrKeys = Object.keys(typeAttrs);
  const row1 = csvRow(['Name', ...attrKeys]);
  const row2 = csvRow(['Name', ...attrKeys.map(k => mapAttrName(k))]);
  const row3 = csvRow(['Text (required)', ...attrKeys.map(k => typeHint(typeAttrs[k]))]);

  let csv = row1 + '\n' + row2 + '\n' + row3 + '\n';
  if (examples) {
    const exampleRow = loadExampleRow(typeName, attrKeys);
    if (exampleRow) csv += csvRow(exampleRow) + '\n';
  }
  return csv;
}

// ── Generate README ──────────────────────────────────────────────────
function generateReadme(types) {
  const roleLabel = role === 'all' ? 'All roles' : role === 'tech-lead' ? 'Technical Lead' : 'CM Analyst';
  const familyLabel = family === 'all' ? 'All types' : family.charAt(0).toUpperCase() + family.slice(1);

  return `# CSV Templates - ${roleLabel} (${familyLabel})

Generated: ${new Date().toISOString().split('T')[0]}

## Workflow

1. Open a CSV template in Excel
2. Fill in data rows below the 3 header rows:
   - Row 1 (camelCase): machine-readable headers, do not modify
   - Row 2 (Title Case): human-readable names, for reference only
   - Row 3 (Type hints): data types, for reference only
3. Save as CSV (UTF-8)
4. Convert to JSON:
   \`\`\`
   node tools/csv-to-json.js --outdir schema/base/data csv-templates/*.csv
   \`\`\`

## Rules

- Name column is required, rows without a Name are skipped
- Empty cells are omitted from output
- References use the exact Name of the target object (case-sensitive)
- Multi-references use semicolons: value1;value2;value3
- Dates must be YYYY-MM-DD format
- Booleans accept: yes/no, true/false, 1/0

## Templates

| File | Type | Fields |
|------|------|--------|
${types.map(t => {
  const attrs = attributes[t];
  const count = attrs ? Object.keys(attrs).length + 1 : 0;
  const kebab = t.toLowerCase().replace(/ /g, '-');
  return `| ${kebab}.csv | ${t} | ${count} |`;
}).join('\n')}
`;
}

// ── XLSX generation ─────────────────────────────────────────────────
function loadLookupValues(referenceTypeName) {
  const safeName = referenceTypeName.toLowerCase().replace(/ /g, '-');
  const possibleFiles = [`${safeName}.json`, `${safeName}s.json`];
  for (const f of possibleFiles) {
    const filePath = path.join(DATA_DIR, f);
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let rows;
      if (Array.isArray(raw)) rows = raw;
      else if (raw[referenceTypeName]) rows = raw[referenceTypeName];
      else {
        const keys = Object.keys(raw);
        if (keys.length === 1 && Array.isArray(raw[keys[0]])) rows = raw[keys[0]];
      }
      if (rows && rows.length > 0) return rows.map(r => r.Name).filter(Boolean);
    } catch (_e) { /* skip */ }
  }
  return [];
}

function columnLetter(col) {
  let letter = '';
  while (col > 0) { col--; letter = String.fromCharCode(65 + (col % 26)) + letter; col = Math.floor(col / 26); }
  return letter;
}

async function generateXlsx(types) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CMDB Kit Template Generator';
  workbook.created = new Date();

  const headerRow1Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
  const headerRow1Font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const headerRow2Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
  const headerRow2Font = { italic: true, size: 10 };
  const headerRow3Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  const headerRow3Font = { color: { argb: 'FF808080' }, size: 10 };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  };

  // Build hidden lookup sheet
  const refTypes = new Map();
  for (const typeName of types) {
    const typeAttrs = attributes[typeName];
    if (!typeAttrs) continue;
    for (const attrDef of Object.values(typeAttrs)) {
      if (attrDef.type !== 1 || !attrDef.referenceType || refTypes.has(attrDef.referenceType)) continue;
      const values = loadLookupValues(attrDef.referenceType);
      if (values.length > 0) refTypes.set(attrDef.referenceType, values);
    }
  }

  const lookupRanges = new Map();
  if (refTypes.size > 0) {
    const sheet = workbook.addWorksheet('_Lookups');
    sheet.state = 'veryHidden';
    let col = 0;
    for (const [refTypeName, values] of refTypes) {
      col++;
      const letter = columnLetter(col);
      sheet.getCell(1, col).value = refTypeName;
      for (let r = 0; r < values.length; r++) sheet.getCell(r + 2, col).value = values[r];
      lookupRanges.set(refTypeName, `_Lookups!$${letter}$2:$${letter}$${values.length + 1}`);
    }
  }

  let sheetCount = 0;
  for (const typeName of types) {
    const typeAttrs = attributes[typeName];
    if (!typeAttrs) continue;

    const attrKeys = Object.keys(typeAttrs);
    const allCols = ['Name', ...attrKeys];
    const sheetName = typeName.length > 31 ? typeName.substring(0, 31) : typeName;
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = allCols.map(key => {
      const displayName = key === 'Name' ? 'Name' : mapAttrName(key);
      return { width: Math.max(12, Math.min(40, displayName.length + 4)) };
    });

    const row1 = sheet.addRow(allCols);
    row1.eachCell(cell => { cell.fill = headerRow1Fill; cell.font = headerRow1Font; cell.border = thinBorder; });

    const displayNames = allCols.map(k => k === 'Name' ? 'Name' : mapAttrName(k));
    const row2 = sheet.addRow(displayNames);
    row2.eachCell(cell => { cell.fill = headerRow2Fill; cell.font = headerRow2Font; cell.border = thinBorder; });

    const hints = ['Text (required)', ...attrKeys.map(k => typeHint(typeAttrs[k]))];
    const row3 = sheet.addRow(hints);
    row3.eachCell(cell => { cell.fill = headerRow3Fill; cell.font = headerRow3Font; cell.border = thinBorder; });

    sheet.views = [{ state: 'frozen', ySplit: 3 }];

    if (examples) {
      const exampleData = loadExampleRow(typeName, attrKeys);
      if (exampleData) sheet.addRow(exampleData);
    }

    const DATA_ROWS = 200;
    for (let colIdx = 0; colIdx < attrKeys.length; colIdx++) {
      const attrDef = typeAttrs[attrKeys[colIdx]];
      if (!attrDef || attrDef.type !== 1 || !attrDef.referenceType) continue;
      const range = lookupRanges.get(attrDef.referenceType);
      if (!range) continue;
      const colNum = colIdx + 2;
      for (let rowNum = 4; rowNum <= 4 + DATA_ROWS; rowNum++) {
        sheet.getCell(rowNum, colNum).dataValidation = {
          type: 'list', allowBlank: true, formulae: [range],
          showErrorMessage: true, errorTitle: 'Invalid value',
          error: `Must match a ${attrDef.referenceType} Name`,
        };
      }
    }
    sheetCount++;
  }

  const roleSlug = role === 'all' ? 'all' : role;
  const familySlug = family === 'all' ? 'all' : family;
  const filename = `${roleSlug}-${familySlug}.xlsx`;
  const outPath = path.join(outdir, filename);
  await workbook.xlsx.writeFile(outPath);
  console.log(`\n  Generated ${sheetCount}-sheet workbook: ${filename}`);
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const types = getTemplateTypes();
  if (types.length === 0) { console.error('No matching types found.'); process.exit(1); }

  console.log(`CMDB Kit ${format.toUpperCase()} Template Generator`);
  console.log(`  Schema: ${schemaDir}`);
  console.log(`  Family: ${family} | Role: ${role} | Format: ${format} | Examples: ${examples}`);
  console.log(`  Output: ${outdir}`);
  console.log(`  Types: ${types.length}`);

  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

  if (format === 'xlsx') { await generateXlsx(types); return; }

  let count = 0;
  for (const typeName of types) {
    const csv = generateTemplate(typeName);
    if (!csv) continue;
    const kebab = typeName.toLowerCase().replace(/ /g, '-');
    fs.writeFileSync(path.join(outdir, `${kebab}.csv`), csv, 'utf8');
    count++;
  }

  fs.writeFileSync(path.join(outdir, 'README.md'), generateReadme(types), 'utf8');
  console.log(`\n  Generated ${count} templates + README.md`);
  console.log('  Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
