import {readFileSync} from 'node:fs';

export const composerImageBytes = readFileSync(
	new URL('../../public/icons/icon-128.png', import.meta.url),
);
export const composerImageFixture = {
	id: 'fixture-image',
	name: 'preview.png',
	dataUrl: `data:image/png;base64,${composerImageBytes.toString('base64')}`,
};
