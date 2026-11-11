export default (fn) => {
	let promise;

	return (...args) => {
		promise ||= fn(...args).finally(() => {
			promise = null;
		});

		return promise;
	};
};
