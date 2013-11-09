SF.pl.user_switcher = new SF.plugin((function($) {
	var $login = $('form#login');
	if ($login.length) {
		var $al = $('#autologin');
		return {
			load: function() {
				$al.attr('checked', true);
				$al.parent().contents().not($al).remove();
				$al.after(' 保存到“多账户切换列表”');
			},
			unload: function() {
				$al.parent().contents().not($al).remove();
				$al.after(' 下次自动登入');
			}
		};
	}

	var $user_top = $('#user_top');
	if (! $user_top.length) return;

	var $logout = $('a[href^="http://fanfou.com/logout/"]');

	/* 初始化 Cookie */
	var domain = document.domain;
	var cookie_strs = document.cookie.split(/\s*;\s*/);
	var cookies = { };
	for (var i = 0; i < cookie_strs.length; ++i) {
		var cookie = cookie_strs[i];
		var pos = cookie.indexOf('=');
		if (pos < 0) continue;
		cookies[cookie.substr(0, pos)] = cookie.substr(pos + 1);
	}

	/* 初始化数据 */
	var data = SF.fn.getData('switcher') || { };

	/* Cookie 操作函数 */
	function deleteCookie(name) {
		document.cookie = name + '=;domain=.' + domain + ';' +
						  'expires=Thu, 01 Jan 1970 00:00:00 GMT';
	}
	function setLogin(al) {
		stop();
		$.ajax({
			url: $logout.prop('href'),
			method: 'HEAD',
			complete: function() {
				if (al) {
					document.cookie = 'al=' + al + ';domain=.' + domain;
					location.href = '/home';
				} else {
					location.href = '/login';
				}
			}
		});
	}
	function removeUser(id) {
		data[id] = undefined;
		SF.fn.setData('switcher', data);
	}

	/* 获取当前用户的信息 */
	var user_id = cookies.u;
	var nickname = $('h3', $user_top).text();
	var image = $('img', $user_top).attr('src');
	var auto_login = cookies.al;
	/* 添加当前用户 */
	if (auto_login) {
		data[user_id] = {
			'image': image,
			'nickname': nickname,
			'auto_login': auto_login,
		};
		SF.fn.setData('switcher', data);
	}

	/* 登出钩子 */
	var $logout = $('#navigation a[href*="/logout/"]');
	function onLogoutClick() {
		removeUser(user_id);
	}

	/* 创建用户列表 */
	var $user_list = $('<ul>');
	$user_list.attr('id', 'user_switcher');
	for (var id in data) {
		if (! data.hasOwnProperty(id)) continue;
		var user = data[id];
		if (id == user_id) continue;
		(function(user, id) {
			var $item = $('<li>');
			var $link = $('<a>');
			$link.click(function() {
				removeUser(id);
				setLogin(user.auto_login);
			});
			var $image = $('<img>');
			$image.attr('src', user.image);
			$image.attr('alt', user.nickname);
			$link.append($image);
			var $name = $('<h3>');
			$name.text(user.nickname);
			$link.append($name);
			$item.append($link);
			var $del = $('<span>');
			$del.text('x');
			$del.click(function() {
				removeUser(id);
				$item.remove();
			});
			$item.append($del);
			$user_list.prepend($item);
		})(user, id);
	}
	var $another = $('<li>');
	$another.addClass('addnew');
	var $link = $('<a>');
	$link.click(function() { setLogin(); });
	$link.text('登入另一个...');
	$another.append($link);
	$user_list.append($another);

	/* 调整样式 */
	var bordercolor = $('#sidebar').css('border-left-color');
	$user_list.css('border-top-color', bordercolor);
	$another.css('border-top-color', bordercolor);
	$user_top.css('border-color', bordercolor);

	return {
		load: function() {
			// 挂载登出钩子
			$logout.click(onLogoutClick);
			// 添加选择框
			$user_top.append($user_list);
			$user_top.addClass('switcher');
		},
		unload: function() {
			// 消除登出钩子
			$logout.unbind('click', onLogoutClick);
			// 删除选择框
			$user_list.detach();
			$user_top.removeClass('switcher');
		}
	};
})(jQuery));
