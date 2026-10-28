import { fileURLToPath } from 'node:url'
import { defineConfig } from 'wxt'
import preact from '@preact/preset-vite'

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  srcDir: 'src',
  publicDir: root('./public'),
  manifestVersion: 3,
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
  manifest: ({ browser }) => ({
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
              strict_min_version: '128.0',
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
  hooks: {
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
