# ServiceNow Scoped App Setup Guide

This guide configures the CMDB-Kit UI inside ServiceNow: an application menu, navigation modules, CI class registration for relationship routing, and related lists on custom CI forms.

There are two options:

- Option A: Run the background script (fast, recommended)
- Option B: Build everything manually in Studio

Both produce the same result.


## Prerequisites

The CMDB-Kit schema must already be imported:

```bash
node adapters/servicenow/import.js schema
node adapters/servicenow/import.js sync
```

You need admin access to the ServiceNow instance.


## Option A: Background Script

1. Log in to your ServiceNow instance as admin.

2. In the navigator filter, type **Scripts - Background** and open it (under System Definition).

3. Open `adapters/servicenow/install-scoped-app.js` from the CMDB-Kit repo in a text editor. Copy the entire contents.

4. Paste the script into the "Run script" text area.

5. Click **Run script**.

6. The output panel logs every action. The summary at the end looks like:

   ```
   CMDB-Kit: Installation complete
   CMDB-Kit:   Created: 24
   CMDB-Kit:   Skipped (already exist): 0
   CMDB-Kit:   Errors: 0
   ```

   If you see errors about missing tables, run `node adapters/servicenow/import.js schema` first and re-run the script. It is idempotent and skips anything already created.

7. Refresh the browser. The CMDB-Kit menu appears in the application navigator.

8. Skip to the Testing section below.


## Option B: Manual Setup in Studio

### Create the Application

1. In the navigator filter, type **Studio** and press Enter. A new tab opens.
2. Click **Create Application**.
3. Fill in:
   - Name: CMDB-Kit
   - Scope: x_cmdbk
   - Description: CMDB-Kit product-delivery CMDB schema
   - Version: 1.0.0
4. Click **Create**.

### Create the Application Menu

1. In Studio, click **Create Application File**.
2. Under Navigation and UI, select **Application Menu**.
3. Fill in:
   - Title: CMDB-Kit
   - Hint: CMDB-Kit product-delivery CMDB
   - Active: checked
   - Category: Custom Applications
4. Click **Submit**.

### Register CI Classes with sys_class_name

For each custom CI class, create a sys_choice entry so ServiceNow recognizes the class for routing.

1. In the main ServiceNow tab (not Studio), go to **System Definition > Choice Lists**.
2. Click **New**.
3. Fill in:
   - Table: cmdb_ci
   - Element: sys_class_name
   - Label: (class label from the table below)
   - Value: (table name from the table below)
   - Language: en
   - Inactive: unchecked
4. Click **Submit**.

Repeat for each class:

| Label | Value |
|---|---|
| Product | u_cmdbk_product |
| Database | u_cmdbk_database |
| Product Component | u_cmdbk_product_component |
| Feature | u_cmdbk_feature |
| Assessment | u_cmdbk_assessment |

### Add CI Relationships Related Lists

For each custom CI class form, add the parent and child relationship lists.

1. Navigate to the table list view (type the table name in the navigator, e.g., u_cmdbk_product).
2. Open any record. If none exist, create a temporary one.
3. Right-click the form header bar and select **Configure > Related Lists**.
4. Move **CI Relationships (cmdb_rel_ci.parent)** and **CI Relationships (cmdb_rel_ci.child)** from Available to Selected.
5. Click **Save**.

Repeat for all five custom CI class tables.

### Create Navigation Modules for CI Classes

In Studio, click **Create Application File**, select **Module** under Navigation and UI, and fill in:

| Module Title | Table Name | Order |
|---|---|---|
| Product | u_cmdbk_product | 100 |
| Database | u_cmdbk_database | 200 |
| Product Component | u_cmdbk_product_component | 300 |
| Feature | u_cmdbk_feature | 400 |
| Assessment | u_cmdbk_assessment | 500 |

For each module:
- Application menu: CMDB-Kit
- Link type: List of records
- Table: the table name from the row

### Create Navigation Modules for Standalone Tables

Same process, for these tables:

| Module Title | Table Name | Order |
|---|---|---|
| People | u_cmdbk_person | 600 |
| Product Versions | u_cmdbk_product_version | 700 |
| Documents | u_cmdbk_document | 800 |
| Deployments | u_cmdbk_deployment | 900 |

### Create Navigation Modules for OOTB Tables

| Module Title | Table Name | Order |
|---|---|---|
| Servers | cmdb_ci_server | 1000 |
| Organizations | core_company | 1100 |
| Teams | sys_user_group | 1200 |
| Locations | cmn_location | 1300 |
| CI Relationships | cmdb_rel_ci | 1400 |


## Testing

### Verify navigation

1. Look for **CMDB-Kit** in the application navigator.
2. Expand it. You should see Product, Database, Product Component, Feature, Assessment, People, Product Versions, Documents, Deployments, Servers, Organizations, Teams, Locations, and CI Relationships.
3. Click **Product**. The list view opens.

### Verify forms

1. Open a Product record.
2. Scroll down. The CI Relationships related lists (parent and child) should appear at the bottom.

### Verify relationship link routing

This is the main thing the scoped app fixes. Without CI class registration, clicking a relationship link to a custom class opens a generic cmdb_ci form.

1. Open a Server record that has a relationship to a Product.
2. In the CI Relationships related list, find a row where the related CI is a Product.
3. Click the Product name link.
4. The link should open the record in the u_cmdbk_product form, not a generic cmdb_ci form.

If the link opens a generic form, the sys_class_name choice entry is missing. Check System Definition > Choice Lists, filter by name=cmdb_ci, element=sys_class_name, and verify the custom table name appears in the Value column.


## Export as Update Set

Once everything is tested, export the configuration so you can install it on other instances.

1. Go to **System Update Sets > Local Update Sets**.
2. Click **New**.
3. Name: CMDB-Kit Scoped App v1.0. Click **Submit**.
4. Open the update set and click **Set as current**.
5. Touch each record to capture it in the update set:
   - System Definition > Choice Lists: open each of the five sys_class_name entries and click **Update**.
   - System Definition > Application Menus: open CMDB-Kit and click **Update**.
   - System Definition > Modules: open each CMDB-Kit module and click **Update**.
   - For related list entries: navigate to sys_ui_related_list_entry.list, filter by list_id starting with u_cmdbk, open each entry and click **Update**.
6. Go back to the update set. Change State to **Complete**.
7. Click **Export to XML** in the Related Links section.
8. The XML file can be imported on other instances via System Update Sets > Retrieved Update Sets > Import Update Set from XML.
