/**
 * ServiceNow adapter library entry point.
 *
 * Re-exports ServiceNow-specific modules (api-client, config, class-map,
 * relationship-handler) plus shared utilities from tools/lib.
 *
 * The class map is loaded from overlay.json if it exists, falling back
 * to the hardcoded class-map.js for backward compatibility.
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');
const { createApiClient } = require('./api-client');
const { loadOverlay } = require('./overlay-loader');
const { INSTALL_STATUS } = require('./constants');
const hardcodedClassMap = require('./class-map');
const { resolveMultiRef, resolveSysId, createCiRelationship, getRelationshipType, resolveGlideListToNames } = require('./relationship-handler');

// Shared utilities from tools/lib
const toolsLib = require('../../../tools/lib');

// Overlay path
const OVERLAY_PATH = path.join(__dirname, '..', 'overlay.json');
const USE_OVERLAY = fs.existsSync(OVERLAY_PATH);

/**
 * Get the class map for a given table prefix.
 * Uses the overlay if overlay.json exists, otherwise falls back to hardcoded class-map.js.
 */
function getClassMap(tablePrefix) {
  if (USE_OVERLAY) {
    return loadOverlay(OVERLAY_PATH, tablePrefix);
  }
  return hardcodedClassMap.getClassMap(tablePrefix);
}

function getMapping(typeName, tablePrefix) {
  const map = getClassMap(tablePrefix);
  return map[typeName] || null;
}

function getAllMappings(tablePrefix) {
  return getClassMap(tablePrefix);
}

function getImportableTypes(tablePrefix) {
  const map = getClassMap(tablePrefix);
  return Object.keys(map).filter(name => map[name].table && !map[name].container);
}

/**
 * Resolve configured table names to actual table names on the instance.
 * On scoped app instances, ServiceNow adds a scope prefix to custom table
 * names (e.g., u_cmdbk_feature becomes x_cmdbk_u_cmdbk_feature).
 * This function queries sys_db_object to find the actual names and updates
 * the class map in place.
 *
 * @param {object} classMap - The class map from getClassMap()
 * @param {object} api - The API client
 * @returns {number} Number of table names resolved to different actual names
 */
async function resolveTableNames(classMap, api) {
  // Collect all custom table names from the class map
  const customTables = {};
  for (const [typeName, mapping] of Object.entries(classMap)) {
    if (mapping.table && (mapping.table.startsWith('u_') || mapping.table.startsWith('x_'))) {
      customTables[mapping.table] = typeName;
    }
  }

  if (Object.keys(customTables).length === 0) return 0;

  let resolved = 0;

  for (const [configuredName, typeName] of Object.entries(customTables)) {
    try {
      // First try exact match
      const exact = await api.get('/api/now/table/sys_db_object', {
        sysparm_query: `name=${configuredName}`,
        sysparm_fields: 'sys_id,name',
        sysparm_limit: 1,
      });
      const exactRecords = Array.isArray(exact) ? exact : [];
      if (exactRecords.length > 0) continue; // Name matches, no resolution needed

      // Try wildcard: look for any table ending with the configured name
      // This catches x_<scope>_<configuredName> patterns
      const wildcard = await api.get('/api/now/table/sys_db_object', {
        sysparm_query: `nameLIKE${configuredName}`,
        sysparm_fields: 'sys_id,name',
        sysparm_limit: 5,
      });
      const wildcardRecords = Array.isArray(wildcard) ? wildcard : [];

      if (wildcardRecords.length === 1) {
        // Single match - use it
        classMap[typeName].table = wildcardRecords[0].name;
        resolved++;
      } else if (wildcardRecords.length > 1) {
        // Multiple matches - prefer the one that ends with the configured name
        const best = wildcardRecords.find(r => r.name.endsWith(configuredName));
        if (best) {
          classMap[typeName].table = best.name;
          resolved++;
        }
      }
      // If no match found, keep the configured name (table may not exist yet)
    } catch (_e) {
      // API error - keep configured name
    }
  }

  return resolved;
}

module.exports = {
  loadConfig,
  createApiClient,
  getClassMap,
  getMapping,
  getAllMappings,
  getImportableTypes,
  resolveTableNames,
  INSTALL_STATUS,
  resolveMultiRef,
  resolveSysId,
  createCiRelationship,
  getRelationshipType,
  resolveGlideListToNames,
  ...toolsLib,
};
