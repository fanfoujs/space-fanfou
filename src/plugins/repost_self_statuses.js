SF.pl.repost_self_statuses = new SF.plugin((function($) {
	var is_status_page = location.href.indexOf('http://fanfou.com/statuses/') == 0;

	var $stream = $('#stream');
	if (! is_status_page && ! $stream.length) return;

	var my_id = SF.fn.getMyPageURL().replace('http://fanfou.com/', '');
	var is_my_page = SF.fn.isMyPage();
	var attr_name = 'is-my-status';

	if (is_my_page) {
		var my_name = $('#panel h1').text();
	}

	var MutationObserver = MutationObserver || WebKitMutationObserver;
	var slice = Array.prototype.slice;

	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			var added = slice.call(mutation.addedNodes, 0);
			var $prev = $(mutation.previousSibling);
			if ($prev.is('ol')) {
				$('>li', $prev).each(function() {
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

	function isMyStatus($item) {
		var value = $item.attr(attr_name);
		if (value === 'true')
			return true;
		else if (value === 'false')
			return false;

		var id = $item.attr('id');
		id = id || unescape(($('.avatar', $item).prop('href') + '').replace('http://fanfou.com/', ''));
		var is_my_status = false;

		if (id == null) {
			is_my_status = is_my_page &&
				! $item.is('.reply.more, .reply.hide, .reply.waiting, .reply.notavail');
		} else {
			is_my_status = id == my_id;
		}

		$item.attr(attr_name, is_my_status);
		return is_my_status;
	}

	function addRepostBtn($item) {
		if (! $item || ! $item.length) return;
		var $repost = $('<a class="repost" title="转发">转发</a>');
		var $delete = $('.op .delete', $item);

		var status_id = ($('.stamp .time', $item).prop('href') || '')
			.replace('http://fanfou.com/statuses/', '');
		$repost.attr('ffid', status_id);

		var author;
		if (is_my_page) {
			author = my_name;
		} else if (is_status_page) {
			author = $('.author', $item).text() || $('#latest h1 a').text();
		} else {
			author = $('.author', $item).text();
		}

		var $content = $('.content', $item).clone();
		$('.photo', $content).remove();
		$content.children('a').each(function() {
			if (this.href.indexOf('http://fanfou.com/') !== 0)
				this.textContent = this.href;
		});
		var content = '转@' + author + ' ' + $content.text().trim();
		$repost.attr('text', content);
		$repost.prop('href', '/home?status=' +
			encodeURIComponent(content) +
			'&repost_status_id=' +
			encodeURIComponent(status_id));

		var token = $delete.attr('token');
		$repost.attr('token', token);

		$delete.before($repost);
		$item.attr('repost-btn-added', 'true');
	}

	function removeRepostBtn($item) {
		$item.removeAttr(attr_name);
		$item.removeAttr('repost-btn-added');
		$('.op .repost', $item).remove();
	}

	function processItem($item) {
		if (! $item.is('li')) return;
		if (! isMyStatus($item)) return;
		if ($item.attr('repost-btn-added') == 'true') return;

		addRepostBtn($item);
	}

	return {
		load: function() {
			if (is_status_page) {
				addRepostBtn($('#latest'));
				$('ol.replymsg li').each(function() { processItem($(this)); });
			} else {
				observer.observe($stream[0], { childList: true, subtree: true });
				$('>ol li', $stream).each(function() { processItem($(this)); });
			}
		},
		unload: function() {
			if (is_status_page) {
				removeRepostBtn($('#latest'));
			} else {
				observer.disconnect();
				var $ol = $('>ol', $stream);
				if (! $ol.length) return;
				$('li[repost-btn-added]', $ol).each(function() {
					removeRepostBtn($(this));
				});
			}
		}
	};
})(jQuery));