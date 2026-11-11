import {fakeBrowser} from '@webext-core/fake-browser';
import {
	COMPOSER_DRAFT_KEY,
	COMPOSER_IMAGE_KEY,
} from '../../src/platform/composer';
import {clearSentComposerDraft} from '../../src/platform/composer-draft';
import {composerImageFixture} from '../fixtures/composer-image';

test('confirmed text and image drafts are cleared together when background cleanup was missed', async () => {
	await fakeBrowser.storage.local.set({
		[COMPOSER_DRAFT_KEY]: '发送内容',
		[COMPOSER_IMAGE_KEY]: composerImageFixture,
	});
	expect(
		await clearSentComposerDraft({
			status: '发送内容',
			imageId: composerImageFixture.id,
		}),
	).toEqual({draft: '', image: null});
	const saved = await fakeBrowser.storage.local.get(null);
	expect(saved[COMPOSER_DRAFT_KEY]).toBe('');
	expect(saved[COMPOSER_IMAGE_KEY] ?? null).toBeNull();
});

test('confirmation of an older send keeps a newer text draft intact', async () => {
	await fakeBrowser.storage.local.set({
		[COMPOSER_DRAFT_KEY]: '后来写的新内容',
		[COMPOSER_IMAGE_KEY]: composerImageFixture,
	});
	expect(
		await clearSentComposerDraft({
			status: '先前发送的内容',
			imageId: composerImageFixture.id,
		}),
	).toEqual({draft: '后来写的新内容', image: composerImageFixture});
});

test('the same caption with a replacement image is a different draft', async () => {
	const replacement = {...composerImageFixture, id: 'replacement'};
	await fakeBrowser.storage.local.set({
		[COMPOSER_DRAFT_KEY]: '图片说明',
		[COMPOSER_IMAGE_KEY]: replacement,
	});
	expect(
		await clearSentComposerDraft({
			status: '图片说明',
			imageId: composerImageFixture.id,
		}),
	).toEqual({draft: '图片说明', image: replacement});
});
