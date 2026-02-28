import { test, expect } from '@playwright/test'

test('probe Fanfou API', async ({ page }) => {
  await page.goto('https://fanfou.com/kesikesi')
  const metaAuthor = await page.locator('meta[name="author"]').getAttribute('content')
  console.log('meta author:', metaAuthor)
  
  await page.goto('https://fanfou.com/%E7%B4%A0%E7%99%BD')
  const metaAuthor2 = await page.locator('meta[name="author"]').getAttribute('content')
  console.log('meta author 2:', metaAuthor2)
})
