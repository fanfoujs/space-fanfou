import messaging from './messaging.js';
import bridge from './bridge.js';
import settings from './settings.js';
import injectScript from './injectScript.js';
import injectMainStyle from './injectMainStyle.js';
import notification from '@content/modules/notification';

export default async function createContentEnvironment() {
	await messaging.ready();
	await bridge.ready();
	injectScript().catch(console.error);
	injectMainStyle();
	await settings.ready();
	messaging.registerBroadcastListener(async ({action, payload}) => {
		if (action !== 'NOTIFICATION_FALLBACK') {
			return;
		}

		await notification.ready();
		notification.create(notification.INFO, payload.message);
	});

	return {messaging, settings};
}
