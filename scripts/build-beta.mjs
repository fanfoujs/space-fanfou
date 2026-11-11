import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {getBetaBuild} from './beta-build.mjs';

const command = process.argv[2];
if (!['build', 'zip'].includes(command)) {
	throw new Error('Expected build or zip');
}

const {values} = parseArgs({
	args: process.argv.slice(3),
	options: {build: {type: 'string', default: '0'}},
});
const betaBuild = getBetaBuild(values.build);
const env = {...process.env, CHROME_BETA_BUILD: String(betaBuild)};
const run = (args) => {
	const result = spawnSync(process.execPath, args, {stdio: 'inherit', env});
	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
};

run([
	fileURLToPath(new URL('../node_modules/wxt/bin/wxt.mjs', import.meta.url)),
	command,
	'-b',
	'chrome',
	'--mv3',
	'--mode',
	'beta',
]);
if (command === 'zip') {
	run([fileURLToPath(new URL('verify-build.mjs', import.meta.url)), '--beta']);
}
