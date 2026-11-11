// NaN 是 JavaScript 里唯一一个自己和自己不 === 的值
// eslint-disable-next-line no-self-compare -- 保留仅对 NaN 为真的严格比较。
export default (x) => x !== x;
