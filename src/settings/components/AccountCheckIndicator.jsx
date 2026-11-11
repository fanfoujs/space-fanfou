import { h } from 'preact'

export default function AccountCheckIndicator({ error }) {
  if (error) return <span className="sf-account-check-note" title={error} aria-label={error}>暂未更新</span>
  return null
}
