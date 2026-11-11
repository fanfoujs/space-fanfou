import globals from 'globals';
import react from 'eslint-plugin-react';
import {fixupPluginRules} from '@eslint/compat';

export default [
	{
		ignores: ['.wxt/**', '.output/**'],
	},
	{prettier: true},
	{
		files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				SF: 'writable',
				Y: 'readonly',
				FF: 'readonly',
				$: 'readonly',
				jQuery: 'readonly',
			},
		},
		rules: {
			'no-unused-vars': [
				'error',
				{varsIgnorePattern: '^(h|Fragment)$', argsIgnorePattern: '^_'},
			],
			'no-unused-expressions': ['error', {allowShortCircuit: true}],
			'import-x/no-unassigned-import': [
				'error',
				{allow: ['**/*.css', '**/*.less', '@settings/styles']},
			],
			'new-cap': ['error', {capIsNewExceptions: ['OAuth', 'HmacSHA1']}],
			// 保留现有模块路径、饭否接口字段和功能工厂的导出约定。
			'unicorn/filename-case': 'off',
			'import-x/extensions': 'off',
			'n/file-extension-in-import': 'off',
			'import-x/no-anonymous-default-export': 'off',
			'unicorn/no-anonymous-default-export': 'off',
			camelcase: ['error', {properties: 'never', ignoreDestructuring: true}],
			// 正则 flag 会影响匹配语义，不在代码风格迁移中强制升级。
			'require-unicode-regexp': 'off',
			'regexp/require-unicode-regexp': 'off',
			'regexp/require-unicode-sets-regexp': 'off',
			// 保持现有浏览器范围，不强制采用更晚才可用的 API。
			'unicorn/prefer-promise-with-resolvers': 'off',
			'unicorn/prefer-iterator-to-array': 'off',
			'unicorn/prefer-dom-node-html-methods': 'off',
			'unicorn/prefer-regexp-escape': 'off',
			'unicorn/prefer-iterator-helpers': 'off',
			'unicorn/prefer-iterator-concat': 'off',
			'unicorn/prefer-iterator-zip': 'off',
			'unicorn/prefer-iterator-to-array-at-end': 'off',
			'unicorn/no-array-sort': 'off',
			'unicorn/no-array-reverse': 'off',
			// 保留已有正则的捕获组及其调用方约定。
			'regexp/prefer-named-capture-group': 'off',
			'regexp/no-unused-capturing-group': 'off',
			// 保留与 DOM、SDK 及已有存储格式约定的 null 和回退语义。
			'unicorn/no-null': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/no-restricted-types': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			eqeqeq: ['error', 'always', {null: 'ignore'}],
			'no-eq-null': 'off',
			// 现有生命周期和分页流程依赖 Promise 链与顺序执行。
			'promise/prefer-await-to-then': 'off',
			'no-await-in-loop': 'off',
			'unicorn/no-await-expression-member': 'off',
			'unicorn/no-array-callback-reference': 'off',
			'unicorn/no-array-method-this-argument': 'off',
			'unicorn/no-array-for-each': 'off',
			'unicorn/no-for-each': 'off',
			'unicorn/no-array-reduce': 'off',
			'no-warning-comments': 'off',
			'no-multi-assign': 'off',
			'unicorn/prefer-add-event-listener': 'off',
			'unicorn/prefer-code-point': 'off',
			'unicorn/no-nested-ternary': 'off',
			'unicorn/prefer-ternary': 'off',
			// 保留既有控制流、类初始化顺序、跨环境全局对象和动态键访问。
			'unicorn/prefer-simple-condition-first': 'off',
			'unicorn/no-declarations-before-early-exit': 'off',
			'unicorn/prefer-early-return': 'off',
			'unicorn/prefer-combined-guards': 'off',
			'unicorn/prefer-continue': 'off',
			'unicorn/prefer-minimal-ternary': 'off',
			'unicorn/prefer-logical-operator-over-ternary': 'off',
			'unicorn/prefer-smaller-scope': 'off',
			'unicorn/no-break-in-nested-loop': 'off',
			'unicorn/no-duplicate-loops': 'off',
			'unicorn/no-immediate-mutation': 'off',
			'unicorn/no-global-object-property-assignment': 'off',
			'unicorn/no-unnecessary-global-this': 'off',
			'unicorn/no-computed-property-existence-check': 'off',
			'unicorn/consistent-boolean-name': 'off',
			'unicorn/consistent-class-member-order': 'off',
			'unicorn/no-undeclared-class-members': 'off',
			'unicorn/prefer-number-coercion': 'off',
			'unicorn/prefer-number-is-safe-integer': 'off',
			// 饭否 OAuth 签名需要保留显式的 HTTP 地址。
			'unicorn/prefer-https': 'off',
			// 交给 XO 内置的格式化器处理运算符和括号，避免修复循环。
			'@stylistic/no-mixed-operators': 'off',
			// Vite 使用 process.env 编译期常量，字节解码仍按 UTF-16 码元处理。
			'n/prefer-global/process': 'off',
			'n/prefer-global/buffer': 'off',
			// 浏览器原生 API 不需要替换为额外的 Node.js 依赖。
			'no-restricted-globals': 'off',
		},
	},
	{
		files: ['**/*.{ts,tsx,mts}'],
		languageOptions: {
			parserOptions: {project: './tsconfig.xo.json', projectService: false},
		},
		rules: {
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'variable',
					format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
					leadingUnderscore: 'allowDouble',
				},
				{selector: 'typeLike', format: ['PascalCase']},
			],
		},
	},
	{
		files: ['**/*.{jsx,tsx}'],
		plugins: {react: fixupPluginRules(react)},
		rules: {
			'react/jsx-uses-react': 'error',
			'react/jsx-uses-vars': 'error',
		},
	},
	{
		files: ['src/**'],
		rules: {
			// 既有后台和页面功能的复杂度与原生交互不在风格迁移中重构。
			complexity: 'off',
			'max-depth': 'off',
			'no-alert': 'off',
			'unicorn/no-top-level-side-effects': 'off',
		},
	},
	{
		files: [
			'src/entrypoints/background.ts',
			'src/entrypoints/offscreen/main.ts',
			'src/platform/audio.ts',
			'src/platform/legacy-storage.ts',
			'src/features/registry.ts',
			'wxt.config.ts',
		],
		rules: {
			// 这些边界沿用 JavaScript 模块、浏览器消息和构建工具的动态类型。
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
		},
	},
	{
		files: ['src/features/check-friendship/@page.jsx'],
		rules: {'no-script-url': 'off'},
	},
	{
		files: ['scripts/**'],
		rules: {'unicorn/no-process-exit': 'off'},
	},
	{
		files: ['src/entrypoints/settings/main.jsx'],
		// 样式入口的副作用导入需要保留原有执行顺序。
		rules: {'unicorn/prefer-top-level-await': 'off', 'import-x/order': 'off'},
	},
	{
		files: ['src/settings/styles/index.js'],
		// CSS 的导入顺序决定层叠关系。
		rules: {'import-x/order': 'off'},
	},
	{
		files: ['src/platform/fanfou-api.ts'],
		// 页面发来的方法名仍需在运行时拒绝，不能只依赖编译期类型。
		rules: {
			'@typescript-eslint/switch-exhaustiveness-check': [
				'error',
				{allowDefaultCaseForExhaustiveSwitch: true},
			],
		},
	},
	{
		files: ['src/libs/truncateFilename.js'],
		// Spread 按 Unicode 码点拆分，会改变现有文件名截断的码元语义。
		rules: {'unicorn/prefer-spread': 'off'},
	},
	{
		files: ['src/entrypoints/**/*.html'],
		// 扩展内部文档不需要面向搜索和社交分享的元数据。
		rules: {
			'@html-eslint/require-meta-description': 'off',
			'@html-eslint/require-open-graph-protocol': 'off',
		},
	},
	{
		files: ['src/entrypoints/offscreen/index.html'],
		rules: {'@html-eslint/require-meta-viewport': 'off'},
	},
	{
		files: ['src/entrypoints/offscreen/main.ts'],
		// Chrome 消息监听器必须返回 true，以保持异步响应通道。
		rules: {'@typescript-eslint/strict-void-return': 'off'},
	},
	{
		files: ['src/features/status-form-enhancements/textarea-state@page.js'],
		// 保留已有选择器的查询范围，避免把格式迁移变成 DOM 行为修改。
		rules: {'unicorn/prefer-scoped-selector': 'off'},
	},
	{
		files: [
			'src/features/notifications/service@background.js',
			'src/features/remove-personalized-theme/@content.jsx',
			'src/features/sidebar-statistics/@page.jsx',
		],
		// 站点数据的提取表达式与既有格式绑定，本次不改写匹配范围。
		rules: {'regexp/no-super-linear-move': 'off'},
	},
	{
		files: ['package.json'],
		rules: {
			// 保留原有许可证声明；WXT 需要 postinstall 生成开发类型。
			'package-json/valid-fields': 'off',
			'package-json/no-install-scripts': 'off',
			'package-json/dependency-version-range': [
				'error',
				{exceptions: ['fanfou-sdk']},
			],
		},
	},
	{
		files: ['Artifacts/SpaceFanfouMagnet/package.json'],
		// 模型导出依赖固定版本，以便复现已验证的几何和项目文件。
		rules: {
			'package-json/dependency-version-range': ['error', {range: 'exact'}],
		},
	},
];
