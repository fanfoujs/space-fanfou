import {browser} from 'wxt/browser';
import messaging from './messaging.js';
import {
	FANFOU_OAUTH_GET_STATUS,
	FANFOU_ACCOUNT_CACHE_KEY,
	FANFOU_OAUTH_PENDING_KEY,
	FANFOU_OAUTH_ERROR_KEY,
	FANFOU_WEBSITE_ACCOUNTS_KEY,
} from '@constants';

let snapshot = {
	status: null,
	loading: true,
	checking: false,
	checkError: '',
	needsReload: false,
};
let cachedRequest;
let isCachedRefreshQueued = false;
let refreshRequest;
let revision = 0;
const listeners = new Set();

function publish(update) {
	snapshot = {...snapshot, ...update};
	for (const listener of listeners) {
		listener(snapshot);
	}
}

function readResponse(response) {
	if (response?.error) {
		throw new Error(response.error);
	}

	if (typeof response?.status?.loggedIn !== 'boolean') {
		const error = new Error('扩展已更新，请重新加载。');
		error.needsReload = true;
		throw error;
	}

	return response.status;
}

function loadCachedStatus(force = false) {
	if (cachedRequest) {
		if (force) {
			isCachedRefreshQueued = true;
		}

		return cachedRequest;
	}

	if (!force && !snapshot.loading) {
		return Promise.resolve();
	}

	const version = revision;
	cachedRequest = messaging
		.postMessage({action: FANFOU_OAUTH_GET_STATUS, payload: {cached: true}})
		.then((response) => {
			const status = readResponse(response);
			if (version === revision) {
				publish({status, loading: false, needsReload: false});
			}
		})
		.catch(() => {
			if (version === revision) {
				publish({loading: false});
			}
		})
		.finally(() => {
			cachedRequest = null;
			if (!isCachedRefreshQueued) {
				return;
			}

			isCachedRefreshQueued = false;
			if (listeners.size > 0) {
				loadCachedStatus(true);
			}
		});
	return cachedRequest;
}

function handleStorageChange(changes, area) {
	const authorizationChanged = [
		FANFOU_OAUTH_PENDING_KEY,
		FANFOU_OAUTH_ERROR_KEY,
	].some((key) =>
		area === 'session'
			? changes[key]
			: area === 'local' && changes[`__sf_session__/${key}`],
	);
	if (
		authorizationChanged ||
		(area === 'local' &&
			(changes[FANFOU_ACCOUNT_CACHE_KEY] ||
				changes[FANFOU_WEBSITE_ACCOUNTS_KEY]))
	) {
		loadCachedStatus(true);
	}
}

export function subscribeAccountStatus(listener) {
	if (listeners.size === 0) {
		browser.storage.onChanged.addListener(handleStorageChange);
	}

	listeners.add(listener);
	listener(snapshot);
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			browser.storage.onChanged.removeListener(handleStorageChange);
		}
	};
}

export function refreshAccountStatus({clearAuthorizationError = false} = {}) {
	if (refreshRequest) {
		return clearAuthorizationError
			? refreshRequest.then(() =>
					refreshAccountStatus({clearAuthorizationError: true}),
				)
			: refreshRequest;
	}

	const version = revision;
	publish({checking: true, checkError: ''});
	const request = (async () => {
		await loadCachedStatus();
		if (version !== revision) {
			return;
		}

		try {
			const response = await messaging.postMessage({
				action: FANFOU_OAUTH_GET_STATUS,
				payload: {refreshAccount: true, clearAuthorizationError},
			});
			const status = readResponse(response);
			if (version !== revision) {
				return;
			}

			revision++;
			publish({
				status,
				loading: false,
				checking: false,
				needsReload: false,
				checkError:
					status.loggedIn && status.profileError
						? '暂时无法更新账号资料，当前显示上次保存的信息。'
						: '',
			});
		} catch (error) {
			if (version !== revision) {
				return;
			}

			publish({
				loading: false,
				checking: false,
				needsReload: Boolean(error.needsReload),
				checkError: snapshot.status
					? '暂时无法更新账号信息，当前显示上次保存的状态。'
					: error.message || '暂时无法检查登录状态，请稍后重试。',
			});
		}
	})().finally(() => {
		if (refreshRequest === request) {
			refreshRequest = null;
		}
	});
	refreshRequest = request;
	return request;
}

// Explicit login/logout wins over any older silent check still in flight.
export function invalidateAccountCheck() {
	revision++;
	refreshRequest = null;
	publish({checking: false, checkError: ''});
}

export function acceptAccountStatus(status) {
	revision++;
	publish({
		status,
		loading: false,
		checking: false,
		needsReload: false,
		checkError: '',
	});
}
