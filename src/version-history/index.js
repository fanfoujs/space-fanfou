import parseVersionHistory from './parseVersionHistory'
import rawVersionHistory from 'raw-loader!./versionHistory'

export default parseVersionHistory(rawVersionHistory)
