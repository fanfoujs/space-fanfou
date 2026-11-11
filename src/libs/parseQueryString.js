export default (queryString) =>
	Object.fromEntries(new URLSearchParams(queryString));
