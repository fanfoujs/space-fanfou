import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const source = path.resolve('.output/safari-mv3')
const projectRoot = path.resolve('.output/safari-project/Space Fanfou')
const projectFiles = ['project.pbxproj', 'project.xcproj'].map((name) =>
  path.join(projectRoot, 'Space Fanfou.xcodeproj', name),
)
let project = projectFiles.find((file) => existsSync(file))
if (!existsSync(path.join(source, 'manifest.json')))
  throw new Error('请先运行 npm run build:safari')
if (project) {
  // 重建扩展资源时保留用户在 Xcode 中选择的签名团队与原生代码。
  const resources = path.join(projectRoot, 'Space Fanfou Extension/Resources')
  rmSync(resources, { recursive: true, force: true })
  cpSync(source, resources, { recursive: true })
  console.log('已更新 Safari 扩展资源，保留现有 Xcode 工程设置')
} else {
  const modern =
    spawnSync('xcrun', ['--find', 'safari-web-extension-packager'], {
      stdio: 'ignore',
    }).status === 0
  const result = spawnSync(
    'xcrun',
    [
      modern
        ? 'safari-web-extension-packager'
        : 'safari-web-extension-converter',
      source,
      '--project-location',
      path.resolve('.output/safari-project'),
      '--app-name',
      'Space Fanfou',
      '--bundle-identifier',
      'me.litomore.spacefanfou',
      '--swift',
      '--macos-only',
      '--copy-resources',
      '--no-open',
      '--no-prompt',
    ],
    { stdio: 'inherit' },
  )
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
  project = projectFiles.find((file) => existsSync(file))
}
if (!project) throw new Error('未找到生成的 Safari Xcode 工程文件')
// 当前 Xcode 模板可能用显示名称重新生成主应用 ID；保证扩展仍属于主应用。
const version = JSON.parse(
  readFileSync(path.join(source, 'manifest.json'), 'utf8'),
).version
// 新版工程使用带尾逗号的 JSON 语法，旧版则使用 OpenStep plist。
const modernProject = project.endsWith('.xcproj')
const settingPattern = (name) =>
  modernProject
    ? new RegExp(`("${name}"\\s*:\\s*)"([^"]*)"`, 'g')
    : new RegExp(`(${name}\\s*=\\s*)([^;]+);`, 'g')
const replaceSetting = (contents, name, value) =>
  contents.replace(settingPattern(name), (_match, prefix) =>
    modernProject ? `${prefix}"${value}"` : `${prefix}${value};`,
  )
let contents = replaceSetting(
  readFileSync(project, 'utf8'),
  'MARKETING_VERSION',
  version,
)
contents = replaceSetting(contents, 'MACOSX_DEPLOYMENT_TARGET', '12.0')
const identifiers = [
  ...contents.matchAll(settingPattern('PRODUCT_BUNDLE_IDENTIFIER')),
].map((match) => match[2].trim().replaceAll('"', ''))
const extension = identifiers.find((identifier) =>
  identifier.endsWith('.Extension'),
)
if (!extension) throw new Error('无法识别 Safari 扩展的 Bundle ID')
const parent = extension.slice(0, -'.Extension'.length)
writeFileSync(
  project,
  contents.replace(
    settingPattern('PRODUCT_BUNDLE_IDENTIFIER'),
    (_match, prefix, identifier) => {
      const value = identifier.includes('.Extension') ? extension : parent
      return modernProject ? `${prefix}"${value}"` : `${prefix}${value};`
    },
  ),
)
console.log(`Safari Xcode 工程：${path.dirname(project)}`)
