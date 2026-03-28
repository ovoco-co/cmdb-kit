#!/usr/bin/env node
/**
 * Generate website content from CMDB-Kit schema files.
 *
 * Produces HTML and Markdown (for AI crawling)
 * with type hierarchy diagrams, attribute tables, and relationship maps.
 *
 * Usage:
 *   node tools/generate-site-content.js                          # Base schema
 *   node tools/generate-site-content.js --schema schema/extended # Extended
 *   node tools/generate-site-content.js --outdir site-content    # Custom output
 *
 * Output:
 *   site-content/
 *   ├── html/
 *   │   ├── schema-overview.html
 *   │   ├── product.html
 *   │   ├── server.html
 *   │   └── ...
 *   ├── md/
 *   │   ├── schema-overview.md
 *   │   ├── product.md
 *   │   ├── server.md
 *   │   └── ...
 *   └── diagrams/
 *       ├── type-hierarchy.mmd
 *       ├── type-hierarchy.html
 *       └── relationships.mmd
 */

const fs = require('fs');
const path = require('path');
const { mapAttrName } = require('./lib/attr-names');

// CLI
const args = process.argv.slice(2);
let schemaDir = null;
let outdir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--schema' && args[i + 1]) schemaDir = args[++i];
  else if (args[i] === '--outdir' && args[i + 1]) outdir = args[++i];
}

const projectRoot = path.resolve(__dirname, '..');
if (!schemaDir) schemaDir = path.join(projectRoot, 'schema', 'core');
else schemaDir = path.resolve(schemaDir);
if (!outdir) outdir = path.join(projectRoot, 'site-content');

const structure = JSON.parse(fs.readFileSync(path.join(schemaDir, 'schema-structure.json'), 'utf8'));
const attributes = JSON.parse(fs.readFileSync(path.join(schemaDir, 'schema-attributes.json'), 'utf8'));
const dataDir = path.join(schemaDir, 'data');

// Build hierarchy
const parentMap = {};
const childrenMap = {};
for (const t of structure) {
  parentMap[t.name] = t.parent || null;
  if (!childrenMap[t.name]) childrenMap[t.name] = [];
  if (t.parent) {
    if (!childrenMap[t.parent]) childrenMap[t.parent] = [];
    childrenMap[t.parent].push(t.name);
  }
}

const descMap = {};
for (const t of structure) descMap[t.name] = t.description || '';

// Load data record count
function countRecords(typeName) {
  const safeName = typeName.toLowerCase().replace(/ /g, '-');
  const filePath = path.join(dataDir, `${safeName}.json`);
  if (!fs.existsSync(filePath)) return 0;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(raw)) return raw.length;
    if (raw[typeName]) return raw[typeName].length;
    const keys = Object.keys(raw);
    if (keys.length === 1 && Array.isArray(raw[keys[0]])) return raw[keys[0]].length;
  } catch (_e) {}
  return 0;
}

// Attribute type display
function attrTypeLabel(def) {
  if (def.type === 1) {
    const ref = def.referenceType || '?';
    return def.max === -1 ? `References ${ref} (multiple)` : `References ${ref}`;
  }
  if (def.defaultTypeId === 4) return 'Date';
  if (def.defaultTypeId === 2) return 'Boolean';
  if (def.defaultTypeId === 1) return 'Integer';
  return 'Text';
}

// Collect all relationships
function getRelationships() {
  const rels = [];
  for (const [typeName, attrs] of Object.entries(attributes)) {
    for (const [key, def] of Object.entries(attrs)) {
      if (def.type === 1 && def.referenceType) {
        rels.push({
          from: typeName,
          to: def.referenceType,
          attr: mapAttrName(key),
          multi: def.max === -1,
        });
      }
    }
  }
  return rels;
}

// --- Mermaid Diagrams ---

function generateHierarchyMermaid() {
  const lines = ['graph TD'];
  const id = name => name.replace(/ /g, '_');
  for (const t of structure) {
    lines.push(`  ${id(t.name)}["${t.name}"]`);
    if (t.parent) {
      lines.push(`  ${id(t.parent)} --> ${id(t.name)}`);
    }
  }
  return lines.join('\n');
}

function generateRelationshipMermaid() {
  const lines = ['graph LR'];
  const id = name => name.replace(/ /g, '_');
  const rels = getRelationships();

  // Add all types that participate in relationships
  const types = new Set();
  for (const r of rels) { types.add(r.from); types.add(r.to); }
  for (const t of types) lines.push(`  ${id(t)}["${t}"]`);

  for (const r of rels) {
    const arrow = r.multi ? '==>' : '-->';
    lines.push(`  ${id(r.from)} ${arrow}|"${r.attr}"| ${id(r.to)}`);
  }
  return lines.join('\n');
}

// --- HTML Generation ---

function htmlHead(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - CMDB-Kit Schema</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.6; }
  h1 { border-bottom: 2px solid #2563eb; padding-bottom: 0.5rem; }
  h2 { color: #2563eb; margin-top: 2rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) { background: #f9fafb; }
  .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
  .badge-ref { background: #dbeafe; color: #1e40af; }
  .badge-text { background: #f3f4f6; color: #374151; }
  .badge-date { background: #fef3c7; color: #92400e; }
  .badge-bool { background: #d1fae5; color: #065f46; }
  .badge-int { background: #ede9fe; color: #5b21b6; }
  .breadcrumb { color: #6b7280; margin-bottom: 1rem; }
  .breadcrumb a { color: #2563eb; text-decoration: none; }
  .type-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; }
  .type-card h3 { margin: 0 0 0.25rem; }
  .type-card p { margin: 0; color: #6b7280; font-size: 0.9rem; }
  .mermaid { margin: 2rem 0; }
  a { color: #2563eb; }
  .stats { display: flex; gap: 2rem; margin: 1rem 0; }
  .stat { text-align: center; }
  .stat-num { font-size: 2rem; font-weight: 700; color: #2563eb; }
  .stat-label { font-size: 0.85rem; color: #6b7280; }
</style>
</head>
<body>`;
}

const htmlFoot = `</body></html>`;

function badgeClass(def) {
  if (def.type === 1) return 'badge-ref';
  if (def.defaultTypeId === 4) return 'badge-date';
  if (def.defaultTypeId === 2) return 'badge-bool';
  if (def.defaultTypeId === 1) return 'badge-int';
  return 'badge-text';
}

function generateOverviewHtml() {
  const rootTypes = structure.filter(t => !t.parent);
  const totalAttrs = Object.values(attributes).reduce((sum, a) => sum + Object.keys(a).length, 0);
  const rels = getRelationships();

  let html = htmlHead('Schema Overview');
  html += `<h1>CMDB-Kit Schema Overview</h1>`;
  html += `<div class="stats">
    <div class="stat"><div class="stat-num">${structure.length}</div><div class="stat-label">Object Types</div></div>
    <div class="stat"><div class="stat-num">${totalAttrs}</div><div class="stat-label">Attributes</div></div>
    <div class="stat"><div class="stat-num">${rels.length}</div><div class="stat-label">Relationships</div></div>
  </div>`;

  for (const root of rootTypes) {
    html += `<h2>${root.name}</h2>`;
    html += `<p>${root.description || ''}</p>`;
    const children = childrenMap[root.name] || [];
    if (children.length > 0) {
      for (const child of children) {
        const kebab = child.toLowerCase().replace(/ /g, '-');
        const attrCount = attributes[child] ? Object.keys(attributes[child]).length : 0;
        const records = countRecords(child);
        html += `<div class="type-card">`;
        html += `<h3><a href="${kebab}.html">${child}</a></h3>`;
        html += `<p>${descMap[child] || ''}</p>`;
        html += `<p>${attrCount} attributes${records > 0 ? `, ${records} example records` : ''}</p>`;
        html += `</div>`;
      }
    }
  }

  // Hierarchy diagram
  html += `<h2>Type Hierarchy</h2>`;
  html += `<pre class="mermaid">${generateHierarchyMermaid()}</pre>`;
  html += `<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:true});</script>`;

  html += htmlFoot;
  return html;
}

function generateTypeHtml(typeName) {
  const attrs = attributes[typeName] || {};
  const kebab = typeName.toLowerCase().replace(/ /g, '-');
  const parent = parentMap[typeName];
  const children = childrenMap[typeName] || [];
  const records = countRecords(typeName);
  const rels = getRelationships().filter(r => r.from === typeName);
  const referencedBy = getRelationships().filter(r => r.to === typeName);

  let html = htmlHead(typeName);

  // Breadcrumb
  const crumbs = [];
  let current = typeName;
  while (current) { crumbs.unshift(current); current = parentMap[current]; }
  html += `<div class="breadcrumb"><a href="schema-overview.html">Schema</a>`;
  for (let i = 0; i < crumbs.length; i++) {
    const c = crumbs[i];
    const cKebab = c.toLowerCase().replace(/ /g, '-');
    if (i === crumbs.length - 1) html += ` / ${c}`;
    else html += ` / <a href="${cKebab}.html">${c}</a>`;
  }
  html += `</div>`;

  html += `<h1>${typeName}</h1>`;
  html += `<p>${descMap[typeName] || ''}</p>`;
  if (records > 0) html += `<p>${records} example records included</p>`;

  // Children
  if (children.length > 0) {
    html += `<h2>Child Types</h2>`;
    for (const child of children) {
      const childKebab = child.toLowerCase().replace(/ /g, '-');
      html += `<div class="type-card"><h3><a href="${childKebab}.html">${child}</a></h3><p>${descMap[child] || ''}</p></div>`;
    }
  }

  // Attributes
  if (Object.keys(attrs).length > 0) {
    html += `<h2>Attributes</h2>`;
    html += `<table><thead><tr><th>Attribute</th><th>Display Name</th><th>Type</th></tr></thead><tbody>`;
    html += `<tr><td>Name</td><td>Name</td><td><span class="badge badge-text">Text (required)</span></td></tr>`;
    for (const [key, def] of Object.entries(attrs)) {
      const display = mapAttrName(key);
      const label = attrTypeLabel(def);
      html += `<tr><td><code>${key}</code></td><td>${display}</td><td><span class="badge ${badgeClass(def)}">${label}</span></td></tr>`;
    }
    html += `</tbody></table>`;
  }

  // Outgoing relationships
  if (rels.length > 0) {
    html += `<h2>References</h2>`;
    html += `<table><thead><tr><th>Attribute</th><th>Target Type</th><th>Cardinality</th></tr></thead><tbody>`;
    for (const r of rels) {
      const targetKebab = r.to.toLowerCase().replace(/ /g, '-');
      html += `<tr><td>${r.attr}</td><td><a href="${targetKebab}.html">${r.to}</a></td><td>${r.multi ? 'Many' : 'One'}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  // Referenced by
  if (referencedBy.length > 0) {
    html += `<h2>Referenced By</h2>`;
    html += `<table><thead><tr><th>Source Type</th><th>Attribute</th><th>Cardinality</th></tr></thead><tbody>`;
    for (const r of referencedBy) {
      const srcKebab = r.from.toLowerCase().replace(/ /g, '-');
      html += `<tr><td><a href="${srcKebab}.html">${r.from}</a></td><td>${r.attr}</td><td>${r.multi ? 'Many' : 'One'}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  // Load example data
  const dataFile = path.join(dataDir, `${kebab}.json`);
  if (fs.existsSync(dataFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      let rows = Array.isArray(raw) ? raw : (raw[typeName] || Object.values(raw)[0] || []);
      if (rows.length > 0) {
        const displayRows = rows.slice(0, 10);
        const allKeys = ['Name', ...Object.keys(attrs)];
        html += `<h2>Example Data</h2>`;
        html += `<table><thead><tr>${allKeys.map(k => `<th>${k === 'Name' ? 'Name' : mapAttrName(k)}</th>`).join('')}</tr></thead><tbody>`;
        for (const row of displayRows) {
          html += `<tr>${allKeys.map(k => {
            const val = row[k];
            if (val === undefined || val === null) return '<td></td>';
            if (Array.isArray(val)) return `<td>${val.join(', ')}</td>`;
            return `<td>${val}</td>`;
          }).join('')}</tr>`;
        }
        html += `</tbody></table>`;
        if (rows.length > 10) html += `<p>Showing 10 of ${rows.length} records</p>`;
      }
    } catch (_e) {}
  }

  html += htmlFoot;
  return html;
}

// --- Markdown Generation ---

function generateOverviewMd() {
  const rootTypes = structure.filter(t => !t.parent);
  const totalAttrs = Object.values(attributes).reduce((sum, a) => sum + Object.keys(a).length, 0);
  const rels = getRelationships();

  let md = `# CMDB-Kit Schema Overview\n\n`;
  md += `${structure.length} object types, ${totalAttrs} attributes, ${rels.length} relationships.\n\n`;

  for (const root of rootTypes) {
    md += `## ${root.name}\n\n`;
    md += `${root.description || ''}\n\n`;
    const children = childrenMap[root.name] || [];
    if (children.length > 0) {
      md += `| Type | Description | Attributes | Example Records |\n`;
      md += `|------|-------------|------------|----------------|\n`;
      for (const child of children) {
        const attrCount = attributes[child] ? Object.keys(attributes[child]).length : 0;
        const records = countRecords(child);
        md += `| [${child}](${child.toLowerCase().replace(/ /g, '-')}.md) | ${descMap[child] || ''} | ${attrCount} | ${records} |\n`;
      }
      md += `\n`;
    }
  }

  md += `## Type Hierarchy\n\n`;
  md += '```mermaid\n' + generateHierarchyMermaid() + '\n```\n\n';
  md += `## Relationship Map\n\n`;
  md += '```mermaid\n' + generateRelationshipMermaid() + '\n```\n';
  return md;
}

function generateTypeMd(typeName) {
  const attrs = attributes[typeName] || {};
  const kebab = typeName.toLowerCase().replace(/ /g, '-');
  const children = childrenMap[typeName] || [];
  const records = countRecords(typeName);
  const rels = getRelationships().filter(r => r.from === typeName);
  const referencedBy = getRelationships().filter(r => r.to === typeName);

  let md = `# ${typeName}\n\n`;
  md += `${descMap[typeName] || ''}\n\n`;
  if (records > 0) md += `${records} example records included.\n\n`;

  if (children.length > 0) {
    md += `## Child Types\n\n`;
    for (const child of children) {
      md += `- [${child}](${child.toLowerCase().replace(/ /g, '-')}.md) - ${descMap[child] || ''}\n`;
    }
    md += `\n`;
  }

  if (Object.keys(attrs).length > 0) {
    md += `## Attributes\n\n`;
    md += `| Attribute | Display Name | Type |\n`;
    md += `|-----------|-------------|------|\n`;
    md += `| Name | Name | Text (required) |\n`;
    for (const [key, def] of Object.entries(attrs)) {
      md += `| \`${key}\` | ${mapAttrName(key)} | ${attrTypeLabel(def)} |\n`;
    }
    md += `\n`;
  }

  if (rels.length > 0) {
    md += `## References\n\n`;
    md += `| Attribute | Target Type | Cardinality |\n`;
    md += `|-----------|-------------|-------------|\n`;
    for (const r of rels) {
      md += `| ${r.attr} | [${r.to}](${r.to.toLowerCase().replace(/ /g, '-')}.md) | ${r.multi ? 'Many' : 'One'} |\n`;
    }
    md += `\n`;
  }

  if (referencedBy.length > 0) {
    md += `## Referenced By\n\n`;
    md += `| Source Type | Attribute | Cardinality |\n`;
    md += `|-----------|-----------|-------------|\n`;
    for (const r of referencedBy) {
      md += `| [${r.from}](${r.from.toLowerCase().replace(/ /g, '-')}.md) | ${r.attr} | ${r.multi ? 'Many' : 'One'} |\n`;
    }
    md += `\n`;
  }

  // Example data
  const dataFile = path.join(dataDir, `${kebab}.json`);
  if (fs.existsSync(dataFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      let rows = Array.isArray(raw) ? raw : (raw[typeName] || Object.values(raw)[0] || []);
      if (rows.length > 0) {
        const displayRows = rows.slice(0, 10);
        const allKeys = ['Name', ...Object.keys(attrs)];
        md += `## Example Data\n\n`;
        md += `| ${allKeys.map(k => k === 'Name' ? 'Name' : mapAttrName(k)).join(' | ')} |\n`;
        md += `| ${allKeys.map(() => '---').join(' | ')} |\n`;
        for (const row of displayRows) {
          md += `| ${allKeys.map(k => {
            const val = row[k];
            if (val === undefined || val === null) return '';
            if (Array.isArray(val)) return val.join(', ');
            return String(val);
          }).join(' | ')} |\n`;
        }
        if (rows.length > 10) md += `\nShowing 10 of ${rows.length} records.\n`;
        md += `\n`;
      }
    } catch (_e) {}
  }

  return md;
}

// --- Main ---

function main() {
  const htmlDir = path.join(outdir, 'html');
  const mdDir = path.join(outdir, 'md');
  const diagramDir = path.join(outdir, 'diagrams');

  for (const dir of [htmlDir, mdDir, diagramDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`CMDB-Kit Site Content Generator`);
  console.log(`  Schema: ${schemaDir}`);
  console.log(`  Output: ${outdir}`);
  console.log(`  Types:  ${structure.length}\n`);

  // Overview
  fs.writeFileSync(path.join(htmlDir, 'schema-overview.html'), generateOverviewHtml());
  fs.writeFileSync(path.join(mdDir, 'schema-overview.md'), generateOverviewMd());
  console.log(`  schema-overview (html + md)`);

  // Per-type pages
  for (const t of structure) {
    const kebab = t.name.toLowerCase().replace(/ /g, '-');
    fs.writeFileSync(path.join(htmlDir, `${kebab}.html`), generateTypeHtml(t.name));
    fs.writeFileSync(path.join(mdDir, `${kebab}.md`), generateTypeMd(t.name));
    console.log(`  ${t.name} (html + md)`);
  }

  // Mermaid diagrams
  fs.writeFileSync(path.join(diagramDir, 'type-hierarchy.mmd'), generateHierarchyMermaid());
  fs.writeFileSync(path.join(diagramDir, 'relationships.mmd'), generateRelationshipMermaid());

  // Standalone HTML with rendered Mermaid
  const mermaidHtml = `${htmlHead('Diagrams')}
<h1>Type Hierarchy</h1>
<pre class="mermaid">${generateHierarchyMermaid()}</pre>
<h1>Relationship Map</h1>
<pre class="mermaid">${generateRelationshipMermaid()}</pre>
<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:true,theme:'default'});</script>
${htmlFoot}`;
  fs.writeFileSync(path.join(diagramDir, 'diagrams.html'), mermaidHtml);
  console.log(`  diagrams (mermaid + html)`);

  const totalFiles = (structure.length + 1) * 2 + 3;
  console.log(`\nDone. ${totalFiles} files generated.`);
}

main();
