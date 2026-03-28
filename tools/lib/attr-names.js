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
  'sitePOC': 'Site POC',
  'supportTeam': 'Support Team',
  'lastDeploymentDate': 'Last Deployment Date',
  'goLiveDate': 'Go Live Date',
  'approvedBy': 'Approved By',
  'approvalDate': 'Approval Date',
  'releaseNotes': 'Release Notes',
  'jobTitle': 'Job Title',
  'establishedDate': 'Established Date',
  'baselineType': 'Baseline Type',
  'assessmentType': 'Assessment Type',
  'assessmentDate': 'Assessment Date',
  'certificationType': 'Certification Type',
  'issueDate': 'Issue Date',
  'expirationDate': 'Expiration Date',
  'issuingBody': 'Issuing Body',
  'licenseType': 'License Type',
  'contactEmail': 'Contact Email',
  'contractExpiry': 'Contract Expiry',
  'targetUptime': 'Target Uptime',
  'responseTime': 'Response Time',
  'reviewDate': 'Review Date',
  'networkType': 'Network Type',
  'locationType': 'Location Type',
  'facilityType': 'Facility Type',
  'formFactor': 'Form Factor',
  'modelNumber': 'Model Number',
  'fileSize': 'File Size',
  'fileName': 'File Name',
  'distributionDate': 'Distribution Date',
  'distributedBy': 'Distributed By',
  'sslEnabled': 'SSL Enabled',
  'pxeEnabled': 'PXE Enabled',
  'collectionId': 'Collection ID',
  'techniqueId': 'Technique ID',
  'companionProducts': 'Companion Products',
  'cpu': 'CPU',
  'ram': 'RAM',
  'url': 'URL',
  'cidr': 'CIDR',
  'vlan': 'VLAN',
  'ipAddress': 'IP Address',
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
