// 判断版本号是否为 '0.x.x.x' 的格式
export default version => (
  typeof version === 'string' &&
  /^0\.\d\.\d\.\d$/.test(version)
)
