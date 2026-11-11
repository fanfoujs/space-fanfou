import '@settings/styles';
import {h, render} from 'preact';
import settings from '@settings/settings';
import App from '@settings/components/App';
import {browser} from 'wxt/browser';

let isPopup = new URLSearchParams(location.search).has('popup');
if (!isPopup) {
	// Older installed manifests still open settings.html without a query marker.
	try {
		isPopup = Boolean(
			browser.extension?.getViews?.({type: 'popup'}).includes(globalThis),
		);
	} catch {
		/*
		Use the explicit marker when view detection is unavailable.
		*/
	}
}

document.documentElement.classList.toggle('sf-popup', isPopup);
document.body.classList.toggle('sf-popup', isPopup);

function renderApp() {
	render(<App isPopup={isPopup} />, document.querySelector('#app'));
}

async function main() {
	await settings.ready();
	renderApp();
}

main();
