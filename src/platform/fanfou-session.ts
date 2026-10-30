import parseHTML from './parse-html'

export type FanfouSession = { userId: string; screenName: string | null }

export function parseFanfouSession(html: string): FanfouSession | null {
  const document = parseHTML(html)
  const link =
    document
      .querySelectorAll('#navigation a')
      .find((item) => item.textContent.trim() === '我的空间') ||
    document.querySelector('#user_top h3 a[href]')
  if (!link) return null
  const url = new URL(
    link.getAttribute('href') || '',
    'https://fanfou.com/home',
  )
  if (
    url.hostname !== 'fanfou.com' ||
    !['http:', 'https:'].includes(url.protocol)
  )
    return null
  const segments = url.pathname.split('/').filter(Boolean)
  if (
    segments.length !== 1 ||
    ['home', 'login', 'logout', 'settings'].includes(segments[0]!)
  )
    return null
  try {
    return {
      userId: decodeURIComponent(segments[0]!),
      screenName:
        document.querySelector('#user_top h3')?.textContent.trim() || null,
    }
  } catch {
    return null
  }
}

let request: Promise<FanfouSession | null> | undefined
export function readFanfouSession(): Promise<FanfouSession | null> {
  // 不缓存账号结果，切换站点 Cookie 后下一次检查立即使用新账号。
  return (request ||= fetch('https://fanfou.com/home', {
    credentials: 'include',
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('暂时无法检查饭否登录状态')
      return parseFanfouSession(await response.text())
    })
    .finally(() => {
      request = undefined
    }))
}
