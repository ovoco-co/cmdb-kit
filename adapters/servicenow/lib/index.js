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

module.exports = {
  loadConfig,
  createApiClient,
  getClassMap,
  getMapping,
  getAllMappings,
  getImportableTypes,
  INSTALL_STATUS,
  resolveMultiRef,
  resolveSysId,
  createCiRelationship,
  getRelationshipType,
  resolveGlideListToNames,
  ...toolsLib,
};
