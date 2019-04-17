import pify from 'pify'

export default fn => pify(fn, { errorFirst: false })
