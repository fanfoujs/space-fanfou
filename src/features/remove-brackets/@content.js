import select from 'select-dom'
import elementReady from 'element-ready'

async function removeBrackets(selector) {
  const found = await elementReady(selector)
  if (!found) return

  for (const element of select.all(selector)) {
    const first = element.firstChild
    if (first?.nodeType === Node.TEXT_NODE && first.data.startsWith('(')) {
      first.deleteData(0, 1)
      const last = element.lastChild
      if (last?.nodeType === Node.TEXT_NODE && last.data.endsWith(')')) {
        last.deleteData(last.length - 1, 1)
      }
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
