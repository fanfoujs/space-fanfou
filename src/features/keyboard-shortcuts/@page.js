import select from 'select-dom';
import isEditableElement from 'dom-element-is-natively-editable';
import isElementInViewport from 'element-visible';
import {isPhotoEntryPage} from '@libs/pageDetect';
import isHotkey from '@libs/isHotkey';
import animatedScrollTop from '@libs/animatedScrollTop';
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray';

export default (context) => {
	const {registerDOMEventListener} = context;

	const hotkeyHandlers = [
		[{key: 'ArrowLeft'}, goPreviousPage],
		[{key: 'ArrowRight'}, goNextPage],
		[{key: 't'}, animatedScrollTop],
		[{key: 'Enter'}, focusTextarea],
	];

	registerDOMEventListener(
		document.documentElement,
		'keydown',
		keyboardEventHandler,
	);

	function keyboardEventHandler(event) {
		// 如果用户是在输入框中按下快捷键，忽略之
		if (isEditableElement(event.target)) {
			return;
		}

		for (const [hotkeyOptions, handler] of hotkeyHandlers) {
			if (isHotkey(event, hotkeyOptions)) {
				handler(event);

				break;
			}
		}
	}

	function goPreviousPage(event) {
		const previousPageButton =
			getPagerButtonsByText('上一页') || getPhotoPagerButtonByText('上一张');

		if (!previousPageButton) {
			return;
		}

		event.preventDefault();
		previousPageButton.click();
	}

	function goNextPage(event) {
		const nextPageButton =
			getPagerButtonsByText('下一页') || getPhotoPagerButtonByText('下一张');

		if (!nextPageButton) {
			return;
		}

		event.preventDefault();
		nextPageButton.click();
	}

	function getPagerButtonsByText(text) {
		const allPageButtons = select.all('.paginator > li > a');
		const buttonWithSpecifiedText = findElementWithSpecifiedContentInArray(
			allPageButtons,
			text,
		);

		return buttonWithSpecifiedText;
	}

	function getPhotoPagerButtonByText(text) {
		if (!isPhotoEntryPage()) {
			return;
		}

		const allPageButtons = select.all('#crumb > ul > li > a[href^="/photo/"]');
		const buttonWithSpecifiedText = findElementWithSpecifiedContentInArray(
			allPageButtons,
			text,
		);

		return buttonWithSpecifiedText;
	}

	function focusTextarea(event) {
		const form = select('#phupdate form');
		const textarea = select('#phupdate textarea');
		const isTriggeredOutsideTheForm = form && !form.contains(event.target);
		const isTextareaVisible = textarea && isElementInViewport(textarea);

		if (!(isTriggeredOutsideTheForm && isTextareaVisible)) {
			return;
		}

		event.preventDefault();
		textarea.focus();
	}
};
