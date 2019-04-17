import select from 'select-dom'
import simpleMemoize from 'just-once'
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray'

export default simpleMemoize(() => {
  const navLinks = select.all('#navigation li a')
  const profilePageLink = findElementWithSpecifiedContentInArray(navLinks, '我的空间')

  return profilePageLink.href
})
