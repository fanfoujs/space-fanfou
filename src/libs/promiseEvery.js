import isPromise from 'is-promise';

// 类似于 Array#every，总是 resolve 返回布尔值
export default (iterable) =>
	new Promise((resolve) => {
		const total = iterable.length;
		if (total === 0) {
			resolve(true);
			return;
		}

		let count = 0;

		let isDone = false;

		function check(value) {
			if (!value) {
				return fail();
			}

			if (++count !== total) {
				return;
			}

			isDone = true;
			resolve(true);
		}

		function fail() {
			isDone = true;
			resolve(false);
		}

		for (const item of iterable) {
			if (isDone) {
				return;
			}

			if (isPromise(item)) {
				item.catch(fail).then(check);
			} else {
				check(item);
			}
		}
	});
