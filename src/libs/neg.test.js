import neg from './neg.js';

test('neg', () => {
	expect(neg(true)).toBe(false);
	expect(neg(Promise.resolve(false))).resolves.toBe(true);
});
