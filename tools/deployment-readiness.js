#!/usr/bin/env node
/**
 * Deployment Readiness Checker
 *
 * Validates whether deployment sites have everything needed for go-live:
 * required fields, valid references, media/distribution, documentation,
 * personnel, and consistent status.
 *
 * Works offline only - reads local JSON data files, no API calls.
 *
 * Usage:
 *   node tools/deployment-readiness.js --all --offline
 *   node tools/deployment-readiness.js --site "US East (Virginia)" --offline
 *   node tools/deployment-readiness.js --all --offline --json
 *   node tools/deployment-readiness.js --all --offline --verbose
 *
 * Options:
 *   --site <name>       Check a specific site (repeatable/comma-separated)
 *   --all               Check all deployment sites
 *   --offline           Required flag (local JSON validation only)
 *   --schema <dir>      Schema directory (default: schema/extended)
 *   --json              Output results as JSON
 *   --verbose, -v       Show all field details per category
 *   --help, -h          Show this help message
 */

const fs = require('fs');
const path = require('path');
const { loadJsonFile, loadDataFile, C } = require('./lib');

// ── CLI ──────────────────────────────────────────────────────────────
function parseCli(args) {
  const opts = {
    sites: [], all: false, offline: false,
    json: false, verbose: false, help: false,
    schemaDir: null,
  };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--offline') opts.offline = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--site' || a === '-s') {
      i++;
      if (args[i]) args[i].split(',').forEach(s => { if (s.trim()) opts.sites.push(s.trim()); });
    }
    else if (a === '--schema') {
      i++;
      if (args[i]) opts.schemaDir = args[i];
    }
    i++;
  }
  return opts;
}

function printHelp() {
  console.log(`
  Deployment Readiness Checker

  Validates deployment sites for go-live readiness by checking required
  fields, reference validity, media distribution, documentation, personnel,
  and status consistency.

  Usage:
    node tools/deployment-readiness.js --all --offline
    node tools/deployment-readiness.js --site "US East (Virginia)" --offline
    node tools/deployment-readiness.js --all --offline --json
    node tools/deployment-readiness.js --all --offline --verbose

  Options:
    --site <name>       Check a specific site (repeatable/comma-separated)
    --all               Check all deployment sites
    --offline           Required flag (local JSON validation only)
    --schema <dir>      Schema directory (default: schema/extended)
    --json              Output results as JSON
    --verbose, -v       Show all field details per category
    --help, -h          Show this help
  `);
}

// ── Required Fields ──────────────────────────────────────────────────
const CRITICAL_FIELDS = ['status', 'environment', 'goLiveDate'];
const IMPORTANT_FIELDS = ['description', 'location'];

// ── Check Functions ──────────────────────────────────────────────────
// Each returns { status: 'GREEN'|'YELLOW'|'RED', findings: string[] }

function checkRequiredFields(site) {
  const findings = [];

  const missingCritical = CRITICAL_FIELDS.filter(f =>
    !site[f] && site[f] !== 0 && site[f] !== false
  );
  const missingImportant = IMPORTANT_FIELDS.filter(f =>
    !site[f] && site[f] !== 0 && site[f] !== false
  );

  missingCritical.forEach(f => findings.push(`Missing critical field: ${f}`));
  missingImportant.forEach(f => findings.push(`Missing field: ${f}`));

  if (findings.length === 0) findings.push('All required fields present');

  const status = missingCritical.length > 0
    ? 'RED'
    : missingImportant.length > 0
      ? 'YELLOW'
      : 'GREEN';
  return { status, findings };
}

function checkReferences(site, refData) {
  const findings = [];
  let hasRed = false;
  let hasYellow = false;

  // Check status reference
  if (site.status) {
    const statuses = refData.siteStatuses || [];
    if (statuses.length > 0 && !statuses.some(s => s.Name === site.status)) {
      findings.push(`Status "${site.status}" not found in Site Status`);
      hasRed = true;
    }
  }

  // Check environment reference
  if (site.environment) {
    const envTypes = refData.environmentTypes || [];
    if (envTypes.length > 0 && !envTypes.some(e => e.Name === site.environment)) {
      findings.push(`Environment "${site.environment}" not found in Environment Type`);
      hasRed = true;
    }
  }

  // Check location reference
  if (site.location) {
    const locations = refData.locations || [];
    if (locations.length > 0 && !locations.some(l => l.Name === site.location)) {
      findings.push(`Location "${site.location}" not found in Location`);
      hasYellow = true;
    }
  }

  if (findings.length === 0) findings.push('All references valid');

  const status = hasRed ? 'RED' : hasYellow ? 'YELLOW' : 'GREEN';
  return { status, findings };
}

function checkMedia(site, refData) {
  const findings = [];
  const distLogs = refData.distributionLogs || [];

  // Find distribution log entries for this site
  const siteDistributions = distLogs.filter(d => d.site === site.Name);

  if (siteDistributions.length === 0) {
    findings.push('No Distribution Log entries for this site');

    // RED if Active, YELLOW otherwise
    const status = site.status === 'Active' ? 'RED' : 'YELLOW';
    return { status, findings };
  }

  findings.push(`${siteDistributions.length} Distribution Log entr${siteDistributions.length === 1 ? 'y' : 'ies'} found`);

  // Check if the distributed versions have Product Media
  const productMedia = refData.productMedia || [];
  for (const dist of siteDistributions) {
    if (dist.version) {
      const versionMedia = productMedia.filter(m => m.version === dist.version);
      if (versionMedia.length === 0) {
        findings.push(`No Product Media found for distributed version "${dist.version}"`);
      } else {
        findings.push(`${versionMedia.length} media file(s) for "${dist.version}"`);
      }
    }
  }

  // Check Product Suite availability
  const productSuites = refData.productSuites || [];
  for (const dist of siteDistributions) {
    if (dist.version) {
      const suites = productSuites.filter(s => s.version === dist.version);
      if (suites.length > 0) {
        findings.push(`Product Suite available: ${suites[0].Name}`);
      }
    }
  }

  const hasMediaGap = findings.some(f => f.startsWith('No Product Media'));
  const status = hasMediaGap ? 'YELLOW' : 'GREEN';
  return { status, findings };
}

function checkDocumentation(site, refData) {
  const findings = [];
  const docSuites = refData.documentationSuites || [];
  const distLogs = refData.distributionLogs || [];

  // Find the version(s) distributed to this site
  const siteDistributions = distLogs.filter(d => d.site === site.Name);
  const distributedVersions = [...new Set(siteDistributions.map(d => d.version).filter(Boolean))];

  if (distributedVersions.length === 0) {
    findings.push('No distributed version to check documentation against');
    return { status: 'YELLOW', findings };
  }

  let hasPublished = false;
  let hasDraft = false;
  let hasMissing = false;

  for (const version of distributedVersions) {
    // Find doc suites matching the version
    const matching = docSuites.filter(ds =>
      ds.version === version || ds.Name?.includes(version)
    );

    if (matching.length === 0) {
      findings.push(`No Documentation Suite for version "${version}"`);
      hasMissing = true;
      continue;
    }

    const published = matching.filter(ds =>
      ds.state === 'Published' || ds.documentState === 'Published'
    );

    if (published.length > 0) {
      findings.push(`Published: ${published[0].Name}`);
      hasPublished = true;
    } else {
      const state = matching[0].state || matching[0].documentState || 'unknown';
      findings.push(`Not published: ${matching[0].Name} (${state})`);
      hasDraft = true;
    }
  }

  const status = hasMissing
    ? (site.status === 'Active' ? 'RED' : 'YELLOW')
    : hasDraft
      ? 'YELLOW'
      : 'GREEN';
  return { status, findings };
}

function checkPersonnel(site, refData) {
  const findings = [];
  let hasRed = false;
  let hasYellow = false;

  const distLogs = refData.distributionLogs || [];
  const siteDistributions = distLogs.filter(d => d.site === site.Name);
  const persons = refData.persons || [];

  if (siteDistributions.length === 0) {
    findings.push('No Distribution Log entries to check personnel');
    return { status: 'YELLOW', findings };
  }

  // Check distributedBy on each distribution log entry
  const withPersonnel = siteDistributions.filter(d => d.distributedBy);
  const withoutPersonnel = siteDistributions.filter(d => !d.distributedBy);

  if (withoutPersonnel.length > 0) {
    findings.push(`${withoutPersonnel.length} distribution(s) missing distributedBy`);
    hasYellow = true;
  }

  // Validate distributedBy references against Person records
  for (const dist of withPersonnel) {
    if (persons.length > 0 && !persons.some(p => p.Name === dist.distributedBy)) {
      findings.push(`Distributor "${dist.distributedBy}" not found in Person records`);
      hasRed = true;
    } else {
      findings.push(`Distributed by: ${dist.distributedBy} (${dist.Name})`);
    }
  }

  if (findings.length === 0) findings.push('All distribution personnel verified');

  const status = hasRed ? 'RED' : hasYellow ? 'YELLOW' : 'GREEN';
  return { status, findings };
}

function checkStatusConsistency(site) {
  const findings = [];
  const siteStatus = site.status;
  const goLiveDate = site.goLiveDate;

  if (!siteStatus) {
    findings.push('No site status set');
    return { status: 'RED', findings };
  }

  findings.push(`Status: ${siteStatus}`);

  if (!goLiveDate) {
    if (siteStatus === 'Active') {
      findings.push('Active site has no go-live date');
      return { status: 'RED', findings };
    }
    findings.push('No go-live date set');
    return { status: 'YELLOW', findings };
  }

  findings.push(`Go-live date: ${goLiveDate}`);

  // Parse goLiveDate and compare to today
  const goLive = new Date(goLiveDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const goLiveInPast = goLive < today;
  const goLiveInFuture = goLive >= today;

  // Active sites should have goLiveDate in the past
  if (siteStatus === 'Active' && goLiveInFuture) {
    findings.push('Active site has go-live date in the future');
    return { status: 'RED', findings };
  }

  // Provisioning sites should have goLiveDate in the future
  if (siteStatus === 'Provisioning' && goLiveInPast) {
    findings.push('Provisioning site has go-live date in the past');
    return { status: 'RED', findings };
  }

  // Decommissioned sites should not normally need checking, but flag if goLiveDate is future
  if (siteStatus === 'Decommissioned' && goLiveInFuture) {
    findings.push('Decommissioned site has go-live date in the future');
    return { status: 'YELLOW', findings };
  }

  // Maintenance sites - no specific date rule, just informational
  if (siteStatus === 'Maintenance') {
    findings.push('Site under maintenance');
  }

  findings.push('Status and go-live date are consistent');
  return { status: 'GREEN', findings };
}

// ── Run All Checks for a Site ────────────────────────────────────────
function checkSite(site, refData) {
  const categories = {
    requiredFields:     checkRequiredFields(site),
    references:         checkReferences(site, refData),
    media:              checkMedia(site, refData),
    documentation:      checkDocumentation(site, refData),
    personnel:          checkPersonnel(site, refData),
    statusConsistency:  checkStatusConsistency(site),
  };

  // Overall = worst status across all categories
  const statuses = Object.values(categories).map(c => c.status);
  const overall = statuses.includes('RED')
    ? 'RED'
    : statuses.includes('YELLOW')
      ? 'YELLOW'
      : 'GREEN';

  return { name: site.Name, overall, categories };
}

// ── Output ───────────────────────────────────────────────────────────
const STATUS_COLORS = {
  GREEN:  `${C.green}GREEN${C.reset}`,
  YELLOW: `${C.yellow}YELLOW${C.reset}`,
  RED:    `${C.red}RED${C.reset}`,
};

const STATUS_PAD = { GREEN: 'GREEN ', YELLOW: 'YELLOW', RED: 'RED   ' };

const CATEGORY_LABELS = {
  requiredFields:    'Required Fields',
  references:        'References',
  media:             'Media',
  documentation:     'Documentation',
  personnel:         'Personnel',
  statusConsistency: 'Status',
};

function printSiteReport(result, verbose) {
  const dots = '.'.repeat(Math.max(2, 52 - result.name.length));
  console.log(`\n  ${result.name} ${dots} ${STATUS_COLORS[result.overall]}`);

  for (const [cat, check] of Object.entries(result.categories)) {
    const label = CATEGORY_LABELS[cat] || cat;
    const padded = `${label}:`.padEnd(18);
    const detail = verbose ? '' : `  (${check.findings[0] || ''})`;
    console.log(`    ${padded} ${STATUS_PAD[check.status]}${detail}`);

    if (verbose) {
      check.findings.forEach(f => console.log(`      - ${f}`));
    }
  }
}

function printSummary(results) {
  const green = results.filter(r => r.overall === 'GREEN').length;
  const yellow = results.filter(r => r.overall === 'YELLOW').length;
  const red = results.filter(r => r.overall === 'RED').length;

  console.log('\n' + '='.repeat(50));
  console.log('  Readiness Summary');
  console.log('='.repeat(50));
  console.log(`\n  Sites checked:     ${results.length}`);
  console.log(`  ${C.green}GREEN${C.reset}:             ${green}   (ready)`);
  console.log(`  ${C.yellow}YELLOW${C.reset}:            ${yellow}   (review recommended)`);
  console.log(`  ${C.red}RED${C.reset}:               ${red}   (blocking issues)`);
}

// ── Load Reference Data ──────────────────────────────────────────────
function loadRefData(dataDir) {
  // Site Status lookup
  const siteStatuses = loadDataFile(dataDir, 'site-status.json', 'Site Status');

  // Environment Type lookup
  const environmentTypes = loadDataFile(dataDir, 'environment-type.json', 'Environment Type');

  // Locations (may be nested format)
  const locRaw = loadJsonFile(path.join(dataDir, 'location.json'));
  let locations = [];
  if (Array.isArray(locRaw)) locations = locRaw;
  else if (locRaw?.Location) locations = locRaw.Location;
  else if (locRaw) {
    for (const k of Object.keys(locRaw)) {
      if (Array.isArray(locRaw[k])) locations = locations.concat(locRaw[k]);
    }
  }

  // Persons (may be nested format)
  const personRaw = loadJsonFile(path.join(dataDir, 'person.json'));
  let persons = [];
  if (Array.isArray(personRaw)) persons = personRaw;
  else if (personRaw?.Person) persons = personRaw.Person;
  else if (personRaw) {
    for (const k of Object.keys(personRaw)) {
      if (k === 'Person' && Array.isArray(personRaw[k])) persons = personRaw[k];
    }
  }

  // Product Version
  const productVersions = loadDataFile(dataDir, 'product-version.json', 'Product Version');

  // Distribution Log
  const distributionLogs = loadDataFile(dataDir, 'distribution-log.json', 'Distribution Log');

  // Documentation Suite
  const documentationSuites = loadDataFile(dataDir, 'documentation-suite.json', 'Documentation Suite');

  // Product Media
  const productMedia = loadDataFile(dataDir, 'product-media.json', 'Product Media');

  // Product Suite
  const productSuites = loadDataFile(dataDir, 'product-suite.json', 'Product Suite');

  // Document State lookup
  const documentStates = loadDataFile(dataDir, 'document-state.json', 'Document State');

  return {
    siteStatuses,
    environmentTypes,
    locations,
    persons,
    productVersions,
    distributionLogs,
    documentationSuites,
    productMedia,
    productSuites,
    documentStates,
  };
}

// ── Main ─────────────────────────────────────────────────────────────
function main() {
  const opts = parseCli(process.argv.slice(2));

  if (opts.help) { printHelp(); process.exit(0); }

  if (!opts.all && opts.sites.length === 0) {
    console.error(`\n  ${C.red}Error:${C.reset} Specify --all or --site <name>`);
    printHelp();
    process.exit(1);
  }

  if (!opts.offline) {
    console.error(`\n  ${C.red}Error:${C.reset} The --offline flag is required. This tool validates against local JSON files only.`);
    process.exit(1);
  }

  // Resolve schema directory
  const projectRoot = path.resolve(__dirname, '..');
  let schemaDir;
  if (opts.schemaDir) {
    schemaDir = path.resolve(opts.schemaDir);
  } else {
    // Default: prefer core
    const core = path.join(projectRoot, 'schema', 'core');
    schemaDir = core;
  }

  const dataDir = path.join(schemaDir, 'data');

  if (!fs.existsSync(dataDir)) {
    console.error(`\n  ${C.red}Error:${C.reset} Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  // Load deployment sites
  const sites = loadDataFile(dataDir, 'deployment-site.json', 'Deployment Site');

  if (sites.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ checkDate: new Date().toISOString(), mode: 'offline', sites: [], summary: { total: 0, green: 0, yellow: 0, red: 0 } }, null, 2));
    } else {
      console.log(`\n  ${C.yellow}No Deployment Site data found in ${dataDir}${C.reset}`);
    }
    process.exit(0);
  }

  // Filter sites if --site specified
  let filtered = sites;
  if (opts.sites.length > 0) {
    filtered = sites.filter(s => opts.sites.some(name =>
      s.Name === name || s.Name?.toLowerCase().includes(name.toLowerCase())
    ));
  }

  if (filtered.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ checkDate: new Date().toISOString(), mode: 'offline', sites: [], summary: { total: 0, green: 0, yellow: 0, red: 0 } }, null, 2));
    } else {
      console.log(`\n  ${C.yellow}No matching deployment sites found${C.reset}`);
      if (opts.sites.length > 0) {
        console.log(`  Searched for: ${opts.sites.join(', ')}`);
        console.log(`  Available sites: ${sites.map(s => s.Name).join(', ')}`);
      }
    }
    process.exit(0);
  }

  // Load reference data
  const refData = loadRefData(dataDir);

  if (!opts.json) {
    console.log('');
    console.log('='.repeat(50));
    console.log('  Deployment Readiness Check');
    console.log('='.repeat(50));
    console.log(`  Mode:     Offline (local JSON files)`);
    console.log(`  Schema:   ${schemaDir}`);
    console.log(`  Sites:    ${filtered.length} of ${sites.length}`);
  }

  // Run checks
  const allResults = [];
  for (const site of filtered) {
    const result = checkSite(site, refData);
    allResults.push(result);
    if (!opts.json) printSiteReport(result, opts.verbose);
  }

  // Output
  if (opts.json) {
    const output = {
      checkDate: new Date().toISOString(),
      mode: 'offline',
      schemaDir,
      sites: allResults,
      summary: {
        total: allResults.length,
        green: allResults.filter(r => r.overall === 'GREEN').length,
        yellow: allResults.filter(r => r.overall === 'YELLOW').length,
        red: allResults.filter(r => r.overall === 'RED').length,
      },
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    printSummary(allResults);
  }

  const hasRed = allResults.some(r => r.overall === 'RED');
  process.exit(hasRed ? 1 : 0);
}

main();
