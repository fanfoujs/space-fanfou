import { browser } from 'wxt/browser'

let creating: Promise<void> | undefined

export async function ensureOffscreen() {
  if (!browser.offscreen) throw new Error('此浏览器不支持 offscreen document')
  creating ??= (async () => {
    if (!(await browser.offscreen.hasDocument())) {
      await browser.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK', 'LOCAL_STORAGE'],
        justification: '播放用户开启的通知提示音，并迁移旧版扩展设置',
      })
    }
  })().finally(() => {
    creating = undefined
  })
  await creating
}

export async function playBackgroundAudio(audioUrl: string) {
  const url = new URL(audioUrl, browser.runtime.getURL('/')).href
  if (typeof Audio !== 'undefined') {
    await new Audio(url).play()
    return
  }
  await ensureOffscreen()
  const result = await browser.runtime.sendMessage({
    target: 'offscreen',
    action: 'play-audio',
    url,
  })
  if (!result?.ok) throw new Error(result?.error || '无法播放提示音')
}
