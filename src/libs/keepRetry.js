import safelyInvokeFn from '@libs/safelyInvokeFn';
import noop from '@libs/noop';

function forever() {
	return false;
}

async function keepRetry(options) {
	const {
		checker,
		executor = noop,
		delay = 100,
		until = forever,
		resolve,
		reject,
	} = options;

	if (await checker()) {
		safelyInvokeFn(executor);
		resolve(true);
	} else if (until()) {
		reject();
	} else {
		setTimeout(keepRetry, delay, options);
	}
}

export default (options) =>
	new Promise((resolve, reject) => {
		keepRetry({...options, resolve, reject});
	});
