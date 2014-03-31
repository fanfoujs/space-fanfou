SF.pl.friend_manage = new SF.plugin((
	location.href == 'http://fanfou.com/friend.request' ?
	function($) {
		var token = $('[token]').attr('token');

		var $h2 = $('#requests h2');

		var $stream = $('#stream');
		var $li = $stream.find('li');

		var $manage = $('<div>');
		$manage.addClass('batch-manage requests');

		function getCheckboxes(selector) {
			selector = 'li input[type=checkbox][userid]' + (selector || '');
			return $stream.find(selector);
		}

		function process(action) {
			var $to_process = getCheckboxes(':checked');
			var length = $to_process.length;
			var action_tip = ({
				'friend.acceptadd': '通过关注请求并关注 %n 个饭友',
				'friend.accept': '通过 %n 个关注请求',
				'friend.deny': '忽略 %n 个关注请求'
			})[action];
			var notice = '确定要' + action_tip.replace('%n', length) + '吗？';
			if (! length || ! confirm(notice)) return;
			$to_process.each(function() {
				var $t = $(this);
				var $btn = $t.parent().find('a.post_act');
				$.ajax({
					type: 'POST',
					url: location.href,
					data: {
						action: action,
						friend: $t.attr('userid'),
						token: $btn.attr('token'),
						ajax: 'yes',
					},
					success: function(data) {
						FF.util.yFadeRemove($btn.get(0), 'li');
						var count_tip = $h2[0].childNodes[0];
						var count = +count_tip.textContent.match(/\d+/)[0];
						var new_count = count - 1;
						if (new_count) {
							count_tip.textContent = count_tip.textContent.replace(count, new_count);
						} else {
							count_tip.textContent = '目前没有关注请求';
						}
					},
				});
			});
		}

		var $select = $('<select />');
		$select
		.append(
			$('<option />')
			.val('default')
			.text('批量处理..')
		)
		.append(
			$('<option />')
			.val('select-all')
			.text('全选')
		)
		.append(
			$('<option />')
			.val('toggle')
			.text('反选')
		)
		.append(
			$('<option />')
			.val('cancel')
			.text('取消选择')
		)
		.append(
			$('<option />')
			.val('accept-and-follow')
			.text('接受请求并关注')
		)
		.append(
			$('<option />')
			.val('accept')
			.text('接受请求')
		)
		.append(
			$('<option />')
			.val('ignore')
			.text('忽略请求')
		)
		.val('default')
		.change(function(evt) {
			switch (this.value) {
			case 'default':
				break;
			case 'select-all':
				getCheckboxes().prop('checked', true);
				break;
			case 'toggle':
				getCheckboxes()
				.each(function() {
					var $checkbox = $(this);
					$checkbox.
					prop('checked', ! $checkbox.prop('checked'));
				});
				break;
			case 'cancel':
				getCheckboxes()
				.prop('checked', false);
				break;
			case 'accept-and-follow':
				process('friend.acceptadd');
				break;
			case 'accept':
				process('friend.accept');
				break;
			case 'ignore':
				process('friend.deny');
				break;
			}
			this.value = 'default';
		})
		.appendTo($manage);

		return {
			load: function() {
				var $checkbox = $('<input>').attr('type', 'checkbox');
				$li.each(function() {
					var $item = $(this);
					var $chk = $checkbox.clone();
					var id = decodeURIComponent($item.find('.name').attr('href').replace('/', ''));
					$chk.attr('userid', id);
					$chk.appendTo($item);
				});
				$manage.appendTo($h2);
			},
			unload: function() {
				getCheckboxes().remove();
				$manage.detach();
			}
		};

	} :
	function($) {
		if (! $('div#friends>.tabs').length)
			return;
		var pageUrl = $('.tabs>a.crumb').attr('href');
		var myPageUrl = $('#navigation ul>li:nth-child(2)>a').attr('href');
		if (pageUrl.split('/').pop() != myPageUrl.split('/').pop())
			return;

		var token = $('[token]').attr('token');

		var isFriend = $('.tabs li.current').is(':first-child');

		var $li = $('#stream li');
		var $manage = $('<div>');
		$manage.addClass('friends batch-manage actions');
		var $del = isFriend ? $('<a>取消关注选定</a>') : $('<a>删除选定用户</a>');
		$del.addClass('friend-remove');
		$del.attr('href', '#');
		$del.click(function(evt) {
			evt.preventDefault();
			var $todel = $('#stream li input[type=checkbox]:checked');
			if (!$todel.length) return;
			var text = isFriend ? '取消关注' : '删除';
			if (!confirm('确定要' + text + '选定的 ' + $todel.length + ' 个人吗？'))
				return;
			$todel.each(function() {
				var $t = $(this);
				var $post_act = $t.parent().find('a.post_act');
				var _token = $post_act.attr('token');
				waitFor(function() {
					return _token = _token || token;
				}, function() {
					var data = {
						action: isFriend ? 'friend.remove' : 'follower.remove',
						token: _token,
						ajax: 'yes',
					};
					if (isFriend) {
						data.friend = $t.attr('userid');
					} else {
						data.follower = $t.attr('userid');
					}
					$.ajax({
						type: 'POST',
						url: location.href,
						data: data,
						dataType: 'json',
						contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
						success: function(data) {
							if (data.status) {
								if (! $post_act.length) {
									$post_act = $('<a>');
									$post_act.attr('token', _token);
									$post_act.hide();
									$t.parent().find('.actions').append($post_act);
								}
								FF.util.yFadeRemove($post_act.get(0), 'li');
								var $count = $('.tabs ul li.current a');
								var text = $count.text();
								var count = +text.match(/\d+/)[0];
								$count.text(text.replace(count, count - 1));
							} else {
								alert(data.msg);
							}
						},
					});
				});
			});
		});

		var $all = $('<input>');
		$all.attr('type', 'checkbox');
		$all.change(function() {
			var $chks = $('#stream li input[type=checkbox]');
			$chks.attr('checked', $all.is(':checked'));
		});
		$manage.append($del).append($all);

		$('#stream ol').change(function(evt) {
			if (! evt.target.checked) {
				$all.removeAttr('checked');
			} else {
				var all_checked = true;
				var $chks = $('#stream li input[type=checkbox]');
				$chks.each(function() {
					all_checked = all_checked && $(this).is(':checked');
				});
				if (all_checked) {
					$all.prop('checked', true);
				}
			}
		});

		var waitFor = (function() {
			var waiting_list = [];

			var interval = 0;
			var lock = false;
			function setWaiting() {
				if (interval) return;
				interval = setInterval(function() {
					if (lock) return;
					lock = true;

					var not_avail = 0;
					for (var i = 0; i < waiting_list.length; ++i) {
						var item = waiting_list[i];
						if (item) {
							if (item.checker()) {
								item.worker();
								waiting_list[i] = null;
							} else {
								++not_avail;
							}
						}
					}

					if (! not_avail) {
						interval = 0 * clearInterval(interval);
					}

					lock = false;
				}, 40);
			}

			return function(checker, worker) {
				if (checker()) return worker();
				waiting_list.push({ checker: checker, worker: worker });
				setWaiting();
			};
		})();

		if (! token) {
			$.ajax({
				url: '/home',
				headers: {
					'X-Requested-With': 'null'
				},
				success: function(html) {
					token = html.match(/token="(\S+)"/)[1];
				}
			});
		}

		return {
			load: function() {
				$li.each(function() {
					var $chk = $('<input>');
					$chk.attr('type', 'checkbox');
					var userid = $('>a.name', this).attr('href').split('/').pop();
					$chk.attr('userid', userid);
					$chk.appendTo(this);
				});
				$manage.insertAfter('#friends h2');
			},
			unload: function() {
				$('#stream li input[type=checkbox]').remove();
				$manage.detach();
			}
		};
	}
)(jQuery));