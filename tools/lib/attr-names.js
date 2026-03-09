/**
 * Shared attribute name mapping for CMDB Kit.
 *
 * Maps camelCase attribute keys (used in JSON data files) to their
 * display names (Title Case). The mapAttrName() function falls back
 * to automatic camelCase to Title Case conversion for any key not
 * in the explicit map.
 *
 * Usage:
 *   const { ATTR_NAME_MAP, mapAttrName } = require('./attr-names');
 */

// Explicit overrides where automatic conversion would be wrong
const ATTR_NAME_MAP = {
  'ipAddress': 'IP Address',
  'orgType': 'Org Type',
  'teamLead': 'Team Lead',
  'deployDate': 'Deploy Date',
  'deployedBy': 'Deployed By',
  'publishDate': 'Publish Date',
  'releaseDate': 'Release Date',
  'storageSize': 'Storage Size',
  'databaseEngine': 'Database Engine',
  'productType': 'Product Type',
  'componentType': 'Component Type',
  'documentType': 'Document Type',
  'documentState': 'Document State',
  'versionNumber': 'Version Number',
  'versionStatus': 'Version Status',
  'previousVersion': 'Previous Version',
  'parentOrganization': 'Parent Organization',
  'operatingSystem': 'Operating System',
  'firstName': 'First Name',
  'lastName': 'Last Name',
  'slaStatus': 'SLA Status',
  'dmlPath': 'DML Path',
};

/**
 * Convert a camelCase attribute key to its display name.
 * Checks the explicit map first, then falls back to automatic conversion.
 */
function mapAttrName(key) {
  if (ATTR_NAME_MAP[key]) return ATTR_NAME_MAP[key];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

module.exports = { ATTR_NAME_MAP, mapAttrName };
