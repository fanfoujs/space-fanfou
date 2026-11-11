export default (object, predicate) => {
	const returnValue = {};

	for (const [k, v] of Object.entries(object)) {
		if (!predicate(v, k)) {
			returnValue[k] = v;
		}
	}

	return returnValue;
};
