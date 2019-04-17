import { h } from 'preact'
import Tooltip from 'react-tooltip-lite'

function patch() {
  const positionModule = require('react-tooltip-lite/dist/position')
  const originalPositionFn = positionModule.default

  positionModule.default = (...args) => {
    const result = originalPositionFn(...args)

    // 解决显示状态 transform 属性没有去除掉的 bug
    if (typeof result.tip.transform === 'undefined') {
      result.tip.transform = null
    }

    return result
  }
}
patch()

const defaultProps = {
  arrowSize: 5,
  padding: '8px',
  distance: 10,
}

export default function TooltipWithDefaultProps(props) {
  return (
    <Tooltip {...defaultProps} {...props} />
  )
}
