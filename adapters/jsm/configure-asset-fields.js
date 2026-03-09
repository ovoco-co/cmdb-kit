#!/usr/bin/env node
/**
 * CMDB Kit JSM Asset Custom Field Configuration
 *
 * Attempts to configure Asset/Insight custom fields via the Insight REST API.
 * This uses undocumented endpoints discovered through research.
 *
 * Usage:
 *   node adapters/jsm/configure-asset-fields.js
 *
 * Environment:
 *   JSM_URL      - JSM instance URL (default: http://localhost:8080)
 *   JSM_USER     - Admin username (required)
 *   JSM_PASSWORD - Admin password (required)
 *   SCHEMA_KEY   - Schema key (default: CMDB)
 */

const { loadConfig, createApiClient } = require('./lib');

const config = loadConfig({ requireSchema: true });
const jiraApi = createApiClient(config, { timeout: 30000, defaultApiType: 'jira' });
const insightApi = createApiClient(config, { timeout: 30000, defaultApiType: 'insight' });

// Asset field configurations
// Fields with portal: true are visible on the customer portal.
const assetFieldConfigs = [
  // Portal fields (visible on customer portal)
  { name: "Product", objectType: "Product", aql: 'objectType = "Product"', multi: false, portal: true },
  { name: "Environment", objectType: "Environment Type", aql: 'objectType = "Environment Type"', multi: false, portal: true },
  { name: "Organization", objectType: "Organization", aql: 'objectType = "Organization"', multi: false, portal: true },
  { name: "Affected Server", objectType: "Server", aql: 'objectType = "Server"', multi: false, portal: true },
  { name: "Affected Servers", objectType: "Server", aql: 'objectType = "Server"', multi: true, portal: true },
  { name: "Priority", objectType: "Priority", aql: 'objectType = "Priority"', multi: false, portal: true },

  // Non-portal fields (agent-only)
  { name: "Server", objectType: "Server", aql: 'objectType = "Server"', multi: false, portal: false },
  { name: "Database", objectType: "Database", aql: 'objectType = "Database"', multi: false, portal: false },
  { name: "Component", objectType: "Product Component", aql: 'objectType = "Product Component"', multi: false, portal: false },
  { name: "Product Version", objectType: "Product Version", aql: 'objectType = "Product Version"', multi: false, portal: false },
  { name: "Deployment", objectType: "Deployment", aql: 'objectType = "Deployment"', multi: false, portal: false },
  { name: "Document", objectType: "Document", aql: 'objectType = "Document"', multi: false, portal: false },
  { name: "Team", objectType: "Team", aql: 'objectType = "Team"', multi: false, portal: false },
  { name: "Assignee", objectType: "Person", aql: 'objectType = "Person"', multi: false, portal: false },
  { name: "Deployment Status", objectType: "Deployment Status", aql: 'objectType = "Deployment Status"', multi: false, portal: false }
];

async function getAssetSchema() {
  const result = await insightApi.get('/objectschema/list');
  return result.objectschemas?.find(s =>
    s.name === config.schemaKey || s.objectSchemaKey === config.schemaKey
  );
}

async function getObjectTypes(schemaId) {
  return await insightApi.get(`/objectschema/${schemaId}/objecttypes/flat`);
}

async function discoverConfigEndpoints(customFieldId) {
  const endpoints = [
    `/customfield/${customFieldId}`,
    `/customfield/default/${customFieldId}`,
    `/customfieldconfig/${customFieldId}`,
    `/customfield/${customFieldId}/config`,
    `/objecttypecustomfield/${customFieldId}`
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await insightApi.get(endpoint);
      return { endpoint, data };
    } catch (_e) { /* endpoint not found */ }
  }
  return null;
}

async function tryConfigureField(customFieldId, schemaId, objectTypeId, aql, multi, showOnPortal) {
  const configPayloads = [
    {
      endpoint: `/customfield/${customFieldId}/config`,
      method: 'PUT',
      data: { objectSchemaId: schemaId, objectTypeId, iql: aql, multiple: multi, removeUnselectedValues: false, showOnPortals: showOnPortal }
    },
    {
      endpoint: `/customfield/default/connect/${customFieldId}`,
      method: 'POST',
      data: { objectSchemaId: schemaId, objectTypeId }
    },
    {
      endpoint: `/objecttypecustomfield/${customFieldId}`,
      method: 'PUT',
      data: { objectSchemaId: schemaId, objectTypeId, iql: aql, multiple: multi, showInPortal: showOnPortal }
    },
    {
      endpoint: `/customfield/${customFieldId}`,
      method: 'PUT',
      data: { objectSchemaId: schemaId, filterObjectTypeIds: [objectTypeId], iql: aql, multiple: multi, showInPortal: showOnPortal }
    }
  ];

  for (const cfg of configPayloads) {
    try {
      await insightApi.request(cfg.method, cfg.endpoint, cfg.data);
      return { success: true, endpoint: cfg.endpoint };
    } catch (_e) { /* try next pattern */ }
  }
  return { success: false };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  CMDB Kit Asset Custom Field Configuration');
  console.log('='.repeat(60));
  console.log(`  URL: ${config.jsmUrl}`);
  console.log(`  Schema: ${config.schemaKey}`);
  console.log('');

  try {
    // Step 1: Get schema
    console.log('Getting schema...');
    const schema = await getAssetSchema();
    if (!schema) throw new Error(`Schema "${config.schemaKey}" not found`);
    console.log(`  Schema ID: ${schema.id}`);

    // Step 2: Get object types
    console.log('Getting object types...');
    const objectTypes = await getObjectTypes(schema.id);
    const typeMap = objectTypes.reduce((acc, t) => { acc[t.name] = t.id; return acc; }, {});
    console.log(`  Found ${Object.keys(typeMap).length} object types`);

    // Step 3: Get all custom fields
    console.log('Getting custom fields...');
    const allFields = await jiraApi.get('/field');

    const assetTypePatterns = [
      'com.atlassian.jira.plugins.cmdb:cmdb-object-cftype',
      'com.riadalabs.jira.plugins.insight:rlabs-customfield-object',
      'com.atlassian.servicedesk.assets-plugin:assetfield'
    ];

    const assetFields = allFields.filter(f =>
      assetTypePatterns.some(pattern => f.schema?.custom?.includes(pattern) || f.schema?.custom?.includes('insight') || f.schema?.custom?.includes('asset') || f.schema?.custom?.includes('cmdb'))
    );
    console.log(`  Found ${assetFields.length} Asset custom fields`);

    if (assetFields.length === 0) {
      console.log('\n  All custom fields:');
      allFields.filter(f => f.id.startsWith('customfield_')).slice(0, 20).forEach(f => {
        console.log(`    ${f.id}: ${f.name} (${f.schema?.custom || 'standard'})`);
      });
    }

    const fieldMap = assetFields.reduce((acc, f) => { acc[f.name] = f.id; return acc; }, {});

    console.log('\n--- Discovering API endpoints ---');
    if (assetFields.length > 0) {
      const testField = assetFields[0];
      const fieldId = testField.id.replace('customfield_', '');

      console.log(`\nTesting with field: ${testField.name} (${testField.id})`);

      const discovery = await discoverConfigEndpoints(fieldId);
      if (discovery) {
        console.log(`  Found working endpoint: ${discovery.endpoint}`);
      } else {
        console.log('  No working GET endpoints found');
      }

      const discoveryFull = await discoverConfigEndpoints(testField.id);
      if (discoveryFull) {
        console.log(`  Found working endpoint (full ID): ${discoveryFull.endpoint}`);
      }
    }

    console.log('\n--- Attempting configuration ---');
    let configured = 0, failed = 0;

    for (const fieldConfig of assetFieldConfigs) {
      const fieldId = fieldMap[fieldConfig.name];
      if (!fieldId) {
        console.log(`  ? ${fieldConfig.name} - field not found in Jira`);
        continue;
      }

      const objectTypeId = typeMap[fieldConfig.objectType];
      if (!objectTypeId) {
        console.log(`  ? ${fieldConfig.name} - object type "${fieldConfig.objectType}" not found`);
        continue;
      }

      const numericId = fieldId.replace('customfield_', '');
      const result = await tryConfigureField(numericId, schema.id, objectTypeId, fieldConfig.aql, fieldConfig.multi, fieldConfig.portal);

      if (result.success) {
        console.log(`  + ${fieldConfig.name} - configured via ${result.endpoint}`);
        configured++;
      } else {
        console.log(`  x ${fieldConfig.name} - no working endpoint found`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`  Summary: ${configured} configured, ${failed} failed`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n  NOTE: Failed fields must be configured manually in the Jira UI.');
      console.log('  Navigate to: Jira Admin > Custom Fields > [Field] > Configure > Edit Insight Configuration');
    }

  } catch (err) {
    console.error('\nERROR:', err.message || err);
    process.exit(1);
  }
}

main();
