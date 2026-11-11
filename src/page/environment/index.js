import bridge from './bridge.js';
import settings from './settings.js';

export default async function createPageEnvironment() {
	await settings.ready();

	return {bridge, settings};
}
