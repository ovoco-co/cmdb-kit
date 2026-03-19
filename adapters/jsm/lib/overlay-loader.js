/**
 * JSM Assets platform overlay loader.
 *
 * Reads a JSM overlay JSON file and provides lookup functions for
 * platform-specific metadata: icons, attribute type overrides,
 * reference type names, and cardinality settings.
 *
 * Unlike the ServiceNow overlay which generates a full class map,
 * the JSM overlay enriches the schema data that the adapter already
 * reads from schema-structure.json and schema-attributes.json.
 *
 * Usage:
 *   const { loadJsmOverlay } = require('./overlay-loader');
 *   const overlay = loadJsmOverlay('/path/to/overlay.json');
 *   const icon = overlay.getIcon('Product');
 *   const refTypeName = overlay.getRefTypeName('owner');
 */

const fs = require('fs');

function loadJsmOverlay(overlayPath) {
  if (!overlayPath || !fs.existsSync(overlayPath)) {
    return createEmptyOverlay();
  }

  const raw = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const types = raw.types || {};
  const lookupDefaults = types._lookupDefaults || {};
  const containerDefaults = types._containerDefaults || {};

  return {
    /**
     * Get the icon name for a type.
     * Falls back to lookup/container defaults, then to 'generic'.
     */
    getIcon(typeName, isLookup, isContainer) {
      const typeDef = types[typeName];
      if (typeDef && typeDef.icon) return typeDef.icon;
      if (isContainer && containerDefaults.icon) return containerDefaults.icon;
      if (isLookup && lookupDefaults.icon) return lookupDefaults.icon;
      return raw.defaults?.defaultIcon || 'generic';
    },

    /**
     * Get attribute metadata from the overlay for a specific type and attribute.
     * Returns null if the overlay doesn't define it.
     */
    getAttribute(typeName, attrKey) {
      const typeDef = types[typeName];
      if (!typeDef || !typeDef.attributes) return null;
      return typeDef.attributes[attrKey] || null;
    },

    /**
     * Get the reference type name for a given attribute key.
     * Overlay can specify custom reference type names per attribute.
     */
    getRefTypeName(typeName, attrKey) {
      const attr = this.getAttribute(typeName, attrKey);
      if (attr && attr.referenceTypeName) return attr.referenceTypeName;
      return null;
    },

    /**
     * Get cardinality for a reference attribute.
     * Returns 'many' or 'one' (default).
     */
    getCardinality(typeName, attrKey) {
      const attr = this.getAttribute(typeName, attrKey);
      if (attr && attr.cardinality === 'many') return 'many';
      return 'one';
    },

    /**
     * Check if the overlay has a definition for a type.
     */
    hasType(typeName) {
      return !!types[typeName];
    },

    /**
     * Get all explicitly defined type names (excluding meta keys).
     */
    getDefinedTypes() {
      return Object.keys(types).filter(k => !k.startsWith('_'));
    },

    /**
     * Get the raw overlay data.
     */
    raw: raw,
  };
}

function createEmptyOverlay() {
  return {
    getIcon() { return 'generic'; },
    getAttribute() { return null; },
    getRefTypeName() { return null; },
    getCardinality() { return 'one'; },
    hasType() { return false; },
    getDefinedTypes() { return []; },
    raw: { platform: 'jsm-assets', types: {} },
  };
}

module.exports = { loadJsmOverlay };
