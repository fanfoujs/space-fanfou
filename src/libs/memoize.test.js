import memoize from './memoize.js';

test('no parameter', () => {
	expect(() => {
		memoize(() => 0);
	}).toThrowError(/^fn 必须有且只有一个参数$/);
});

test('two parameters', () => {
	expect(() => {
		memoize((a, b) => a + b);
	}).toThrowError(/^fn 必须有且只有一个参数$/);
});

test('memoize', () => {
	let calls = 0;
	const generateValue = (_key) => ++calls;
	const memoizedGenerateValue = memoize(generateValue);

	expect(memoizedGenerateValue('first')).toBe(1);
	expect(memoizedGenerateValue('first')).toBe(1);
	expect(memoizedGenerateValue('second')).toBe(2);

	memoizedGenerateValue.delete('first');
	expect(memoizedGenerateValue('first')).toBe(3);
	expect(memoizedGenerateValue('first')).toBe(3);
	expect(memoizedGenerateValue('second')).toBe(2);
	expect(calls).toBe(3);
});
