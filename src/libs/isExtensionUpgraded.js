import semver from 'semver'
import isLegacyVersion from '@libs/isLegacyVersion'

export default (previousVersion, currentVersion) => {
  // 新安装，没有检查到旧版本号
  if (!previousVersion) return false
  // 检查到老的 '0.x.x.x' 版本号，但是这个不能直接传给 semver，会报错
  if (isLegacyVersion(previousVersion)) return true
  return semver.gt(currentVersion, previousVersion)
}
