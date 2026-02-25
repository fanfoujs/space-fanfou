import simpleMemoize from 'just-once'
import { isUserProfilePage } from '@libs/pageDetect'

// 获取当前页面所有者的 ID（默认当前页面为用户页面）
export default simpleMemoize(async () => {
  const splitPathname = window.location.pathname.split('/')

  const result = await isUserProfilePage()
    ? splitPathname[1] // fanfou.com/<userid>
    : splitPathname[2] // fanfou.com/album/<userid>

  return decodeURIComponent(result || '')
})
