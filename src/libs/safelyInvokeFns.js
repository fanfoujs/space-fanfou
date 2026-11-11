import safelyInvokeFn from '@libs/safelyInvokeFn';

// 使用 try-catch 包裹调用函数数组，这样任一函数出错不会影响到后面函数继续执行
export default (options) => {
	if (Array.isArray(options)) {
		options = {fns: options};
	}

	const {fns, ...restOptions} = options;

	for (const fn of fns) {
		safelyInvokeFn({fn, ...restOptions});
	}
};
