import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, vi } from 'vitest'

vi.mock('wxt/browser', () => ({ browser: fakeBrowser }))
beforeEach(() => {
  fakeBrowser.reset()
})
