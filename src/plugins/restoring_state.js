SF.pl.restoring_state = new SF.plugin((function($) {
	var $form = $('#message');
	if (! $form.length) return;
	var $more = $('#pagination-more');
	if (! $more.length) return;
	var $win = $(window);
	var $stream = $('#stream');

	var storage;

	function saveState() {
		storage.value = JSON.stringify({
			code: $stream.html(),
			scrollTop: $win.scrollTop()
		})
	}
	function init() {
		storage = $form[0].ajax;
		var data;
		try {
			data = JSON.parse(storage.value);
		} catch (e) {
			return;
		}
		if (! $.isPlainObject(data) || ! data.code)
			return;
		storage.value = '';
		$stream.html(data.code);
		$win.scrollTop(data.scrollTop);
		FF.app.Stream.init();
		FF.app.Zoom.init('stream');
		FF.app.Timeline.processRefresh();
	}

	var onScroll = SF.fn.throttle(saveState, 250);
	function onSubmit(e) {
		storage.value = '';
	}

	var MutationObserver = MutationObserver || WebKitMutationObserver;
	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(saveState);
	});

	return {
		load: function() {
			init();
			observer.observe($stream[0], { childList: true, subtree: true });
			$form.on('submit', onSubmit);
			$win.on('scroll', onScroll);
		},
		unload: function() {
			storage.value = '';
			observer.disconnect();
			$form.off('submit', onSubmit);
			$win.off('scroll', onScroll);
		}
	};
})(jQuery));