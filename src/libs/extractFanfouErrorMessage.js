import parseHTML from './parseHTML'

const DEFAULT_ERROR_MESSAGE = '饭否服务器返回了无法识别的错误页面'
const MAX_MESSAGE_LENGTH = 120

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function trimMessage(text) {
  if (text.length <= MAX_MESSAGE_LENGTH) return text

  return `${text.slice(0, MAX_MESSAGE_LENGTH).trim()}...`
}

function findMessageInHtml(document) {
  const selectors = [
    '#message',
    '.error',
    '.flash',
    '.flash-error',
    '.alert',
    'title',
    'body',
  ]

  for (const selector of selectors) {
    const text = normalizeWhitespace(document.querySelector(selector)?.textContent || '')

    if (text) return text
  }

  return ''
}

export default function extractFanfouErrorMessage(responseText, status = 0) {
  if (typeof responseText !== 'string' || responseText.trim() === '') {
    return status ? `饭否服务器返回错误（HTTP ${status}）` : DEFAULT_ERROR_MESSAGE
  }

  const looksLikeHtml = /<html[\s>]|<!doctype html|<body[\s>]|<title[\s>]/i.test(responseText)
  const rawMessage = looksLikeHtml
    ? findMessageInHtml(parseHTML(responseText))
    : normalizeWhitespace(responseText)

  if (!rawMessage) {
    return status ? `饭否服务器返回错误（HTTP ${status}）` : DEFAULT_ERROR_MESSAGE
  }

  return trimMessage(rawMessage)
}
