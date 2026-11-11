import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const script = fileURLToPath(
  new URL('../../scripts/package-safari.mjs', import.meta.url),
)

describe('Safari 工程更新', () => {
  it.each(['project.pbxproj', 'project.xcproj'])(
    '更新 %s 的资源和构建设置，并保留签名团队',
    (filename) => {
      const root = mkdtempSync(path.join(tmpdir(), 'space-fanfou-safari-test-'))
      try {
        const source = path.join(root, '.output/safari-mv3')
        const projectRoot = path.join(
          root,
          '.output/safari-project/Space Fanfou',
        )
        const project = path.join(
          projectRoot,
          'Space Fanfou.xcodeproj',
          filename,
        )
        const resources = path.join(
          projectRoot,
          'Space Fanfou Extension/Resources',
        )
        const appInfo = path.join(projectRoot, 'Space Fanfou/Info.plist')
        mkdirSync(source, { recursive: true })
        mkdirSync(path.dirname(project), { recursive: true })
        mkdirSync(resources, { recursive: true })
        mkdirSync(path.dirname(appInfo), { recursive: true })
        writeFileSync(
          appInfo,
          '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n<key>SFSafariWebExtensionConverterVersion</key>\n<string>27.2</string>\n</dict>\n</plist>\n',
        )
        const manifest = JSON.stringify({ version: '2.0.1' })
        writeFileSync(path.join(source, 'manifest.json'), manifest)
        writeFileSync(path.join(resources, 'stale.js'), 'old')
        const modern = filename === 'project.xcproj'
        const setting = (name: string, value: string) =>
          modern ? `"${name}": "${value}",` : `${name} = "${value}";`
        writeFileSync(
          project,
          [
            setting('MARKETING_VERSION', '1.0'),
            setting('MACOSX_DEPLOYMENT_TARGET', '27.2'),
            setting('DEVELOPMENT_TEAM', 'EXISTING_TEAM'),
            setting('PRODUCT_BUNDLE_IDENTIFIER', 'me.litomore.Space-Fanfou'),
            setting(
              'PRODUCT_BUNDLE_IDENTIFIER',
              'me.litomore.spacefanfou.Extension',
            ),
          ].join('\n'),
        )

        const run = () =>
          spawnSync(process.execPath, [script], {
            cwd: root,
            encoding: 'utf8',
            // 已有工程只应更新资源，不应再次调用 Xcode 转换工具。
            env: { ...process.env, PATH: '' },
          })
        const result = run()
        expect(result.stderr).toBe('')
        expect(result.status).toBe(0)
        const contents = readFileSync(project, 'utf8')
        expect(contents).toContain(
          modern
            ? '"MARKETING_VERSION": "2.0.1"'
            : 'MARKETING_VERSION = 2.0.1;',
        )
        expect(contents).toContain(
          modern
            ? '"MACOSX_DEPLOYMENT_TARGET": "12.0"'
            : 'MACOSX_DEPLOYMENT_TARGET = 12.0;',
        )
        expect(contents).toContain(setting('DEVELOPMENT_TEAM', 'EXISTING_TEAM'))
        expect(contents).not.toContain('me.litomore.Space-Fanfou')
        expect(contents).toContain('me.litomore.spacefanfou.Extension')
        expect(contents).toContain(
          modern
            ? '"PRODUCT_BUNDLE_IDENTIFIER": "me.litomore.spacefanfou"'
            : 'PRODUCT_BUNDLE_IDENTIFIER = me.litomore.spacefanfou;',
        )
        expect(
          readFileSync(path.join(resources, 'manifest.json'), 'utf8'),
        ).toBe(manifest)
        expect(() => readFileSync(path.join(resources, 'stale.js'))).toThrow()
        const updatedPlist = readFileSync(appInfo, 'utf8')
        expect(updatedPlist).toContain(
          '<key>LSApplicationCategoryType</key>\n\t<string>public.app-category.social-networking</string>',
        )
        expect(updatedPlist).toContain(
          '<key>SFSafariWebExtensionConverterVersion</key>\n<string>27.2</string>',
        )
        expect(run().status).toBe(0)
        expect(readFileSync(project, 'utf8')).toBe(contents)
        expect(readFileSync(appInfo, 'utf8')).toBe(updatedPlist)
        const customCategory = updatedPlist.replace(
          'public.app-category.social-networking',
          'public.app-category.utilities',
        )
        writeFileSync(appInfo, customCategory)
        expect(run().status).toBe(0)
        expect(readFileSync(appInfo, 'utf8')).toBe(customCategory)
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    },
  )
})
