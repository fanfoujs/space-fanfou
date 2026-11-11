import {createRegistry} from './registry';
import {metadataModules} from './index.js';

export default createRegistry(
	metadataModules,
	import.meta.glob('./*/*@content.{js,jsx}', {eager: true}),
	import.meta.glob('./*/*@content.{less,css}', {
		eager: true,
		query: '?inline',
		import: 'default',
	}),
);
