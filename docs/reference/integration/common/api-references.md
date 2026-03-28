# API References

This document covers the REST APIs used by CMDB-Kit's JSM adapter. It provides base URLs, authentication patterns, key endpoints, and attribute type mappings for both Data Center and Cloud deployments.


# Assets Jira Service Management Data Center REST API

On Data Center, Assets exposes a REST API at a fixed base path on your Jira instance. No proxy, no workspace ID, no rate limiting.

## Base URL

```
https://<your-jira-dc>:8080/rest/insight/1.0
```

All endpoints below are relative to this base path.

## Authentication

Data Center uses HTTP Basic authentication with a local username and password:

```bash
curl -u admin:password \
  https://your-jira:8080/rest/insight/1.0/objectschema/list
```

The account must have Assets Administrator permissions on the target schema. In SSO-only environments, create a local service account with direct login credentials.

## Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /objectschema/list | List all object schemas |
| GET | /objectschema/{schemaId}/objecttypes/flat | List all object types in a schema |
| POST | /objecttype/create | Create an object type |
| PUT | /objecttype/{id} | Update an object type |
| GET | /objecttype/{id}/attributes | List attributes for an object type |
| POST | /objecttypeattribute/{objectTypeId} | Create an attribute on an object type |
| POST | /object/create | Create an object |
| PUT | /object/{id} | Update an object |
| GET | /object/{id} | Get a single object by ID |
| DELETE | /object/{id} | Delete an object |
| POST | /object/aql | Search objects using AQL |

## Example: list object types

```bash
curl -u admin:password \
  https://your-jira:8080/rest/insight/1.0/objectschema/1/objecttypes/flat
```


# Assets Cloud REST API

On Cloud, the Assets API lives on a separate host (`api.atlassian.com`) and requires a workspace ID in every request path. The CMDB-Kit adapter handles this routing automatically.

## Base URL

```
https://api.atlassian.com/jsm/assets/workspace/{workspaceId}/v1
```

Replace `{workspaceId}` with the UUID for your Assets instance. See the workspace discovery section below.

## Authentication

Cloud uses HTTP Basic authentication with your Atlassian email address and an API token. Generate a token at https://id.atlassian.com/manage-profile/security/api-tokens.

```bash
curl -u you@example.com:your-api-token \
  "https://api.atlassian.com/jsm/assets/workspace/$WORKSPACE_ID/v1/objectschema/list"
```

This is the same credential pair you set in `JSM_USER` and `JSM_PASSWORD` when configuring the adapter. The email is not a username, and the API token is not your account password.


## Assets Cloud REST API Reference

The Cloud endpoints mirror the DC endpoints. The only difference is the base URL. All paths below are relative to the Cloud base URL shown above.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /objectschema/list | List all object schemas |
| GET | /objectschema/{schemaId}/objecttypes/flat | List all object types in a schema |
| POST | /objecttype/create | Create an object type |
| PUT | /objecttype/{id} | Update an object type |
| GET | /objecttype/{id}/attributes | List attributes for an object type |
| POST | /objecttypeattribute/{objectTypeId} | Create an attribute on an object type |
| POST | /object/create | Create an object |
| PUT | /object/{id} | Update an object |
| GET | /object/{id} | Get a single object by ID |
| DELETE | /object/{id} | Delete an object |
| POST | /object/aql | Search objects using AQL |

## Example: create an object type on Cloud

```bash
curl -X POST \
  -u you@example.com:your-api-token \
  -H "Content-Type: application/json" \
  "https://api.atlassian.com/jsm/assets/workspace/$WORKSPACE_ID/v1/objecttype/create" \
  -d '{
    "name": "Server",
    "iconId": 1,
    "objectSchemaId": 1,
    "parentObjectTypeId": 5
  }'
```


# Creating Objects via REST API

The object creation endpoint accepts an `objectTypeId` and an `attributes` array. Each entry in the array maps an attribute ID to one or more values.

### Request structure

```json
{
  "objectTypeId": 42,
  "attributes": [
    {
      "objectTypeAttributeId": 100,
      "objectAttributeValues": [
        { "value": "Web Server 01" }
      ]
    },
    {
      "objectTypeAttributeId": 101,
      "objectAttributeValues": [
        { "value": "2025-06-15" }
      ]
    }
  ]
}
```

The `objectTypeAttributeId` is the numeric ID of the attribute definition, not its name. Fetch attribute IDs with `GET /objecttype/{id}/attributes` before building your payload.

## Attribute type mapping

Each attribute definition in `schema-attributes.json` has a `type` and optional `defaultTypeId`. These control what values the API expects.

| Schema definition | API value format | Example |
|-------------------|------------------|---------|
| `{ "type": 0 }` (text) | Plain string | `{ "value": "Production" }` |
| `{ "type": 0, "defaultTypeId": 4 }` (date) | Date string, YYYY-MM-DD | `{ "value": "2025-06-15" }` |
| `{ "type": 0, "defaultTypeId": 1 }` (integer) | Number as string | `{ "value": "16" }` |
| `{ "type": 0, "defaultTypeId": 2 }` (boolean) | Boolean as string | `{ "value": "true" }` |
| `{ "type": 1 }` (single reference) | Referenced object's ID | `{ "value": "CMDB-123" }` |
| `{ "type": 1, "max": -1 }` (multi-reference) | One entry per reference | See below |

All values are sent as strings, even integers and booleans. The API coerces them based on the attribute type definition.

## Single reference example

A single reference attribute points to one object. Resolve the target object's ID first (via AQL or name lookup), then pass it as the value:

```json
{
  "objectTypeAttributeId": 200,
  "objectAttributeValues": [
    { "value": "CMDB-45" }
  ]
}
```

## Multi-reference example

For attributes with `"max": -1`, provide multiple entries in the `objectAttributeValues` array:

```json
{
  "objectTypeAttributeId": 201,
  "objectAttributeValues": [
    { "value": "CMDB-10" },
    { "value": "CMDB-11" },
    { "value": "CMDB-12" }
  ]
}
```

In CMDB-Kit data files, multi-reference values use semicolon-separated names (e.g., `"Auth Service;API Gateway;Web Frontend"`). The adapter splits these, resolves each name to an object ID via AQL, and builds the values array.

## Resolving references by name

The adapter uses AQL (Assets Query Language) to find object IDs by name:

```bash
curl -X POST \
  -u admin:password \
  -H "Content-Type: application/json" \
  https://your-jira:8080/rest/insight/1.0/object/aql \
  -d '{
    "qlQuery": "objectTypeId = 42 AND Name = \"Web Server 01\""
  }'
```

The response includes matching objects with their IDs. Use the `id` field from the first match as the reference value.

## Full example: create a Server object

```bash
curl -X POST \
  -u admin:password \
  -H "Content-Type: application/json" \
  https://your-jira:8080/rest/insight/1.0/object/create \
  -d '{
    "objectTypeId": 10,
    "attributes": [
      {
        "objectTypeAttributeId": 50,
        "objectAttributeValues": [{ "value": "web-prod-03" }]
      },
      {
        "objectTypeAttributeId": 51,
        "objectAttributeValues": [{ "value": "web-prod-03.ovoco.internal" }]
      },
      {
        "objectTypeAttributeId": 52,
        "objectAttributeValues": [{ "value": "10.0.1.30" }]
      },
      {
        "objectTypeAttributeId": 53,
        "objectAttributeValues": [{ "value": "Ubuntu 22.04 LTS" }]
      }
    ]
  }'
```

The attribute IDs (50, 51, 52, 53) are illustrative. Your actual IDs will differ. Always fetch them from the API first.


# JSM Cloud REST API

The JSM Cloud REST API (separate from the Assets API) provides workspace discovery and service management endpoints. The adapter uses it during initialization to resolve the workspace ID before making Assets calls.

## Workspace ID Discovery

The workspace ID is a UUID that identifies your Assets instance. The adapter fetches it automatically with this call:

```
GET https://your-site.atlassian.net/rest/servicedeskapi/assets/workspace
```

```bash
curl -u you@example.com:your-api-token \
  https://your-site.atlassian.net/rest/servicedeskapi/assets/workspace
```

Response:

```json
{
  "values": [
    {
      "workspaceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  ]
}
```

Take `values[0].workspaceId` and use it in all subsequent Assets API calls. The adapter stores this on the config object after the first call.

If auto-detection fails (usually a permissions issue), find the workspace ID manually by opening Assets in your browser and extracting it from the URL. Set `JSM_WORKSPACE_ID` in your `.env` file to skip auto-detection.

## How the adapter routes requests

The adapter in `adapters/jsm/lib/api-client.js` detects Cloud vs DC by checking whether the hostname ends in `.atlassian.net`:

- Cloud "insight" API calls route to `api.atlassian.com` with the workspace ID in the path
- Cloud "servicedesk" API calls (like workspace discovery) route to the site URL at `/rest/servicedeskapi`
- DC calls route directly to the configured server at `/rest/insight/1.0`

Both Cloud and DC use the same Basic auth header. The adapter builds the base64-encoded credential from `JSM_USER` and `JSM_PASSWORD`.
