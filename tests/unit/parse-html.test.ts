import parseHTML from '../../src/platform/parse-html'

test('background parsing supports Fanfou navigation, topics and timeline fragments without a browser DOM', () => {
  const page = parseHTML(
    '<html><body><ul id="navigation"><li><a href="/tester">我的空间</a></li></ul><div id="savedsearchs"><ul><li><a><span class="label">TypeScript &amp; 饭否</span></a></li></ul></div><script>throw new Error("must not run")</script></body></html>',
  )
  expect(page.querySelector('#navigation li a')?.getAttribute('href')).toBe(
    '/tester',
  )
  expect(
    page.querySelectorAll('#savedsearchs > ul > li > a > .label')[0]
      ?.textContent,
  ).toBe('TypeScript & 饭否')
  const fragment = parseHTML(
    '<li><a class="author" href="/friend">朋友</a><span class="stamp"><a class="time" href="/statuses/123" stime="2026-10-28T00:00:00Z"></a></span></li>',
  )
  expect(fragment.body.children).toHaveLength(1)
  expect(
    fragment.body.children[0]
      ?.querySelector('.stamp .time')
      ?.getAttribute('stime'),
  ).toBe('2026-10-28T00:00:00Z')
})
