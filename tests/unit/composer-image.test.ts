import {
	MAX_COMPOSER_IMAGE_SIZE,
	parseComposerImage,
	validateComposerImageFile,
} from '../../src/platform/composer-image';
import {
	composerImageBytes,
	composerImageFixture,
} from '../fixtures/composer-image';

test('saved JSON attachments reconstruct the original native image file', async () => {
	const serialized = JSON.stringify(composerImageFixture);
	const file = parseComposerImage(JSON.parse(serialized));
	expect(file.name).toBe('preview.png');
	expect(file.type).toBe('image/png');
	expect(Buffer.from(await file.arrayBuffer())).toEqual(composerImageBytes);
});

test('unsupported and oversized selections are rejected before reading their bytes', () => {
	expect(() => {
		validateComposerImageFile({type: 'image/svg+xml', size: 10});
	}).toThrow('请选择 JPG');
	expect(() => {
		validateComposerImageFile({type: 'image/png', size: 0});
	}).toThrow('为空');
	expect(() => {
		validateComposerImageFile({
			type: 'image/png',
			size: MAX_COMPOSER_IMAGE_SIZE + 1,
		});
	}).toThrow('4 MB');
});

test.each([
	null,
	{...composerImageFixture, id: ''},
	{...composerImageFixture, dataUrl: 'https://example.com/private-image.png'},
	{...composerImageFixture, dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+'},
	{
		...composerImageFixture,
		dataUrl: 'data:image/png;base64,bm90LWFuLWltYWdl',
	},
])('malformed attachment data is never treated as an upload: %j', (value) => {
	expect(() => parseComposerImage(value)).toThrow();
});
