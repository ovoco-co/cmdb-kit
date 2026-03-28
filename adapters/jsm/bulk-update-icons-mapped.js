/**
 * adapters/jsm/bulk-update-icons-mapped.js
 * Reads from schema/core/icon-map.json and updates JSM Assets.
 */
const { client, config } = require('./lib');
const fs = require('fs');
const path = require('path');

async function runMappedUpdate() {
    try {
        // Load the mapping file
        const mapPath = path.join(config.SCHEMA_DIR, 'icon-map.json');
        if (!fs.existsSync(mapPath)) {
            throw new Error(`Mapping file not found at ${mapPath}. Please create it first.`);
        }
        
        const iconConfig = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
        const { defaultIconId, mappings } = iconConfig;

        console.log(`Targeting Schema: ${config.SCHEMA_KEY} [${config.JSM_URL}]`);

        // 1. Get the Schema ID
        const schemas = await client.get('/objectschema/list');
        const schema = schemas.values.find(s => s.objectSchemaKey === config.SCHEMA_KEY);
        
        if (!schema) throw new Error(`Schema ${config.SCHEMA_KEY} not found.`);

        // 2. Fetch all Object Types
        const objectTypes = await client.get(`/objectschema/${schema.id}/objecttypes`);
        console.log(`Processing ${objectTypes.length} types...`);

        // 3. Update each type
        for (const ot of objectTypes) {
            const targetIconId = mappings[ot.name] || defaultIconId;
            
            process.stdout.write(`Updating ${ot.name.padEnd(20)} -> Icon ${targetIconId}... `);

            await client.put(`/objecttype/${ot.id}`, {
                name: ot.name,
                description: ot.description || "",
                iconId: targetIconId
            });
            
            console.log("Done.");
        }

        console.log("\nBulk icon update finished.");
    } catch (err) {
        console.error("\nUpdate failed:", err.response?.data || err.message);
    }
}

runMappedUpdate();