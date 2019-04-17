import splitLines from 'split-lines'

const MAX_CONTINOUS_BLANK_LINES = 1
const SUMMARY_LENGTH_LIMIT = 120

export default rawVersionHistory => {
  const lines = splitLines(rawVersionHistory)
  const parsed = []
  let currentLine
  let continousBlankLines = 0
  let current

  while (lines.length) {
    // 保留每行行首的空格
    currentLine = lines.shift().trimEnd()

    // 跳过空行
    if (!currentLine && ++continousBlankLines > MAX_CONTINOUS_BLANK_LINES) {
      throw new Error(`连续空行不该超过 ${MAX_CONTINOUS_BLANK_LINES} 行`)
    }
    continousBlankLines = 0

    // 版本号（必选）
    if (currentLine.startsWith('v')) {
      const versionTag = currentLine.substr(1)

      current = {
        version: versionTag,
        summary: '',
        updateDetails: [],
      }
      parsed.push(current)

      continue
    }

    // 发布日期（必选）
    if (currentLine.startsWith('@')) {
      const releaseDate = currentLine.substr(1)

      current.releaseDate = releaseDate

      continue
    }

    // 版本更新内容概要（可选）
    if (currentLine.startsWith('~ ')) {
      const summary = currentLine.substr(2)

      if (summary.length > SUMMARY_LENGTH_LIMIT) {
        throw new Error(`摘要不该长于 ${SUMMARY_LENGTH_LIMIT} 字`)
      }

      current.summary = summary

      continue
    }

    // 版本更新细节项目（必选）
    if (currentLine.startsWith('- ')) {
      const updateDetail = currentLine.substr(2)

      current.updateDetails.push(updateDetail)

      continue
    }
  }

  return parsed
}
