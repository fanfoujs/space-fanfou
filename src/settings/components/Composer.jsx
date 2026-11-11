import {h, Component} from 'preact';
import {browser} from 'wxt/browser';
import messaging from '../messaging.js';
import {
	refreshAccountStatus,
	subscribeAccountStatus,
} from '../accountStatus.js';
import AccountCheckIndicator from './AccountCheckIndicator';
import {FANFOU_COMPOSE_SEND} from '@constants';
import {
	COMPOSER_ACCOUNT_KEY,
	COMPOSER_DRAFT_KEY,
	COMPOSER_IMAGE_KEY,
	getComposerDraftKey,
	getComposerSendKey,
	MAX_STATUS_LENGTH,
} from '@platform/composer';
import {
	COMPOSER_IMAGE_TYPES,
	parseComposerImage,
	validateComposerImageFile,
} from '@platform/composer-image';
import {
	clearSentComposerDraft,
	matchesComposerDraft,
} from '@platform/composer-draft';
import blobToBase64 from '@libs/blobToBase64';

const matchesDraft = (result, draft, image) =>
	result?.status === draft && (result.imageId || null) === (image?.id || null);

export default class Composer extends Component {
	state = {
		loading: true,
		checking: false,
		checkError: '',
		status: null,
		accounts: [],
		switching: false,
		draft: '',
		image: null,
		imageLoading: false,
		sending: false,
		error: '',
	};
	writes = Promise.resolve();
	pendingWrites = 0;
	statusVersion = 0;
	contentVersion = 0;
	sendStates = new Map();

	componentDidMount() {
		this.mounted = true;
		this.selectionReady = browser.storage.local
			.get(COMPOSER_ACCOUNT_KEY)
			.then((values) => {
				this.selectedAccountId =
					typeof values[COMPOSER_ACCOUNT_KEY] === 'string'
						? values[COMPOSER_ACCOUNT_KEY]
						: null;
			})
			.catch(() => {
				this.selectedAccountId = null;
			});
		this.unsubscribeAccount = subscribeAccountStatus(this.handleAccountStatus);
		if (this.props.active) {
			this.refreshStatus();
		}

		window.addEventListener('focus', this.handleFocus);
		browser.storage.onChanged.addListener(this.handleStorageChange);
	}

	componentDidUpdate(previousProps) {
		document.documentElement.classList.toggle(
			'sf-popup--image',
			this.props.active && Boolean(this.state.image),
		);
		if (!this.props.active || previousProps.active) {
			return;
		}

		this.refreshStatus();
		this.textarea?.focus();
	}

	componentWillUnmount() {
		this.mounted = false;
		document.documentElement.classList.remove('sf-popup--image');
		this.unsubscribeAccount();
		window.removeEventListener('focus', this.handleFocus);
		browser.storage.onChanged.removeListener(this.handleStorageChange);
	}

	handleFocus = () => {
		if (this.props.active && !this.state.sending) {
			this.refreshStatus();
		}
	};
	refreshStatus = () => refreshAccountStatus();
	handleAccountStatus = async ({status, loading, checking, checkError}) => {
		this.accountSnapshot = {
			status,
			loading,
			checking,
			checkError,
		};
		const version = ++this.statusVersion;
		if (!status) {
			this.setState({loading, checking, checkError});
			return;
		}

		try {
			await this.selectionReady;
			if (!this.mounted || version !== this.statusVersion) {
				return;
			}

			if (
				this.selectedAccountId &&
				Array.isArray(status.accounts) &&
				status.accounts.every(
					(account) => account.userId !== this.selectedAccountId,
				)
			) {
				this.selectedAccountId = null;
			}

			const accounts = Array.isArray(status.accounts)
				? status.accounts.map((account) => ({
						...account,
						screenName:
							!this.selectedAccountId && account.userId === status.userId
								? status.screenName || account.screenName
								: account.screenName,
						sending: this.sendStates.has(account.userId)
							? this.sendStates.get(account.userId)
							: account.sending,
					}))
				: status.userId
					? [
							{
								userId: status.userId,
								screenName: status.screenName,
								loggedIn: status.loggedIn,
								sending: status.sending,
							},
						]
					: [];
			if (this.selectedAccountId) {
				const selected = accounts.find(
					(account) => account.userId === this.selectedAccountId,
				);
				status = {
					...status,
					userId: this.selectedAccountId,
					screenName:
						selected?.screenName ||
						(this.state.status?.userId === this.selectedAccountId
							? this.state.status.screenName
							: this.selectedAccountId),
					loggedIn: Boolean(selected?.loggedIn),
					sending: Boolean(selected?.sending),
				};
				checkError = '';
			}

			if (this.sendStates.has(status.userId)) {
				status = {...status, sending: this.sendStates.get(status.userId)};
			}

			const userId = status.userId || status.currentUserId || 'anonymous';
			if (!this.draftKey || this.userId !== userId) {
				await this.writes;
				const legacyKey = getComposerDraftKey(userId);
				const values = await browser.storage.local.get([
					COMPOSER_DRAFT_KEY,
					COMPOSER_IMAGE_KEY,
					legacyKey,
					getComposerSendKey(userId),
				]);
				if (!this.mounted || version !== this.statusVersion) {
					return;
				}

				let {draft} = this.state;
				let {image} = this.state;
				let imageError = '';
				if (!this.draftKey) {
					image = values[COMPOSER_IMAGE_KEY] || null;
					if (image) {
						try {
							parseComposerImage(image);
						} catch {
							image = null;
							imageError = '保存的图片无法读取，请重新添加。';
						}
					}

					draft =
						typeof values[COMPOSER_DRAFT_KEY] === 'string'
							? values[COMPOSER_DRAFT_KEY]
							: typeof values[legacyKey] === 'string'
								? values[legacyKey]
								: '';
					if (typeof values[COMPOSER_DRAFT_KEY] !== 'string') {
						await browser.storage.local.set({[COMPOSER_DRAFT_KEY]: draft});
						if (!this.mounted || version !== this.statusVersion) {
							return;
						}
					}

					this.draftKey = COMPOSER_DRAFT_KEY;
				}

				this.userId = userId;
				const result = values[getComposerSendKey(userId)];
				if (result?.state === 'sent' || result?.state === 'error') {
					this.sendStates.set(userId, false);
					status = {...status, sending: false};
				}

				this.setState({
					draft,
					image,
					error:
						imageError ||
						(result?.state === 'error' && matchesDraft(result, draft, image)
							? result.error
							: result?.state === 'sending' && !status.sending
								? '上次发送结果未确认，请到饭否查看后再重试。'
								: ''),
				});
			}

			if (this.mounted && version === this.statusVersion) {
				this.setState(
					{
						status,
						accounts,
						loading: false,
						checking,
						checkError,
						sending: Boolean(status.sending),
					},
					() => {
						if (
							this.props.active &&
							!document.activeElement?.matches(
								'input, textarea, select, button',
							)
						) {
							this.textarea?.focus();
						}
					},
				);
			}
		} catch {
			if (this.mounted && version === this.statusVersion) {
				this.setState({
					loading: false,
					checking,
					checkError,
					error: '无法读取草稿，请重试。',
				});
			}
		}
	};
	handleAccountChange = async (event) => {
		const userId = event.currentTarget.value;
		const previous = this.selectedAccountId;
		if (!userId || this.state.sending || this.state.switching) {
			return;
		}

		this.selectedAccountId = userId;
		this.setState({switching: true, error: ''});
		try {
			await this.writes;
			await browser.storage.local.set({[COMPOSER_ACCOUNT_KEY]: userId});
			await this.handleAccountStatus(this.accountSnapshot);
		} catch {
			this.selectedAccountId = previous;
			await this.handleAccountStatus(this.accountSnapshot);
			if (this.mounted) {
				this.setState({error: '无法保存发送账号，请重试。'});
			}
		} finally {
			if (this.mounted) {
				this.setState({switching: false});
			}
		}
	};
	handleStorageChange = (changes, area) => {
		if (area !== 'local' || !this.draftKey) {
			return;
		}

		const selection = changes[COMPOSER_ACCOUNT_KEY];
		if (
			selection &&
			selection.newValue == null &&
			selection.oldValue === this.selectedAccountId
		) {
			this.selectedAccountId = null;
			if (this.accountSnapshot?.status) {
				this.handleAccountStatus(this.accountSnapshot);
			}
		}

		for (const account of this.state.accounts) {
			const result = changes[getComposerSendKey(account.userId)]?.newValue;
			if (result) {
				this.sendStates.set(account.userId, result.state === 'sending');
			}
		}

		if (changes[this.draftKey] && !this.pendingWrites) {
			this.contentVersion++;
			this.setState({draft: changes[this.draftKey].newValue || ''});
		}

		if (changes[COMPOSER_IMAGE_KEY] && !this.pendingWrites) {
			this.contentVersion++;
			const image = changes[COMPOSER_IMAGE_KEY].newValue || null;
			try {
				if (image) {
					parseComposerImage(image);
				}

				this.setState({image, error: ''});
			} catch {
				this.setState({image: null, error: '保存的图片无法读取，请重新添加。'});
			}
		}

		const result = changes[getComposerSendKey(this.userId)]?.newValue;
		const draft = changes[this.draftKey]?.newValue ?? this.state.draft;
		const image = changes[COMPOSER_IMAGE_KEY]
			? changes[COMPOSER_IMAGE_KEY].newValue
			: this.state.image;
		if (result) {
			this.setState({
				sending: result.state === 'sending',
				error:
					result.state === 'error' && matchesDraft(result, draft, image)
						? result.error
						: '',
			});
		}
	};
	handleInput = (event) => {
		this.contentVersion++;
		const draft = event.currentTarget.value;
		const key = this.draftKey;
		this.setState({draft, error: ''});
		this.pendingWrites++;
		const write = this.writes.then(() =>
			browser.storage.local.set({[key]: draft}),
		);
		this.writes = write
			.catch(() => {
				if (this.mounted) {
					this.setState({error: '草稿保存失败，请保持窗口打开并重试。'});
				}
			})
			.finally(() => {
				this.pendingWrites--;
			});
	};
	handleSend = async (event) => {
		event.preventDefault();
		const {draft, image, imageLoading, status, sending, loading, switching} =
			this.state;
		if (
			loading ||
			switching ||
			sending ||
			imageLoading ||
			!status?.loggedIn ||
			(!draft.trim() && !image) ||
			draft.length > MAX_STATUS_LENGTH
		) {
			return;
		}

		const {draftKey} = this;
		const {userId} = status;
		const accountId = this.selectedAccountId;
		let isConfirmed = false;
		this.sendStates.set(status.userId, true);
		this.setState({sending: true, error: ''});
		try {
			await this.writes;
			const response = await messaging.postMessage({
				action: FANFOU_COMPOSE_SEND,
				payload: {
					status: draft,
					userId: status.userId,
					...(image && {image}),
					...(accountId && {accountId}),
				},
			});
			if (response?.error) {
				throw new Error(response.error);
			}

			if (!response?.ok || !response.statusId) {
				throw new Error('未能确认发送结果，请到饭否查看后再重试。');
			}

			isConfirmed = true;
			this.sendStates.set(status.userId, false);
			if (
				this.mounted &&
				this.draftKey === draftKey &&
				this.userId === userId
			) {
				await this.writes;
				const sent = {status: draft, imageId: image?.id || null};
				const version = this.contentVersion;
				const remaining = await clearSentComposerDraft(sent);
				if (!this.mounted || this.userId !== userId) {
					return;
				}

				const stillSentDraft =
					matchesComposerDraft(sent, this.state.draft, this.state.image) ||
					(!this.state.draft && !this.state.image);
				this.setState({
					sending: false,
					...(version === this.contentVersion && stillSentDraft && remaining),
				});
				this.textarea?.focus();
			}
		} catch (error) {
			this.sendStates.set(status.userId, false);
			if (
				this.mounted &&
				this.draftKey === draftKey &&
				this.userId === userId
			) {
				this.setState({
					sending: false,
					error: isConfirmed
						? '消息已发送，但草稿清理失败，请勿重复发送。'
						: error.message || '发送失败，草稿已保留。',
				});
			}
		}
	};
	saveImage = (image) => {
		this.pendingWrites++;
		const write = this.writes.then(() =>
			browser.storage.local.set({[COMPOSER_IMAGE_KEY]: image}),
		);
		this.writes = write
			.catch(() => {})
			.finally(() => {
				this.pendingWrites--;
			});
		return write.catch(() => {
			throw new Error('图片保存失败，请尝试较小的图片。');
		});
	};
	addImage = async (files) => {
		if (
			this.state.loading ||
			this.state.sending ||
			this.state.imageLoading ||
			!this.draftKey ||
			files.length === 0
		) {
			return;
		}

		if (files.length !== 1) {
			this.setState({error: '每条消息只能附一张图片，请选择一张。'});
			return;
		}

		this.setState({imageLoading: true, error: ''});
		try {
			const file = files[0];
			validateComposerImageFile(file);
			const image = {
				id: crypto.randomUUID(),
				name: file.name || 'clipboard-image',
				dataUrl: await blobToBase64(file),
			};
			parseComposerImage(image);
			await this.saveImage(image);
			if (this.mounted) {
				this.contentVersion++;
				this.setState({image});
			}
		} catch (error) {
			if (this.mounted) {
				this.setState({error: error.message || '图片添加失败，请重试。'});
			}
		} finally {
			if (this.mounted) {
				this.setState({imageLoading: false});
			}
		}
	};
	handleImageChange = (event) => {
		const files = [...(event.currentTarget.files || [])];
		event.currentTarget.value = '';
		this.addImage(files);
	};
	handlePaste = (event) => {
		const files = [...(event.clipboardData?.files || [])].filter((file) =>
			file.type.startsWith('image/'),
		);
		if (files.length === 0) {
			return;
		}

		event.preventDefault();
		this.addImage(files);
	};
	handleDragOver = (event) => {
		if ([...(event.dataTransfer?.types || [])].includes('Files')) {
			event.preventDefault();
		}
	};
	handleDrop = (event) => {
		const files = [...(event.dataTransfer?.files || [])];
		if (files.length === 0) {
			return;
		}

		event.preventDefault();
		this.addImage(files);
	};
	removeImage = async () => {
		if (this.state.sending || this.state.imageLoading) {
			return;
		}

		this.setState({imageLoading: true, error: ''});
		try {
			await this.saveImage(null);
			if (this.mounted) {
				this.contentVersion++;
				this.setState({image: null});
			}
		} catch {
			if (this.mounted) {
				this.setState({error: '图片移除失败，请重试。'});
			}
		} finally {
			if (this.mounted) {
				this.setState({imageLoading: false});
			}
		}
	};
	handleKeyDown = (event) => {
		if (
			event.key === 'Enter' &&
			(event.ctrlKey || event.metaKey) &&
			!event.isComposing
		) {
			this.handleSend(event);
		}
	};

	render() {
		const {active, onSettings} = this.props;
		const {
			loading,
			checkError,
			status,
			accounts,
			switching,
			draft,
			image,
			imageLoading,
			sending,
			error,
		} = this.state;
		const count = draft.length;
		const hasExceeded = count > MAX_STATUS_LENGTH;
		const accountLabel = (account) =>
			`${account.screenName || account.userId}${account.loggedIn ? '' : account.hasAuthorization === false ? '（未授权）' : '（需重新授权）'}`;
		const selectedAccount = accounts.find(
			(account) => account.userId === status?.userId,
		);
		const selectedLabel = selectedAccount
			? accountLabel(selectedAccount)
			: status?.userId
				? `${status.screenName || status.userId}（需重新授权）`
				: '选择账号';
		return (
			<section
				className="sf-composer"
				hidden={!active}
				aria-label="快捷发饭窗口"
			>
				<form
					className="sf-composer__form"
					onSubmit={this.handleSend}
					onPaste={this.handlePaste}
					onDragOver={this.handleDragOver}
					onDrop={this.handleDrop}
				>
					<textarea
						ref={(element) => {
							this.textarea = element;
						}}
						aria-label="饭否消息"
						placeholder="你在做什么？"
						value={draft}
						disabled={loading || switching || sending || !this.draftKey}
						onInput={this.handleInput}
						onKeyDown={this.handleKeyDown}
					/>
					{image && (
						<div className="sf-composer__attachment">
							<img src={image.dataUrl} alt="待发送的图片" title={image.name} />
							<button
								className="custom-appearance sf-composer__remove-image"
								type="button"
								aria-label="移除图片"
								title="移除图片"
								disabled={sending || imageLoading}
								onClick={this.removeImage}
							>
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<path d="m6 6 12 12M6 18 18 6" />
								</svg>
							</button>
						</div>
					)}
					{error && (
						<div className="sf-composer__feedback">
							<p role="alert">{error}</p>
						</div>
					)}
					<footer className="sf-composer__footer">
						<div className="sf-composer__account">
							{accounts.length > 0 || this.selectedAccountId ? (
								<label className="sf-composer__account-picker">
									<span>发送至</span>
									<span className="sf-composer__account-select-wrap">
										<span
											className="sf-composer__account-measure"
											aria-hidden="true"
										>
											{selectedLabel}
										</span>
										<select
											className="sf-composer__account-select"
											aria-label="发送账号"
											title={selectedLabel}
											value={status?.userId || ''}
											disabled={loading || switching || sending}
											onChange={this.handleAccountChange}
										>
											<option value="" disabled>
												选择账号
											</option>
											{status?.userId && !selectedAccount && (
												<option value={status.userId} disabled>
													{selectedLabel}
												</option>
											)}
											{accounts.map((account) => (
												<option
													key={account.userId}
													value={account.userId}
													disabled={!account.loggedIn}
												>
													{accountLabel(account)}
												</option>
											))}
										</select>
									</span>
								</label>
							) : loading ? (
								'正在检查账号…'
							) : (
								'当前饭否账号尚未授权'
							)}
							<AccountCheckIndicator error={checkError} />
							{!loading && !status?.loggedIn && (
								<button type="button" onClick={() => onSettings(true)}>
									前往登录
								</button>
							)}
						</div>
						<div className="sf-composer__actions">
							<input
								ref={(element) => {
									this.imageInput = element;
								}}
								type="file"
								accept={COMPOSER_IMAGE_TYPES.join(',')}
								hidden
								aria-label="选择图片"
								onChange={this.handleImageChange}
							/>
							<button
								className="custom-appearance sf-quiet-button sf-composer__icon-button"
								type="button"
								aria-label="添加图片"
								title="添加图片，也可直接粘贴或拖入"
								disabled={loading || sending || imageLoading || !this.draftKey}
								aria-busy={imageLoading}
								onClick={() => this.imageInput?.click()}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
									focusable="false"
								>
									<rect x="3" y="3" width="18" height="18" rx="2" />
									<circle cx="8.5" cy="8.5" r="1.5" />
									<path d="m21 15-5-5L5 21" />
								</svg>
							</button>
							<button
								className="custom-appearance sf-quiet-button sf-composer__icon-button sf-composer__settings"
								type="button"
								aria-label="设置"
								title="设置"
								onClick={() => onSettings()}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
									focusable="false"
								>
									<path d="M10 2h4l.5 3 1.5 1 3-1 2 3.5-2.5 2v3l2.5 2-2 3.5-3-1-1.5 1-.5 3h-4l-.5-3-1.5-1-3 1-2-3.5 2.5-2v-3L3 8.5 5 5l3 1 1.5-1Z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							</button>
							<span
								className={
									hasExceeded
										? 'sf-composer__count is-exceeded'
										: 'sf-composer__count'
								}
								aria-label={`已输入 ${count} 字，最多 ${MAX_STATUS_LENGTH} 字`}
							>
								{count}
								<span> / {MAX_STATUS_LENGTH}</span>
							</span>
							<button
								className="custom-appearance sf-composer__send"
								type="submit"
								title="发送（Ctrl / ⌘ + Enter）"
								disabled={
									loading ||
									switching ||
									sending ||
									imageLoading ||
									!status?.loggedIn ||
									(!draft.trim() && !image) ||
									hasExceeded
								}
							>
								{sending ? '正在发送…' : '发送'}
							</button>
						</div>
					</footer>
				</form>
			</section>
		);
	}
}
