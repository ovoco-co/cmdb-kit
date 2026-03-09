#!/usr/bin/env node
/**
 * Screenshot all object types in a JSM Assets schema using Playwright.
 *
 * Prerequisites:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Usage:
 *   node tools/screenshot-schema.js
 *
 * Environment (from .env):
 *   JSM_URL        - e.g. https://yoursite.atlassian.net
 *   JSM_USER       - Atlassian email
 *   JSM_PASSWORD   - API token (also used for browser login)
 *   SCHEMA_KEY     - Schema key (used to find schema ID)
 *
 * Output:
 *   screenshots/ directory with one PNG per object type
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const JSM_URL = process.env.JSM_URL;
const JSM_USER = process.env.JSM_USER;
const JSM_PASSWORD = process.env.JSM_PASSWORD;
const SCHEMA_ID = process.argv[2] || '42';

if (!JSM_URL || !JSM_USER || !JSM_PASSWORD) {
  console.error('Set JSM_URL, JSM_USER, and JSM_PASSWORD in .env');
  process.exit(1);
}

const baseUrl = JSM_URL.replace(/\/$/, '');

// Object types from schema - update these if your schema changes
const objectTypes = [
  { id: '434', name: 'Product CMDB' },
  { id: '435', name: 'Product Library' },
  { id: '436', name: 'Directory' },
  { id: '437', name: 'Lookup Types' },
  { id: '438', name: 'Product' },
  { id: '439', name: 'Server' },
  { id: '440', name: 'Database' },
  { id: '441', name: 'Product Component' },
  { id: '442', name: 'Product Version' },
  { id: '443', name: 'Document' },
  { id: '444', name: 'Deployment' },
  { id: '445', name: 'Organization' },
  { id: '446', name: 'Team' },
  { id: '447', name: 'Person' },
  { id: '448', name: 'Product Status' },
  { id: '449', name: 'Version Status' },
  { id: '450', name: 'Deployment Status' },
  { id: '451', name: 'Environment Type' },
  { id: '452', name: 'Document Type' },
  { id: '453', name: 'Document State' },
  { id: '454', name: 'Component Type' },
  { id: '455', name: 'Priority' },
  { id: '456', name: 'Organization Type' },
  { id: '457', name: 'Deployment Role' },
];

async function main() {
  const outDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Launching browser...`);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
  const page = await context.newPage();

  // Log in to Atlassian - manual login
  console.log(`Opening ${baseUrl}...`);
  console.log('Log in manually in the browser window (email, password, 2FA).');
  console.log('Waiting up to 3 minutes...\n');
  await page.goto(`${baseUrl}/login`);

  // Wait until the URL leaves the login/auth pages
  await page.waitForURL(
    url => !url.href.includes('/login') && !url.href.includes('id.atlassian.com'),
    { timeout: 180000 }
  );
  console.log('Login complete.');
  await page.waitForTimeout(3000);

  console.log(`\nScreenshotting ${objectTypes.length} object types...\n`);

  for (const type of objectTypes) {
    const url = `${baseUrl}/jira/assets/object-schema/${SCHEMA_ID}?typeId=${type.id}`;
    const filename = type.name.toLowerCase().replace(/ /g, '-') + '.png';

    console.log(`  ${type.name} -> ${filename}`);

    // Navigate to a blank page first to force a full reload of the SPA
    await page.goto('about:blank');
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Wait for the type name to appear in the page content
    try {
      await page.waitForFunction(
        name => document.body.innerText.includes(name),
        type.name,
        { timeout: 15000 }
      );
      await page.waitForTimeout(2000);
    } catch (_e) {
      console.log(`    (content not detected, screenshotting anyway)`);
    }

    await page.screenshot({
      path: path.join(outDir, filename),
      fullPage: true
    });
  }

  // Also screenshot the schema overview (type tree)
  console.log(`  Schema overview -> schema-overview.png`);
  await page.goto('about:blank');
  await page.goto(`${baseUrl}/jira/assets/object-schema/${SCHEMA_ID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: path.join(outDir, 'schema-overview.png'),
    fullPage: true
  });

  console.log(`\nDone. ${objectTypes.length + 1} screenshots saved to screenshots/`);
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
