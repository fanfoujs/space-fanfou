import simpleMemoize from 'just-once'
import { ASSET_CLASSNAME } from '@constants'

export default simpleMemoize(() => {
  const runtime = globalThis.browser?.runtime || globalThis.chrome?.runtime
  if (runtime?.id) return runtime.getURL('/').replace(/\/$/, '')
  const marker = document.querySelector('meta[name="space-fanfou-extension-origin"]')
  if (marker?.content) return marker.content
  const script = document.querySelector(`script.${ASSET_CLASSNAME}[src]`)
  if (!script) throw new Error('找不到太空饭否页面脚本的资源地址')
  const url = new URL(script.src)
  return `${url.protocol}//${url.host}`
})
