import safelyInvokeFn from '@libs/safelyInvokeFn'

// 使用 try-catch 包裹调用函数数组，这样任一函数出错不会影响到后面函数继续执行
export default opts => {
  if (Array.isArray(opts)) {
    opts = { fns: opts }
  }

  const { fns, ...restOpts } = opts

  for (const fn of fns) {
    safelyInvokeFn({ fn, ...restOpts })
  }
}
