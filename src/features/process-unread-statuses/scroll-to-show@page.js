import isVisible from 'is-visible';
import Timeout from '@libs/Timeout';
import noop from '@libs/noop';

const RELEASE_COUNT = 3;

export default (context) => {
	const {requireModules, elementCollection, registerDOMEventListener} = context;
	const {scrollManager} = requireModules(['scrollManager']);

	let scrollCount = 0;

	const waiting = new Timeout({
		fn: noop,
		wait: 96,
	});
	const timeout = new Timeout({
		fn: goBackward,
		wait: 500,
	});

	elementCollection.add({
		timelineNotification: '#timeline-notification',
		button: {parent: 'timelineNotification', selector: 'a'},
		timelineCount: '#timeline-count',
	});

	registerDOMEventListener(globalThis, 'mousewheel', onMouseWheel);

	function setCount(next) {
		scrollCount = next;
		elementCollection.get('button').dataset.scrollCount = scrollCount;
		elementCollection
			.get('timelineNotification')
			.classList.toggle('sf-is-scrolling', scrollCount > 0);
	}

	function goForward() {
		setCount(scrollCount + 1);
	}

	function goBackward() {
		setCount(scrollCount - 1);

		if (scrollCount > 0) {
			timeout.setup();
		}
	}

	function reset() {
		setCount(0);
	}

	function hasNewStatuses() {
		return (
			isVisible(elementCollection.get('timelineNotification')) &&
			Number.parseInt(elementCollection.get('timelineCount').textContent, 10) >
				0
		);
	}

	function showNewStatuses() {
		elementCollection.get('timelineNotification').click();
	}

	function onMouseWheel(event) {
		// 如果距离上一次滚动时间过短，忽略之
		if (waiting.isActive()) {
			return;
		}

		// 如果不是向上滚动，忽略之
		if (event.wheelDeltaY <= 0) {
			return;
		}

		// 如果没有滚动到页面顶部，忽略之
		if (scrollManager.getScrollTop()) {
			return;
		}

		// 如果是在发送消息输入框内滑动滚轮时触发了事件，忽略之
		if (event.target.tagName === 'TEXTAREA') {
			return;
		}

		// 如果「新增 X 条最新消息，点击查看」通知条未显示，忽略之
		if (!hasNewStatuses()) {
			return;
		}

		timeout.cancel();
		goForward();

		if (scrollCount === RELEASE_COUNT) {
			showNewStatuses();
			reset();
		} else {
			waiting.setup();
			timeout.setup();
		}
	}

	return {
		applyWhen: () => elementCollection.ready('timelineNotification'),
	};
};
