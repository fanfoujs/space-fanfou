// 饭否的回复和转发按钮处理是通过事件代理实现的
// 但是所绑定的选择器不能包含我们展开了的消息
// 所以给我们展开了的消息的回复和转发按钮添加事件代理，然后交给饭否原来的事件处理器来处理

import { on, off } from 'delegated-events'
import { CLASSNAME_CONTAINER } from './constants'
import { isTimelinePage } from '@libs/pageDetect'

export default () => {
  const createHandler = proxiedSelector => event => {
    // 饭否原本的回复/转发事件处理器
    const { handler } = window.jQuery._data(document, 'events').click
      .find(({ selector }) => selector === proxiedSelector)

    handler.call(event.target, event)
  }

  const onClickReply = createHandler('.message ol >li .op>a.reply')
  const onClickRepost = createHandler('#stream ol >li >span.op>a.repost')

  return {
    applyWhen: () => isTimelinePage(),

    onLoad() {
      on('click', `.${CLASSNAME_CONTAINER} .op .reply`, onClickReply)
      on('click', `.${CLASSNAME_CONTAINER} .op .repost`, onClickRepost)
    },

    onUnload() {
      off('click', `.${CLASSNAME_CONTAINER} .op .reply`, onClickReply)
      off('click', `.${CLASSNAME_CONTAINER} .op .repost`, onClickRepost)
    },
  }
}
