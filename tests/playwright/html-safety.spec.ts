import path from 'node:path'
import { expect, test } from '@playwright/test'
import { build } from 'vite'

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium' })

let templates: string
let removeBrackets: string

test.beforeAll(async () => {
  async function bundle(entry: string, name: string) {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        lib: { entry: path.resolve(entry), name, formats: ['iife'] },
      },
    })
    const output = Array.isArray(result) ? result[0] : result
    if (!('output' in output)) throw new Error('Expected a library bundle')
    const chunk = output.output.find((output) => output.type === 'chunk')
    if (!chunk || chunk.type !== 'chunk')
      throw new Error('Missing library code')
    return chunk.code
  }
  ;[templates, removeBrackets] = await Promise.all([
    bundle('src/features/better-at-autocomplete/templates.js', 'templates'),
    bundle('src/features/remove-brackets/@content.js', 'removeBrackets'),
  ])
})

test('autocomplete preserves highlights and rejects injected markup and avatar schemes', async ({
  page,
}) => {
  await page.setContent('<div id="menu"></div>')
  await page.addScriptTag({ content: templates })
  const result = await page.evaluate(() => {
    const render = (window as any).templates.menuItemTemplate
    const menu = document.querySelector('#menu')!
    menu.innerHTML = render({
      original: { photo_url: 'https://example.com/avatar.jpg' },
      string: '<strong>小</strong>明 user<strong>id</strong>',
    })
    const normal = {
      text: menu.textContent,
      highlights: [...menu.querySelectorAll('strong')].map(
        (el) => el.textContent,
      ),
      avatar: menu.querySelector('img')?.getAttribute('src'),
    }
    for (const url of [
      'javascript:alert(1)',
      'data:image/svg+xml,<svg onload="alert(1)"></svg>',
      'https://example.com/" onerror="alert(1)',
    ]) {
      menu.innerHTML = render({
        original: { photo_url: url },
        string:
          '<svg/onload=alert(1)><img/src=x/onerror=alert(1)><strong/onmouseover=alert(1)>名字</strong> userid',
      })
      if (menu.querySelectorAll('img').length !== 1)
        throw new Error('Injected image')
      if (menu.querySelector('svg,script,[onload],[onerror],[onmouseover]')) {
        throw new Error('Executable markup survived')
      }
      const src = menu.querySelector('img')?.getAttribute('src')
      if (src && !src.startsWith('https://'))
        throw new Error('Unsafe avatar scheme')
    }
    return normal
  })
  expect(result).toEqual({
    text: '小明 (userid)',
    highlights: ['小', 'id'],
    avatar: 'https://example.com/avatar.jpg',
  })
})

test('removing count brackets preserves child nodes and their event listeners', async ({
  page,
}) => {
  await page.setContent(
    '<div id="navigation"><span class="count">(12)</span><span class="count">(<b>34</b>)</span><span class="count">56</span><span class="count">()</span></div>',
  )
  await page.addScriptTag({ content: removeBrackets })
  await page.evaluate(() => {
    const bold = document.querySelector('b')!
    ;(window as any).originalBold = bold
    bold.addEventListener('click', () =>
      bold.setAttribute('data-clicked', 'yes'),
    )
    ;(window as any).removeBrackets().onLoad()
  })
  await expect(page.locator('.count')).toHaveText(['12', '34', '56', ''])
  expect(
    await page.evaluate(
      () => document.querySelector('b') === (window as any).originalBold,
    ),
  ).toBe(true)
  await page.locator('b').click()
  await expect(page.locator('b')).toHaveAttribute('data-clicked', 'yes')
})
