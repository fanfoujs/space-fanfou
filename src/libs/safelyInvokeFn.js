import defined from 'defined';
import log from '@libs/log';

function defaultExceptionHandler(error) {
	log.error(error);
}

// 使用 try-catch 包裹调用函数
export default (options) => {
	let fn;

	if (typeof options === 'function') {
		fn = options;
		options = {};
	} else {
		fn = options.fn;
	}

	const exceptionHandler = defined(
		options.exceptionHandler,
		defaultExceptionHandler,
	);
	const args = defined(options.args, []);

	try {
		const result = fn(...args);
		return result?.catch ? result.catch(exceptionHandler) : result;
	} catch (error) {
		exceptionHandler(error);
	}
};
