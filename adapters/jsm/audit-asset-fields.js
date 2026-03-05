#!/usr/bin/env node
/**
 * CMDB Kit Asset Custom Field Configuration Audit
 *
 * Fetches all custom fields and checks their Insight/Asset configuration status.
 *
 * Usage:
 *   node adapters/jsm/audit-asset-fields.js
 *
 * Environment:
 *   JSM_URL      - JSM instance URL (default: http://localhost:8080)
 *   JSM_USER     - Admin username (required)
 *   JSM_PASSWORD - Admin password (required)
 *   SCHEMA_ID    - Schema ID (optional, for display only)
 */

const { loadConfig, createApiClient } = require('./lib');

const config = loadConfig();
config.schemaId = process.env.SCHEMA_ID || null;
const jiraApi = createApiClient(config, { timeout: 30000, defaultApiType: 'jira' });
const insightApi = createApiClient(config, { timeout: 30000, defaultApiType: 'insight' });

async function main() {
  console.log('='.repeat(70));
  console.log('  CMDB Kit Asset Custom Field Configuration Audit');
  console.log('='.repeat(70));
  console.log(`  URL: ${config.jsmUrl}`);
  if (config.schemaId) console.log(`  Schema ID: ${config.schemaId}`);
  console.log('');

  try {
    // Get all fields
    console.log('Fetching all custom fields...');
    const allFields = await jiraApi.get('/field');
    const customFields = allFields.filter(f => f.id.startsWith('customfield_'));

    console.log(`  Total custom fields: ${customFields.length}`);

    // Group by type
    const fieldsByType = {};
    customFields.forEach(f => {
      const type = f.schema?.custom || f.schema?.type || 'unknown';
      if (!fieldsByType[type]) fieldsByType[type] = [];
      fieldsByType[type].push(f);
    });

    console.log('\n--- Custom Field Types ---\n');
    Object.entries(fieldsByType).forEach(([type, fields]) => {
      console.log(`  ${type}: ${fields.length} fields`);
    });

    // Find Asset/Insight fields
    const assetTypes = [
      'com.atlassian.jira.plugins.cmdb:cmdb-object-cftype',
      'com.riadalabs.jira.plugins.insight:rlabs-customfield-object'
    ];

    const assetFields = customFields.filter(f =>
      assetTypes.includes(f.schema?.custom) ||
      (f.schema?.custom && (
        f.schema.custom.includes('insight') ||
        f.schema.custom.includes('asset') ||
        f.schema.custom.includes('cmdb')
      ))
    );

    console.log('\n' + '='.repeat(70));
    console.log('  Asset/Insight Custom Fields');
    console.log('='.repeat(70));
    console.log(`  Found: ${assetFields.length} Asset fields\n`);

    if (assetFields.length === 0) {
      console.log('  No Asset custom fields found.');
      console.log('  You may need to create them first via:');
      console.log('    Jira Admin > Custom Fields > Create > Asset Object');
      console.log('');

      console.log('\n--- All Custom Fields ---\n');
      customFields.slice(0, 30).forEach(f => {
        console.log(`  ${f.id}: ${f.name}`);
        console.log(`    Type: ${f.schema?.custom || f.schema?.type || 'standard'}`);
      });
      return;
    }

    // For each Asset field, try to get its configuration
    console.log('--- Asset Field Configurations ---\n');

    for (const field of assetFields) {
      const numericId = field.id.replace('customfield_', '');
      console.log(`${field.name} (${field.id}):`);
      console.log(`  Type: ${field.schema?.custom}`);

      const configEndpoints = [
        `/customfield/${numericId}`,
        `/customfieldconfig/${numericId}`,
        `/customfield/default/${numericId}`
      ];

      let configFound = false;
      for (const endpoint of configEndpoints) {
        try {
          const cfg = await insightApi.get(endpoint);
          configFound = true;
          console.log(`  Schema ID: ${cfg.objectSchemaId || cfg.schemaId || 'NOT SET'}`);
          console.log(`  Object Type ID: ${cfg.objectTypeId || cfg.filterObjectTypeIds?.[0] || 'NOT SET'}`);
          console.log(`  IQL/AQL: ${cfg.iql || cfg.ql || 'NOT SET'}`);
          console.log(`  Multiple: ${cfg.multiple ?? cfg.isMultiple ?? 'NOT SET'}`);
          console.log(`  Portal: ${cfg.showInPortal ?? cfg.showOnPortals ?? 'NOT SET'}`);
          break;
        } catch (_e) { /* endpoint not found, try next */ }
      }

      if (!configFound) {
        console.log(`  Configuration: Unable to read (API may not expose this)`);
      }

      console.log('');
    }

    // Summary
    console.log('='.repeat(70));
    console.log('  Summary');
    console.log('='.repeat(70));
    console.log(`  Total Asset fields: ${assetFields.length}`);
    console.log('');
    console.log('  Asset fields by name:');
    assetFields.forEach(f => {
      console.log(`    - ${f.name} (${f.id})`);
    });

  } catch (err) {
    console.error('\nERROR:', err.message || err);
    process.exit(1);
  }
}

main();
