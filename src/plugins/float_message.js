SF.pl.float_message = new SF.plugin((function($, $Y) {
	var $main = $('#main');
	if ($main.hasClass('privatemsg')) return;
	var $update = $('>#phupdate', $main);
	if (! $update.length) return;
	var $act = $('.act', $update);
	var $button = $('.formbutton[type="submit"]', $act);
	var $tip = $('.tip', $update);

	var notlostfocus = false,
		keepmentions = false;

	var is_home = location.href.indexOf('http://fanfou.com/home') === 0;

	/* 处理悬浮 */
	var $msg = $('textarea', $update);
	var $win = $(window);
	var ud_top = $update.offset().top - 11;
	var main_padtop = $main.css('padding-top');
	function resetFloat() {
		$update.removeClass('float-message');
		$main.css('padding-top', main_padtop);
	}
	var is_floating;
	function onWinScroll() {
		if (is_floating) {
			if ($win.scrollTop() <= ud_top) {
				is_floating = false;
				resetFloat();
				if ($msg.not(':focus') && $(':focus').is(':not(:input)'))
					$msg.focus();
			}
		} else {
			if ($win.scrollTop() > ud_top) {
				is_floating = true;
				$update.addClass('float-message');
				$main.css('padding-top',
						  $update.outerHeight() + parseInt(main_padtop) +
						   -16 +'px');
				if ($msg.val().length == 0 && $msg.is(':focus')) {
					$msg.blur();
					$update.addClass('msgempty');
				}
			}
		}
	}

	/* 重载事件 */
	var $popup = $('#PopupBox');
	var myurl = $('#navigation li>a').eq(1).attr('href');
	var $ol = $('#stream ol');
	var $form = $('form#message', $update);
	var padding = parseInt($msg.css('padding-top'));
	var $in_reply = $('[name=in_reply_to_status_id]', $update);
	var $repost = $('[name=repost_status_id]', $update);
	function pushState(newstate, url) {
		var state = { sf: true, msg: $msg.val() };
		if ($in_reply.val()) {
			state.reply = $in_reply.val();
		} else if ($repost.val()) {
			state.repost = $repost.val();
		}
		history.replaceState(state, null);
		if (newstate) {
			newstate.sf = true;
			history.pushState(newstate, null, url);
		}
	}
	function onReplyClick(e) {
		e.preventDefault();
		var $t = $(this);
		var ffid = $t.attr('ffid');
		var ffname = $t.attr('ffname');
		var msg = '@' + ffname + ' ';
		$('.content a.former', $t.parents('li')).each(function() {
			if ($(this).attr('href') == myurl) return;
			msg += '@' + $(this).text() + ' ';
		});
		var select_end = msg.length;
		msg += $msg.val();
		msg = msg.split(/\s+/);
		var new_msg = [ ];
		var at_ed = { };
		for (var i = 0; i < msg.length; ++i) {
			if (msg[i][0] != '@') {
				for (; i < msg.length; ++i)
					new_msg.push(msg[i]);
				break;
			}
			if (at_ed[msg[i]] !== true) {
				new_msg.push(msg[i]);
				at_ed[msg[i]] = true;
			}
		}
		msg = new_msg.join(' ');
		pushState({ msg: msg, reply: ffid },
				location.pathname +
				'?status=' + encodeURIComponent(msg) +
				'&in_reply_to_status_id=' + ffid);
		$msg.val(msg).trigger('change');
		$msg.get(0).setSelectionRange(ffname.length + 2, select_end);
		$msg.focus();
		$in_reply.val(ffid);
		$repost.val('');
		return false;
	}
	function onRepostClick(e) {
		e.preventDefault();
		var $t = $(this);
		var ffid = $t.attr('ffid');
		var old_msg = $msg.val();
		var msg = old_msg + $t.get(0).getAttribute('text');
		pushState({ msg: msg, repost: ffid },
				location.pathname +
				'?status=' + encodeURIComponent(msg) +
				'&repost_status_id=' + ffid);
		$in_reply.val('');
		$repost.val(ffid);
		$msg.val(msg).trigger('change');
		$msg.get(0).setSelectionRange(old_msg.length, old_msg.length);
		$msg.focus();
		return false;
	}

	/* 备份相关事件 */
	var $E = $Y.util.Event;
	var backup = { };
	var msg_keyup, update_submit;
	SF.fn.waitFor(function() {
		msg_keyup = $E.getListeners($msg[0], 'keyup');
		update_submit = $E.getListeners($form[0], 'submit');
		return msg_keyup && update_submit;
	}, function() {
		backup.msg_keyup = msg_keyup[0].fn;
		backup.update_submit = update_submit[0].fn;
	});

	function processData(callback) {
		var arr_data = $form.serializeArray();
		arr_data.forEach(function(item) {
			callback(item.name, item.value);
		});
	}

	/* AJAX化提交 */
	var $loading = $('.loading', $form);
	var $count = $('#user_stats .count').eq(2);
	function onFormSubmit(e) {
		$loading.css('visibility', 'visible');
		if ($form.attr('target')) return;
		// 生成 form_submit 事件以触发彩蛋识别
		var eve = document.createEvent('Event');
		eve.initEvent('form_submit', false, false);
		this.dispatchEvent(eve);
		// 继续执行相关处理
		e.preventDefault();
		var data, files,
			$file = $('input[type=file]'),
			$base64 = $('#upload-base64'),
			is_uploading = false;
		if ($file.length || $base64.length) {
			files = $file[0].files;
			base64 = $base64[0].value;
			if (files.length || base64) {
				is_uploading = true;
				var fd = new FormData;
				processData(function(name, value) {
					fd.append(name, value);
				});
				fd.append('ajax', 'yes');
				files[0] && fd.append('picture', files[0]);
				data = fd;
			}
		}
		if (! is_uploading) {
			data = {};
			processData(function(name, value) {
				data[name] = value;
			});
			if (data.action == 'photo.upload') {
				data.action = 'msg.post';
				data.content = data.desc;
				delete data.desc;
			}
			data.ajax = 'yes';
		}
		$.ajax({
			url: is_uploading ? '/home/upload' : '/home',
			type: 'POST',
			data: data,
			processData: ! is_uploading,
			contentType: is_uploading ?
				false : 'application/x-www-form-urlencoded; charset=UTF-8',
			accepts: 'json',
			dataType: 'json',
			xhr: function() {
				var xhr = new XMLHttpRequest;
				if (xhr.upload) {
					xhr.upload.addEventListener('progress', function(e) {
						if (! e.lengthComputable) return;
						if (e.total < 50 * 1024) return;
						var percent = Math.floor(e.loaded / e.total * 100);
						$button.val(percent + '%');
					}, false);
				}
				return xhr;
			},
			beforeSend: function() {
				$button.val('发送');
			},
			success: function(data) {
				$loading.css('visibility', 'hidden');
				var $notice = $('<div>');
				if (! data.status) {
					$notice.addClass('errmsg');
					$msg.focus();
				} else {
					$notice.addClass('sysmsg');
					var q = location.search;
					q = q.replace(/\b(status|in_reply_to_status_id|repost_status_id)=[^&]+&?/g, '');
					if (q == '?') q = '';
					pushState({ msg: '' }, location.pathname + q);
					var msg = '';
					if (keepmentions) {
						msg = $msg.val().split(/\s+/);
						for (var i = 0; i < msg.length; ++i) {
							if (msg[i].substr(0, 1) != '@') {
								msg = msg.slice(0, i);
								break;
							}
						}
						msg = msg.join(' ');
						if (msg) msg += ' ';
					}
					$msg.val(msg).trigger('change');
					if (notlostfocus)
						$msg.focus();
					$in_reply.val('');
					$repost.val('');
					$count.text(+$count.text() + 1);
					if (is_uploading) {
						$('#ul_close').click();
						data.msg = data.msg || '图片上传成功！';
					}
					if (is_home) {
						setTimeout(function() {
							FF.app.Timeline.checkNew();
						}, 500);
					}
				}
				$notice.text(data.msg);
				$notice.hide();
				var $header = $('#header');
				$('.errmsg, .sysmsg', $header).remove();
				$header.append($notice);
				$notice.fadeIn(500).delay(3500).fadeOut(500,
					function() { $(this).remove(); });
			},
			complete: function() {
				$button.val('发送');
			}
		}, 'json');
		return false;
	}
	function onMsgKeypress(e) {
		if (e.ctrlKey && (e.keyCode == 10 || e.keyCode == 13)) {
			e.preventDefault();
			$(this).blur();
			$form.submit();
			return false;
		}
	}
	function onDrop(e) {
		var $base64 = $('#upload-base64');
		setTimeout(function() {
			if ($base64.val()) {
				$('#upload-filename, #ul_close').show();
			}
		}, 250);
	}

	/* 历史记录 */
	// 历史记录不在禁用时关闭是为了已经加入的历史可以被正确处理
	window.onpopstate = function(e) {
		var state = e.state;
		if (! state || ! state.sf) return;
		$msg.val(state.msg);
		$in_reply.val('');
		$repost.val('');
		if (state.reply) {
			$in_reply.val(state.reply);
		} else if (state.repost) {
			$repost.val(state.repost);
		}
	};

	/* 样式处理 */
	var interval = 0;
	function onInterval() {
		var length = $msg.val().length;
		if ($update.hasClass('msgempty') && length) {
			$update.removeClass('msgempty');
		} else if ($msg.is(':not(:focus)') && ! length) {
			$update.addClass('msgempty');
		}
	}
	function onMsgFocus() {
		$update.removeClass('msgempty');
	}
	function onMsgClick() {
		$act.css('display', 'block');
	}


	return {
		update: function(is_notlostfocus, is_keepmentions) {
			notlostfocus = is_notlostfocus;
			keepmentions = is_keepmentions;
		},
		load: function() {
			// 添加悬浮
			SF.fn.scrollHandler.addListener(onWinScroll);
			// 清理按钮事件
			var $items = $('>li', '#stream ol.wa');
			if (! $items.length) {
				var $items = $('>li', '#stream ol.self');
			}
			$('>span.op>a.reply', $items).die('click');
			$('>span.op>a.repost', $items).die('click');
			$popup.detach();
			// 重载事件
			$('>span.op>a.reply', $items).live('click', onReplyClick);
			$('>span.op>a.repost', $items).live('click', onRepostClick);
			// 清除原有事件
			SF.fn.waitFor(function() {
				return backup.msg_keyup && backup.update_submit;
			}, function() {
				$E.removeListener($msg[0], 'keyup', backup.msg_keyup);
				$E.removeListener($form[0], 'submit', backup.update_submit);
			});
			// AJAX 化提交
			$form.submit(onFormSubmit);
			$msg.keypress(onMsgKeypress);
			// 设置样式调节
			interval = setInterval(onInterval, 50);
			$msg.focus(onMsgFocus).click(onMsgClick).change(onMsgClick);
			// 设置初始状态
			is_floating = false;
			pushState();
			// 修正拖拽上传图片
			$msg.on('drop', onDrop);
		},
		unload: function() {
			// 取消悬浮
			SF.fn.scrollHandler.removeListener(onWinScroll);
			resetFloat();
			// 清除绑定的事件
			var $items = $('>li', '.wa');
			$('>span.op>a.reply', $items).die('click');
			$('>span.op>a.repost', $items).die('click');
			// 恢复按钮事件
			$('body').unbind('keydown');
			$('#PopupClose', '#PopupBox').unbind('click');
			$('#PopupForm').unbind('keydown');
			$('#PopupForm').unbind('submit');
			$popup.appendTo('body');
			FF.app.QuickReply();
			FF.app.Repost();
			// 回退 AJAX 化提交
			$form.unbind('submit', onFormSubmit);
			$msg.unbind('keypress', onMsgKeypress);
			$msg.off('drop', onDrop);
			// 恢复原有事件
			if (backup.msg_keyup)
				$E.on($msg[0], 'keyup', backup.msg_keyup);
			if (backup.update_submit)
				$E.on($form[0], 'submit', backup.update_submit);
			// 删除样式调节
			clearInterval(interval);
			interval = 0;
			$msg.unbind('focus', onMsgFocus).unbind('click', onMsgClick).unbind('change', onMsgClick);
		}
	};
})(jQuery, YAHOO));
