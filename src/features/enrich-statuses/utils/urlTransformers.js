export default [ {
  // 如果要 AJAX 获取数据，确保一定是访问 HTTPS
  isMatchingUrl: ({ parsedUrl }) => parsedUrl.protocol === 'http:',
  transform: ({ url }) => url.replace('http:', 'https:'),
}, {
  isMatchingUrl: ({ parsedUrl }) => (
    parsedUrl.domain === 'music.163.com' &&
    parsedUrl.pathname === '/' &&
    parsedUrl.hash.startsWith('/')
  ),
  transform: ({ parsedUrl }) => parsedUrl.origin + parsedUrl.hash,
} ]
