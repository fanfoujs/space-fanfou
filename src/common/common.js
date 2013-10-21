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

	/* 修正放大图片时图片加载延迟的 bug */
	/* 较大尺寸的图片在新窗口显示 */

	(function() {
		var $stream = $('#stream');
		if (! $stream.length) return;

		$(window).delegate('.photo.zoom', 'click', function(e) {
			var $link = $(e.target);
			$('#ZoomBox img').prop('href', $link.prop('href'));
		});

		var MutationObserver = MutationObserver || WebKitMutationObserver;
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(processPhotos);
		});

		function processPhotos() {
			$('.photo.zoom img').each(function() {
				var $img = $(this);
				[ 1, 2, 3, 4, 5 ].forEach(function(i) {
					setTimeout(function() {
						$img.click(function(e) {
							var width = $img.width();
							var height = $img.height();
							if (width / height > 3 || height / width > 3) {
								e.stopImmediatePropagation();
								e.preventDefault();
								SF.fn.openURL(location.origin + $img.parent().attr('name'));
							}
						});
					}, i * 100);
				});
			});
		}

		observer.observe($stream[0], { childList: true, subtree: true });
		processPhotos();
	})();

})(jQuery);
