import {h, Component} from 'preact';
import {browser} from 'wxt/browser';
import messaging from '../messaging.js';
import {
	acceptAccountStatus,
	invalidateAccountCheck,
	refreshAccountStatus,
	subscribeAccountStatus,
} from '../accountStatus.js';
import AccountCheckIndicator from './AccountCheckIndicator';
import {FANFOU_OAUTH_AUTHORIZE, FANFOU_OAUTH_REMOVE_ACCOUNT} from '@constants';

const SETUP_KEY = 'fanfou-oauth/accountSetup';

export default class OAuthPanel extends Component {
	state = {
		loading: true,
		checking: false,
		checkError: '',
		working: false,
		workingUserId: null,
		status: null,
		error: '',
		needsReload: false,
		setup: null,
		allowTab: false,
		accountQuery: '',
	};
	setupVersion = 0;

	componentDidMount() {
		this.mounted = true;
		this.unsubscribeAccount = subscribeAccountStatus((snapshot) =>
			this.setState(snapshot),
		);
		browser.storage.onChanged.addListener(this.handleSetupChange);
		browser.storage.local
			.get(SETUP_KEY)
			.then((values) => {
				const setup = values[SETUP_KEY];
				if (
					this.mounted &&
					!this.setupVersion &&
					setup &&
					Date.now() - setup.startedAt < 30 * 60_000
				) {
					this.setState({setup});
				}
			})
			.catch(() => {});
		this.refreshStatus();
		window.addEventListener('focus', this.handleFocus);
	}

	componentWillUnmount() {
		this.mounted = false;
		this.unsubscribeAccount();
		browser.storage.onChanged.removeListener(this.handleSetupChange);
		window.removeEventListener('focus', this.handleFocus);
	}

	handleSetupChange = (changes, area) => {
		if (
			area === 'local' &&
			changes[SETUP_KEY] &&
			!changes[SETUP_KEY].newValue
		) {
			this.setupVersion++;
			this.setState({setup: null});
		}
	};
	handleFocus = () => {
		if (!this.state.working) {
			this.refreshStatus();
		}
	};
	refreshStatus = () => refreshAccountStatus();
	recheckAuthorization = () => {
		this.setState({error: '', allowTab: false});
		return refreshAccountStatus({clearAuthorizationError: true});
	};
	handleSearch = (event) => {
		this.setState({accountQuery: event.currentTarget.value}, () =>
			this.accountList?.scrollTo(0, 0),
		);
	};
	beginSetup = async (account = null) => {
		const setup = {
			kind: account
				? account.unregistered
					? 'authorize'
					: 'reauthorize'
				: 'add',
			userId: account?.userId,
			screenName: account?.screenName,
			startedAt: Date.now(),
		};
		this.setupVersion++;
		this.setState({setup, error: '', allowTab: false});
		try {
			await browser.storage.local.set({[SETUP_KEY]: setup});
		} catch {
			if (this.mounted) {
				this.setState({error: '无法保存登录步骤，请保持窗口打开后重试。'});
			}
		}
	};
	finishSetup = async () => {
		this.setupVersion++;
		if (this.mounted) {
			this.setState({setup: null});
		}

		await browser.storage.local.remove(SETUP_KEY);
	};
	openFanfou = async () => {
		try {
			await browser.tabs.create({url: 'https://fanfou.com/home'});
		} catch {
			if (this.mounted) {
				this.setState({error: '无法打开饭否，请重试。'});
			}
		}
	};
	handleAuthorize = async (options = {}) => {
		const {setup} = this.state;
		const userId =
			options.userId ||
			(setup && setup.kind !== 'add' ? setup.userId : undefined);
		const addAccount = options.addAccount ?? setup?.kind === 'add';
		this.lastAuthorization = {userId, addAccount};
		invalidateAccountCheck();
		this.setState({
			working: true,
			workingUserId: userId || this.state.status?.userId,
			error: '',
			allowTab: false,
		});
		try {
			const response = await messaging.postMessage({
				action: FANFOU_OAUTH_AUTHORIZE,
				payload: {
					useTab: Boolean(options.useTab),
					userId,
					addAccount,
				},
			});
			if (response?.error) {
				const error = new Error(response.error);
				error.accountMismatch = response.accountMismatch;
				throw error;
			}

			if (response?.status) {
				acceptAccountStatus(response.status);
			}

			const status = response?.status;
			if (!status?.pendingAuthorization) {
				const authorized = status?.accounts?.some(
					(account) =>
						account.loggedIn &&
						(!userId ||
							account.userId === userId ||
							account.accountIds?.includes(userId) ||
							(account.isCurrent && status.currentUserId === userId)),
				);
				if (!authorized && !status?.loggedIn) {
					throw new Error('登录未完成，请重试。');
				}

				if (userId && !authorized) {
					const error = new Error(
						'刚才授权的账号与所选账号不同，请切换到所选账号后重试。',
					);
					error.accountMismatch = true;
					throw error;
				}

				await this.finishSetup();
			}

			if (this.mounted) {
				this.setState({working: false, workingUserId: null});
			}
		} catch (error) {
			if (this.mounted) {
				this.setState({
					working: false,
					workingUserId: null,
					error: error.message || '登录失败，请重试。',
					allowTab: !error.accountMismatch && !options.useTab,
				});
			}

			if (this.mounted && error.accountMismatch) {
				this.refreshStatus();
			}
		}
	};
	handleRemove = async (account) => {
		invalidateAccountCheck();
		this.setState({
			working: true,
			workingUserId: account.userId,
			error: '',
			allowTab: false,
		});
		try {
			const response = await messaging.postMessage({
				action: FANFOU_OAUTH_REMOVE_ACCOUNT,
				payload: {userId: account.userId},
			});
			if (response?.error) {
				throw new Error(response.error);
			}

			if (response?.status) {
				acceptAccountStatus(response.status);
			}

			if (this.state.setup?.userId === account.userId) {
				await this.finishSetup();
			}

			if (this.mounted) {
				this.setState({working: false, workingUserId: null});
			}

			if (this.mounted) {
				this.refreshStatus();
			}
		} catch (error) {
			if (this.mounted) {
				this.setState({
					working: false,
					workingUserId: null,
					error: error.message || '移除授权失败，请重试。',
				});
			}
		}
	};
	cancelSetup = async () => {
		this.setState({working: true, error: '', allowTab: false});
		try {
			if (this.state.status?.pendingAuthorization) {
				invalidateAccountCheck();
				const response = await messaging.postMessage({
					action: FANFOU_OAUTH_AUTHORIZE,
					payload: {cancel: true},
				});
				if (response?.error) {
					throw new Error(response.error);
				}

				if (response?.status) {
					acceptAccountStatus(response.status);
				}
			}

			await this.finishSetup();
			if (this.mounted) {
				this.setState({working: false});
			}
		} catch (error) {
			if (this.mounted) {
				this.setState({
					working: false,
					error: error.message || '取消失败，请重试。',
				});
			}
		}
	};

	render() {
		const {
			loading,
			checking,
			checkError,
			working,
			workingUserId,
			status,
			error,
			needsReload,
			setup,
			allowTab,
			accountQuery,
		} = this.state;
		const busy = loading || working;
		const isPending = Boolean(status?.pendingAuthorization);
		const accounts = (status?.accounts || []).map((account) => ({
			...account,
			screenName: account.isCurrent
				? status.screenName || status.currentScreenName || account.screenName
				: account.screenName,
			unregistered: account.hasAuthorization === false,
		}));
		if (
			status?.currentUserId &&
			accounts.every((account) => !account.isCurrent)
		) {
			accounts.push({
				userId: status.currentUserId,
				screenName: status.currentScreenName || status.currentUserId,
				isCurrent: true,
				loggedIn: false,
				unregistered: true,
			});
		}

		accounts.sort(
			(a, b) =>
				Number(b.isCurrent) - Number(a.isCurrent) ||
				Number(b.loggedIn) - Number(a.loggedIn) ||
				(a.screenName || a.userId).localeCompare(
					b.screenName || b.userId,
					'zh-CN',
				),
		);
		const query = accountQuery.trim().toLowerCase();
		const visibleAccounts = query
			? accounts.filter((account) =>
					[
						account.screenName,
						account.userId,
						...(account.accountIds || []),
					].some((value) =>
						String(value || '')
							.toLowerCase()
							.includes(query),
					),
				)
			: accounts;
		return (
			<div className="sf-oauth-panel">
				<div className="sf-oauth-panel__status" aria-live="polite">
					{loading && accounts.length === 0 ? (
						<p>正在读取账号…</p>
					) : accounts.length > 0 ? (
						<div>
							{(accounts.length > 5 || accountQuery) && (
								<div className="sf-oauth-panel__search-row">
									<input
										className="sf-oauth-panel__search"
										type="search"
										aria-label="搜索饭否账号"
										placeholder="搜索名称或 ID"
										value={accountQuery}
										onInput={this.handleSearch}
									/>
									<span className="sf-oauth-panel__count">
										{accounts.length} 个账号
									</span>
								</div>
							)}
							<ul
								className="sf-oauth-accounts"
								aria-label="饭否账号列表"
								ref={(element) => {
									this.accountList = element;
								}}
							>
								{visibleAccounts.map((account) => (
									<li
										className="sf-oauth-account"
										key={account.userId}
										data-account-id={account.userId}
									>
										<div className="sf-oauth-account__identity">
											<span className="sf-oauth-account__name">
												{account.screenName || account.userId}
												<span className="sf-oauth-account__id">
													（{account.userId}）
												</span>
											</span>
											{account.isCurrent && (
												<span className="sf-oauth-account__current">
													当前网页
												</span>
											)}
											<AccountCheckIndicator
												error={
													account.isCurrent
														? checkError
														: account.profileError
															? '暂时无法更新此账号的资料。'
															: ''
												}
											/>
										</div>
										<span
											className={
												account.loggedIn
													? 'sf-oauth-account__state'
													: 'sf-oauth-account__state is-expired'
											}
										>
											{account.loggedIn
												? '已授权'
												: account.unregistered
													? '未授权'
													: '需重新授权'}
										</span>
										<div className="sf-oauth-account__actions">
											{!account.loggedIn && (
												<button
													className="custom-appearance sf-oauth-link-button"
													type="button"
													disabled={busy || isPending}
													onClick={() =>
														account.isCurrent
															? this.handleAuthorize({userId: account.userId})
															: this.beginSetup(account)
													}
												>
													{account.unregistered ? '授权' : '重新授权'}
												</button>
											)}
											{!account.unregistered && (
												<button
													className="custom-appearance sf-oauth-link-button"
													type="button"
													aria-label={`移除 ${account.screenName || account.userId} 的授权`}
													disabled={busy}
													onClick={() => this.handleRemove(account)}
												>
													{working && workingUserId === account.userId
														? '处理中…'
														: '移除授权'}
												</button>
											)}
										</div>
									</li>
								))}
							</ul>
							{visibleAccounts.length === 0 && (
								<p className="sf-oauth-panel__empty">没有匹配的账号</p>
							)}
						</div>
					) : (
						<p>
							尚未添加饭否账号。
							<AccountCheckIndicator error={checkError} />
						</p>
					)}
				</div>
				{needsReload ? (
					<button type="button" onClick={() => browser.runtime.reload()}>
						重新加载扩展
					</button>
				) : isPending ? (
					<div className="sf-oauth-panel__setup">
						<p>请在饭否确认授权，登录将自动完成。</p>
						<div className="sf-oauth-panel__actions">
							<button
								type="button"
								disabled={busy || checking}
								onClick={this.recheckAuthorization}
							>
								{checking ? '正在检查…' : '重新检查'}
							</button>
							<button
								className="custom-appearance sf-oauth-link-button"
								type="button"
								disabled={busy}
								onClick={this.cancelSetup}
							>
								取消
							</button>
						</div>
					</div>
				) : setup ? (
					<div
						className="sf-oauth-panel__setup"
						role="group"
						aria-label={
							setup.kind === 'reauthorize'
								? '重新授权账号'
								: setup.kind === 'authorize'
									? '授权饭否账号'
									: '添加饭否账号'
						}
					>
						<p>
							{setup.kind === 'add'
								? '先在饭否切换到要添加的账号，再回来授权。'
								: `先在饭否切换到「${setup.screenName || setup.userId}」，再回来授权。`}
						</p>
						<div className="sf-oauth-panel__actions">
							<button type="button" disabled={busy} onClick={this.openFanfou}>
								打开饭否
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => this.handleAuthorize()}
							>
								授权当前网页账号
							</button>
							<button
								className="custom-appearance sf-oauth-link-button"
								type="button"
								disabled={busy}
								onClick={this.cancelSetup}
							>
								取消
							</button>
						</div>
					</div>
				) : (
					<div className="sf-oauth-panel__actions">
						<button
							type="button"
							disabled={busy}
							onClick={() =>
								accounts.length > 0 ? this.beginSetup() : this.handleAuthorize()
							}
						>
							{working
								? '正在处理…'
								: accounts.length > 0
									? '登录其他账号'
									: 'OAuth 登录'}
						</button>
					</div>
				)}
				{(error || status?.authorizationError) && (
					<div>
						<p role="alert" className="sf-oauth-panel__error">
							{error || status?.authorizationError}
						</p>
						{!isPending && (
							<button
								type="button"
								disabled={busy || checking}
								onClick={this.recheckAuthorization}
							>
								{checking ? '正在检查…' : '重新检查'}
							</button>
						)}
					</div>
				)}
				{error && allowTab && !isPending && (
					<button
						type="button"
						disabled={busy}
						onClick={() =>
							this.handleAuthorize({...this.lastAuthorization, useTab: true})
						}
					>
						改用标签页授权
					</button>
				)}
			</div>
		);
	}
}
