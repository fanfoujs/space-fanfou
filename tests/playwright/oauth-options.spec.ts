import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {test, chromium} from '@playwright/test';

test('dump settings page DOM', async () => {
	test.setTimeout(20_000);
	const extensionPath = path.resolve('.output/chrome-mv3');
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
		background ||= await context.waitForEvent('serviceworker');

		background.on('console', (message) => {
			console.log('SW LOG:', message.text());
		});
		background.on('pageerror', (error) => {
			console.log('SW ERROR:', error.message);
		});

		const extensionId = background.url().split('/', 3)[2];
		const page = await context.newPage();
		page.on('console', (message) => {
			console.log('PAGE LOG:', message.text());
		});
		page.on('pageerror', (error) => {
			console.log('PAGE ERROR:', error.message);
		});

		await page.goto(`chrome-extension://${extensionId}/settings.html`);
		console.log('Navigated to settings page');

		await page.waitForTimeout(3000);

		const html = await page.content();
		console.log('PAGE HTML:');
		console.log(html.slice(0, 1500));
		console.log('...');
		console.log(html.slice(Math.max(0, html.length - 1500)));
		await page.screenshot({path: 'settings_page_debug.png'});
	} finally {
		await context.close();
	}
});
