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

		var MutationObserver = MutationObserver || WebKitMutationObserver;
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(processPhotos);
		});

		function processPhotos() {
			$('.photo.zoom img').each(function() {
				var $img = $(this);
				$img[0].onclick = function(e) {
					var width = $img.width();
					var height = $img.height();
					if (width / height > 3 || height / width > 3) {
						e.stopImmediatePropagation();
						e.preventDefault();
						SF.fn.openURL(location.origin + $img.parent().attr('name'));
					} else {
						var $link = $img.parent();
						$('#ZoomImage').prop('src', $link.prop('href'));
					}
				}
			});
		}

		observer.observe($stream[0], { childList: true, subtree: true });
		processPhotos();
	})();

	/* 输入框粘贴上传图片 */

	(function() {
		var $textarea = $('#phupdate textarea');
		if (! $textarea.length) return;

		function isImage(type) {
			switch (type) {
			case 'image/jpeg':
			case 'image/png':
			case 'image/gif':
			case 'image/bmp':
			case 'image/jpg':
				return true;
			default:
				return false;
			}
		}

		$(window).on('paste', function(e) {
			var e = e.originalEvent;
			var items = e.clipboardData.items;
			if (! items.length) return;
			var f, i = 0;
			while (items[i]) {
				f = items[i].getAsFile();
				if (f && isImage(f.type)) {
					break;
				}
				i++;
			}
			if (! f) return;
			f.name = 'image-from-clipboard.' + f.type.replace('image/', '');

			$('#upload-filename').text(f.name).show();
			$('#ul_close').show();
			$('#message').attr('action', '/home/upload').attr('enctype', 'multipart/form-data');
			$('#phupdate input[name="action"]').val('photo.upload');
			$textarea.attr('name', 'desc');

			var fr = new FileReader;
			fr.onload = function(e) {
				$('#upload-base64').val(fr.result);
				$('#upload-wrapper').slideDown();
			}
			fr.readAsDataURL(f);
		});
	})();

})(jQuery);
