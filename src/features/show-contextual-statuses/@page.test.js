const mockSleep = jest.fn(() => Promise.resolve())
const mockWretchText = jest.fn()
const mockWretch = jest.fn(() => ({
  get: () => ({
    text: mockWretchText,
  }),
}))

function mockSelect(selector, parent = document) {
  return parent.querySelector(selector)
}

mockSelect.all = (selector, parent = document) => Array.from(parent.querySelectorAll(selector))
mockSelect.exists = (selector, parent = document) => Boolean(mockSelect(selector, parent))

jest.mock('p-sleep', () => ({
  __esModule: true,
  default: (...args) => mockSleep(...args),
}))

jest.mock('select-dom', () => ({
  __esModule: true,
  default: mockSelect,
}))

jest.mock('wretch', () => ({
  __esModule: true,
  default: (...args) => mockWretch(...args),
}))

jest.mock('@libs/requireFanfouLib', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}))

import createFeature from './@page'
import { CLASSNAME_CONTAINER, CLASSNAME_STATUS, CLASSNAME_TIME } from './constants'

function createStatusMarkup() {
  return `
    <li>
      <a class="author" href="https://fanfou.com/invierno">invierno</a>
      <span class="content">hello world</span>
      <span class="stamp">
        <span class="reply"><a href="https://fanfou.com/statuses/root-1">回复原文</a></span>
      </span>
      <span class="op">
        <a class="reply" href="https://fanfou.com/statuses/reply-1">回复</a>
      </span>
    </li>
  `
}

function createExpandedStatusPageHtml() {
  return `
    <div id="avatar"><a href="https://fanfou.com/older"><img src="https://static.fanfou.com/a.jpg"></a></div>
    <h1><a href="https://fanfou.com/older">older</a></h1>
    <h2>
      <span class="content">older message</span>
      <span class="stamp"><a class="time">1分钟前</a></span>
      <span class="op"><a class="reply" href="https://fanfou.com/statuses/reply-older">回复</a></span>
    </h2>
  `
}

function createTestHarness(optionOverrides = {}) {
  document.body.innerHTML = `
    <div id="stream">
      <ol>
        ${createStatusMarkup()}
      </ol>
    </div>
  `

  window.FF = {
    app: {
      Stream: {
        attach: jest.fn(),
      },
      Zoom: {
        init: jest.fn(),
      },
    },
  }

  let mutationObserverCallback
  const timelineElementObserver = {
    addCallback: jest.fn(fn => {
      mutationObserverCallback = fn
    }),
    removeCallback: jest.fn(),
  }
  const options = {
    autoFetch: false,
    fetchStatusNumberPerClick: 1,
    ...optionOverrides,
  }
  const context = {
    readOptionValue: jest.fn(optionName => options[optionName]),
    requireModules: jest.fn(() => ({ timelineElementObserver })),
    elementCollection: {
      add: jest.fn(),
      getAll: jest.fn(() => ({
        stream: document.querySelector('#stream'),
      })),
    },
  }
  const feature = createFeature(context)

  feature.onLoad()

  return {
    context,
    feature,
    status: document.querySelector('#stream > ol > li'),
    triggerMutation(mutationRecord) {
      mutationObserverCallback([ mutationRecord ])
    },
    timelineElementObserver,
  }
}

async function flushAsyncWork() {
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
  await Promise.resolve()
}

beforeEach(() => {
  mockSleep.mockClear()
  mockWretch.mockClear()
  mockWretchText.mockReset()
})

afterEach(() => {
  document.body.innerHTML = ''
  delete window.FF
})

test('mounts contextual UI inside the status row and renders expanded statuses with div roots', async () => {
  mockWretchText.mockResolvedValue(createExpandedStatusPageHtml())

  const harness = createTestHarness()

  harness.triggerMutation({
    addedNodes: [ harness.status ],
    removedNodes: [],
  })

  expect(document.querySelectorAll('#stream > ol > li')).toHaveLength(1)
  expect(harness.status.querySelector(`:scope > .${CLASSNAME_CONTAINER}`)).toBeTruthy()
  expect(document.querySelectorAll(`#stream > ol > .${CLASSNAME_CONTAINER}`)).toHaveLength(0)

  const toggleButton = harness.status.querySelector(`.${CLASSNAME_CONTAINER} .sf-toggle`)
  toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushAsyncWork()

  const contextualStatus = harness.status.querySelector(`.${CLASSNAME_STATUS}`)

  expect(contextualStatus).toBeTruthy()
  expect(contextualStatus.tagName).toBe('DIV')
  expect(document.querySelectorAll(`#stream li.${CLASSNAME_STATUS}`)).toHaveLength(0)
  expect(contextualStatus.querySelector('.time')).toBeNull()
  expect(contextualStatus.querySelector(`.${CLASSNAME_TIME}`)).toBeTruthy()
  expect(window.FF.app.Stream.attach).toHaveBeenCalledWith(contextualStatus)
})

test('reattaches the live contextual container into replacement rows without duplicating it', () => {
  const harness = createTestHarness()

  harness.triggerMutation({
    addedNodes: [ harness.status ],
    removedNodes: [],
  })

  const liveContainer = harness.status.querySelector(`:scope > .${CLASSNAME_CONTAINER}`)
  const replacementStatus = harness.status.cloneNode(true)

  harness.status.replaceWith(replacementStatus)
  harness.triggerMutation({
    addedNodes: [ replacementStatus ],
    removedNodes: [ harness.status ],
  })

  expect(document.querySelectorAll('#stream > ol > li')).toHaveLength(1)
  expect(replacementStatus.querySelectorAll(`:scope > .${CLASSNAME_CONTAINER}`)).toHaveLength(1)
  expect(replacementStatus.querySelector(`:scope > .${CLASSNAME_CONTAINER}`)).toBe(liveContainer)
  expect(document.querySelectorAll(`#stream > ol > .${CLASSNAME_CONTAINER}`)).toHaveLength(0)
})
