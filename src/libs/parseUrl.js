import pick from 'just-pick'
import parseQueryString from '@libs/parseQueryString'
import memoize from '@libs/memoize'

const helper = document.createElement('a')

// 假定 url 是绝对路径；如果是相对路径，则 domain 一定会是 fanfou.com
export default memoize(url => {
  helper.href = url

  // 缺少 port 等，但是已经足够使用了
  return {
    ...pick(helper, [ 'protocol', 'origin', 'pathname' ]),
    domain: helper.hostname,
    query: parseQueryString(helper.search),
    hash: helper.hash.slice(1),
  }
})
