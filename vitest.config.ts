import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: Object.fromEntries(
			['libs', 'constants', 'platform', 'features', 'background', 'assets'].map(
				(name) => [
					`@${name}`,
					fileURLToPath(
						new URL(
							name === 'assets' ? './assets' : `./src/${name}`,
							import.meta.url,
						),
					),
				],
			),
		),
	},
	test: {
		// Let upload tests use the same native FormData as the SDK browser build.
		server: {deps: {inline: ['fanfou-sdk']}},
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.{js,ts}', 'tests/unit/**/*.test.ts'],
		setupFiles: ['tests/unit/setup.ts'],
	},
});
