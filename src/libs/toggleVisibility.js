// 借鉴自 Zepto.js

const elementDisplay = {}

function getDefaultDisplay(nodeName) {
  if (!elementDisplay[nodeName]) {
    const element = document.createElement(nodeName)
    document.body.appendChild(element)
    let display = getComputedStyle(element, '').getPropertyValue('display')
    element.remove()
    if (display === 'none') display = 'block'
    elementDisplay[nodeName] = display
  }

  return elementDisplay[nodeName]
}

export function showElement(element) {
  if (element.style.display === 'none') {
    element.style.display = ''
  }

  if (getComputedStyle(element, '').getPropertyValue('display') === 'none') {
    element.style.display = getDefaultDisplay(element.nodeName)
  }
}

export function hideElement(element) {
  element.style.display = 'none'
}
