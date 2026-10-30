import DOMPurify from 'dompurify'

function appendHighlightedText(element, html) {
  // Tribute wraps matched characters in <strong>; no other markup is needed.
  element.append(DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [ 'strong' ],
    ALLOWED_ATTR: [],
    RETURN_DOM_FRAGMENT: true,
  }))
}

export function menuItemTemplate(item) {
  const container = document.createElement('span')
  const avatar = document.createElement('img')
  try {
    const url = new URL(item.original.photo_url, window.location.href)
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      avatar.src = url.href
    }
  } catch {
    // An invalid avatar URL should not prevent showing the user.
  }
  container.append(avatar)
  const [ nickname, userid ] = item.string.split(' ')
  appendHighlightedText(container, nickname)
  container.append(' ')
  const id = document.createElement('small')
  id.append('(')
  appendHighlightedText(id, userid || '')
  id.append(')')
  container.append(id)

  // Tribute accepts an HTML string. Serialize only the DOM constructed above.
  return container.innerHTML
}

export function noMatchTemplate(avatarUrl) {
  const container = document.createElement('div')
  const item = document.createElement('li')
  item.className = 'no-match'
  const avatar = document.createElement('img')
  avatar.src = avatarUrl
  item.append(avatar, '没有匹配的用户')
  container.append(item)
  return container.innerHTML
}
