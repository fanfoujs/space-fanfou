const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const extensionPath = path.resolve(__dirname, 'dist');
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker');
  
  worker.on('console', msg => console.log('SW LOG:', msg.text()));
  worker.on('pageerror', err => console.log('SW ERROR:', err.message));
  
  // Create a page just to trigger connection
  const page = await context.newPage();
  const extId = worker.url().split('/')[2];
  await page.goto(`chrome-extension://${extId}/settings.html`);
  
  await new Promise(r => setTimeout(r, 4000));
  await context.close();
})();
