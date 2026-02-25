import { test, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

test('dump settings page DOM', async () => {
  test.setTimeout(20_000);
  const extensionPath = path.resolve(__dirname, '../../dist');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  });

  try {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    const extensionId = background.url().split('/')[2];
    const page = await context.newPage();
    
    await page.goto(`chrome-extension://${extensionId}/settings.html`);
    console.log("Navigated to settings page");
    
    await page.waitForTimeout(3000);
    
    const html = await page.content();
    console.log("PAGE HTML:");
    console.log(html.substring(0, 1500));
    console.log("...");
    console.log(html.substring(html.length - 1500));
    await page.screenshot({ path: 'settings_page_debug.png' });
  } finally {
    await context.close();
  }
});
