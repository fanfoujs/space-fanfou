import { h, Component } from 'preact'
import versionHistory from '@version-history'

export default class VersionHistory extends Component {
  render() {
    return (
      <div id="version-history">
        { versionHistory.map(this.renderVersionUpdateDetails, this) }
      </div>
    )
  }

  renderVersionUpdateDetails({ version, releaseDate, updateDetails }) {
    return (
      <div key={`version-${version}`}>
        { this.renderVersionAndReleaseDate({ version, releaseDate }) }
        { this.renderUpdateDetails(updateDetails) }
      </div>
    )
  }

  renderVersionAndReleaseDate({ version, releaseDate }) {
    return (
      <h3>
        v{ version }
        <span className="sub">（{ releaseDate }）</span>
      </h3>
    )
  }

  renderUpdateDetails(updateDetails) {
    return (
      <ul>
        { updateDetails.map(this.renderUpdateDetail, this) }
      </ul>
    )
  }

  renderUpdateDetail(updateDetail, index) {
    return (
      <li key={index}>
        { updateDetail }
      </li>
    )
  }
}
