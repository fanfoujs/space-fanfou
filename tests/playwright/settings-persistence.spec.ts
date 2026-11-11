import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	chromium,
	expect,
	test,
	type BrowserContext,
	type Page,
} from '@playwright/test';

test('disabled auto expansion survives stale settings windows and an extension restart', async () => {
	const profile = fs.mkdtempSync(
		path.join(os.tmpdir(), 'space-fanfou-settings-'),
	);
	const extension = path.resolve('.output/chrome-mv3');
	let context: BrowserContext | undefined;
	const launch = async () => {
		const browser = await chromium.launchPersistentContext(profile, {
			channel: 'chromium',
			executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
			headless: true,
			args: [
				`--disable-extensions-except=${extension}`,
				`--load-extension=${extension}`,
			],
		});
		await browser.route(/^https?:\/\/(?:[^/]+\.)?fanfou\.com\//, (route) =>
			route.fulfill({status: 200, body: '<html></html>'}),
		);
		const worker =
			browser.serviceWorkers()[0] ||
			(await browser.waitForEvent('serviceworker'));
		await expect
			.poll(() =>
				worker.evaluate(
					() => (globalThis as any).__SF_BACKGROUND_STATE__?.phase,
				),
			)
			.toBe('ready');
		return {
			browser,
			extensionUrl: `chrome-extension://${new URL(worker.url()).host}/settings.html`,
		};
	};

	const storedAutoFetch = (page: Page, area: 'local' | 'sync') =>
		page.evaluate(async (areaName) => {
			const values = await (globalThis as any).chrome.storage[areaName].get(
				'settings',
			);
			return values.settings['show-contextual-statuses/autoFetch'];
		}, area);

	try {
		const first = await launch();
		context = first.browser;
		const page = await context.newPage();
		await page.goto(first.extensionUrl);
		const autoExpand = page.getByRole('checkbox', {
			name: '消息载入后自动展开 1 条消息',
			exact: true,
		});
		await expect(autoExpand).not.toBeChecked();
		await autoExpand.check();
		await expect.poll(() => storedAutoFetch(page, 'sync')).toBe(true);

		// This view still holds the old enabled value when another view disables it.
		const stale = await context.newPage();
		await stale.goto(first.extensionUrl);
		await expect(
			stale.getByRole('checkbox', {
				name: '消息载入后自动展开 1 条消息',
				exact: true,
			}),
		).toBeChecked();
		await autoExpand.uncheck();
		await expect.poll(() => storedAutoFetch(page, 'local')).toBe(false);
		await expect.poll(() => storedAutoFetch(page, 'sync')).toBe(false);
		await page.close();

		await stale
			.getByRole('checkbox', {
				name: '随页面向下滚动自动加载更多消息',
				exact: true,
			})
			.uncheck();
		await expect
			.poll(() =>
				stale.evaluate(
					async () =>
						(await (globalThis as any).chrome.storage.local.get('settings'))
							.settings['auto-pager'],
				),
			)
			.toBe(false);
		expect(await storedAutoFetch(stale, 'local')).toBe(false);
		await stale.reload();
		await expect(
			stale.getByRole('checkbox', {
				name: '消息载入后自动展开 1 条消息',
				exact: true,
			}),
		).not.toBeChecked();
		await expect.poll(() => storedAutoFetch(stale, 'sync')).toBe(false);

		await context.close();
		context = undefined;
		const restarted = await launch();
		context = restarted.browser;
		const restored = await context.newPage();
		await restored.goto(restarted.extensionUrl);
		await expect(
			restored.getByRole('checkbox', {
				name: '消息载入后自动展开 1 条消息',
				exact: true,
			}),
		).not.toBeChecked();
		expect(await storedAutoFetch(restored, 'local')).toBe(false);
		expect(await storedAutoFetch(restored, 'sync')).toBe(false);
	} finally {
		await context?.close();
		fs.rmSync(profile, {recursive: true, force: true});
	}
});
