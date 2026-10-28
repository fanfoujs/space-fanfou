import { browser, type Browser } from 'wxt/browser'

type Handler<Args extends unknown[]> = (...args: Args) => unknown

function createEvent<Args extends unknown[]>() {
  const handlers = new Set<Handler<Args>>()
  return {
    addListener(handler: Handler<Args>) {
      handlers.add(handler)
    },
    removeListener(handler: Handler<Args>) {
      handlers.delete(handler)
    },
    async dispatch(...args: Args) {
      await backgroundReady
      await Promise.all([...handlers].map((handler) => handler(...args)))
    },
  }
}

let backgroundReady: Promise<unknown> = Promise.resolve()

export const events = {
  alarm: createEvent<[Browser.alarms.Alarm]>(),
  tabActivated: createEvent<[Browser.tabs.OnActivatedInfo]>(),
  tabUpdated:
    createEvent<[number, Browser.tabs.OnUpdatedInfo, Browser.tabs.Tab]>(),
  menuClicked:
    createEvent<
      [Browser.contextMenus.OnClickData, Browser.tabs.Tab | undefined]
    >(),
  notificationClicked: createEvent<[string]>(),
  notificationButtonClicked: createEvent<[string, number]>(),
}

// Register native listeners synchronously, before settings or other async work.
// A cold service worker must advertise every event that can wake it.
export function registerBackgroundEvents() {
  const dispatch =
    <Args extends unknown[]>(event: ReturnType<typeof createEvent<Args>>) =>
    (...args: Args) => {
      void event.dispatch(...args).catch(console.error)
    }
  browser.alarms.onAlarm.addListener(dispatch(events.alarm))
  browser.tabs.onActivated.addListener(dispatch(events.tabActivated))
  browser.tabs.onUpdated.addListener(dispatch(events.tabUpdated))
  browser.contextMenus?.onClicked.addListener(dispatch(events.menuClicked))
  browser.notifications?.onClicked.addListener(
    dispatch(events.notificationClicked),
  )
  browser.notifications?.onButtonClicked?.addListener(
    dispatch(events.notificationButtonClicked),
  )
}

export function setBackgroundReady(ready: Promise<unknown>) {
  backgroundReady = ready
}
