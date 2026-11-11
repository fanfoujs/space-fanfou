import cookies from 'js-cookie';
import select from 'select-dom';
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray';

let cachedUserId;

export function getUserIdFromProfileLink() {
	const navLinks = select.all('#navigation li a');
	const profilePageLink = findElementWithSpecifiedContentInArray(
		navLinks,
		'我的空间',
	);

	if (!profilePageLink) {
		return undefined;
	}

	try {
		const url = new URL(profilePageLink.href, location.origin);
		const [userId] = url.pathname.replace(/^\/+/, '').split('/', 1);

		return userId ? decodeURIComponent(userId) : undefined;
	} catch {
		return undefined;
	}
}

export default function getLoggedInUserId() {
	if (cachedUserId) {
		return cachedUserId;
	}

	const cookieUserId = cookies.get('u');
	if (cookieUserId) {
		cachedUserId = cookieUserId;
		return cachedUserId;
	}

	const domUserId = getUserIdFromProfileLink();

	if (domUserId) {
		cachedUserId = domUserId;
		return cachedUserId;
	}

	return undefined;
}
