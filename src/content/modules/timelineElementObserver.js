import select from 'select-dom'
import elementReady from 'element-ready'
import wrapper from '@libs/wrapper'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'

// TODO: 允许分开添加 onAdd 和 onRemove callbacks

let stream
let observer
const map = new WeakMap()
const callbacks = []

function callCallbacks(...args) {
  safelyInvokeFns({ fns: callbacks, args })
}

function streamMutationObserver(mutationRecords) {
  for (const { addedNodes, removedNodes } of mutationRecords) {
    // 当用户在侧栏点击热门话题或者关注话题时，#stream>ol 会替换为新元素
    // 此时 `addedNodes` 包含新的 ol，`removedNodes` 则包含被替换掉的 ol
    for (const addedOl of addedNodes) {
      const subObserver = new MutationObserver(olMutationObserver)

      subObserver.observe(addedOl, { childList: true })
      map.set(addedOl, subObserver)

      callCallbacks([ {
        addedNodes: Array.from(addedOl.children),
        removedNodes: [],
      } ])
    }

    // 我们不再监听旧 ol 的变化
    for (const removedOl of removedNodes) {
      const subObserver = map.get(removedOl)

      subObserver.disconnect()

      callCallbacks([ {
        addedNodes: [],
        removedNodes: Array.from(removedOl.children),
      } ])
    }
  }
}

function olMutationObserver(mutationRecords) {
  callCallbacks(mutationRecords.map(mutationRecord => ({
    ...mutationRecord,
    addedNodes: Array.from(mutationRecord.addedNodes),
    removedNodes: Array.from(mutationRecord.removedNodes),
  })))
}

function getStatusLists() {
  return select.all(':scope>ol', stream)
}

function getStatuses() {
  return select.all(':scope>ol>li', stream)
}

export default wrapper({
  async install() {
    stream = await elementReady('#stream')

    if (stream) {
      observer = new MutationObserver(streamMutationObserver)
      observer.observe(stream, { childList: true })
      // 处理已经存在的 ol
      streamMutationObserver([ {
        addedNodes: getStatusLists(),
        removedNodes: [],
      } ])
    }

    return !!stream
  },

  uninstall() {
    if (observer) {
      observer.disconnect()
      observer = null
      callbacks.length = 0
    }
  },

  addCallback(fn) {
    arrayUniquePush(callbacks, fn)
    fn([ {
      addedNodes: getStatuses(),
      removedNodes: [],
    } ])
  },

  removeCallback(fn) {
    arrayRemove(callbacks, fn)
    fn([ {
      addedNodes: [],
      removedNodes: getStatuses(),
    } ])
  },
})
