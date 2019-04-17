import pick from 'just-pick'
import storage from '@background/environment/storage'
import wrapper from '@libs/wrapper'

export default wrapper(pick(storage, [ 'read', 'write', 'delete' ]))
