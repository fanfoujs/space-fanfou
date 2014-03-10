SF.pl.expanding_replies = new SF.plugin((function($) {
	var $stream = $('#stream');
	if (! $stream.length) return;

	var MutationObserver = MutationObserver || WebKitMutationObserver;
	var slice = Array.prototype.slice;

	var $notification_btn = $('#timeline-notification a');
	var $last_refresh;

	var replies_number;
	var auto_expand;

	var MSG_DELETED = '已删除';
	var MSG_NOPUBLIC = '不公开';

	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			var added = slice.call(mutation.addedNodes, 0);
			var removed = slice.call(mutation.removedNodes, 0);
			var $prev = $(mutation.previousSibling);
			if ($prev.is('ol')) {
				$('>li', $prev).each(function() {
					processItem($(this));
				});
				$('>li', $stream).remove();
			}
			if (removed.length === 1) {
				var $item = $(removed[0]);
				if ($item.attr('expended')) {
					removeReplies($item,
						$prev,
						$(mutation.nextSibling));
				}
			}
			if (added.length) {
				added.forEach(function(item) {
					processItem($(item));
				});
				getLastRefresh();
			}
		});
	});

	var getLastRefresh = SF.fn.throttle(function() {
		$last_refresh = $('#stream li.buffered').last();
	}, 16);

	function showBufferedStatuses() {
		setTimeout(function() {
			$('#stream li.buffered').removeClass('buffered');
			if ($last_refresh && $last_refresh.length) {
				$('.last-refresh').removeClass('last-refresh');
				$last_refresh.addClass('last-refresh').removeAttr('last-refresh');
			}
			$last_refresh = null;
		}, 16);
	}

	function showWaiting($e) {
		var $wait = $('<li>');
		$wait.addClass('reply waiting');
		var id = 'waiting_' + Math.random().toString().slice(2);
		$wait.attr('id', id);
		$e.replaceWith($wait);
		return id;
	}

	function displayReplyList(url, before, num, type) {
		if (num == 0) {
			var $more = $('<li>');
			$more.attr('href', url);
			$more.addClass('reply more');
			$more.text('继续展开');
			var $before = $('#' + before);
			$more.insertBefore($before);
			$before.remove();
			return;
		}
		$.get(url, function(data) {
			var $before = $('#' + before);
			var avatar = /<div id="avatar">(.+?)<\/div>/.exec(data)[1];
			var author_exp = /<h1>(.+?)<\/h1>/g;
			author_exp.lastIndex = data.indexOf('id="latest"');
			var author = author_exp.exec(data)[1];
			var content = /<h2>([\s\S]+?)<\/h2>/.exec(data);
			var avail = false;
			if (! content) {
				content = MSG_DELETED;
				spans = '';
			} else {
				content = content[1];
				var stamp_pos = content.indexOf('<span class="stamp">');
				var spans;
				if (stamp_pos == -1) {
					content = MSG_NOPUBLIC;
					spans = '';
				} else {
					spans = content.substring(stamp_pos);
					content = content.substring(0, stamp_pos);
					if (content.indexOf('<span class="content">') === -1) {
						content = '<span class="content">' + content + '</span>';
					}
					spans = spans.replace('redirect="/home" ', '');
					avail = true;
				}
			}
			var $li = $('<li>');
			if (avail) {
				$li.attr('expended', 'expended');
				$li.addClass('reply unlight');
				$li.html(avatar + author + content + spans);
				FF.app.Stream.attach($li[0]);
				if (content.indexOf('<img '))
					FF.app.Zoom.init($li[0]);
				var $links = $('a', $li);
				$links.eq(0).addClass('avatar');
				$links.eq(1).addClass('author');
				var $stamp = $('.stamp', $li);
				if (! $stamp.length) {
					url = '';
				} else {
					var $reply = $('.reply', $stamp);
					if ($reply.length == 0) {
						url = '';
					} else {
						url = $('a', $reply).attr('href');
					}
				}
				if (type) {
					var $hide_replies = $('<li>');
					$hide_replies.addClass('reply hide');
					$hide_replies.attr('expended', 'expended');
					$hide_replies.text('隐藏原文');
					$hide_replies.insertBefore($before);
				}
				$li.insertBefore($before);
				if (! url) {
					$li.addClass('last');
					$before.remove();
				} else {
					displayReplyList(url, before, num - 1);
				}
			} else {
				$li.addClass('reply notavail');
				$li.attr('href', url);
				$li.text(content);
				$before.replaceWith($li);
			}
		});
	}

	function showExpand($item, dont_auto_expand) {
		if ($item.attr('expended')) return;
		var $reply = $('.stamp .reply', $item);
		if (! $reply.length) return;
		$item.attr('expended', 'expended');
		var $expand = $('<li>');
		var $link = $('a', $reply);
		var type = $link.text().indexOf('转自') == 0;
		$expand
		.attr('type', type ? '转发' : '回复')
		.attr('href', $link.attr('href'))
		.addClass('reply more first')
		.text(type ? '转自' : '展开')
		.insertAfter($item);
		if (auto_expand && dont_auto_expand !== true) {
			setTimeout(function() {
				displayReplyList($expand.attr('href'),
					showWaiting($expand), 1, true);
			}, 0);
		}
	}

	function hideReplyList() {
		var $t = $(this);
		$t.hide();
		var $item = $t.prev();
		$item.removeAttr('expended');
		showExpand($item, true);
		for (var $i = $t.next(); $i.hasClass('reply'); $i = $i.next())
			$t = $t.add($i);
		$t.removeAttr('expended');
		$t.remove();
	}

	function processItem($item) {
		if (! $item.hasClass('reply hide') && ! $item.attr('href')) {
			showExpand($item);
		}
	}

	function removeReplies($item, $prev, $next) {
		var $replies = [];
		while ($next.hasClass('reply')) {
			$replies.push($next);
			$next = $next.next();
		}
		if ($item.hasClass('reply')) {
			if ($prev.hasClass('hide')) {
				$prev.fadeOut();
			}
		} else {
			$prev = null;
		}
		function fadeOut() {
			if (! $replies.length) {
				if ($prev) {
					var $deleted = $('<li>');
					$deleted.addClass('reply notavail');
					$deleted.text(MSG_DELETED);
					if ($prev.hasClass('hide')) {
						$prev.replaceWith($deleted);
					} else {
						$prev.after($deleted);
					}
				}
				return;
			}
			var $i = $replies.shift();
			$i.fadeOut(function() {
				fadeOut();
				$i.removeAttr('expended');
				$item.remove();
			});
		}
		fadeOut();
	}

	return {
		update: function(number, is_auto_expand) {
			replies_number = number;
			auto_expand = is_auto_expand;
		},
		load: function() {
			$notification_btn.click(showBufferedStatuses);
			observer.observe($stream[0], { childList: true, subtree: true });
			$('>ol li', $stream).each(function() { showExpand($(this)); });
			$stream.delegate('li.reply.more[href]', 'click.expanding-replies', function(e) {
				var $t = $(this);
				displayReplyList($t.attr('href'),
				showWaiting($t), replies_number,
				$t.hasClass('first') ? $t.attr('type') : false);
			});
			$stream.delegate('li.reply.hide', 'click.expanding-replies', hideReplyList);
		},
		unload: function() {
			observer.disconnect();
			var $ol = $('>ol', $stream);
			if (! $ol.length) return;
			$('li.reply', $ol).remove();
			$('li[expended]', $ol).removeAttr('expended');
			$notification_btn.unbind('click', showBufferedStatuses);
			$stream.undelegate('.expanding-replies');
		}
	};
})(jQuery));
