import {browser} from 'wxt/browser';
import {COMPOSER_DRAFT_KEY, COMPOSER_IMAGE_KEY} from './composer';
import type {ComposerImage} from './composer-image';

export type SentComposerDraft = {
	status: string;
	imageId?: string | null;
};

export function matchesComposerDraft(
	sent: SentComposerDraft,
	draft: string,
	image?: ComposerImage | null,
) {
	return (
		sent.status === draft && (sent.imageId || null) === (image?.id || null)
	);
}

// A confirmed send may come from an older worker or miss a storage notification.
// Finish clearing the same draft in the editor too, keeping any newer content.
export async function clearSentComposerDraft(sent: SentComposerDraft) {
	const values = await browser.storage.local.get([
		COMPOSER_DRAFT_KEY,
		COMPOSER_IMAGE_KEY,
	]);
	const draft =
		typeof values[COMPOSER_DRAFT_KEY] === 'string'
			? values[COMPOSER_DRAFT_KEY]
			: '';
	const image = (values[COMPOSER_IMAGE_KEY] || null) as ComposerImage | null;
	if (!matchesComposerDraft(sent, draft, image)) {
		return {draft, image};
	}

	await browser.storage.local.set({
		[COMPOSER_DRAFT_KEY]: '',
		[COMPOSER_IMAGE_KEY]: null,
	});
	return {draft: '', image: null};
}
