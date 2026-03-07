/**
 * Configuration module for JSM Assets adapter.
 *
 * Loads environment variables and resolves paths for JSM connection.
 * Supports both JSM Cloud and Data Center.
 *
 * Usage:
 *   const { loadConfig } = require('./config');
 *   const config = loadConfig({ requireSchema: true });
 */

const fs = require('fs');
const path = require('path');

/**
 * Load .env file from project root if it exists.
 * Environment variables already set take precedence.
 */
function loadEnvFile() {
  const envPath = path.join(__dirname, '../../../.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Only set if not already set (real env vars take precedence)
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadConfig(options = {}) {
  loadEnvFile();

  const {
    requireAuth = true,
    requireSchema = false,
    defaults = {},
  } = options;

  const config = {
    jsmUrl: process.env.JSM_URL || defaults.jsmUrl || 'http://localhost:8080',
    user: process.env.JSM_USER || defaults.user || '',
    password: process.env.JSM_PASSWORD || defaults.password || '',
    debug: process.env.DEBUG === 'true',
    dataDir: process.env.DATA_DIR || defaults.dataDir || path.join(__dirname, '../../../schema/base/data'),
  };

  if (requireSchema) {
    config.schemaKey = process.env.SCHEMA_KEY || defaults.schemaKey || 'CMDB';
    config.schemaName = process.env.SCHEMA_NAME || process.env.SCHEMA_KEY || defaults.schemaName || 'CMDB';
    config.schemaId = process.env.SCHEMA_ID || defaults.schemaId || null;
    config.createSchema = process.env.CREATE_SCHEMA === 'true';
    config.structureFile = process.env.STRUCTURE_FILE || defaults.structureFile || 'schema-structure.json';
    config.attrFile = process.env.ATTRIBUTES_FILE || defaults.attrFile || 'schema-attributes.json';
    // Schema dir defaults to parent of data dir
    config.schemaDir = process.env.SCHEMA_DIR || defaults.schemaDir || path.resolve(config.dataDir, '..');
  }

  if (options.requireProject) {
    config.projectKey = process.env.PROJECT_KEY || defaults.projectKey || '';
    config.projectName = process.env.PROJECT_NAME || defaults.projectName || '';
  }

  if (requireAuth && (!config.user || !config.password)) {
    console.error('Error: JSM_USER and JSM_PASSWORD environment variables are required');
    console.error('');
    console.error('Set them in a .env file at the project root or export them:');
    console.error('');
    console.error('  # Cloud');
    console.error('  export JSM_URL=https://your-site.atlassian.net');
    console.error('  export JSM_USER=you@example.com');
    console.error('  export JSM_PASSWORD=your-api-token');
    console.error('');
    console.error('  # Data Center');
    console.error('  export JSM_URL=http://your-jsm:8080');
    console.error('  export JSM_USER=admin');
    console.error('  export JSM_PASSWORD=password');
    console.error('');
    console.error('See .env.example for all options.');
    process.exit(1);
  }

  const url = new URL(config.jsmUrl);
  config.url = url;
  config.isHttps = url.protocol === 'https:';
  config.auth = config.user
    ? Buffer.from(`${config.user}:${config.password}`).toString('base64')
    : '';

  // Cloud detection
  config.isCloud = url.hostname.endsWith('.atlassian.net');
  config.workspaceId = process.env.JSM_WORKSPACE_ID || null;

  return config;
}

module.exports = { loadConfig };
