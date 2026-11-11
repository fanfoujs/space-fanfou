import parseUrl from './parseUrl.js';

test('parseUrl', () => {
	expect(parseUrl('https://domain.com/path?foo=bar#hash')).toEqual({
		protocol: 'https:',
		origin: 'https://domain.com',
		domain: 'domain.com',
		pathname: '/path',
		query: {
			foo: 'bar',
		},
		hash: 'hash',
	});
});
