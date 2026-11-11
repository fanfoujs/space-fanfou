import transformUrl from 'transform-url';
import loadAsset, {
	injectBeforeFirstScriptOrAppendToHead,
} from '@libs/loadAsset';
import Deferred from '@libs/Deferred';

let count = 0;
const prefix = 'spacefanfou$$jsonp';

const ERR_TIMEOUT = new Error('JSONP timeout');

export default (url, options = {}) => {
	const id = `${prefix}${count++}`;
	const parameters = options.params || {};
	const callbackField = options.callbackField || 'callback';
	const timeout = options.timeout == null ? 60_000 : options.timeout;
	const isCache = options.cache === true;
	const d = new Deferred();
	let timer;
	let script;

	if (timeout) {
		timer = setTimeout(() => {
			d.reject(ERR_TIMEOUT);
			cleanup();
		}, timeout);
	}

	function cleanup() {
		delete window[id];

		if (timer) {
			clearTimeout(timer);
			timer = null;
		}

		if (!script) {
			return;
		}

		script.remove();
		script = null;
	}

	function wrappedCallback(response) {
		d.resolve(response);
		cleanup();
	}

	window[id] = wrappedCallback;

	const finalParameters = {...parameters, [callbackField]: id};
	if (!isCache) {
		finalParameters._ = Date.now();
	}

	const finalUrl = transformUrl(url, finalParameters);

	script = loadAsset({
		type: 'script',
		url: finalUrl,
		mount: injectBeforeFirstScriptOrAppendToHead,
	});

	return d.promise;
};
