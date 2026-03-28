/**
 * CMDB-Kit Scoped App Installer
 *
 * GlideRecord Background Script - runs in ServiceNow's
 * System Definition > Scripts - Background console.
 *
 * Prerequisites:
 *   - The CMDB-Kit schema has already been imported via the adapter
 *     (node adapters/servicenow/import.js schema)
 *   - You are logged in as an admin user
 *
 * What this script does:
 *   1. Creates or finds the CMDB-Kit application menu
 *   2. For each custom CI class: registers sys_class_name choice,
 *      adds CI Relationships related lists, creates a nav module
 *   3. For standalone tables: creates navigation modules
 *   4. For OOTB tables: creates navigation modules
 *
 * The script is idempotent. Running it again skips items that
 * already exist.
 */

(function installCmdbKit() {
    'use strict';

    // -------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------

    var MENU_TITLE = 'CMDB-Kit';

    // Table prefix: change this if using a scoped app (e.g., 'x_cmdbk_u_cmdbk')
    var PREFIX = 'u_cmdbk';

    // Custom CI class tables - extend cmdb_ci
    var CI_CLASSES = [
        { table: PREFIX + '_product',           label: 'Product',           order: 100 },
        { table: PREFIX + '_database',          label: 'Database',          order: 200 },
        { table: PREFIX + '_product_component', label: 'Product Component', order: 300 },
        { table: PREFIX + '_feature',           label: 'Feature',           order: 400 },
        { table: PREFIX + '_assessment',        label: 'Assessment',        order: 500 }
    ];

    // Standalone tables - not CIs
    var STANDALONE_TABLES = [
        { table: PREFIX + '_person',          label: 'People',            order: 600 },
        { table: PREFIX + '_product_version', label: 'Product Versions',  order: 700 },
        { table: PREFIX + '_document',        label: 'Documents',         order: 800 },
        { table: PREFIX + '_deployment',      label: 'Deployments',       order: 900 },
        { table: PREFIX + '_deployment_site', label: 'Deployment Sites',  order: 950 },
        { table: PREFIX + '_baseline',        label: 'Baselines',         order: 960 }
    ];

    // OOTB tables
    var OOTB_MODULES = [
        { table: 'cmdb_ci_server',  label: 'Servers',          order: 1000, filter: '' },
        { table: 'core_company',    label: 'Organizations',    order: 1100, filter: '' },
        { table: 'sys_user_group',  label: 'Teams',            order: 1200, filter: '' },
        { table: 'cmn_location',    label: 'Locations',        order: 1300, filter: '' },
        { table: 'cmdb_rel_ci',     label: 'CI Relationships', order: 1400, filter: '' }
    ];

    // Counters
    var created = 0;
    var skipped = 0;
    var errors  = 0;

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    /**
     * Find a record by encoded query. Returns sys_id or null.
     */
    function findRecord(table, encodedQuery) {
        var gr = new GlideRecord(table);
        gr.addEncodedQuery(encodedQuery);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            return gr.getUniqueValue();
        }
        return null;
    }

    /**
     * Check whether a table exists in the dictionary.
     */
    function tableExists(tableName) {
        var gr = new GlideRecord('sys_db_object');
        gr.addQuery('name', tableName);
        gr.setLimit(1);
        gr.query();
        return gr.next();
    }

    // -------------------------------------------------------------------
    // Step 1: Application menu (sys_app_application)
    // -------------------------------------------------------------------

    function ensureAppMenu() {
        var menuId = findRecord('sys_app_application', 'title=' + MENU_TITLE);
        if (menuId) {
            gs.info('CMDB-Kit: Application menu already exists (sys_id: ' + menuId + ')');
            skipped++;
            return menuId;
        }

        var gr = new GlideRecord('sys_app_application');
        gr.initialize();
        gr.setValue('title', MENU_TITLE);
        gr.setValue('hint', 'CMDB-Kit product-delivery CMDB');
        gr.setValue('active', true);
        gr.setValue('category', 'custom_apps');
        menuId = gr.insert();
        if (menuId) {
            gs.info('CMDB-Kit: Created application menu (sys_id: ' + menuId + ')');
            created++;
        } else {
            gs.error('CMDB-Kit: Failed to create application menu');
            errors++;
        }
        return menuId;
    }

    // -------------------------------------------------------------------
    // Step 2: sys_class_name choice registration
    // -------------------------------------------------------------------

    function ensureSysClassNameChoice(tableName, label) {
        var query = 'name=cmdb_ci^element=sys_class_name^value=' + tableName;
        var choiceId = findRecord('sys_choice', query);
        if (choiceId) {
            gs.info('CMDB-Kit: sys_class_name choice for ' + tableName + ' already exists');
            skipped++;
            return;
        }

        var gr = new GlideRecord('sys_choice');
        gr.initialize();
        gr.setValue('name', 'cmdb_ci');
        gr.setValue('element', 'sys_class_name');
        gr.setValue('value', tableName);
        gr.setValue('label', label);
        gr.setValue('language', 'en');
        gr.setValue('inactive', false);
        var id = gr.insert();
        if (id) {
            gs.info('CMDB-Kit: Created sys_class_name choice for ' + tableName);
            created++;
        } else {
            gs.error('CMDB-Kit: Failed to create sys_class_name choice for ' + tableName);
            errors++;
        }
    }

    // -------------------------------------------------------------------
    // Step 3: Related list entries (cmdb_rel_ci on CI class forms)
    // -------------------------------------------------------------------

    function ensureRelatedList(tableName, relField, position) {
        var relatedList = 'cmdb_rel_ci.' + relField;
        var query = 'list_id=' + tableName + '^related_list=' + relatedList;
        var entryId = findRecord('sys_ui_related_list_entry', query);
        if (entryId) {
            gs.info('CMDB-Kit: Related list ' + relatedList + ' on ' + tableName + ' already exists');
            skipped++;
            return;
        }

        var gr = new GlideRecord('sys_ui_related_list_entry');
        gr.initialize();
        gr.setValue('list_id', tableName);
        gr.setValue('related_list', relatedList);
        gr.setValue('position', position);
        var id = gr.insert();
        if (id) {
            gs.info('CMDB-Kit: Added related list ' + relatedList + ' to ' + tableName);
            created++;
        } else {
            gs.error('CMDB-Kit: Failed to add related list ' + relatedList + ' to ' + tableName);
            errors++;
        }
    }

    // -------------------------------------------------------------------
    // Step 4: Navigation module
    // -------------------------------------------------------------------

    function ensureModule(menuId, tableName, label, order, filter) {
        var query = 'title=' + label + '^application=' + menuId;
        var modId = findRecord('sys_app_module', query);
        if (modId) {
            gs.info('CMDB-Kit: Module "' + label + '" already exists');
            skipped++;
            return;
        }

        var gr = new GlideRecord('sys_app_module');
        gr.initialize();
        gr.setValue('title', label);
        gr.setValue('application', menuId);
        gr.setValue('order', order);
        gr.setValue('link_type', 'LIST');
        gr.setValue('name', tableName);
        if (filter) {
            gr.setValue('filter', filter);
        }
        var id = gr.insert();
        if (id) {
            gs.info('CMDB-Kit: Created module "' + label + '" -> ' + tableName);
            created++;
        } else {
            gs.error('CMDB-Kit: Failed to create module "' + label + '"');
            errors++;
        }
    }

    // -------------------------------------------------------------------
    // Main execution
    // -------------------------------------------------------------------

    gs.info('CMDB-Kit: ========================================');
    gs.info('CMDB-Kit: Starting scoped app installation');
    gs.info('CMDB-Kit: ========================================');

    var menuId = ensureAppMenu();
    if (!menuId) {
        gs.error('CMDB-Kit: Cannot proceed without application menu. Aborting.');
        return;
    }

    // Custom CI classes
    gs.info('CMDB-Kit: --- Custom CI classes ---');
    for (var i = 0; i < CI_CLASSES.length; i++) {
        var ci = CI_CLASSES[i];
        if (!tableExists(ci.table)) {
            gs.error('CMDB-Kit: Table ' + ci.table + ' not found. Run schema import first.');
            errors++;
            continue;
        }
        gs.info('CMDB-Kit: Configuring ' + ci.label + ' (' + ci.table + ')');
        ensureSysClassNameChoice(ci.table, ci.label);
        ensureRelatedList(ci.table, 'parent', 0);
        ensureRelatedList(ci.table, 'child', 1);
        ensureModule(menuId, ci.table, ci.label, ci.order, '');
    }

    // Standalone tables
    gs.info('CMDB-Kit: --- Standalone tables ---');
    for (var j = 0; j < STANDALONE_TABLES.length; j++) {
        var st = STANDALONE_TABLES[j];
        if (!tableExists(st.table)) {
            gs.error('CMDB-Kit: Table ' + st.table + ' not found. Run schema import first.');
            errors++;
            continue;
        }
        ensureModule(menuId, st.table, st.label, st.order, '');
    }

    // OOTB tables
    gs.info('CMDB-Kit: --- OOTB tables ---');
    for (var k = 0; k < OOTB_MODULES.length; k++) {
        var ootb = OOTB_MODULES[k];
        ensureModule(menuId, ootb.table, ootb.label, ootb.order, ootb.filter);
    }

    // -------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------

    gs.info('CMDB-Kit: ========================================');
    gs.info('CMDB-Kit: Installation complete');
    gs.info('CMDB-Kit:   Created: ' + created);
    gs.info('CMDB-Kit:   Skipped (already exist): ' + skipped);
    gs.info('CMDB-Kit:   Errors: ' + errors);
    gs.info('CMDB-Kit: ========================================');

    if (errors > 0) {
        gs.error('CMDB-Kit: ' + errors + ' errors occurred. ' +
            'Most common cause: missing tables. Run schema import first.');
    } else {
        gs.info('CMDB-Kit: All items configured. ' +
            'Look for CMDB-Kit in the application navigator.');
    }

})();
