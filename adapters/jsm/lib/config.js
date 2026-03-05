/**
 * Configuration module for JSM Assets adapter.
 *
 * Loads environment variables and resolves paths for JSM connection.
 *
 * Usage:
 *   const { loadConfig } = require('./config');
 *   const config = loadConfig({ requireSchema: true });
 */

const path = require('path');

function loadConfig(options = {}) {
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
    console.error('Usage:');
    console.error('  export JSM_URL=http://your-jsm:8080');
    console.error('  export JSM_USER=admin');
    console.error('  export JSM_PASSWORD=password');
    process.exit(1);
  }

  const url = new URL(config.jsmUrl);
  config.url = url;
  config.isHttps = url.protocol === 'https:';
  config.auth = config.user
    ? Buffer.from(`${config.user}:${config.password}`).toString('base64')
    : '';

  return config;
}

module.exports = { loadConfig };
