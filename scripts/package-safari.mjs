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
const project = path.join(projectRoot, 'Space Fanfou.xcodeproj/project.pbxproj')
if (!existsSync(path.join(source, 'manifest.json')))
  throw new Error('请先运行 npm run build:safari')
if (existsSync(project)) {
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
}
// 当前 Xcode 模板可能用显示名称重新生成主应用 ID；保证扩展仍属于主应用。
const version = JSON.parse(
  readFileSync(path.join(source, 'manifest.json'), 'utf8'),
).version
const contents = readFileSync(project, 'utf8')
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(
    /MACOSX_DEPLOYMENT_TARGET = [^;]+;/g,
    'MACOSX_DEPLOYMENT_TARGET = 12.0;',
  )
const identifiers = [
  ...contents.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g),
].map((match) => match[1].replaceAll('"', ''))
const extension = identifiers.find((identifier) =>
  identifier.endsWith('.Extension'),
)
if (!extension) throw new Error('无法识别 Safari 扩展的 Bundle ID')
const parent = extension.slice(0, -'.Extension'.length)
writeFileSync(
  project,
  contents.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g,
    (_match, identifier) =>
      `PRODUCT_BUNDLE_IDENTIFIER = ${identifier.includes('.Extension') ? extension : parent};`,
  ),
)
