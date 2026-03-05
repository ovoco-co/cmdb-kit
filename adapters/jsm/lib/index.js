/**
 * JSM adapter library entry point.
 *
 * Re-exports JSM-specific modules (api-client, config) plus shared
 * utilities from tools/lib.
 */

const { loadConfig } = require('./config');
const { createApiClient, BASE_PATHS } = require('./api-client');

// Shared utilities from tools/lib
const toolsLib = require('../../../tools/lib');

module.exports = {
  loadConfig,
  createApiClient,
  BASE_PATHS,
  ...toolsLib,
};
