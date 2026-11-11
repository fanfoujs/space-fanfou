import oauth from '../../src/background/environment/fanfouOAuth';
import log from '../../src/libs/log';
import {composerImageFixture} from '../fixtures/composer-image';
import {
	COMPOSER_DRAFT_KEY,
	COMPOSER_IMAGE_KEY,
	getComposerDraftKey,
	getComposerSendKey,
} from '../../src/platform/composer';

const state = vi.hoisted(() => ({
	handlers: new Map<string, (payload?: any) => Promise<any>>(),
	storage: new Map<string, any>(),
	createTab: vi.fn(),
	readSession: vi.fn(),
	session: {userId: '42', screenName: 'tester'} as {
		userId: string;
		screenName: string;
	} | null,
	identity: undefined as
		| undefined
		| {
				getRedirectURL: (path: string) => string;
				launchWebAuthFlow: ReturnType<typeof vi.fn>;
		  },
	options: {'fanfou-oauth': true} as Record<string, unknown>,
}));
vi.mock('wxt/browser', () => ({
	browser: {
		get identity() {
			return state.identity;
		},
		tabs: {create: state.createTab},
		runtime: {
			getURL: (path: string) => `chrome-extension://test-extension${path}`,
		},
		storage: {
			local: {
				get: async (key: string | string[]) =>
					Object.fromEntries(
						(Array.isArray(key) ? key : [key]).map((name) => [
							name,
							state.storage.get('local:' + name),
						]),
					),
				async set(values: Record<string, unknown>) {
					for (const [key, value] of Object.entries(values)) {
						state.storage.set('local:' + key, value);
					}
				},
			},
		},
	},
}));
vi.mock('../../src/background/environment/messaging', () => ({
	default: {
		registerHandler: (type: string, handler: (payload?: any) => Promise<any>) =>
			state.handlers.set(type, handler),
	},
}));
vi.mock('../../src/background/environment/settings', () => ({
	default: {readAll: async () => state.options},
}));
vi.mock('../../src/background/environment/storage', () => ({
	default: {
		read: async (key: string, area: string) =>
			state.storage.get(area + ':' + key),
		async write(key: string, value: unknown, area: string) {
			state.storage.set(area + ':' + key, value);
		},
		async delete(key: string, area: string) {
			state.storage.delete(area + ':' + key);
		},
	},
}));
vi.mock('../../src/platform/fanfou-session', () => ({
	readFanfouSession: (...args: unknown[]) => state.readSession(...args),
}));

const authorize = (payload?: unknown) =>
	state.handlers.get('FANFOU_OAUTH_AUTHORIZE')!(payload);
const pendingKey = 'session:fanfou-oauth/pending';
const tokenKey = 'local:fanfou-oauth/tokens';
const compose = (
	payload: unknown,
	url = 'chrome-extension://test-extension/settings.html?popup',
) => (state.handlers.get('FANFOU_COMPOSE_SEND')! as any)(payload, {url});
const removeAccount = (
	userId: string,
	url = 'chrome-extension://test-extension/settings.html?popup',
) =>
	(state.handlers.get('FANFOU_OAUTH_REMOVE_ACCOUNT')! as any)({userId}, {url});

beforeEach(async () => {
	state.storage.clear();
	state.identity = undefined;
	state.session = {userId: '42', screenName: 'tester'};
	state.readSession.mockReset().mockImplementation(async () => state.session);
	state.options = {'fanfou-oauth': true};
	state.createTab.mockReset();
	oauth.install();
	await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!();
	state.storage.clear();
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function mockAuthorization() {
	const requests: Request[] = [];
	const fetchMock = vi.fn(
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init);
			requests.push(request);
			const path = new URL(request.url).pathname;
			if (path === '/oauth/request_token') {
				return new Response(
					'oauth_token=temporary&oauth_token_secret=temp-secret',
				);
			}

			if (path === '/oauth/access_token') {
				return new Response(
					'oauth_token=access&oauth_token_secret=access-secret',
				);
			}

			return Response.json({
				id: '42',
				screen_name: 'tester',
				statuses_count: 7,
			});
		},
	);
	vi.stubGlobal('fetch', fetchMock);
	return {requests, fetchMock};
}

function callbackIdentity(parameters: string) {
	const redirect = 'https://extension-test.chromiumapp.org/fanfou-oauth';
	state.identity = {
		getRedirectURL: () => redirect,
		launchWebAuthFlow: vi.fn(async () => `${redirect}?${parameters}`),
	};
	return {redirect, launch: state.identity.launchWebAuthFlow};
}

test('Safari can authorize without identity API, keep pending state, exchange tokens, and revoke', async () => {
	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input instanceof Request ? input.url : input);
		return new Response(
			url.includes('api.fanfou.com')
				? JSON.stringify({
						id: '42',
						screen_name: 'tester',
						statuses_count: 7,
					})
				: url.includes('request_token')
					? 'oauth_token=temporary&oauth_token_secret=temp-secret'
					: 'oauth_token=access&oauth_token_secret=access-secret&screen_name=tester&user_id=42',
		);
	});
	vi.stubGlobal('fetch', fetchMock);
	oauth.install();
	try {
		const status = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!();
		expect(status.status.manualAuthorization).toBe(true);
		expect(status.status.redirectUrl).toBe('oob');
		const started = await state.handlers.get('FANFOU_OAUTH_AUTHORIZE')!();
		expect(started.status.pendingAuthorization).toBe(true);
		expect(state.createTab).toHaveBeenCalledWith(
			expect.objectContaining({
				url: expect.stringContaining('oauth_callback=oob'),
			}),
		);
		const authorized = await state.handlers.get('FANFOU_OAUTH_AUTHORIZE')!({
			complete: true,
			verifier: '123456',
		});
		expect(authorized.status.hasTokens).toBe(true);
		expect(authorized.status.screenName).toBe('tester');
		expect(state.storage.has('session:fanfou-oauth/pending')).toBe(false);
		expect(state.storage.get('local:fanfou-oauth/tokens').oauthToken).toBe(
			'access',
		);
		const profile = await state.handlers.get('FANFOU_OAUTH_API_REQUEST')!({
			method: 'getUser',
			params: {id: '42'},
		});
		expect(profile.responseJSON).toMatchObject({
			id: '42',
			screenName: 'tester',
			statusesCount: 7,
		});
		const [accessInput, accessInit] = fetchMock.mock.calls.find(([input]) =>
			String(input).includes('access_token'),
		)! as unknown as [RequestInfo, RequestInit];
		const access = new Request(accessInput, accessInit);
		expect(access.method).toBe('POST');
		expect(access.credentials).toBe('omit');
		expect(new URLSearchParams(await access.text()).get('oauth_verifier')).toBe(
			'123456',
		);
		expect(
			(await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!()).status
				.hasTokens,
		).toBe(false);
	} finally {
		vi.unstubAllGlobals();
	}
});

test('Safari without a verifier exchanges both tokens through SDK and retrieves account details', async () => {
	const {requests} = mockAuthorization();
	const started = await authorize();
	expect(started.status.pendingAuthorization).toBe(true);
	expect(state.storage.get(pendingKey).tempToken).toEqual({
		oauth_token: 'temporary',
		oauth_token_secret: 'temp-secret',
	});
	const url = new URL(state.createTab.mock.calls[0]![0].url);
	expect(url.searchParams.get('oauth_callback')).toBe('oob');
	expect(url.searchParams.get('oauth_token')).toBe('temporary');
	const result = await authorize({complete: true});
	expect(result.status).toMatchObject({
		hasTokens: true,
		screenName: 'tester',
		userId: '42',
		pendingAuthorization: false,
	});
	expect(
		requests.map((request) => [new URL(request.url).pathname, request.method]),
	).toEqual([
		['/oauth/request_token', 'GET'],
		['/oauth/access_token', 'GET'],
		['/users/show.json', 'GET'],
	]);
	expect(requests[0]!.url).toBe('https://fanfou.com/oauth/request_token');
	expect(requests[1]!.headers.get('Authorization')).toContain(
		'oauth_token="temporary"',
	);
	expect(requests[2]!.headers.get('Authorization')).toContain(
		'oauth_token="access"',
	);
	expect(state.storage.get(tokenKey)).toMatchObject({
		oauthToken: 'access',
		oauthTokenSecret: 'access-secret',
		screenName: 'tester',
	});
	expect(state.storage.get(tokenKey)).not.toHaveProperty('consumerSecret');
});

test.each(['', '&oauth_verifier=654321'])(
	'callback authorization keeps callback URL and supports verifier %s',
	async (suffix) => {
		const {requests} = mockAuthorization();
		const {redirect, launch} = callbackIdentity(
			'oauth_token=temporary' + suffix,
		);
		const result = await authorize();
		expect(result.status).toMatchObject({
			hasTokens: true,
			screenName: 'tester',
			userId: '42',
		});
		const url = new URL(launch.mock.calls[0]![0].url);
		expect(url.searchParams.get('oauth_callback')).toBe(redirect);
		expect(url.searchParams.get('oauth_token')).toBe('temporary');
		expect(state.createTab).not.toHaveBeenCalled();
		expect(requests[1]!.method).toBe(suffix ? 'POST' : 'GET');
		if (suffix) {
			expect(
				new URLSearchParams(await requests[1]!.text()).get('oauth_verifier'),
			).toBe('654321');
		}
	},
);

test.each([
	['oauth_token=another-token', 'OAuth 回调 token 不匹配'],
	['denied=temporary', '授权被拒绝'],
])(
	'callback %s is rejected before token exchange',
	async (parameters, error) => {
		const {requests} = mockAuthorization();
		callbackIdentity(parameters!);
		vi.spyOn(log, 'error').mockImplementation(() => {});
		expect(await authorize()).toEqual({error});
		expect(requests).toHaveLength(1);
		expect(state.storage.has(tokenKey)).toBe(false);
	},
);

test.each(['expired', 'consumer-changed'])(
	'manual authorization rejects %s pending state',
	async (reason) => {
		const {requests} = mockAuthorization();
		await authorize();
		const pending = state.storage.get(pendingKey);
		if (reason === 'expired') {
			pending.createdAt = Date.now() - 11 * 60_000;
		} else {
			pending.consumerKey = 'different-consumer';
		}

		vi.spyOn(log, 'error').mockImplementation(() => {});
		const result = await authorize({complete: true});
		expect(result.error).toContain(
			reason === 'expired' ? '授权已过期' : '应用密钥已变更',
		);
		expect(requests).toHaveLength(1);
		expect(state.storage.has(tokenKey)).toBe(false);
	},
);

test('incomplete temporary credentials never open an authorization window', async () => {
	const {fetchMock} = mockAuthorization();
	fetchMock.mockImplementationOnce(
		async () => new Response('oauth_token=temporary'),
	);
	expect((await authorize()).error).toContain('获取 Request Token 失败');
	expect(state.createTab).not.toHaveBeenCalled();
	expect(state.storage.has(pendingKey)).toBe(false);
});

test('incomplete access credentials are not persisted', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	fetchMock.mockImplementationOnce(
		async () => new Response('oauth_token=access'),
	);
	vi.spyOn(log, 'error').mockImplementation(() => {});
	expect((await authorize({complete: true})).error).toContain(
		'获取 Access Token 失败',
	);
	expect(state.storage.has(tokenKey)).toBe(false);
});

test('account profile failures do not discard successful SDK authorization', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	fetchMock.mockImplementationOnce(
		async () =>
			new Response('oauth_token=access&oauth_token_secret=access-secret'),
	);
	fetchMock.mockImplementationOnce(async () =>
		Response.json({error: 'Profile unavailable'}, {status: 403}),
	);
	vi.spyOn(log, 'warn').mockImplementation(() => {});
	const result = await authorize({complete: true});
	expect(result.status).toMatchObject({
		loggedIn: true,
		screenName: 'tester',
		pendingAuthorization: false,
	});
	expect(state.storage.get(tokenKey).oauthToken).toBe('access');
});

test('duplicate requests share one authorization and exchange each temporary token only once', async () => {
	const {requests} = mockAuthorization();
	const started = await Promise.all([authorize(), authorize()]);
	expect(started[0]).toEqual(started[1]);
	expect(state.createTab).toHaveBeenCalledTimes(1);
	const results = await Promise.all([
		authorize({complete: true}),
		authorize({complete: true}),
	]);
	expect(results[0]).toEqual(results[1]);
	expect(results[0].status.hasTokens).toBe(true);
	expect(
		requests.filter(
			(request) => new URL(request.url).pathname === '/oauth/access_token',
		),
	).toHaveLength(1);
});

test('a different authorization flow cannot replace one that is still in progress', async () => {
	mockAuthorization();
	const started = authorize();
	expect(await authorize({manual: true})).toEqual({
		error: '授权正在处理中，请稍后再试',
	});
	expect((await started).status.pendingAuthorization).toBe(true);
	expect((await authorize({complete: true})).status.hasTokens).toBe(true);
});

test('after a temporary profile error the cooldown retry does not request new OAuth tokens', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	fetchMock.mockImplementationOnce(
		async () =>
			new Response('oauth_token=access&oauth_token_secret=access-secret'),
	);
	fetchMock.mockImplementationOnce(async () =>
		Response.json({error: 'Profile unavailable'}, {status: 403}),
	);
	vi.spyOn(log, 'warn').mockImplementation(() => {});
	const authorized = await authorize({complete: true});
	expect(authorized.status).toMatchObject({
		loggedIn: true,
		screenName: 'tester',
	});
	expect(state.storage.get(tokenKey).profileError).toBe('Profile unavailable');
	const requestCount = fetchMock.mock.calls.length;
	vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60_000);
	const status = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
		refreshAccount: true,
	});
	expect(status.status).toMatchObject({
		hasTokens: true,
		screenName: 'tester',
		userId: '42',
		profileError: null,
	});
	expect(state.storage.get(tokenKey).profileError).toBeNull();
	expect(
		fetchMock.mock.calls
			.slice(requestCount)
			.map(([input]) => (input instanceof Request ? input.url : String(input))),
	).toEqual(['https://api.fanfou.com/users/show.json']);
});

test.each([
	[{error: 'Permission denied'}, 'Permission denied'],
	[{authorized: true}, '饭否没有返回有效的账号资料'],
])(
	'invalid account response %j cannot overwrite the identity confirmed by OAuth',
	async (response, message) => {
		const {fetchMock} = mockAuthorization();
		await authorize();
		fetchMock.mockImplementationOnce(
			async () =>
				new Response('oauth_token=access&oauth_token_secret=access-secret'),
		);
		fetchMock.mockImplementationOnce(async () => Response.json(response));
		vi.spyOn(log, 'warn').mockImplementation(() => {});
		const result = await authorize({complete: true});
		expect(result.status).toMatchObject({
			loggedIn: true,
			userId: '42',
		});
		expect(state.storage.get(tokenKey).profileError).toBe(message);
	},
);

test('account lookup uses the returned name when screen_name is absent', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	fetchMock.mockImplementationOnce(
		async () =>
			new Response('oauth_token=access&oauth_token_secret=access-secret'),
	);
	fetchMock.mockImplementationOnce(async () =>
		Response.json({id: '42', name: '测试账号'}),
	);
	expect((await authorize({complete: true})).status).toMatchObject({
		screenName: '测试账号',
		userId: '42',
		profileError: null,
	});
});

test('simultaneous account rechecks share one API request', async () => {
	const {requests} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	const count = requests.length;
	const status = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!;
	const results = await Promise.all([
		status({refreshAccount: true}),
		status({refreshAccount: true}),
	]);
	expect(results[0]).toEqual(results[1]);
	expect(requests.length - count).toBe(1);
});

test('finishing an account lookup after revocation cannot restore saved tokens', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	let respond!: (response: Response) => void;
	let markStarted!: () => void;
	const started = new Promise<void>((resolve) => {
		markStarted = resolve;
	});
	fetchMock.mockImplementationOnce(async () => {
		markStarted();
		return new Promise<Response>((resolve) => {
			respond = resolve;
		});
	});
	const checking = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
		refreshAccount: true,
	});
	await started;
	await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!();
	respond(Response.json({id: '42', screen_name: 'tester'}));
	expect((await checking).status.hasTokens).toBe(false);
	expect(state.storage.has(tokenKey)).toBe(false);
	expect(
		(await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({cached: true}))
			.status.loggedIn,
	).toBe(false);
});

test('switching or signing out of the website never treats the previous account as logged in', async () => {
	const {requests} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	const status = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!;
	state.session = {userId: '43', screenName: 'another'};
	expect((await status()).status).toMatchObject({
		loggedIn: false,
		hasTokens: false,
	});
	const count = requests.length;
	const result = await state.handlers.get('FANFOU_OAUTH_API_REQUEST')!({
		method: 'getFollowings',
	});
	expect(result.error).toContain('当前饭否账号尚未完成授权');
	expect(requests).toHaveLength(count);
	state.session = null;
	expect((await status()).status.loggedIn).toBe(false);
	state.session = {userId: '42', screenName: 'tester'};
	expect((await status()).status).toMatchObject({
		loggedIn: true,
		userId: '42',
	});
});

async function loginSecondAccount(
	fetchMock: ReturnType<typeof mockAuthorization>['fetchMock'],
) {
	state.session = {userId: '43', screenName: 'second'};
	await authorize();
	fetchMock.mockImplementationOnce(
		async () =>
			new Response(
				'oauth_token=second-access&oauth_token_secret=second-secret',
			),
	);
	fetchMock.mockImplementationOnce(async () =>
		Response.json({id: '43', screen_name: 'second', unique_id: '~second'}),
	);
	expect((await authorize({complete: true})).status.loggedIn).toBe(true);
}

test('each account keeps its authorization and API requests use the current website account', async () => {
	const {fetchMock, requests} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	const status = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!;
	state.session = {userId: '42', screenName: 'tester'};
	expect((await status()).status).toMatchObject({
		loggedIn: true,
		userId: '42',
	});
	state.session = {userId: '~second', screenName: 'second'};
	expect((await status()).status).toMatchObject({
		loggedIn: true,
		userId: '43',
	});
	await state.handlers.get('FANFOU_OAUTH_API_REQUEST')!({
		method: 'getFollowings',
	});
	expect(requests.at(-1)!.headers.get('Authorization')).toContain(
		'oauth_token="second-access"',
	);
});

test('logging out removes only the current account authorization', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	expect(
		(await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!()).status.loggedIn,
	).toBe(false);
	state.session = {userId: '42', screenName: 'tester'};
	expect(
		(await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!()).status.loggedIn,
	).toBe(true);
});

test('obsolete custom consumer settings cannot override the built-in app', async () => {
	state.options = {
		'fanfou-oauth': false,
		'fanfou-oauth/consumerKey': 'obsolete-custom-key',
		'fanfou-oauth/consumerSecret': 'obsolete-custom-secret',
	};
	const {requests} = mockAuthorization();
	await authorize();
	expect(requests[0]!.headers.get('Authorization')).toContain(
		'oauth_consumer_key="3b8763186f221a7d1f4afa56969898b9"',
	);
	expect(state.storage.get(pendingKey).consumerKey).toBe(
		'3b8763186f221a7d1f4afa56969898b9',
	);
});

test('composer uses the current authorized account and clears the shared draft in the background', async () => {
	const {fetchMock, requests} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	state.storage.set('local:' + COMPOSER_DRAFT_KEY, '写饭测试');
	fetchMock.mockImplementationOnce(async () =>
		Response.json({id: 'posted', text: '写饭测试'}),
	);
	expect(await compose({status: '写饭测试', userId: '42'})).toEqual({
		ok: true,
		statusId: 'posted',
	});
	expect(requests.at(-1)!.headers.get('Authorization')).toContain(
		'oauth_token="access"',
	);
	expect(state.storage.get('local:' + COMPOSER_DRAFT_KEY)).toBe('');
	expect(state.storage.get('local:' + getComposerSendKey('42'))).toEqual({
		state: 'sent',
	});
});

test('composer refuses calls from a website or from an account changed since opening the editor', async () => {
	const {requests} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	const count = requests.length;
	expect(
		(await compose({status: '测试', userId: '42'}, 'https://fanfou.com/home'))
			.error,
	).toContain('快捷发饭窗口');
	expect(
		(
			await compose(
				{status: '测试', userId: '42'},
				'chrome-extension://other-extension/settings.html',
			)
		).error,
	).toContain('快捷发饭窗口');
	state.session = {userId: '43', screenName: 'another'};
	expect((await compose({status: '测试', userId: '42'})).error).toContain(
		'账号已改变',
	);
	expect(requests).toHaveLength(count);
});

test('failed sends keep the draft and report the API error', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	state.storage.set('local:' + COMPOSER_DRAFT_KEY, '保留草稿');
	fetchMock.mockImplementationOnce(async () =>
		Response.json({error: '请稍后再试'}, {status: 503}),
	);
	expect((await compose({status: '保留草稿', userId: '42'})).error).toBe(
		'请稍后再试',
	);
	expect(state.storage.get('local:' + COMPOSER_DRAFT_KEY)).toBe('保留草稿');
});

test('an in-flight send blocks duplicates and never clears a newer draft', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	let finish!: (response: Response) => void;
	let markStarted!: () => void;
	const started = new Promise<void>((resolve) => {
		markStarted = resolve;
	});
	fetchMock.mockImplementationOnce(async () => {
		markStarted();
		return new Promise<Response>((resolve) => {
			finish = resolve;
		});
	});
	const sending = compose({status: '旧草稿', userId: '42'});
	await started;
	expect((await compose({status: '旧草稿', userId: '42'})).error).toContain(
		'正在发送',
	);
	state.storage.set('local:' + COMPOSER_DRAFT_KEY, '其他窗口的新草稿');
	finish(Response.json({id: 'posted'}));
	expect((await sending).ok).toBe(true);
	expect(state.storage.get('local:' + COMPOSER_DRAFT_KEY)).toBe(
		'其他窗口的新草稿',
	);
});

test('photo-only sending clears the matching saved image and keeps failures retryable', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	state.storage.set('local:' + COMPOSER_DRAFT_KEY, '');
	state.storage.set('local:' + COMPOSER_IMAGE_KEY, composerImageFixture);
	fetchMock.mockImplementationOnce(async (input, init) => {
		// Consume the multipart body before Ky cancels its request streams.
		await new Request(input, init).arrayBuffer();
		return Response.json({error: '图片发送失败'}, {status: 503});
	});
	expect(
		(await compose({status: '', userId: '42', image: composerImageFixture}))
			.error,
	).toBe('图片发送失败');
	expect(state.storage.get('local:' + COMPOSER_IMAGE_KEY)).toEqual(
		composerImageFixture,
	);
	fetchMock.mockImplementationOnce(async (input, init) => {
		await new Request(input, init).arrayBuffer();
		return Response.json({id: 'uploaded'});
	});
	expect(
		(await compose({status: '', userId: '42', image: composerImageFixture})).ok,
	).toBe(true);
	expect(state.storage.get('local:' + COMPOSER_IMAGE_KEY)).toBe(null);
});

test('a delayed photo upload cannot clear a replacement image even when its caption is unchanged', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	let finish!: (response: Response) => void;
	let started!: () => void;
	const pending = new Promise<void>((resolve) => {
		started = resolve;
	});
	fetchMock.mockImplementationOnce(async (input, init) => {
		await new Request(input, init).arrayBuffer();
		started();
		return new Promise<Response>((resolve) => {
			finish = resolve;
		});
	});
	state.storage.set('local:' + COMPOSER_DRAFT_KEY, '相同说明');
	state.storage.set('local:' + COMPOSER_IMAGE_KEY, composerImageFixture);
	const sending = compose({
		status: '相同说明',
		userId: '42',
		image: composerImageFixture,
	});
	await pending;
	const replacement = {...composerImageFixture, id: 'new-image'};
	state.storage.set('local:' + COMPOSER_IMAGE_KEY, replacement);
	finish(Response.json({id: 'uploaded'}));
	expect((await sending).ok).toBe(true);
	expect(state.storage.get('local:' + COMPOSER_IMAGE_KEY)).toEqual(replacement);
	expect(state.storage.get('local:' + COMPOSER_DRAFT_KEY)).toBe('相同说明');
});

test('credentials for the previous app are not treated as a login to the new built-in app', async () => {
	const {fetchMock} = mockAuthorization();
	state.storage.set(tokenKey, {
		oauthToken: 'old-access',
		oauthTokenSecret: 'old-secret',
		consumerKey: 'old-app',
		userId: '42',
		accountIds: ['42'],
	});
	const status = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
		refreshAccount: true,
	});
	expect(status.status).toMatchObject({loggedIn: false, hasTokens: false});
	expect(fetchMock).not.toHaveBeenCalled();
});

test.each([401, 403])(
	'profile rate limit %s preserves confirmed login and backs off retries',
	async (statusCode) => {
		const {fetchMock} = mockAuthorization();
		await authorize();
		fetchMock.mockImplementationOnce(
			async () =>
				new Response('oauth_token=access&oauth_token_secret=access-secret'),
		);
		fetchMock.mockImplementationOnce(async () =>
			Response.json(
				{error: '尝试次数过多，请到 http://fanfou.com 登录'},
				{status: statusCode},
			),
		);
		vi.spyOn(log, 'warn').mockImplementation(() => {});
		const result = await authorize({complete: true});
		expect(result.status).toMatchObject({loggedIn: true, userId: '42'});
		const count = fetchMock.mock.calls.length;
		const getStatus = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!;
		expect((await getStatus({refreshAccount: true})).status.loggedIn).toBe(
			true,
		);
		expect((await getStatus({refreshAccount: true})).status.loggedIn).toBe(
			true,
		);
		expect(fetchMock.mock.calls).toHaveLength(count);
		vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60_000);
		expect((await getStatus({refreshAccount: true})).status).toMatchObject({
			loggedIn: true,
			profileError: null,
		});
		expect(fetchMock.mock.calls).toHaveLength(count + 1);
	},
);

test('an explicitly invalid access token is not treated as a confirmed login', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	fetchMock.mockImplementationOnce(
		async () =>
			new Response('oauth_token=access&oauth_token_secret=access-secret'),
	);
	fetchMock.mockImplementationOnce(async () =>
		Response.json({error: 'Invalid OAuth token'}, {status: 401}),
	);
	vi.spyOn(log, 'warn').mockImplementation(() => {});
	expect((await authorize({complete: true})).status.loggedIn).toBe(false);
	expect(state.storage.get(tokenKey).authorizationInvalid).toBe(true);
});

test('a website account change during manual authorization cannot bind an unverified token to the new account', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	state.session = {userId: '43', screenName: 'other'};
	fetchMock.mockImplementationOnce(
		async () =>
			new Response('oauth_token=access&oauth_token_secret=access-secret'),
	);
	fetchMock.mockImplementationOnce(async () =>
		Response.json({error: 'Profile unavailable'}, {status: 403}),
	);
	vi.spyOn(log, 'warn').mockImplementation(() => {});
	expect((await authorize({complete: true})).status.loggedIn).toBe(false);
	expect(state.storage.get(tokenKey).userId).toBeNull();
});

test('unknown historical credentials cannot acquire a website identity just because profile lookup is rate limited', async () => {
	const {fetchMock} = mockAuthorization();
	state.storage.set(tokenKey, {
		oauthToken: 'unknown-access',
		oauthTokenSecret: 'unknown-secret',
		consumerKey: '3b8763186f221a7d1f4afa56969898b9',
	});
	fetchMock.mockImplementationOnce(async () =>
		Response.json({error: '尝试次数过多'}, {status: 401}),
	);
	vi.spyOn(log, 'warn').mockImplementation(() => {});
	expect(
		(
			await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
				refreshAccount: true,
			})
		).status.loggedIn,
	).toBe(false);
	expect(state.storage.get(tokenKey).userId).toBeFalsy();
});

test('cached status returns the saved profile without checking the website or calling an API', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	const requests = fetchMock.mock.calls.length;
	const sessionReads = state.readSession.mock.calls.length;
	const getStatus = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!;
	expect((await getStatus({cached: true})).status).toMatchObject({
		loggedIn: true,
		userId: '42',
		screenName: 'tester',
	});
	// Older installations have a saved token/profile but no separate display cache.
	state.storage.delete('local:fanfou-oauth/status');
	expect((await getStatus({cached: true})).status).toMatchObject({
		loggedIn: true,
		userId: '42',
		screenName: 'tester',
	});
	expect(fetchMock.mock.calls).toHaveLength(requests);
	expect(state.readSession.mock.calls).toHaveLength(sessionReads);
});

test('failed session checks preserve the saved status instead of caching a logout', async () => {
	mockAuthorization();
	await authorize();
	await authorize({complete: true});
	const getStatus = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!;
	state.readSession.mockRejectedValueOnce(new Error('offline'));
	await expect(getStatus({refreshAccount: true})).rejects.toThrow('offline');
	const cached = await getStatus({cached: true});
	expect(cached.status).toMatchObject({loggedIn: true, screenName: 'tester'});
	expect(JSON.stringify(cached)).not.toContain('access-secret');
	expect(cached.status).not.toHaveProperty('oauthToken');
	expect(cached.status).not.toHaveProperty('consumerSecret');
});

test('a confirmed website logout and explicit revocation both replace the cached login', async () => {
	mockAuthorization();
	await authorize();
	await authorize({complete: true});
	const getStatus = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!;
	state.session = null;
	await getStatus();
	expect((await getStatus({cached: true})).status.loggedIn).toBe(false);
	state.session = {userId: '42', screenName: 'tester'};
	await getStatus();
	expect((await getStatus({cached: true})).status.loggedIn).toBe(true);
	await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!();
	expect((await getStatus({cached: true})).status.loggedIn).toBe(false);
});

test('logout from a cached profile cannot revoke a different account after a website switch', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	const clear = state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!;
	expect((await clear({userId: '42'})).error).toContain('账号已改变');
	expect(
		(await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!()).status,
	).toMatchObject({loggedIn: true, userId: '43'});
});

test('composer lists all known accounts without returning credentials or checking the network', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	const count = fetchMock.mock.calls.length;
	const checks = state.readSession.mock.calls.length;
	const result = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
		cached: true,
	});
	expect(result.status.accounts).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				userId: '42',
				screenName: 'tester',
				loggedIn: true,
			}),
			expect.objectContaining({
				userId: '43',
				screenName: 'second',
				loggedIn: true,
			}),
		]),
	);
	expect(JSON.stringify(result.status.accounts)).not.toMatch(
		/oauthToken|consumerSecret|access-secret|second-access/,
	);
	expect(fetchMock.mock.calls).toHaveLength(count);
	expect(state.readSession.mock.calls).toHaveLength(checks);
});

test.each([false, true])(
	'an explicitly selected account sends with its own token when website signed out = %s',
	async (signedOut) => {
		const {fetchMock, requests} = mockAuthorization();
		await authorize();
		await authorize({complete: true});
		await loginSecondAccount(fetchMock);
		state.session = {userId: '42', screenName: 'tester'};
		await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!();
		if (signedOut) {
			state.session = null;
		}

		state.storage.set('local:' + getComposerDraftKey('42'), '保留的旧版草稿');
		state.storage.set('local:' + COMPOSER_DRAFT_KEY, '第二个账号发送');
		const checks = state.readSession.mock.calls.length;
		fetchMock.mockImplementationOnce(async (input, init) => {
			requests.push(new Request(input, init));
			return Response.json({id: 'second-post'});
		});
		expect(
			await compose({
				status: '第二个账号发送',
				userId: '43',
				accountId: '43',
			}),
		).toEqual({ok: true, statusId: 'second-post'});
		expect(requests.at(-1)!.headers.get('Authorization')).toContain(
			'oauth_token="second-access"',
		);
		expect(state.readSession.mock.calls).toHaveLength(checks);
		expect(state.storage.get(tokenKey).oauthToken).toBe('access');
		expect(state.storage.get('local:' + getComposerDraftKey('42'))).toBe(
			'保留的旧版草稿',
		);
		expect(state.storage.get('local:' + COMPOSER_DRAFT_KEY)).toBe('');
	},
);

test('explicit sending rejects unknown, mismatched, expired, and other-app accounts before posting', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	state.session = {userId: '42', screenName: 'tester'};
	await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!();
	const count = fetchMock.mock.calls.length;
	expect(
		(await compose({status: '测试', userId: '43', accountId: '42'})).error,
	).toContain('不一致');
	expect(
		(await compose({status: '测试', userId: 'missing', accountId: 'missing'}))
			.error,
	).toContain('尚未授权');
	const accounts = state.storage.get('local:fanfou-oauth/accounts');
	const key = Object.keys(accounts).find(
		(key) => accounts[key].userId === '43',
	)!;
	accounts[key] = {...accounts[key], authorizationInvalid: true};
	expect(
		(await compose({status: '测试', userId: '43', accountId: '43'})).error,
	).toContain('授权已失效');
	accounts[key] = {
		...accounts[key],
		authorizationInvalid: false,
		consumerKey: 'other-app',
	};
	expect(
		(await compose({status: '测试', userId: '43', accountId: '43'})).error,
	).toContain('尚未授权');
	expect(fetchMock.mock.calls).toHaveLength(count);
});

test('an expired selected token is marked for reauthorization without logging out another account', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	state.session = {userId: '42', screenName: 'tester'};
	await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!();
	state.storage.set('local:' + COMPOSER_DRAFT_KEY, '授权过期也保留草稿');
	fetchMock.mockImplementationOnce(async () =>
		Response.json({error: 'Invalid OAuth token'}, {status: 401}),
	);
	expect(
		(
			await compose({
				status: '授权过期也保留草稿',
				userId: '43',
				accountId: '43',
			})
		).error,
	).toBe('Invalid OAuth token');
	const cached = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
		cached: true,
	});
	expect(cached.status.accounts).toEqual(
		expect.arrayContaining([
			expect.objectContaining({userId: '42', loggedIn: true}),
			expect.objectContaining({userId: '43', loggedIn: false}),
		]),
	);
	expect(state.storage.get(tokenKey).oauthToken).toBe('access');
	expect(state.storage.get('local:' + COMPOSER_DRAFT_KEY)).toBe(
		'授权过期也保留草稿',
	);
});

test('account manager removes another account offline, preserves drafts, and clears its saved sender selection', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	state.session = {userId: '42', screenName: 'tester'};
	await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!();
	state.storage.set('local:' + COMPOSER_DRAFT_KEY, '移除后保留的草稿');
	state.storage.set('local:composer/selectedAccount', '43');
	const requests = fetchMock.mock.calls.length;
	const sessionReads = state.readSession.mock.calls.length;
	const result = await removeAccount('43');
	expect(result.status).toMatchObject({
		loggedIn: true,
		userId: '42',
		currentUserId: '42',
	});
	expect(result.status.accounts).toEqual([
		expect.objectContaining({userId: '42', isCurrent: true}),
	]);
	expect(state.storage.get(tokenKey).oauthToken).toBe('access');
	expect(state.storage.get('local:' + COMPOSER_DRAFT_KEY)).toBe(
		'移除后保留的草稿',
	);
	expect(state.storage.has('local:composer/selectedAccount')).toBe(false);
	expect(fetchMock.mock.calls).toHaveLength(requests);
	expect(state.readSession.mock.calls).toHaveLength(sessionReads);
});

test('removing the current account leaves other authorizations and the website identity intact', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	const result = await removeAccount('43');
	expect(result.status).toMatchObject({loggedIn: false, currentUserId: '43'});
	expect(result.status.accounts).toEqual([
		expect.objectContaining({userId: '42', loggedIn: true, isCurrent: false}),
	]);
	expect(state.storage.has(tokenKey)).toBe(false);
	state.session = {userId: '42', screenName: 'tester'};
	expect(
		(await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!()).status.loggedIn,
	).toBe(true);
});

test('a delayed profile refresh cannot restore an account removed from the manager', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	let respond!: (response: Response) => void;
	let begin!: () => void;
	const started = new Promise<void>((resolve) => {
		begin = resolve;
	});
	fetchMock.mockImplementationOnce(async () => {
		begin();
		return new Promise<Response>((resolve) => {
			respond = resolve;
		});
	});
	const checking = state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
		refreshAccount: true,
	});
	await started;
	expect((await removeAccount('42')).status.accounts).toEqual([]);
	respond(Response.json({id: '42', screen_name: 'tester'}));
	expect((await checking).status.accounts).toEqual([]);
	expect(
		(await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({cached: true}))
			.status.accounts,
	).toEqual([]);
});

test('account removal rejects website callers and unknown accounts without deleting credentials', async () => {
	mockAuthorization();
	await authorize();
	await authorize({complete: true});
	expect(
		(await removeAccount('42', 'https://fanfou.com/home')).error,
	).toContain('扩展设置');
	expect((await removeAccount('missing')).error).toContain('已经移除');
	expect(state.storage.get(tokenKey).oauthToken).toBe('access');
});

test('adding another account requires switching away from an already authorized website account', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	const count = fetchMock.mock.calls.length;
	expect((await authorize({addAccount: true})).accountMismatch).toBe(true);
	expect(fetchMock.mock.calls).toHaveLength(count);
	state.session = {userId: '43', screenName: 'second'};
	expect(
		(await authorize({addAccount: true})).status.pendingAuthorization,
	).toBe(true);
	fetchMock.mockImplementationOnce(
		async () =>
			new Response(
				'oauth_token=second-access&oauth_token_secret=second-secret',
			),
	);
	fetchMock.mockImplementationOnce(async () =>
		Response.json({id: '43', screen_name: 'second'}),
	);
	const result = await authorize({complete: true, addAccount: true});
	expect(result.status.accounts).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				userId: '42',
				loggedIn: true,
				isCurrent: false,
			}),
			expect.objectContaining({
				userId: '43',
				loggedIn: true,
				isCurrent: true,
			}),
		]),
	);
});

test('reauthorizing a particular account rejects the wrong website identity before starting OAuth', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	state.session = {userId: '42', screenName: 'tester'};
	const count = fetchMock.mock.calls.length;
	expect((await authorize({userId: '43'})).accountMismatch).toBe(true);
	expect(fetchMock.mock.calls).toHaveLength(count);
	expect(state.storage.has(pendingKey)).toBe(false);
});

test('cancelling a pending manual login keeps existing authorizations', async () => {
	mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await authorize();
	expect(state.storage.has(pendingKey)).toBe(true);
	const result = await authorize({cancel: true});
	expect(result.status).toMatchObject({
		pendingAuthorization: false,
		loggedIn: true,
	});
	expect(state.storage.has(pendingKey)).toBe(false);
	expect(state.storage.get(tokenKey).oauthToken).toBe('access');
});

test('website switcher accounts are listed even when only one has OAuth authorization', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	state.storage.set('local:user-switcher/allUserData', [
		{
			userId: '42',
			nickname: '网页账号一',
			cookies: {u: 'private-session-a'},
		},
		{
			userId: 'web-only',
			nickname: '网页账号二',
			cookies: {u: 'private-session-b', PHPSESSID: 'private-session-id'},
		},
	]);
	const count = fetchMock.mock.calls.length;
	const sessionReads = state.readSession.mock.calls.length;
	const result = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({
		cached: true,
	});
	expect(result.status.accounts).toHaveLength(2);
	expect(result.status.accounts).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				userId: '42',
				loggedIn: true,
				hasAuthorization: true,
				hasWebsiteSession: true,
			}),
			expect.objectContaining({
				userId: 'web-only',
				screenName: '网页账号二',
				loggedIn: false,
				hasAuthorization: false,
				hasWebsiteSession: true,
			}),
		]),
	);
	expect(JSON.stringify(result)).not.toMatch(
		/cookies|private-session|PHPSESSID/,
	);
	expect(fetchMock.mock.calls).toHaveLength(count);
	expect(state.readSession.mock.calls).toHaveLength(sessionReads);
});

test('website IDs and verified OAuth aliases merge into one account row', async () => {
	const {fetchMock} = mockAuthorization();
	await authorize();
	await authorize({complete: true});
	await loginSecondAccount(fetchMock);
	state.session = {userId: '~second', screenName: 'second'};
	state.storage.set('local:user-switcher/allUserData', [
		{
			userId: 'cookie-id',
			accountIds: ['cookie-id', '~second'],
			nickname: '网页昵称',
		},
		{userId: '~second', nickname: '重复昵称'},
		{userId: '42', nickname: 'tester'},
	]);
	const result = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!();
	expect(result.status.accounts).toHaveLength(2);
	expect(result.status.accounts).toContainEqual(
		expect.objectContaining({
			userId: '43',
			isCurrent: true,
			hasWebsiteSession: true,
			hasAuthorization: true,
		}),
	);
	expect(
		result.status.accounts.find((account: any) => account.userId === '43')
			.accountIds,
	).toContain('cookie-id');
});

test('a website account with a verified profile-link alias can start its own authorization', async () => {
	mockAuthorization();
	state.session = {userId: '~second', screenName: 'second'};
	state.storage.set('local:user-switcher/allUserData', [
		{
			userId: 'cookie-id',
			accountIds: ['cookie-id', '~second'],
			nickname: 'second',
		},
	]);
	expect(
		(await authorize({userId: 'cookie-id'})).status.pendingAuthorization,
	).toBe(true);
});

test('a saved website login alone cannot be used as an OAuth credential for sending', async () => {
	const {fetchMock} = mockAuthorization();
	state.storage.set('local:user-switcher/allUserData', [
		{
			userId: 'web-only',
			nickname: '网页登录账号',
			cookies: {u: 'private-session'},
		},
	]);
	expect(
		(await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!({cached: true}))
			.status.accounts,
	).toHaveLength(1);
	expect(
		(
			await compose({
				status: '不应发送',
				userId: 'web-only',
				accountId: 'web-only',
			})
		).error,
	).toContain('尚未授权');
	expect(fetchMock).not.toHaveBeenCalled();
});
