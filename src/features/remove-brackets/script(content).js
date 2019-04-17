import select from 'select-dom'
import safeElementReady from '@libs/safeElementReady'

async function removeBrackets(selector) {
  const found = await safeElementReady(selector)
  if (!found) return

  for (const element of select.all(selector)) {
    const html = element.innerHTML

    if (html.startsWith('(')) {
      element.innerHTML = html.replace(/^\(|\)$/g, '')
    }
  }
}

export default () => ({
  onLoad() {
    const selectors = [
      '#navigation .count',
      '#navtabs .count',
    ]

    selectors.forEach(removeBrackets)
  },
})
