(function($) {

	/* 输入框自动获得焦点 */

	(function() {
		var $textarea = $('#phupdate textarea');
		if (! $textarea.length) return;
		var body = document.body;
		var textarea = $textarea[0];
		var pos = $textarea.offset().top + textarea.offsetHeight;
		$textarea = null;
		var focused = true;
		addEventListener('scroll', SF.fn.throttle(function(e) {
			if (body.scrollTop > pos) {
				focused && textarea.blur();
				focused = false;
			} else {
				focused || textarea.focus();
				focused = true;
			}
		}, 250), false);
	})();

})(jQuery);
