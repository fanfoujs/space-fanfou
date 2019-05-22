import splitLines from 'split-lines'
import stringWidth from 'string-width'

const MAX_CONTINOUS_BLANK_LINE_NUMBER = 1
const MAX_SUMMARY_LENGTH = 120

export default rawVersionHistory => {
  const lines = splitLines(rawVersionHistory)
  const parsed = []
  let currentLine
  let continousBlankLineNumber = 0
  let currentVersionItem

  while (lines.length) {
    currentLine = lines.shift().trim()

    // 跳过空行
    if (!currentLine) {
      if (++continousBlankLineNumber > MAX_CONTINOUS_BLANK_LINE_NUMBER) {
        throw new Error(`连续空行不该超过 ${MAX_CONTINOUS_BLANK_LINE_NUMBER} 行`)
      } else {
        continue
      }
    }
    continousBlankLineNumber = 0

    // 注释
    if (currentLine.startsWith('#')) {
      continue
    }

    // 版本号（必选）
    if (currentLine.startsWith('v')) {
      const versionTag = currentLine.substr(1)

      currentVersionItem = {
        version: versionTag,
        releaseDate: '0000-00-00',
        summary: '',
        updateDetails: [],
      }
      parsed.push(currentVersionItem)

      continue
    }

    // 发布日期（必选）
    if (currentLine.startsWith('@')) {
      const releaseDate = currentLine.substr(1)

      currentVersionItem.releaseDate = releaseDate

      continue
    }

    // 版本更新内容概要（可选）
    if (currentLine.startsWith('~ ')) {
      const summary = currentLine.substr(2)

      if (stringWidth(summary) > MAX_SUMMARY_LENGTH) {
        throw new Error(`摘要不该长于 ${MAX_SUMMARY_LENGTH} 字`)
      }

      currentVersionItem.summary = summary

      continue
    }

    // 版本更新细节项目（必选）
    if (currentLine.startsWith('- ')) {
      const updateDetail = currentLine.substr(2)

      currentVersionItem.updateDetails.push(updateDetail)

      continue
    }

    throw new Error(`无法识别：${currentLine}`)
  }

  return parsed
}
