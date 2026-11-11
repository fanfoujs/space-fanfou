import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, vi } from 'vitest'

vi.mock('wxt/browser', () => ({ browser: fakeBrowser }))
// Match form-data's browser export used in the shipped extension bundle.
vi.mock('form-data', () => ({ default: globalThis.FormData }))
beforeEach(() => {
  fakeBrowser.reset()
})
