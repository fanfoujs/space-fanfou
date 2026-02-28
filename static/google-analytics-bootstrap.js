/* eslint-disable no-unused-expressions, func-names, space-before-function-paren, dot-notation, prefer-rest-params, no-undef */
// Google Analytics官方初始化代码，第三方代码，禁用所有必要的ESLint规则
!(function setupGoogleAnalytics() {
  (function (i, s, o, g, r, a, m) {
    i.GoogleAnalyticsObject = r
    i[r] = i[r] || function () {
      (i[r].q = i[r].q || []).push(arguments)
    }
    i[r].l = 1 * new Date()
    a = s.createElement(o)
    m = s.getElementsByTagName(o)[0]
    a.async = 1
    a.src = g
    m.parentNode.insertBefore(a, m)
  })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga')

  ga('create', 'UA-84490018-1', 'auto')
  ga('send', 'pageview')
})()
