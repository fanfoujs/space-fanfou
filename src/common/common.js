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
		SF.fn.scrollHandler.addListener(SF.fn.throttle(function() {
			if (body.scrollTop > pos) {
				focused && textarea.blur();
				focused = false;
			} else {
				focused || textarea.focus();
				focused = true;
			}
		}, 250));
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
					if (height / width > 3) {
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

	/* 让消息支持换行 */

	(function() {
		var $stream = $('#stream');
		var is_status_page = location.href.indexOf('http://fanfou.com/statuses/') == 0;
		if (! $stream.length && ! is_status_page)
			return;

		var MutationObserver = MutationObserver || WebKitMutationObserver;
		var slice = Array.prototype.slice;

		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				var added = slice.call(mutation.addedNodes, 0);
				var $prev = $(mutation.previousSibling);
				if ($prev.is('ol')) {
					$prev.find('li').each(function() {
						processItem($(this));
					});
				}
				if (added.length) {
					added.forEach(function(item) {
						processItem($(item));
					});
				}
			});
		});

		function processItem($item) {
			if (! $item.is('li')) return;
			if ($item.attr('newline-replaced') == 'true') return;

			replaceNewline($item);
			$item.attr('newline-replaced', 'true');
		}

		function replaceNewline($item) {
			var $content = $item.find('.content');
			var content = $content.html() || '';
			if (content.indexOf('\n') === -1) return;
			var $photo = $content.find('.photo');
			content = content.replace(/\n\s*/g, '<br />');
			if (content.indexOf('<br />') !== 0) {
				content = '<br />' + content;
			}
			$content.html(content);
			$content.find('.photo').replaceWith($photo);
		}

		if (is_status_page) {
			replaceNewline($('#latest'));
		} else {
			observer.observe($stream[0], { childList: true, subtree: true });
			$stream.find('ol li').each(function() { processItem($(this)); });
		}
	})();

})(jQuery);
