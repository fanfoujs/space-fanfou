import {browser} from 'wxt/browser';
import messaging from './messaging.js';
import storage from './storage.js';
import settings from './settings.js';
import proxiedFetch from './proxiedFetch.js';
import proxiedAudio from './proxiedAudio.js';
import proxiedCreateTab from './proxiedCreateTab.js';
import fanfouOAuth from './fanfouOAuth.js';
import {loadLegacyStorage} from '@platform/legacy-storage';

let ready;
export default function createBackgroundEnvironment() {
	if (ready) {
		return ready;
	}

	messaging.install();
	messaging.registerHandler('INJECT_PAGE_SCRIPT', async (_payload, sender) => {
		if (
			sender?.tab?.id == null ||
			!/^https?:\/\/fanfou\.com\//.test(sender.url || sender.tab.url || '')
		) {
			return {error: '只能在饭否页面运行页面脚本'};
		}

		await browser.scripting.executeScript({
			target: {tabId: sender.tab.id, frameIds: [sender.frameId || 0]},
			world: 'MAIN',
			files: ['/page.js'],
		});
		return {ok: true};
	});
	storage.install();
	proxiedFetch.install();
	proxiedAudio.install();
	proxiedCreateTab.install();
	fanfouOAuth.install();
	ready = (async () => {
		globalThis.__SF_BACKGROUND_STATE__ = {phase: 'reading-legacy-storage'};
		await loadLegacyStorage();
		globalThis.__SF_BACKGROUND_STATE__ = {phase: 'loading-settings'};
		await settings.install();
		await browser.storage.local.set({'migration/legacyDocumentRead': true});
		return {messaging, settings};
	})();
	messaging.setReady(ready);
	return ready;
}
