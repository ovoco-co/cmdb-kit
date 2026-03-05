/**
 * Shared constants for CMDB Kit.
 *
 * Single source of truth for import order, type groupings, and terminal colors.
 *
 * Usage:
 *   const { LOAD_PRIORITY, PERSONNEL_TYPES, NESTED_TYPES, C } = require('./constants');
 */

// Import order: reference data first, then entities that reference them.
const LOAD_PRIORITY = [
  // ===== LOOKUP TYPES (no dependencies) =====
  'Application Status',
  'Version Status',
  'Deployment Status',
  'Environment Type',
  'Document Type',
  'Document State',
  'Component Type',
  'Priority',
  'Organization Type',
  'Deployment Role',

  // ===== EXTENDED LOOKUPS =====
  'Change Type',
  'Change Impact',
  'Incident Severity',
  'Incident Status',
  'Certification Type',
  'Certification Status',
  'Assessment Type',
  'Assessment Status',
  'Network Type',
  'Baseline Type',
  'Baseline Status',
  'License Type',
  'License Status',
  'Site Status',
  'Vendor Status',
  'SLA Status',

  // ===== ENTERPRISE LOOKUPS =====
  'Service Type',
  'Capability Status',
  'Disposition',
  'Library Item Type',
  'Distribution Status',
  'Delivery Method',
  'Media Urgency',
  'Transfer Status',
  'Requirement Type',
  'Requirement Status',
  'Requirement Priority',
  'Verification Method',
  'Contract Status',
  'Disposal Method',
  'Site Type',

  // ===== DIRECTORY =====
  'Organization',
  'Team',
  'Person',
  'Location',
  'Facility',
  'Vendor',

  // ===== FINANCIAL (depends on Vendor, Person) =====
  'Contract',
  'Cost Category',

  // ===== ENTERPRISE ARCHITECTURE (depends on Organization, Team, Application Status) =====
  'Capability',

  // ===== PRODUCT CMDB =====
  'Application',
  'Server',
  'Database',
  'Product Component',
  'Hardware Model',
  'Network Segment',
  'Virtual Machine',
  'License',
  'Feature',
  'Assessment',

  // ===== ENTERPRISE ARCHITECTURE (depends on Application, Capability, Team) =====
  'Service',
  'Business Process',
  'Information Object',

  // ===== PRODUCT LIBRARY =====
  'Product Version',
  'Document',
  'Deployment',
  'Baseline',
  'Documentation Suite',
  'Product Media',
  'Product Suite',
  'Certification',
  'Deployment Site',
  'Distribution Log',
  'Change Request',
  'Incident',
  'SLA',
  'Requirement',

  // ===== CONFIGURATION LIBRARY (depends on Product Version) =====
  'Library Item',
];

// Types bundled in person.json (nested format).
// If you add personnel-related types (e.g., Clearance, Training Record,
// Facility Access), add them here so they resolve from person.json.
const PERSONNEL_TYPES = ['Person'];

// Types using nested JSON format { "TypeName": [...] }
const NESTED_TYPES = new Set([
  'Organization', 'Team', 'Person',
  'Location', 'Facility', 'Vendor',
]);

// ANSI color codes for terminal output
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

module.exports = { LOAD_PRIORITY, PERSONNEL_TYPES, NESTED_TYPES, C };
