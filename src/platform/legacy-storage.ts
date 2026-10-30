import { browser } from 'wxt/browser'
import { ensureOffscreen } from './audio'

export type LegacyStorage = {
  settings: Record<string, unknown> | null
  version: string | null
}
let legacy: LegacyStorage = { settings: null, version: null }

export async function loadLegacyStorage() {
  if (
    (await browser.storage.local.get('migration/legacyDocumentRead'))[
      'migration/legacyDocumentRead'
    ]
  )
    return
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('settings')
    legacy = {
      settings: raw ? JSON.parse(raw) : null,
      version: localStorage.getItem('sf_version'),
    }
  } else {
    await ensureOffscreen()
    const result = await browser.runtime.sendMessage({
      target: 'offscreen',
      action: 'read-legacy-storage',
    })
    if (!result?.ok) throw new Error(result?.error || '无法读取旧版设置')
    legacy = result.value
  }
}

export function getLegacyStorage() {
  return legacy
}
