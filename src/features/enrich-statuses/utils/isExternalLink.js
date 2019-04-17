import compareDomains from '@libs/compareDomains'

// 判断一个 <a /> 元素是否指向外站链接
// 即 *.fanfou.com 之外的链接（fan.fo 也算作外站链接）
export default link => !compareDomains(link.hostname, 'fanfou.com')
