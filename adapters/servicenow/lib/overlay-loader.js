/**
 * Platform overlay loader for CMDB-Kit.
 *
 * Reads a platform overlay JSON file and generates a class map from it.
 * The overlay describes how the platform-agnostic schema maps to a
 * specific platform's tables, columns, and APIs.
 *
 * The overlay format uses:
 *   {prefix}    - replaced with the configured table prefix
 *   scoped/global - column names that differ between scoped and global scope
 *
 * Usage:
 *   const { loadOverlay } = require('./overlay-loader');
 *   const classMap = loadOverlay('/path/to/overlay.json', 'u_cmdbk');
 */

const fs = require('fs');
const path = require('path');

/**
 * Load an overlay file and generate a class map.
 *
 * @param {string} overlayPath - path to the overlay JSON file
 * @param {string} tablePrefix - table prefix (e.g., 'u_cmdbk' or 'x_cmdbk')
 * @returns {object} class map compatible with getClassMap() output
 */
function loadOverlay(overlayPath, tablePrefix = 'u_cmdbk') {
  const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const map = {};
  const isScoped = tablePrefix.startsWith('x_');

  // Resolve {prefix} placeholders in a string
  function resolvePrefix(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{prefix\}/g, tablePrefix);
  }

  // Resolve a column name that may have scoped/global variants
  function resolveColumn(val) {
    if (typeof val === 'string') return resolvePrefix(val);
    if (val && typeof val === 'object' && ('scoped' in val || 'global' in val)) {
      return isScoped ? val.scoped : resolvePrefix(val.global);
    }
    return val;
  }

  // Resolve an attribute mapping
  function resolveAttr(attr) {
    if (typeof attr === 'string') return resolvePrefix(attr);
    if (attr && typeof attr === 'object') {
      // Has scoped/global at top level (simple column name switch)
      if ('scoped' in attr && 'global' in attr && !('column' in attr) && !('ref' in attr) && !('transform' in attr)) {
        return isScoped ? attr.scoped : resolvePrefix(attr.global);
      }
      // Has column, ref, transform
      const result = {};
      if (attr.column) result.column = resolveColumn(attr.column);
      if (attr.ref) result.ref = resolvePrefix(attr.ref);
      if (attr.transform) {
        // Transform can be a string (named transform) or reference to a transform map
        if (typeof attr.transform === 'string' && overlay.transforms && overlay.transforms[attr.transform]) {
          result.transform = overlay.transforms[attr.transform];
        } else {
          result.transform = attr.transform;
        }
      }
      if (attr.multi) result.multi = attr.multi;
      return result;
    }
    return attr;
  }

  // Resolve all attributes for a type
  function resolveAttributes(attrs) {
    if (!attrs) return {};
    const resolved = {};
    for (const [key, val] of Object.entries(attrs)) {
      resolved[key] = resolveAttr(val);
    }
    return resolved;
  }

  // Process explicitly defined types
  const types = overlay.types || {};
  for (const [typeName, typeDef] of Object.entries(types)) {
    // Skip meta keys
    if (typeName.startsWith('_')) continue;

    map[typeName] = {
      tier: typeDef.tier,
      table: resolvePrefix(typeDef.table),
      nameField: typeDef.nameField || 'name',
      isCi: typeDef.isCi || false,
      cmdbApi: typeDef.cmdbApi || false,
      superClass: typeDef.superClass || null,
      identificationAttributes: typeDef.identificationAttributes || null,
      attrMap: resolveAttributes(typeDef.attributes),
    };

    if (typeDef.vendorFlag) map[typeName].vendorFlag = true;
    if (typeDef.autoName) map[typeName].autoName = true;
    if (typeDef.skipOnFlag) map[typeName].skipOnFlag = typeDef.skipOnFlag;
  }

  // Process lookup types
  const lookupTypes = types._lookupTypes || [];
  for (const typeName of lookupTypes) {
    if (map[typeName]) continue; // Don't overwrite explicit definitions
    const slug = typeName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    map[typeName] = {
      tier: 3,
      table: `${tablePrefix}_${slug}`,
      nameField: 'name',
      isCi: false,
      isLookup: true,
      attrMap: { description: 'u_description' },
    };
  }

  // Process container types
  const containers = types._containers || [];
  for (const name of containers) {
    map[name] = { tier: 0, table: null, nameField: null, isCi: false, container: true };
  }

  // Process product-prefixed types
  const prefixes = types._prefixedProducts || [];
  const ciTypes = types._prefixedCiTypes || [];
  const libraryTypes = types._prefixedLibraryTypes || [];
  const siteTypes = types._prefixedSiteTypes || [];

  for (const prefix of prefixes) {
    for (const baseName of ciTypes) {
      const slug = baseName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      const fullName = `${prefix} ${baseName}`;
      if (map[fullName]) continue;
      map[fullName] = {
        tier: 2,
        table: `${tablePrefix}_${prefix.toLowerCase()}_${slug}`,
        superClass: 'cmdb_ci',
        nameField: 'name',
        isCi: true,
        cmdbApi: true,
        identificationAttributes: ['name'],
        attrMap: { description: 'short_description' },
      };
    }

    for (const baseName of libraryTypes) {
      const slug = baseName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      const fullName = `${prefix} ${baseName}`;
      if (map[fullName]) continue;
      map[fullName] = {
        tier: 3,
        table: `${tablePrefix}_${prefix.toLowerCase()}_${slug}`,
        nameField: 'name',
        isCi: false,
        attrMap: { description: 'u_description' },
      };
    }

    for (const baseName of siteTypes) {
      const slug = baseName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      const fullName = `${prefix} ${baseName}`;
      if (map[fullName]) continue;
      map[fullName] = {
        tier: 3,
        table: `${tablePrefix}_${prefix.toLowerCase()}_${slug}`,
        nameField: 'name',
        isCi: false,
        attrMap: { description: 'u_description' },
      };
    }
  }

  // Process shared services types
  const ssPrefix = types._sharedServicesPrefix || 'SS';
  const ssCiTypes = types._sharedServicesCiTypes || [];
  const ssStandaloneTypes = types._sharedServicesStandaloneTypes || [];

  for (const baseName of ssCiTypes) {
    const slug = baseName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const fullName = `${ssPrefix} ${baseName}`;
    if (map[fullName]) continue;
    map[fullName] = {
      tier: 2,
      table: `${tablePrefix}_${ssPrefix.toLowerCase()}_${slug}`,
      superClass: 'cmdb_ci',
      nameField: 'name',
      isCi: true,
      cmdbApi: true,
      identificationAttributes: ['name'],
      attrMap: { description: 'short_description' },
    };
  }

  for (const baseName of ssStandaloneTypes) {
    const slug = baseName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const fullName = `${ssPrefix} ${baseName}`;
    if (map[fullName]) continue;
    map[fullName] = {
      tier: 3,
      table: `${tablePrefix}_${ssPrefix.toLowerCase()}_${slug}`,
      nameField: 'name',
      isCi: false,
      attrMap: { description: 'u_description' },
    };
  }

  // Process EA types
  const eaTypes = types._eaTypes || {};
  for (const [typeName, eaDef] of Object.entries(eaTypes)) {
    if (map[typeName]) continue;
    map[typeName] = {
      tier: 2,
      table: `${tablePrefix}_${typeName.toLowerCase().replace(/\s+/g, '_')}`,
      superClass: 'cmdb_ci',
      nameField: 'name',
      isCi: true,
      cmdbApi: true,
      identificationAttributes: ['name'],
      attrMap: {
        description: 'short_description',
        owner: { column: 'assignment_group', ref: 'sys_user_group' },
        status: { column: 'install_status', transform: overlay.transforms?.installStatus || {} },
        ...resolveAttributes(eaDef.attributes || {}),
      },
    };
  }

  return map;
}

module.exports = { loadOverlay };
