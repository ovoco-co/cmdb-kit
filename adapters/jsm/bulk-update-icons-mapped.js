/**
 * adapters/jsm/bulk-update-icons-mapped.js
 * Reads from icon-map.json and updates JSM Assets object type icons.
 */
const { loadConfig, createApiClient, resolveWorkspaceId, loadJsonFile } = require('./lib');
const fs = require('fs');
const path = require('path');

async function runMappedUpdate() {
    try {
        const config = loadConfig({ requireAuth: true, requireSchema: true });
        const api = createApiClient(config, { timeout: 30000, maxRetries: 2 });

        if (config.isCloud) {
            await resolveWorkspaceId(config, api);
        }

        // Load the mapping file
        const mapPath = path.join(config.schemaDir, 'icon-map.json');
        if (!fs.existsSync(mapPath)) {
            throw new Error(`Mapping file not found at ${mapPath}. Please create it first.`);
        }

        const mappings = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

        console.log(`Targeting Schema: ${config.schemaKey} [${config.jsmUrl}]`);

        // 1. Get the Schema ID
        const schemas = await api.get('/objectschema/list');
        const schemaList = schemas.objectschemas || schemas.values || schemas;
        const schema = Array.isArray(schemaList) ? schemaList.find(s => s.objectSchemaKey === config.schemaKey) : null;

        if (!schema) throw new Error(`Schema ${config.schemaKey} not found.`);

        // 2. Fetch all Object Types
        const raw = await api.get(`/objectschema/${schema.id}/objecttypes/flat`);
        const objectTypes = Array.isArray(raw) ? raw : (raw.values || raw.objectTypes || []);
        console.log(`Processing ${objectTypes.length} types...`);

        // 3. Update each type with its mapped icon
        for (const ot of objectTypes) {
            const targetIconId = mappings[ot.name];
            if (!targetIconId) continue;

            process.stdout.write(`Updating ${ot.name.padEnd(25)} -> Icon ${targetIconId}... `);

            await api.put(`/objecttype/${ot.id}`, {
                name: ot.name,
                description: ot.description || "",
                iconId: targetIconId
            });

            console.log("Done.");
        }

        console.log("\nBulk icon update finished.");
    } catch (err) {
        console.error("\nUpdate failed:", err.error || err.message);
    }
}

runMappedUpdate();
