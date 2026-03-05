/**
 * Shared library entry point for CMDB Kit tools.
 *
 * Usage:
 *   const { loadJsonFile, loadDataFile, mapAttrName, LOAD_PRIORITY, C } = require('./lib');
 */

const { loadJsonFile, loadDataFile } = require('./file-loader');
const { ATTR_NAME_MAP, mapAttrName } = require('./attr-names');
const { LOAD_PRIORITY, PERSONNEL_TYPES, NESTED_TYPES, C } = require('./constants');

module.exports = {
  loadJsonFile,
  loadDataFile,
  ATTR_NAME_MAP,
  mapAttrName,
  LOAD_PRIORITY,
  PERSONNEL_TYPES,
  NESTED_TYPES,
  C,
};
