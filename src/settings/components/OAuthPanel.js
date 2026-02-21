import { h, Component } from 'preact'
import messaging from '../messaging'
import {
  FANFOU_OAUTH_AUTHORIZE,
  FANFOU_OAUTH_GET_STATUS,
  FANFOU_OAUTH_CLEAR_TOKENS,
} from '@constants'

export default class OAuthPanel extends Component {
  state = {
    loading: true,
    working: false,
    status: null,
    error: null,
  }

  componentDidMount() {
    this.refreshStatus()
  }

  async refreshStatus() {
    this.setState({ loading: true, error: null })

    try {
      const response = await messaging.postMessage({
        action: FANFOU_OAUTH_GET_STATUS,
      })

      if (response?.error) throw new Error(response.error)

      this.setState({ status: response?.status || null, loading: false })
    } catch (error) {
      this.setState({
        loading: false,
        error: error.message || String(error),
      })
    }
  }

  handleAuthorize = async () => {
    this.setState({ working: true, error: null })

    try {
      const response = await messaging.postMessage({
        action: FANFOU_OAUTH_AUTHORIZE,
      })

      if (response?.error) throw new Error(response.error)

      this.setState({ status: response?.status || null, working: false })
    } catch (error) {
      this.setState({
        working: false,
        error: error.message || String(error),
      })
    }
  }

  handleClear = async () => {
    this.setState({ working: true, error: null })

    try {
      const response = await messaging.postMessage({
        action: FANFOU_OAUTH_CLEAR_TOKENS,
      })

      if (response?.error) throw new Error(response.error)

      this.setState({ status: response?.status || null, working: false })
    } catch (error) {
      this.setState({
        working: false,
        error: error.message || String(error),
      })
    }
  }

  render() {
    const { loading, working, status, error } = this.state
    const canAuthorize = status?.canAuthorize && !working
    const canClear = !!status?.hasTokens && !working
    const summary = this.getSummary(status)

    return (
      <div className="sf-oauth-panel">
        <h4>OAuth 授权状态</h4>
        { loading && <p>正在读取状态…</p> }
        { !loading && summary }

        { status?.redirectUrl && (
          <p className="sf-oauth-panel__redirect">
            OAuth 回调地址（请复制到饭否应用后台的 Callback URL）：<br />
            <code>{ status.redirectUrl }</code>
          </p>
        ) }

        <div className="sf-oauth-panel__actions">
          <button type="button" disabled={!canAuthorize} onClick={this.handleAuthorize}>
            { working ? '处理中…' : '开始授权' }
          </button>
          <button type="button" disabled={!canClear} onClick={this.handleClear}>
            取消授权
          </button>
          <button type="button" onClick={() => this.refreshStatus()}>
            重新检测
          </button>
        </div>

        { error && <p className="sf-oauth-panel__error">⚠️ { error }</p> }
      </div>
    )
  }

  getSummary(status) {
    if (!status) return null

    const lines = []

    lines.push(
      status.enabled
        ? '「启用 OAuth 认证」：已勾选'
        : '「启用 OAuth 认证」：未启用（请先选中复选框）'
    )

    lines.push(
      status.usingBuiltinKey
        ? 'Consumer Key / Secret：使用内置密钥（nofan）'
        : status.hasConsumerCredentials
          ? 'Consumer Key / Secret：已填写（自定义）'
          : 'Consumer Key / Secret：尚未填写'
    )

    if (status.hasTokens) {
      lines.push(`已授权账号：${status.screenName || status.userId || '未知'}`)
    } else {
      lines.push('授权状态：未完成授权')
    }

    return (
      <ul className="sf-oauth-panel__summary">
        { lines.map((line, index) => <li key={index}>{ line }</li>) }
      </ul>
    )
  }
}
