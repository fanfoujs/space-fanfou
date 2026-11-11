import bridge from '../environment/bridge.js';
import wrapper from '@libs/wrapper';
import {FANFOU_OAUTH_API_REQUEST} from '@constants';

function request(method, parameters) {
	return bridge.postMessage({
		action: FANFOU_OAUTH_API_REQUEST,
		payload: {method, params: parameters},
	});
}

export default wrapper({
	install() {
		return bridge.ready();
	},

	getUser(parameters) {
		return request('getUser', parameters);
	},

	getFollowings(parameters) {
		return request('getFollowings', parameters);
	},

	checkFriendshipDetail(parameters) {
		return request('checkFriendshipDetail', parameters);
	},
});
