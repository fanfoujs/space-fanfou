const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
  const extensionPath = path.resolve(__dirname, 'dist');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-'));
  
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: true, // Need true or xvfb is required
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  });

  browserContext.on('serviceworker', worker => {
    console.log('[SW Event] Service worker registered');
    worker.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[SW CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    worker.on('pageerror', error => {
      console.error(`[SW UNCAUGHT EXCEPTION] ${error.message}`);
    });
  });

  const page = await browserContext.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[Browser ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error(`[Browser UNCAUGHT EXCEPTION] ${error.message}`);
  });

  console.log('Navigating to Fanfou...');
  await page.goto('https://fanfou.com/wangxing', { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting 3 seconds...');
  await page.waitForTimeout(3000);

  await browserContext.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
})();
