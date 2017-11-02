SF.pl.user_switcher = new SF.plugin((function($) {
  var $login = $('form#login');
  if ($login.length) {
    // 登录页面
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

  var $logout = $('a[href^="//fanfou.com/logout/"]');
  if (!$logout.length) {
    // 尝试 http
    $logout = $('a[href^="http://fanfou.com/logout/"]');
  }

  /* 初始化 Cookie */
  var cookies;
  function readCookies(){
    var pairs = document.cookie.split(/; ?/);
    cookies = {};
    for (var i = 0; i < pairs.length; i++){
      var pair = pairs[i].split('=');
      var key = pair[0];
      if (key) {
        var value = unescape(pair[1]);
        cookies[key] = value;
      }
    }
  }

  /* 初始化数据 */
  var data = SF.fn.getData('switcher') || { };
  readCookies();

  /* Cookie 操作函数 */
  function setCookie(key, val, expires) {
    var value = key + '=' + val + '; domain=.fanfou.com';
    if (expires) value += '; expires=' + expires.toUTCString();
    document.cookie = value;
  }
  function deleteCookie(key) {
    setCookie(key, '', new Date(0));
  }
  function logout(callback) {
    $.ajax({
      url: $logout.prop('href'),
      method: 'HEAD',
      complete: function() {
        readCookies();
        if (cookies.u) {
          var err = new Error('failed to logout');
          callback(err);
        } else {
          callback(null);
        }
      }
    });
  }
  function removeUser(id) {
    delete data[id];
    SF.fn.setData('switcher', data);
  }
  function setUserCookies(id) {
    var user_cookies = data[id].cookies;
    var expires = new Date();
    // 设置为一个月后过期
    // 实际上这样处理不是很妥当，我们写 cookies 应该按照服务端原样来写
    // 然而前端缺少一个直接的方式获取后端设置的 cookies 过期日期
    expires.setMonth(expires.getMonth() + 1);
    for (var key in user_cookies) setCookie(key, user_cookies[key], expires);
  }
  function redirectToHomePage() {
    location.href = '/home';
  }

  /* 获取当前用户的信息 */
  var user_id = cookies.u;
  var nickname = $('h3', $user_top).text();
  var avatar = $('img', $user_top).attr('src');
  /* 添加当前用户 */
  if (cookies.al) {
    // 只有登录并且勾选“自动登录”才会存在 al 这个 cookie
    // 实际上这里最好用 PHPSESSID 这个字段作为判断依据
    // 然而退登之后饭否后端并不会删掉这个字段的 cookie
    var user_cookies = {};
    for (var key in cookies) {
      if (cookies.hasOwnProperty(key) && key.charAt(0) !== '_' && key !== 'uuid') {
        user_cookies[key] = cookies[key];
      }
    }
    data[user_id] = {
      image: avatar,
      nickname: nickname,
      cookies: user_cookies
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
    if (! data[id].cookies) continue; // 旧版本太空饭否存储的数据不包含 cookies 这个字段
    var user = data[id];
    if (id == user_id) continue;
    (function(user, id) {
      var $item = $('<li>');
      var $link = $('<a>');
      $link.click(function() {
        setUserCookies(id);
        redirectToHomePage();
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
      $del.text('×');
      $del.click(function() {
        var tip = '确定要从用户列表中删除 @' +
          user.nickname + '(' +
          id + ') 吗？';
        if (! confirm(tip)) return;
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
  $link.click(function() {
    [ 'u', 'm', 'al', 'PHPSESSID' ].forEach(function (key) {
      deleteCookie(key);
    });
    location.href = '/login';
  });
  $link.text('登入另一个...');
  $another.append($link);
  $user_list.append($another);

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
