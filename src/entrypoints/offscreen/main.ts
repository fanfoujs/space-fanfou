import { browser } from 'wxt/browser'

// Keep audio elements alive until playback finishes; multiple requests may overlap.
const playing = new Set<HTMLAudioElement>()
browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.target !== 'offscreen') return
  if (request.action === 'read-legacy-storage') {
    try {
      const raw = localStorage.getItem('settings')
      sendResponse({
        ok: true,
        value: {
          settings: raw ? JSON.parse(raw) : null,
          version: localStorage.getItem('sf_version'),
        },
      })
    } catch (error) {
      sendResponse({ ok: false, error: String(error) })
    }
    return
  }
  if (request.action === 'play-audio') {
    const audio = new Audio(request.url)
    playing.add(audio)
    const release = () => playing.delete(audio)
    audio.addEventListener('ended', release, { once: true })
    audio.addEventListener('error', release, { once: true })
    audio.play().then(
      () => sendResponse({ ok: true }),
      (error) => {
        release()
        sendResponse({ ok: false, error: String(error) })
      },
    )
    return true
  }
})
