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
  'Product Status',
  'Version Status',
  'Deployment Status',
  'Environment Type',
  'Document Type',
  'Document State',
  'Component Type',
  'Priority',
  'Organization Type',
  'Deployment Role',
  'Site Status',
  'Baseline Type',
  'Baseline Status',

  // ===== EXTENDED LOOKUPS =====
  'Certification Type',
  'Certification Status',
  'Assessment Type',
  'Assessment Status',
  'Network Type',
  'License Type',
  'License Status',
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
  'Site Workflow Status',
  'Upgrade Status',
  'Build Status',
  'Sunset Reason',
  'Implementation Status',
  'Baseline Milestone',
  'Media Type',

  // ===== DIRECTORY (Person before Team since Team.teamLead references Person) =====
  'Organization',
  'Person',
  'Team',
  'Location',
  'Facility',
  'Vendor',

  // ===== BASE CI TYPES (depends on lookups, directory) =====
  'Product',               // refs Team, Product Status
  'Server',                // refs Environment Type
  'Database',              // refs Server, Environment Type
  'Product Component',     // refs Component Type, Team
  'Product Version',       // refs Version Status, Product Component, Person
  'Document',              // refs Document Type, Document State, Person, Product, Product Version
  'Deployment',            // refs Product Version, Environment Type, Deployment Status, Person
  'Feature',               // refs Product, Product Version, Version Status, Team
  'Deployment Site',       // refs Product, Product Version, Organization, Environment Type, Site Status, Person, Team
  'Baseline',              // refs Baseline Type, Baseline Status, Product, Product Version, Person, Product Component, Document

  // ===== EXTENDED CI TYPES (depends on base + extended lookups) =====
  'Hardware Model',        // no refs
  'Network Segment',       // refs Network Type
  'Virtual Machine',       // refs Server, Environment Type
  'License',               // refs License Type, License Status, Vendor
  'Assessment',            // refs Assessment Type, Assessment Status, Person
  'Documentation Suite',   // refs Product Version, Document
  'Product Media',         // refs Product Version
  'Product Suite',         // refs Product Version, Product Media
  'Certification',         // refs Certification Type, Certification Status
  'Distribution Log',      // refs Product Version, Deployment Site, Person
  'SLA',                   // refs Product, SLA Status

  // ===== SCCM DOMAIN (depends on compliance + infrastructure domains) =====
  'SCCM Site Type',
  'SCCM Role Type',
  'SCCM Finding Category',
  'SCCM Site',             // refs SCCM Site Type, Server, self-ref parentSite
  'SCCM Site Role',        // refs SCCM Role Type, SCCM Site, Server
  'SCCM Collection',       // refs SCCM Site, self-ref limitingCollection
  'SCCM Security Role',    // refs SCCM Site
  'SCCM Service Account',  // refs SCCM Site
  'SCCM Boundary Group',   // refs SCCM Site, Network Segment
  'SCCM Finding',          // refs SCCM Finding Category, SCCM Site, Assessment, Priority

  // ===== FINANCIAL (depends on Vendor, Person) =====
  'Contract',
  'Cost Category',

  // ===== ENTERPRISE ARCHITECTURE (depends on Organization, Team, Product Status) =====
  'Capability',
  'Service',
  'Business Process',
  'Information Object',

  // ===== SHARED SERVICES CMDB (depends on Location, License Type, etc.) =====
  'SS Hardware Model',
  'SS Server',
  'SS Virtual Machine',
  'SS Network Segment',
  'SS License',
  'SS Product',
  'SS Document',
  'SS Certification',
  'SS Assessment',

  // ===== OVOCOANALYTICS (interleaved: types before their dependents) =====
  'AN Product',
  'AN Feature',
  'AN Hardware Model',
  'AN Product Component',
  'AN Product Version',        // refs AN Product, AN Product Component
  'AN Feature Implementation', // refs AN Feature, AN Product Version
  'AN Component Instance',     // refs AN Product Component, AN Product Version
  'AN Document',               // refs AN Product, AN Product Version
  'AN Documentation Suite',    // refs AN Product Version, AN Document (circular)
  'AN Product Media',          // refs AN Product
  'AN Product Suite',          // refs AN Product Version, AN Product Media (circular)
  'AN Certification',          // refs AN Product, AN Document
  'AN Baseline',               // refs AN Product Version, AN Component Instance, AN Certification
  'Site',
  'AN Deployment Site',        // refs AN Product, AN Product Version, Site
  'AN Network Segment',        // refs AN Deployment Site
  'AN Server',                 // refs AN Hardware Model, AN Deployment Site, AN Network Segment
  'AN Assessment',             // refs AN Product, AN Product Version, AN Deployment Site
  'AN License',                // refs AN Product, AN Deployment Site
  'AN Site Location Assignment',
  'AN Site Org Relationship',
  'AN Site Personnel Assignment',
  'AN Distribution Log',

  // ===== OVOCOCRM (interleaved: types before their dependents) =====
  'CR Product',
  'CR Feature',
  'CR Hardware Model',
  'CR Product Component',
  'CR Product Version',        // refs CR Product, CR Product Component
  'CR Feature Implementation', // refs CR Feature, CR Product Version
  'CR Component Instance',     // refs CR Product Component, CR Product Version
  'CR Document',               // refs CR Product, CR Product Version
  'CR Documentation Suite',    // refs CR Product Version, CR Document (circular)
  'CR Product Media',          // refs CR Product
  'CR Product Suite',          // refs CR Product Version, CR Product Media (circular)
  'CR Certification',          // refs CR Product, CR Document
  'CR Baseline',               // refs CR Product Version, CR Component Instance, CR Certification
  'CR Deployment Site',        // refs CR Product, CR Product Version, Site
  'CR Network Segment',        // refs CR Deployment Site
  'CR Server',                 // refs CR Hardware Model, CR Deployment Site, CR Network Segment
  'CR Virtual Machine',        // refs CR Server, CR Deployment Site
  'CR Assessment',             // refs CR Product, CR Product Version, CR Deployment Site
  'CR License',                // refs CR Product, CR Deployment Site
  'CR Site Location Assignment',
  'CR Site Org Relationship',
  'CR Site Personnel Assignment',
  'CR Distribution Log',

  // ===== SHARED LIBRARY =====
  'Requirement',

  // ===== CONFIGURATION LIBRARY =====
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
