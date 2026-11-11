export function getBetaBuild(value = process.env.CHROME_BETA_BUILD ?? '0') {
	if (!/^(0|[1-9]\d*)$/.test(value) || Number(value) > 65_535) {
		throw new Error('--build must be an integer between 0 and 65535');
	}

	return Number(value);
}
