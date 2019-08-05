import transformUrl from 'transform-url'
import loadAsset, { injectBeforeFirstScriptOrAppendToHead } from '@libs/loadAsset'
import Deferred from '@libs/Deferred'

let count = 0
const prefix = 'spacefanfou$$jsonp'

const ERR_TIMEOUT = new Error('JSONP timeout')

export default (url, opts = {}) => {
  const id = `${prefix}${count++}`
  const params = opts.params || {}
  const callbackField = opts.callbackField || 'callback'
  const timeout = opts.timeout != null ? opts.timeout : 60000
  const cache = opts.cache === true
  const d = new Deferred()
  let timer
  let script

  if (timeout) {
    timer = setTimeout(() => {
      d.reject(ERR_TIMEOUT)
      cleanup()
    }, timeout)
  }

  function cleanup() {
    delete window[id]

    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (script) {
      script.remove()
      script = null
    }
  }

  function wrappedCallback(response) {
    d.resolve(response)
    cleanup()
  }
  window[id] = wrappedCallback

  const finalParams = { ...params, [callbackField]: id }
  if (!cache) finalParams._ = Date.now()
  const finalUrl = transformUrl(url, finalParams)

  script = loadAsset({
    type: 'script',
    url: finalUrl,
    mount: injectBeforeFirstScriptOrAppendToHead,
  })

  return d.promise
}
