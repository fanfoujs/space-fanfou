import local from './local.js';
import sync from './sync.js';
import session from './session.js';
import safelyInvokeFns from '@libs/safelyInvokeFns';
import arrayUniquePush from '@libs/arrayUniquePush';
import arrayRemove from '@libs/arrayRemove';

function initStorageAreas() {
	const storageAreas = {local, sync, session};
	const listeners = [];
	const createListener = (storageAreaName) => (changes) => {
		for (const [key, {oldValue, newValue}] of Object.entries(changes)) {
			safelyInvokeFns({
				fns: listeners,
				args: [
					{
						key,
						storageAreaName,
						oldValue,
						newValue,
					},
				],
			});
		}
	};

	// SessionStorage 不需要监听改动
	let isInitialized = false;
	function initialize() {
		if (isInitialized) {
			return;
		}

		isInitialized = true;
		for (const storageAreaName of ['local', 'sync']) {
			storageAreas[storageAreaName].listen(createListener(storageAreaName));
		}
	}

	return {
		...storageAreas,
		initialize,
		listen: (fn) => arrayUniquePush(listeners, fn),
		unlisten: (fn) => arrayRemove(listeners, fn),
	};
}

export default initStorageAreas();
