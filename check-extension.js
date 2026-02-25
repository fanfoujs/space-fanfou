const { chromium } = require('playwright');
(async () => {
  const pathToExtension = require('path').join(__dirname, 'dist');
  const browser = await chromium.launchPersistentContext('', {
    headless: true, // Need true for CI
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
  
  const page = await browser.newPage();
  await page.goto('chrome://extensions/');
  await new Promise(r => setTimeout(r, 2000));
  
  // Extract error details from chrome://extensions/ using JS Handle
  const extData = await page.evaluate(async () => {
    return new Promise(resolve => {
      chrome.management.getAll(ext => {
        resolve(ext);
      });
    });
  });
  
  console.log("Installed Extensions:", JSON.stringify(extData, null, 2));

  await browser.close();
})();
