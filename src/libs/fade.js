import sleep from 'p-sleep'

async function fade(element, duration, start, end) {
  const { opacity, transition } = element.style

  element.style.transition = `unset !important`

  element.style.opacity = start
  element.style.transition = `opacity ${duration}ms`
  await sleep(0)

  element.style.opacity = end
  await sleep(duration)

  element.style.transition = transition
  element.style.transition = opacity
}

export function fadeIn(element, duration) {
  return fade(element, duration, 0, 1)
}

export function fadeOut(element, duration) {
  return fade(element, duration, 1, 0)
}
