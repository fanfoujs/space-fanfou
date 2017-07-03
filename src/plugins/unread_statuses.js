SF.pl.unread_statuses = new SF.plugin((function($) {
  var $notification_bar = $('#timeline-notification');
  if (! $notification_bar.length)
    return;

  var playsound;

  var button = $('a', $notification_bar)[0];
  var $counter = $('a strong', $notification_bar);

  var interval;
  var period = 500;
  var ud_top = 230;
  var unread_counter;

  var ext_domain = SF.fn.getExtDomain();
  var my_page_url = SF.fn.getMyPageURL();

  var sound;

  return {
    update: function(ps) {
      playsound = ps;
    },
    load: function() {
      if (playsound) {
        sound = new Audio;
        sound.src = ext_domain + 'resources/sounds/dingdong.mp3';
      }

      function check() {
        var counter = 0;
        var all_is_mine = false;

        if (! $notification_bar.is(':hidden')) {
          counter = parseInt($counter.text(), 10) || 0;

          if (counter) {
            // 查找缓存了的未读消息
            // 当未读消息数量超过一定值时，饭否不会缓存消息（点击新消息提示条会直接刷新页面）
            // 对于未读消息较多的情况，我们不予自动处理
            var $unread_statuses = $('#stream li.buffered');
            all_is_mine = $unread_statuses.length > 0 && [].every.call($unread_statuses, function($item) {
              var statusAuthorUrl = $('.avatar', $item).prop('href');
              return statusAuthorUrl === my_page_url;
            });
          }

          if (counter > unread_counter &&
            ! all_is_mine &&
            playsound) {
            sound.play();
          }

          if (all_is_mine && scrollY <= ud_top) {
            SF.fn.emulateClick(button, true);
          }
        }

        unread_counter = counter;
      }

      unread_counter = 0;
      interval = setInterval(check, period);
    },
    unload: function() {
      clearInterval(interval);
      sound = null;
    }
  };
})(jQuery));
