export const DEFAULT_POPUP_MODE_KEY = 'settings/defaultPopupMode';
export const LAST_POPUP_MODE_KEY = 'settings/popupMode';
export const LAST_SETTINGS_TAB_KEY = 'settings/lastTab';
export const COMPOSER_ACCOUNT_KEY = 'composer/selectedAccount';
export const COMPOSER_DRAFT_KEY = 'composer/draft';
export const COMPOSER_IMAGE_KEY = 'composer/image';
export const MAX_STATUS_LENGTH = 140;

// Only used to recover drafts saved before the editor shared one draft across accounts.
export const getComposerDraftKey = (userId: string) =>
	`composer/draft-${encodeURIComponent(userId)}`;

export const getComposerSendKey = (userId: string) =>
	`composer/send-${encodeURIComponent(userId)}`;
