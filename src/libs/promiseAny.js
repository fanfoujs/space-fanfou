import isPromise from 'is-promise';

// 类似于 Array#some，总是 resolve 返回布尔值。
// 这里如果使用 async/await 的话，代码可以简单许多，但是要么只能串行执行，
// 要么用 Promsie.all() 并行执行但是必须等待所有都结束。
// 没有使用 p-any 的原因是，它在不达成条件的情况下会 reject/throw，我们这里则是 resolve(false)。
// 后者的好处是使用起来更方便，前者就只能用 try/catch 来判断。
// 而且 p-any 代码量明显大于下面这个实现。
export default (iterable) =>
	new Promise((resolve) => {
		const total = iterable.length;
		if (total === 0) {
			resolve(false);
			return;
		}

		let count = 0;

		let isDone = false;

		function check(value) {
			if (isDone) {
				return;
			}

			if (value) {
				isDone = true;
				resolve(true);
			} else {
				fail();
			}
		}

		function fail() {
			if (isDone || ++count !== total) {
				return;
			}

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
