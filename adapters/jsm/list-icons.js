#!/usr/bin/env node
const { loadConfig, createApiClient, resolveWorkspaceId } = require('./lib');

async function main() {
  console.log('--- Fetching Available JSM Icons ---');
  const config = loadConfig({ requireSchema: true });
  const api = createApiClient(config);

  await resolveWorkspaceId(config, api);

  try {
    // This endpoint returns all global icons in your instance
    const res = await api.get('/icon/global');
    const icons = Array.isArray(res) ? res : (res.values || res.Icons || []);

    if (icons.length === 0) {
      console.log('No icons found. Ensure your API token has proper permissions.');
      return;
    }

    console.log(`${'NAME'.padEnd(25)} | ${'GUID / ID'}`);
    console.log('-'.repeat(60));

    icons.forEach(icon => {
      // We filter out the "default" text ones to find the actual graphic icons
      const name = icon.name || 'Unnamed Icon';
      const id = icon.id;
      console.log(`${name.padEnd(25)} | ${id}`);
    });

    console.log('\n--- End of List ---');
    console.log('Copy the GUID from the right column into your schema-structure.json "icon" fields.');

  } catch (err) {
    console.error('Error fetching icons:', err.message);
  }
}

main();