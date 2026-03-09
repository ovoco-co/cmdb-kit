#!/usr/bin/env node
const { loadConfig, createApiClient, resolveWorkspaceId, C } = require('./lib');

async function main() {
  console.log(`${C.yellow}--- Purging "default" Icons ---${C.reset}`);
  const config = loadConfig({ requireSchema: true });
  const api = createApiClient(config);

  await resolveWorkspaceId(config, api);

  try {
    const res = await api.get('/icon/global');
    const icons = Array.isArray(res) ? res : (res.values || []);

    const targets = icons.filter(icon => icon.name === 'default');

    if (targets.length === 0) {
      console.log('No icons named "default" found.');
      return;
    }

    console.log(`Found ${targets.length} "default" icons. Starting deletion...`);

    let success = 0;
    let failed = 0;

    for (const icon of targets) {
      try {
        // Assets API uses DELETE /icon/{id}
        await api.del(`/icon/${icon.id}`);
        success++;
        if (success % 10 === 0) process.stdout.write('.'); // Progress dots
      } catch (err) {
        failed++;
      }
    }

    console.log(`\n\n${C.green}Success:${C.reset} Removed ${success} icons.`);
    if (failed > 0) {
      console.log(`${C.red}Failed:${C.reset} Could not remove ${failed} icons (some may be in use).`);
    }

    console.log('\n--- Cleanup Complete ---');

  } catch (err) {
    console.error('Fatal error during purge:', err.message);
  }
}

main();