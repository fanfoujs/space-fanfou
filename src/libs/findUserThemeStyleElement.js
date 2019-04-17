import select from 'select-dom'

function isUserThemeStyleElement(styleElement) {
  const css = styleElement.textContent

  return (
    css.startsWith('body {') &&
    css.includes('.reply a {') &&
    css.includes('#sidebar {') &&
    css.includes('#goodapp span {')
  )
}

export default () => {
  return select.all('head style').find(isUserThemeStyleElement)
}
