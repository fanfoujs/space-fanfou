import {createRegistry} from './registry';
import {metadataModules} from './index.js';

export default createRegistry(
	metadataModules,
	import.meta.glob('./*/*@background.{js,jsx}', {eager: true}),
);
