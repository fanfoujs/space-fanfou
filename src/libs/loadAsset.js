import extensionUnloaded from '@libs/extensionUnloaded'
import log from '@libs/log'
import { ASSET_CLASSNAME } from '@constants'

export function appendToRoot(element) {
  document.documentElement.append(element)
}

// 假设了 <head /> 的存在，使用时需注意
export function appendToHead(element) {
  document.head.append(element)
}

// 如果页面中不存在任何 <script> 标签，则假设存在 <head />，使用时需注意
export function injectBeforeFirstScriptOrAppendToHead(element) {
  const firstScript = document.getElementsByTagName('script')[0]

  if (firstScript) {
    firstScript.before(element)
  } else {
    appendToHead(element)
  }
}

export function insertImmediatelyAfterHead(element) {
  document.head.after(element)
}

export function insertBeforeBody(element) {
  if (document.body) {
    document.body.before(element)
  } else {
    document.documentElement.append(element)
  }
}

export default opts => {
  const { type, url, code, async, mount = appendToHead, dataset } = opts
  let element

  if (type === 'style' && code) {
    element = document.createElement('style')
    element.setAttribute('type', 'text/css')
    element.append(document.createTextNode(code))
  } else if (type === 'style' && url) {
    element = document.createElement('link')
    element.setAttribute('rel', 'stylesheet')
    element.setAttribute('type', 'text/css')
    element.setAttribute('href', url)
  } else if (type === 'script' && code) {
    element = document.createElement('script')
    element.setAttribute('type', 'text/javascript')
    element.append(document.createTextNode(code))
  } else if (type === 'script' && url) {
    element = document.createElement('script')
    element.setAttribute('type', 'text/javascript')
    element.setAttribute('src', url)
    async && element.setAttribute('async', '')
  }

  if (!element) return log.error('非法参数：', opts)

  if (dataset) Object.assign(element.dataset, dataset)

  element.classList.add(ASSET_CLASSNAME)
  mount(element)

  extensionUnloaded.addListener(::element.remove)

  return element
}
