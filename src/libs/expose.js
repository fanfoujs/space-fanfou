// Service Worker 兼容：检测 window 对象是否存在
export default (object) => {
	// Service Worker 环境中没有 window 对象，直接返回
	if (globalThis.window === undefined) {
		return;
	}

	if (typeof SF === 'undefined') {
		globalThis.SF = {};
	}

	Object.assign(SF, object);
};
