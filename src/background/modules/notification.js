import {browser} from 'wxt/browser';
import debounce from 'just-debounce-it';
import {events} from '@platform/events';
import {createStorageArea} from '@platform/storage';
import {playBackgroundAudio} from '@platform/audio';
import settings from '@background/environment/settings';
import messaging from '@background/environment/messaging';
import wrapper from '@libs/wrapper';
import log from '@libs/log';
import SOUND_URL from '@assets/sounds/ding.mp3';

const DEFAULT_TIMEOUT = 15_000;
const ALARM_PREFIX = 'notification-expire/';
const state = createStorageArea('session');
const callbacks = new Map();
const playSound = debounce(() => {
	if (settings.read('notifications/playSound')) {
		playBackgroundAudio(SOUND_URL).catch(log.info);
	}
}, 1);

async function destroy(id) {
	callbacks.delete(id);
	await Promise.all([
		browser.notifications?.clear(id),
		browser.alarms.clear(ALARM_PREFIX + id),
		state.delete('notification/' + id),
	]);
	if (!browser.notifications) {
		await browser.action.setBadgeText({text: ''});
	}
}

async function create(options) {
	const {
		id,
		title = '太空饭否',
		message,
		timeout = DEFAULT_TIMEOUT,
		buttonDefs = [],
	} = options;
	if (!id) {
		throw new Error('必须指定通知的 id');
	}

	await destroy(id);
	const record = {
		targetUrl: options.targetUrl,
		reuseExistingTabs: Boolean(options.reuseExistingTabs),
		action: options.action,
		expiresAt: Date.now() + timeout,
	};
	await state.write('notification/' + id, record);
	callbacks.set(id, options);
	if (browser.notifications) {
		await browser.notifications.create(id, {
			type: 'basic',
			iconUrl: browser.runtime.getURL('/icons/icon-256.png'),
			title,
			message,
			...(import.meta.env.CHROME && {
				buttons: buttonDefs.map(({title: buttonTitle}) => ({
					title: buttonTitle,
				})),
				requireInteraction: true,
				silent: true,
			}),
		});
	} else {
		// Safari has no WebExtensions notifications API: preserve unread indicators
		// and surface the message in open Fanfou pages as well as the toolbar badge.
		await browser.action.setBadgeText({text: '•'});
		messaging.broadcastMessage({
			action: 'NOTIFICATION_FALLBACK',
			payload: {title, message},
		});
	}

	playSound();
	await browser.alarms.create(ALARM_PREFIX + id, {when: record.expiresAt});
}

async function click(id, buttonIndex) {
	const options = callbacks.get(id);
	const record = await state.read('notification/' + id);
	if (options) {
		const handler =
			buttonIndex == null
				? options.onClick
				: options.buttonDefs?.[buttonIndex]?.onClick;
		await handler?.();
	} else if (record && (buttonIndex == null || buttonIndex === 0)) {
		if (record.targetUrl) {
			const tabs = record.reuseExistingTabs
				? await browser.tabs.query({url: record.targetUrl})
				: [];
			const tab = tabs[0];
			if (tab?.id == null) {
				await browser.tabs.create({url: record.targetUrl, active: true});
			} else {
				await browser.tabs.update(tab.id, {active: true});
				await browser.windows.update(tab.windowId, {focused: true});
				await browser.tabs.reload(tab.id);
			}
		}

		if (record.action) {
			await messaging.invoke(record.action.type, record.action.payload);
		}
	}

	await destroy(id);
}

export default wrapper({
	install() {
		events.notificationClicked.addListener((id) => click(id));
		events.notificationButtonClicked.addListener(click);
		events.alarm.addListener((alarm) => {
			if (alarm.name.startsWith(ALARM_PREFIX)) {
				return destroy(alarm.name.slice(ALARM_PREFIX.length));
			}
		});
	},
	create: (options) => create(options).catch(log.error),
	hide: (id) => destroy(id).catch(log.error),
});
