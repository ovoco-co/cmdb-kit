/**
 * Shared API client for JSM Assets adapter.
 *
 * Provides a unified HTTP client with:
 *  - Configurable base paths (Insight, Jira REST)
 *  - Request timeouts (default 30s)
 *  - Retry with exponential backoff for transient failures
 *  - Optional debug logging
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

  const httpModule = config.isHttps ? https : http;

  function debug(msg, data) {
    if (!config.debug) return;
    console.log(`[DEBUG] ${msg}`);
    if (data !== undefined) console.log(JSON.stringify(data, null, 2));
  }

  function request(method, endpoint, data, opts = {}) {
    const apiType = opts.apiType || defaultApiType;
    const basePath = BASE_PATHS[apiType] || BASE_PATHS.insight;
    const fullPath = `${basePath}${endpoint}`;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: config.url.hostname,
        port: config.url.port || (config.isHttps ? 443 : 80),
        path: fullPath,
        method,
        headers: {
          'Authorization': `Basic ${config.auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Atlassian-Token': 'no-check',
        },
      };

      debug(`${method} ${fullPath}`, data || undefined);

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
        const retryable = err.status === 0 || err.status >= 500;
        if (!retryable || attempt >= maxRetries) throw err;
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
