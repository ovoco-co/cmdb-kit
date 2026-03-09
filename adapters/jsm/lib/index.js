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

/**
 * Resolve the Assets workspace ID for Cloud instances.
 * No-op for Data Center. Stores the workspace ID on config.workspaceId.
 *
 * Must be called after loadConfig() and createApiClient() but before
 * any Insight/Assets API calls.
 */
async function resolveWorkspaceId(config, api) {
  if (!config.isCloud) return;
  if (config.workspaceId) {
    console.log(`  Workspace: ${config.workspaceId} (from env)`);
    return;
  }

  try {
    const result = await api.get('/assets/workspace', { apiType: 'servicedesk' });
    const workspaces = result.values || [];
    if (workspaces.length === 0) {
      throw new Error('No Assets workspace found. Ensure JSM Assets is enabled (requires Premium or Enterprise plan).');
    }
    config.workspaceId = workspaces[0].workspaceId;
    console.log(`  Workspace: ${config.workspaceId}`);
  } catch (err) {
    if (err.status === 404 || err.status === 403) {
      throw new Error(
        `Could not fetch workspace ID (HTTP ${err.status}). ` +
        'Ensure Assets is enabled and your account has Assets access. ' +
        'You can also set JSM_WORKSPACE_ID manually.'
      );
    }
    throw err;
  }
}

module.exports = {
  loadConfig,
  createApiClient,
  resolveWorkspaceId,
  BASE_PATHS,
  ...toolsLib,
};
