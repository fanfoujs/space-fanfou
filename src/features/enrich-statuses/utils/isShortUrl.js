const shortUrlServiceDomains = [
  'fan.fo',
  't.cn',
  't.co',
  'fb.me',
  'goo.gl',
  'is.gd',
  'v.gd',
  'tinyurl.com',
  'tiny.cc',
  'bit.ly',
  'to.ly',
  'j.mp',
  'yep.it',
]

function stripProtocol(url) {
  return url.replace(/^https?:\/\//, '')
}

function getDomain(url) {
  return stripProtocol(url).split('/')[0]
}

export default url => shortUrlServiceDomains.includes(getDomain(url))
