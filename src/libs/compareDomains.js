export default (heystack, needle) => {
	heystack = heystack.split('.');
	needle = needle.split('.');

	if (needle.length > heystack.length) {
		return false;
	}

	while (needle.length > 0) {
		if (needle.pop() !== heystack.pop()) {
			return false;
		}
	}

	return true;
};
