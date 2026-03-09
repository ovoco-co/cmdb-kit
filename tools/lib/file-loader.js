/**
 * Shared file-loading utilities for CMDB Kit.
 *
 * Usage:
 *   const { loadJsonFile, loadDataFile } = require('./file-loader');
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and parse a JSON file. Returns null if the file does not exist
 * or cannot be parsed.
 */
function loadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Warning: could not parse ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * Load an object-data file and return an array of objects.
 *
 * Handles multiple JSON wrapper formats:
 *   - Plain array: [...]
 *   - { objects: [...] }
 *   - { values: [...] }
 *   - { "TypeName": [...] }
 *   - { singleKey: [...] }
 */
function loadDataFile(dataDir, fileName, typeName) {
  const filePath = path.join(dataDir, fileName);
  const raw = loadJsonFile(filePath);
  if (raw === null) return [];

  if (Array.isArray(raw)) return raw;
  if (raw.objects && Array.isArray(raw.objects)) return raw.objects;
  if (raw.values && Array.isArray(raw.values)) return raw.values;
  if (typeName && raw[typeName] && Array.isArray(raw[typeName])) return raw[typeName];

  // Single-key wrapper
  const keys = Object.keys(raw);
  if (keys.length === 1 && Array.isArray(raw[keys[0]])) return raw[keys[0]];

  return [];
}

module.exports = { loadJsonFile, loadDataFile };
