/**
 * Multi-reference handling for ServiceNow adapter.
 *
 * Two strategies based on whether both sides are CI classes:
 *
 *   - glide_list: comma-separated sys_ids in a single field.
 *     Used for custom tables and non-CI-to-CI relationships.
 *
 *   - cmdb_rel_ci: ServiceNow's CI relationship table with typed
 *     relationships (Contains, Depends on, etc.).
 *     Used when both parent and child are cmdb_ci descendants.
 *
 * Usage:
 *   const { resolveMultiRef, createCiRelationship } = require('./relationship-handler');
 */

/**
 * Resolve a multi-reference value to a comma-separated string of sys_ids
 * for use in a glide_list field.
 *
 * @param {string} value - Semicolon-separated names (e.g., "Component A;Component B")
 * @param {string} refTable - Target table name
 * @param {object} sysIdCache - Cache of { table: { name: sys_id } }
 * @param {object} api - API client
 * @returns {string|null} Comma-separated sys_ids or null
 */
async function resolveMultiRef(value, refTable, sysIdCache, api) {
  if (!value) return null;

  const names = typeof value === 'string'
    ? value.split(';').map(s => s.trim()).filter(Boolean)
    : Array.isArray(value) ? value : [value];

  const sysIds = [];
  for (const name of names) {
    const sysId = await resolveSysId(name, refTable, sysIdCache, api);
    if (sysId) sysIds.push(sysId);
  }

  return sysIds.length > 0 ? sysIds.join(',') : null;
}

/**
 * Resolve a single name to a sys_id, using cache first.
 *
 * Tries 'name' first (works for OOTB tables and CI class extensions),
 * then falls back to 'u_name' for Tier 3 standalone custom tables
 * where ServiceNow auto-prefixes column names.
 */
async function resolveSysId(name, table, sysIdCache, api) {
  if (!name || !table) return null;

  // Check cache
  if (sysIdCache[table] && sysIdCache[table][name]) {
    return sysIdCache[table][name];
  }

  // Escape special characters in the name for ServiceNow encoded queries.
  // ^ is the AND separator, so names containing ^ would break the query.
  const safeName = String(name).replace(/\^/g, '\\^').replace(/\n/g, '');

  // Try 'name' first (works for OOTB and CI class extensions)
  try {
    const result = await api.get(`/api/now/table/${table}`, {
      sysparm_query: `name=${safeName}`,
      sysparm_fields: 'sys_id,name',
      sysparm_limit: 1,
    });

    const records = Array.isArray(result) ? result : [];
    if (records.length > 0) {
      const sysId = records[0].sys_id;
      if (!sysIdCache[table]) sysIdCache[table] = {};
      sysIdCache[table][name] = sysId;
      return sysId;
    }

    // Fall back to 'u_name' for standalone custom tables
    if (table.startsWith('u_') || table.startsWith('x_')) {
      const fallback = await api.get(`/api/now/table/${table}`, {
        sysparm_query: `u_name=${safeName}`,
        sysparm_fields: 'sys_id,u_name',
        sysparm_limit: 1,
      });
      const fbRecords = Array.isArray(fallback) ? fallback : [];
      if (fbRecords.length > 0) {
        if (!sysIdCache[table]) sysIdCache[table] = {};
        sysIdCache[table][name] = fbRecords[0].sys_id;
        return fbRecords[0].sys_id;
      }
    }
  } catch (err) {
    // Silently fail - caller handles null
  }

  return null;
}

/**
 * Create a CI-to-CI relationship using cmdb_rel_ci.
 *
 * @param {string} parentSysId - sys_id of the parent CI
 * @param {string} childSysId - sys_id of the child CI
 * @param {string} relType - Relationship type sys_id (e.g., Contains)
 * @param {object} api - API client
 */
async function createCiRelationship(parentSysId, childSysId, relType, api) {
  if (!parentSysId || !childSysId) return null;

  // Check if relationship already exists (Zurich doesn't return 409 for duplicates)
  try {
    const existing = await api.get('/api/now/table/cmdb_rel_ci', {
      sysparm_query: `parent=${parentSysId}^child=${childSysId}^type=${relType}`,
      sysparm_fields: 'sys_id',
      sysparm_limit: 1,
    });
    const records = Array.isArray(existing) ? existing : [];
    if (records.length > 0) return null; // Already exists
  } catch (_e) {}

  try {
    const result = await api.post('/api/now/table/cmdb_rel_ci', {
      parent: parentSysId,
      child: childSysId,
      type: relType,
    });
    return result;
  } catch (err) {
    if (err.status === 409) return null;
    throw err;
  }
}

/**
 * Look up a relationship type sys_id by name.
 */
async function getRelationshipType(name, api, cache = {}) {
  if (cache[name]) return cache[name];

  try {
    const result = await api.get('/api/now/table/cmdb_rel_type', {
      sysparm_query: `name=${name}`,
      sysparm_fields: 'sys_id,name',
      sysparm_limit: 1,
    });

    const records = Array.isArray(result) ? result : [];
    if (records.length > 0) {
      cache[name] = records[0].sys_id;
      return records[0].sys_id;
    }
  } catch (_err) {
    // Fall through
  }

  return null;
}

/**
 * Resolve a glide_list of sys_ids back to display names.
 *
 * @param {string} glideListValue - Comma-separated sys_ids
 * @param {string} table - Target table
 * @param {object} api - API client
 * @returns {string} Semicolon-separated names
 */
async function resolveGlideListToNames(glideListValue, table, api) {
  if (!glideListValue) return '';

  const sysIds = glideListValue.split(',').map(s => s.trim()).filter(Boolean);
  if (sysIds.length === 0) return '';

  const names = [];
  for (const sysId of sysIds) {
    try {
      const result = await api.get(`/api/now/table/${table}/${sysId}`, {
        sysparm_fields: 'name',
      });
      if (result && result.name) {
        names.push(result.name);
      }
    } catch (_err) {
      // Skip unresolvable references
    }
  }

  return names.join(';');
}

module.exports = {
  resolveMultiRef,
  resolveSysId,
  createCiRelationship,
  getRelationshipType,
  resolveGlideListToNames,
};
