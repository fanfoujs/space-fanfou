import cookies from 'js-cookie'
import simpleMemoize from 'just-once'

// 默认 cookies 在页面加载后不发生变化
export default simpleMemoize(() => cookies.get('u'))
