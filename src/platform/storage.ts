import { browser } from 'wxt/browser'
import deepEqual from 'fast-deep-equal'

export type StorageAreaName = 'local' | 'sync' | 'session'
export type StorageValues = Record<string, unknown>
type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>

function resolveArea(name: StorageAreaName) {
  const area = browser.storage[name]
  return {
    area: area || browser.storage.local,
    prefix: area ? '' : `__sf_${name}__/`,
  }
}

export function createStorageArea(name: StorageAreaName) {
  return {
    async read(key: string) {
      const { area, prefix } = resolveArea(name)
      return (await area.get(prefix + key))[prefix + key]
    },
    async readAll(): Promise<StorageValues> {
      const { area, prefix } = resolveArea(name)
      return Object.fromEntries(
        Object.entries(await area.get(null))
          .filter(([key]) =>
            prefix ? key.startsWith(prefix) : !key.startsWith('__sf_'),
          )
          .map(([key, value]) => [key.slice(prefix.length), value]),
      )
    },
    async write(key: string, value: unknown) {
      if (value === undefined) return this.delete(key)
      const { area, prefix } = resolveArea(name)
      if (!deepEqual(await this.read(key), value))
        await area.set({ [prefix + key]: value })
    },
    async writeAll(values: StorageValues) {
      const { area, prefix } = resolveArea(name)
      const old = await this.readAll()
      const changed = Object.fromEntries(
        Object.entries(values)
          .filter(
            ([key, value]) =>
              value !== undefined && !deepEqual(old[key], value),
          )
          .map(([key, value]) => [prefix + key, value]),
      )
      if (Object.keys(changed).length) await area.set(changed)
    },
    async delete(key: string) {
      const { area, prefix } = resolveArea(name)
      await area.remove(prefix + key)
    },
    listen(listener: (changes: Changes) => void) {
      const { prefix } = resolveArea(name)
      browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== (prefix ? 'local' : name)) return
        const relevant = Object.fromEntries(
          Object.entries(changes)
            .filter(([key]) =>
              prefix ? key.startsWith(prefix) : !key.startsWith('__sf_'),
            )
            .map(([key, value]) => [key.slice(prefix.length), value]),
        )
        if (Object.keys(relevant).length) listener(relevant)
      })
    },
  }
}

export async function clearFallbackSession() {
  if (browser.storage.session) return
  const keys = Object.keys(await browser.storage.local.get(null)).filter(
    (key) => key.startsWith('__sf_session__/'),
  )
  if (keys.length) await browser.storage.local.remove(keys)
}
