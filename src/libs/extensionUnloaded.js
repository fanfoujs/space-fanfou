import {EXTENSION_UNLOADED_EVENT_TYPE} from '@constants';

// Service Worker 兼容：检测 window 对象是否存在
const hasWindow = globalThis.window !== undefined;

export default {
	trigger() {
		if (!hasWindow) {
			return;
		}

		const event = new CustomEvent(EXTENSION_UNLOADED_EVENT_TYPE);
		globalThis.dispatchEvent(event);
	},

	addListener(fn) {
		if (!hasWindow) {
			return;
		}

		globalThis.addEventListener(EXTENSION_UNLOADED_EVENT_TYPE, fn, {
			once: true,
		});
	},
};
