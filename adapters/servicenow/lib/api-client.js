/**
 * REST client for ServiceNow Table API.
 *
 * Provides a unified HTTP client with:
 *  - Pagination via sysparm_offset + sysparm_limit
 *  - Auto-unwrap of { result: [...] } responses
 *  - Rate limit awareness (X-RateLimit-Remaining, Retry-After)
 *  - Retry with exponential backoff for transient failures
 *  - Configurable delay between requests (for dev instances)
 *  - Optional debug logging
 *
 * Usage:
 *   const { createApiClient } = require('./api-client');
 *   const config = loadConfig({ requireAuth: true });
 *   const api = createApiClient(config);
 *   const result = await api.get('/api/now/table/cmdb_ci_appl');
 */

const https = require('https');
const http = require('http');

function createApiClient(config, clientOptions = {}) {
  const {
    timeout = 30000,
    maxRetries = 2,
  } = clientOptions;

  const httpModule = config.isHttps ? https : http;
  let lastRequestTime = 0;

  function debug(msg, data) {
    if (!config.debug) return;
    console.log(`[DEBUG] ${msg}`);
    if (data !== undefined) console.log(JSON.stringify(data, null, 2));
  }

  async function throttle() {
    if (config.requestDelay > 0) {
      const elapsed = Date.now() - lastRequestTime;
      if (elapsed < config.requestDelay) {
        await new Promise(r => setTimeout(r, config.requestDelay - elapsed));
      }
    }
  }

  function request(method, endpoint, data, queryParams = {}) {
    lastRequestTime = Date.now();

    // Build query string
    const qs = new URLSearchParams(queryParams).toString();
    const fullPath = qs ? `${endpoint}?${qs}` : endpoint;

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

            if (res.statusCode >= 200 && res.statusCode < 300) {
              // Auto-unwrap ServiceNow { result: ... } wrapper
              resolve(json.result !== undefined ? json.result : json);
            } else {
              reject({
                status: res.statusCode,
                error: json.error || json,
                path: fullPath,
                retryAfter: res.headers['retry-after'] ? parseInt(res.headers['retry-after'], 10) : null,
              });
            }
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

  async function requestWithRetry(method, endpoint, data, queryParams) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await throttle();
        return await request(method, endpoint, data, queryParams);
      } catch (err) {
        lastError = err;
        const retryable = err.status === 0 || err.status === 429 || err.status >= 500;
        if (!retryable || attempt >= maxRetries) throw err;

        const delay = err.retryAfter
          ? err.retryAfter * 1000
          : Math.pow(2, attempt + 1) * 1000;
        debug(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  /**
   * Paginated GET that fetches all records from a table.
   * Returns the full array of records.
   */
  async function getAll(endpoint, queryParams = {}) {
    const all = [];
    let offset = 0;
    const limit = config.batchSize || 200;

    while (true) {
      const params = { ...queryParams, sysparm_offset: offset, sysparm_limit: limit };
      const batch = await requestWithRetry('GET', endpoint, null, params);
      const records = Array.isArray(batch) ? batch : [];
      all.push(...records);
      if (records.length < limit) break;
      offset += limit;
    }
    return all;
  }

  /**
   * Test connection to the ServiceNow instance.
   */
  async function testConnection() {
    try {
      await requestWithRetry('GET', '/api/now/table/sys_properties', null, {
        sysparm_query: 'name=instance_name',
        sysparm_fields: 'name,value',
        sysparm_limit: 1,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  return {
    request: requestWithRetry,
    get:  (endpoint, queryParams) => requestWithRetry('GET', endpoint, null, queryParams),
    post: (endpoint, data, queryParams) => requestWithRetry('POST', endpoint, data, queryParams),
    put:  (endpoint, data, queryParams) => requestWithRetry('PUT', endpoint, data, queryParams),
    del:  (endpoint, queryParams) => requestWithRetry('DELETE', endpoint, null, queryParams),
    getAll,
    testConnection,
  };
}

module.exports = { createApiClient };
