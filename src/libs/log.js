/* eslint no-console: 0 */

let outputLevel = 1

if (process.env.NODE_ENV === 'production') {
  outputLevel = 2
}

function log(level, logger, ...message) {
  if (level >= outputLevel) {
    logger('[SpaceFanfou]', ...message)
  }
}

export default {
  debug(...message) {
    log(0, console.log, ...message)
  },

  info(...message) {
    log(1, console.log, ...message)
  },

  error(...message) {
    log(2, console.error, ...message)
  },
}
