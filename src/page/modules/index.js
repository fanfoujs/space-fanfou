import checkMyNewStatus from './checkMyNewStatus.js';
import fanfouOAuth from './fanfouOAuth.js';
import proxiedAudio from './proxiedAudio.js';
import proxiedCreateTab from './proxiedCreateTab.js';
import proxiedFetch from './proxiedFetch.js';
import storage from './storage.js';
import contentModules from '@content/modules';

export default {
	...contentModules,
	checkMyNewStatus,
	fanfouOAuth,
	proxiedAudio,
	proxiedCreateTab,
	proxiedFetch,
	storage,
};
