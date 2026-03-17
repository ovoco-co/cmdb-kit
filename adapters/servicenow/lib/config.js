/**
 * Configuration module for ServiceNow CMDB adapter.
 *
 * Loads environment variables and resolves paths for ServiceNow connection.
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

  // Resolve data directory: explicit DATA_DIR > SCHEMA_DIR/data > default
  const schemaDir = process.env.SCHEMA_DIR || defaults.schemaDir || null;
  const defaultDataDir = schemaDir
    ? path.resolve(schemaDir, 'data')
    : path.join(__dirname, '../../../schema/base/data');

  const config = {
    instanceUrl: process.env.SN_INSTANCE || defaults.instanceUrl || '',
    user: process.env.SN_USER || defaults.user || '',
    password: process.env.SN_PASSWORD || defaults.password || '',
    debug: process.env.DEBUG === 'true',
    dataDir: process.env.DATA_DIR || defaults.dataDir || defaultDataDir,
    tablePrefix: process.env.SN_TABLE_PREFIX || defaults.tablePrefix || 'u_cmdbk',
    lookupStrategy: process.env.SN_LOOKUP_STRATEGY || defaults.lookupStrategy || 'table',
    batchSize: parseInt(process.env.SN_BATCH_SIZE || defaults.batchSize || '200', 10),
    requestDelay: parseInt(process.env.SN_REQUEST_DELAY || defaults.requestDelay || '0', 10),
    discoverySource: process.env.SN_DISCOVERY_SOURCE || defaults.discoverySource || 'ServiceNow',
  };

  if (requireSchema) {
    config.structureFile = process.env.STRUCTURE_FILE || defaults.structureFile || 'schema-structure.json';
    config.attrFile = process.env.ATTRIBUTES_FILE || defaults.attrFile || 'schema-attributes.json';
    config.schemaDir = process.env.SCHEMA_DIR || defaults.schemaDir || path.resolve(config.dataDir, '..');
  }

  if (requireAuth) {
    if (!config.instanceUrl) {
      console.error('Error: SN_INSTANCE environment variable is required');
      console.error('');
      console.error('Usage:');
      console.error('  export SN_INSTANCE=https://dev12345.service-now.com');
      console.error('  export SN_USER=admin');
      console.error('  export SN_PASSWORD=password');
      process.exit(1);
    }
    if (!config.user || !config.password) {
      console.error('Error: SN_USER and SN_PASSWORD environment variables are required');
      process.exit(1);
    }
  }

  // Normalize instance URL (strip trailing slash)
  config.instanceUrl = config.instanceUrl.replace(/\/+$/, '');

  const url = new URL(config.instanceUrl || 'https://localhost');
  config.url = url;
  config.isHttps = url.protocol === 'https:';
  config.auth = config.user
    ? Buffer.from(`${config.user}:${config.password}`).toString('base64')
    : '';

  return config;
}

module.exports = { loadConfig };
