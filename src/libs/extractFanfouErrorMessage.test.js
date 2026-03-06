import extractFanfouErrorMessage from './extractFanfouErrorMessage'

test('extract message from html body', () => {
  const html = `
    <!doctype html>
    <html>
      <head><title>上传失败</title></head>
      <body>
        <div class="error">图片大小超过限制，请压缩后重试</div>
      </body>
    </html>
  `

  expect(extractFanfouErrorMessage(html, 400)).toBe('图片大小超过限制，请压缩后重试')
})

test('fallback to http status when html has no readable message', () => {
  const html = '<html><body></body></html>'

  expect(extractFanfouErrorMessage(html, 413)).toBe('饭否服务器返回错误（HTTP 413）')
})

test('keep plain text response', () => {
  expect(extractFanfouErrorMessage('图片上传失败，请重试', 400)).toBe('图片上传失败，请重试')
})
