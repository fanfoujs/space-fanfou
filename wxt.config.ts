import { fileURLToPath } from 'node:url'
import { defineConfig } from 'wxt'
import preact from '@preact/preset-vite'
import packageJson from './package.json'

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  srcDir: 'src',
  publicDir: root('./public'),
  manifestVersion: 3,
  zip: {
    artifactTemplate: '{{name}}-{{version}}-{{browser}}{{modeSuffix}}.zip',
    sourcesTemplate: '{{name}}-{{version}}-sources{{modeSuffix}}.zip',
    includeSources: [
      'src/**',
      'assets/**',
      'public/**',
      'scripts/**',
      'docs/**',
      'tests/**',
      '*.json',
      '*.ts',
      '*.mjs',
      'README.md',
      'CONTRIBUTING.md',
      'COPYING',
      '.npmrc',
      '.postcssrc.js',
      '.browserslistrc',
    ],
  },
  imports: false,
  alias: Object.fromEntries([
    ...[
      'background',
      'content',
      'page',
      'settings',
      'features',
      'libs',
      'constants',
      'version-history',
      'platform',
    ].map((name) => [`@${name}`, root(`./src/${name}`)]),
    ['@assets', root('./assets')],
  ]),
  manifest: ({ browser, mode }) => ({
    name: '太空饭否',
    description:
      '为饭否添加回复和转发展开、浮动输入框、多用户切换、消息批量管理、自动翻页等功能。',
    ...(browser === 'chrome' ? { minimum_chrome_version: '123' } : {}),
    icons: Object.fromEntries(
      [16, 24, 32, 48, 128, 256].map((size) => [
        size,
        `icons/icon-${size}.png`,
      ]),
    ),
    action: { default_title: '太空饭否', default_popup: 'settings.html' },
    ...(browser === 'chrome' && mode === 'beta'
      ? {
          name: '太空饭否 Beta',
          version: `${packageJson.version}.${packageJson.chromeBetaBuild}`,
          version_name: packageJson.version,
          description:
            'THIS EXTENSION IS FOR BETA TESTING. 太空饭否测试版，为饭否提供页面外观和浏览、发帖体验增强功能。',
          action: {
            default_title: '太空饭否 Beta',
            default_popup: 'settings.html',
          },
        }
      : {}),
    options_ui: {
      page: 'settings.html',
      ...(browser === 'safari' ? {} : { open_in_tab: true }),
    },
    permissions: [
      'tabs',
      'contextMenus',
      'storage',
      'scripting',
      'alarms',
      ...(browser === 'safari' ? [] : ['notifications', 'identity']),
      ...(browser === 'chrome' ? ['offscreen'] : []),
    ],
    host_permissions: ['*://*.fanfou.com/*', 'https://setq.me/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'",
    },
    web_accessible_resources: [
      {
        resources: ['page.js', 'assets/*'],
        matches: ['*://fanfou.com/*'],
      },
    ],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'space-fanfou@litomore.me',
              strict_min_version: '140.0',
              data_collection_permissions: { required: ['none'] },
            },
            gecko_android: { strict_min_version: '142.0' },
          },
        }
      : {}),
  }),
  hooks: {
    'vite:build:extendConfig'(entrypoints, config) {
      const entrypoint = entrypoints[0]
      if (entrypoint?.type !== 'unlisted-style') return

      // Keep the stylesheet path stable and name its images by content, so
      // parallel asset processing cannot change names between review builds.
      const output = config.build?.rollupOptions?.output
      if (output && !Array.isArray(output)) {
        output.assetFileNames = (asset) =>
          asset.names.some((name) => name.endsWith('.css'))
            ? `assets/${entrypoint.name}.css`
            : 'assets/[name]-[hash].[ext]'
      }
    },
    'build:manifestGenerated'(wxt, manifest) {
      if (wxt.config.browser === 'safari') {
        manifest.background = { scripts: ['background.js'] }
      }
    },
  },
  vite: () => ({
    plugins: [preact({ prefreshEnabled: false })],
    resolve: {
      extensions: [
        '.mjs',
        '.js',
        '.ts',
        '.tsx',
        '.jsx',
        '.json',
        '.less',
        '.css',
      ],
    },
    build: { assetsInlineLimit: 0 },
  }),
})
