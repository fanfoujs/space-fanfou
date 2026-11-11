import isFanfouWebUrl from './isFanfouWebUrl.js';

test('isFanfouWebUrl', () => {
	expect(isFanfouWebUrl('http://fanfou.com')).toBe(true);
	expect(isFanfouWebUrl('http://fanfou.com/')).toBe(true);
	expect(isFanfouWebUrl('https://fanfou.com/')).toBe(true);
	expect(isFanfouWebUrl('https://fanfou.com')).toBe(true);
	expect(isFanfouWebUrl('https://fanfou.com/home')).toBe(true);
	expect(isFanfouWebUrl('https://m.fanfou.com/home')).toBe(false);
});
