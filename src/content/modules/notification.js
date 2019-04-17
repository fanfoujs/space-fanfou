import { h } from 'dom-chef'
import select from 'select-dom'
import sleep from 'p-sleep'
import safeElementReady from '@libs/safeElementReady'
import { fadeIn, fadeOut } from '@libs/fade'

const FADE_DURATION = 500
const STAY_DURATION = 3500
const CLASSNAME_INFO = 'sysmsg'
const CLASSNAME_ERROR = 'errmsg'

let container
let header

function removeExisitingNotifications() {
  const elements = select.all(`.${CLASSNAME_INFO}, .${CLASSNAME_ERROR}`, container)

  for (const element of elements) {
    element.remove()
  }
}

function createNotification(className, text) {
  const element = (
    <div className={className}>{ text }</div>
  )

  header.after(element)

  return element
}

async function animate(element) {
  await fadeIn(element, FADE_DURATION)
  await sleep(STAY_DURATION)
  await fadeOut(element, FADE_DURATION)
  element.remove()
}

export default {
  async ready() {
    container = await safeElementReady('#container')
    header = await safeElementReady('#header')

    return container && header
  },

  create(type, text) {
    removeExisitingNotifications()
    return animate(createNotification(type, text))
  },

  INFO: CLASSNAME_INFO,
  ERROR: CLASSNAME_ERROR,
}
