/* eslint sort-keys: 2 */

module.exports = {
  extends: 'stylelint-config-xo-space',
  rules: {
    'at-rule-empty-line-before': [ 'always', {
      except: [ 'blockless-after-same-name-blockless' ],
    } ],
    'declaration-empty-line-before': null,
    'declaration-no-important': null,
    'declaration-property-value-blacklist': null,
    'function-comma-newline-after': null,
    'function-comma-space-after': null,
    'function-parentheses-newline-inside': null,
    'function-parentheses-space-inside': null,
    'no-descending-specificity': null,
    'no-unknown-animations': null,
    'property-blacklist': null,
    'selector-class-pattern': null,
    'selector-id-pattern': null,
    'string-quotes': [ 'double', {
      avoidEscape: false,
    } ],
  },
}
