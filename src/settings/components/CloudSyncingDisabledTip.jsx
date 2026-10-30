import { h, Component } from 'preact'
import Tooltip from '@libs/Tooltip'

const tooltipProps = {
  tagName: 'span',
  content: '这个设置项不会被同步',
  distance: 10,
}

export default class CloudSyncingDisabledTip extends Component {
  render() {
    return (
      <span className="cloud-syncing-disabled">
        <Tooltip {...tooltipProps}>
          <span className="icon-cloud-syncing-disabled" />
        </Tooltip>
      </span>
    )
  }
}
