/**
 * Shared API client for JSM Assets adapter.
 *
 * Provides a unified HTTP client with:
 *  - Configurable base paths (Insight, Jira REST)
 *  - Automatic Cloud vs Data Center routing
 *  - Request timeouts (default 30s)
 *  - Retry with exponential backoff for transient failures
 *  - Optional debug logging
 *
 * Cloud requests to the Assets/Insight API are routed through
 * api.atlassian.com with the workspace ID in the path.
 * All other API types (jira, servicedesk) hit the site URL directly.
 *
 * Usage:
 *   const { createApiClient } = require('./api-client');
 *   const { loadConfig } = require('./config');
 *
 *   const config = loadConfig({ requireAuth: true });
 *   const api = createApiClient(config);
 *   const schemas = await api.get('/objectschema/list');
 */

const https = require('https');
const http = require('http');

const BASE_PATHS = {
  insight: '/rest/insight/1.0',
  jira: '/rest/api/2',
  servicedesk: '/rest/servicedeskapi',
  raw: '',
};

function createApiClient(config, clientOptions = {}) {
  const {
    timeout = 30000,
    maxRetries = 0,
    defaultApiType = 'insight',
  } = clientOptions;

  function debug(msg, data) {
    if (!config.debug) return;
    console.log(`[DEBUG] ${msg}`);
    if (data !== undefined) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Resolve connection parameters for a request.
   * Cloud 'insight' calls route to api.atlassian.com.
   * Everything else goes to the configured JSM site URL.
   */
  function resolveConnection(apiType) {
    if (config.isCloud && apiType === 'insight') {
      if (!config.workspaceId) {
        throw new Error(
          'Cloud workspace ID not set. Call resolveWorkspaceId(config, api) before making Assets API calls.'
        );
      }
      return {
        hostname: 'api.atlassian.com',
        port: 443,
        basePath: `/jsm/assets/workspace/${config.workspaceId}/v1`,
        useHttps: true,
      };
    }

    return {
      hostname: config.url.hostname,
      port: config.url.port || (config.isHttps ? 443 : 80),
      basePath: BASE_PATHS[apiType] || BASE_PATHS.insight,
      useHttps: config.isHttps,
    };
  }

  function request(method, endpoint, data, opts = {}) {
    const apiType = opts.apiType || defaultApiType;
    const conn = resolveConnection(apiType);
    const fullPath = `${conn.basePath}${endpoint}`;
    const httpModule = conn.useHttps ? https : http;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: conn.hostname,
        port: conn.port,
        path: fullPath,
        method,
        headers: {
          'Authorization': `Basic ${config.auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Atlassian-Token': 'no-check',
        },
      };

      debug(`${method} ${conn.hostname}${fullPath}`, data || undefined);

      const req = httpModule.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = body ? JSON.parse(body) : {};
            debug(`Response ${res.statusCode}`, json);
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
            else reject({ status: res.statusCode, error: json, path: fullPath });
          } catch (_e) {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(body || {});
            else reject({ status: res.statusCode, error: body, path: fullPath });
          }
        });
      });

      req.on('error', (e) => reject({ status: 0, error: e.message, path: fullPath }));
      req.setTimeout(timeout, () => { req.destroy(); reject({ status: 0, error: 'Request timeout', path: fullPath }); });

      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  async function requestWithRetry(method, endpoint, data, opts) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await request(method, endpoint, data, opts);
      } catch (err) {
        lastError = err;
        const retryable = err.status === 0 || err.status >= 500 || err.status === 429;
        if (!retryable || attempt >= maxRetries) throw err;
        // Use Retry-After header if available, otherwise exponential backoff
        const delay = Math.pow(2, attempt + 1) * 1000;
        debug(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  return {
    request: requestWithRetry,
    get:  (endpoint, opts) => requestWithRetry('GET', endpoint, null, opts),
    post: (endpoint, data, opts) => requestWithRetry('POST', endpoint, data, opts),
    put:  (endpoint, data, opts) => requestWithRetry('PUT', endpoint, data, opts),
    del:  (endpoint, opts) => requestWithRetry('DELETE', endpoint, null, opts),
  };
}

module.exports = { createApiClient, BASE_PATHS };
