import defined from 'defined'

export default (event, opts) => {
  if (event.ctrlKey !== Boolean(opts.ctrl)) return false
  if (event.altKey !== Boolean(defined(opts.alt, opts.option))) return false
  if (event.shiftKey !== Boolean(opts.shift)) return false
  if (event.metaKey !== Boolean(defined(opts.command, opts.win))) return false
  if (event.key.toLowerCase() !== opts.key.toLowerCase()) return false

  return true
}
