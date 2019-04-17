/* eslint react/jsx-no-target-blank: 0 */

import { h, Component } from 'preact'

export default class ExternalLink extends Component {
  render() {
    const { url, text, className, children } = this.props

    return (
      <a href={url} target="_blank" className={className}>{ text || children }</a>
    )
  }
}
