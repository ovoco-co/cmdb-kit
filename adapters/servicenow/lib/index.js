/**
 * ServiceNow adapter library entry point.
 *
 * Re-exports ServiceNow-specific modules (api-client, config, class-map,
 * relationship-handler) plus shared utilities from tools/lib.
 */

const { loadConfig } = require('./config');
const { createApiClient } = require('./api-client');
const { getClassMap, getMapping, getAllMappings, getImportableTypes, INSTALL_STATUS } = require('./class-map');
const { resolveMultiRef, resolveSysId, createCiRelationship, getRelationshipType, resolveGlideListToNames } = require('./relationship-handler');

// Shared utilities from tools/lib
const toolsLib = require('../../../tools/lib');

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
