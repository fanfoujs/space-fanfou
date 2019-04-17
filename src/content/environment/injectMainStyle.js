import waitForHead from '@libs/waitForHead'
import loadAsset, { insertImmediatelyAfterHead } from '@libs/loadAsset'
import getExtensionOrigin from '@libs/getExtensionOrigin'

// 必须把主样式插入到饭否主样式（<head /> 中的 base.css）之后才能保证有足够优先级覆盖掉原有样式
// （不希望滥用 !important，因为不仅会覆盖掉饭否的样式，我们自己的样式写起来也会受影响）
// 选择插入到 <head /> 之后而不是之内是因为，经过反复实验只有这样才能最大限度加快加载速度
// 从而避免出现样式抖动现象（用户会先短暂看到饭否原来的样式，然后突然变成太空饭否的样式，体验很糟糕）
export default async function injectMainStyle() {
  // 确保此时 <head /> 已经存在
  await waitForHead()

  loadAsset({
    type: 'style',
    url: `${getExtensionOrigin()}/page.css`,
    // 插入到 <head /> 紧后面，确保应该在所有其他 feature 样式之前
    mount: insertImmediatelyAfterHead,
  })
}
