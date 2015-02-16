SF.pl.friendship_check = new SF.plugin((function($) {
  if (! SF.fn.isUserPage() || SF.fn.isMyPage())
    return;

  var $protected = $('#profile-protected');
  if ($protected.length) {
    $('#panel h1').after(
      $('<p />').prop('id', 'relation')
    );
  }

  var $insert = $('#relation, #userview_link').first();
  if (! $insert.length) 
    return;

  var my_url = SF.fn.getMyPageURL();
  if (! my_url) return;

  var my_id = getIdFromURL(my_url);
  var follower_list_url = 'http://fanfou.com/followers/' + encodeURIComponent(my_id) + '/p.';

  var $check = $('<span />');

  var gender, gender_text;

  function getUserGender() {
    var $user_infos = $('#user_infos .vcard li');
    $user_infos.each(function() {
      var text = this.textContent || '',
        result;
      result = (result = text.match(/性别：(男|女)/)) && result[1];
      gender = gender || result;
    });
    gender = gender || '男';
  }

  function getIdFromURL(url) {
    return decodeURIComponent(url.replace('http://fanfou.com/', ''));
  }

  function check() {
    $check.unbind();
    $check.css('cursor', 'auto');
    var $avatar = $('#avatar a');
    var user_url = $avatar.prop('href');
    var user_id = getIdFromURL(user_url);
    var is_followed = false;

    $('#friends ul a').each(function() {
      if (! is_followed && $(this).prop('href') === my_url) {
        is_followed = true;
        $check.text(gender_text + '关注了你！:)');
      }
    });

    if (! is_followed) {
      checkPage(1, user_id);
    }
  }

  function checkPage(page_num, target_id) {
    $check.text('检查中…(' + page_num + ')');
    $.get(follower_list_url + page_num, function(html) {
      if (html.indexOf('<a href="/' + target_id + '" class="name">') > -1) {
        $check.text(gender_text + '关注了你！:)');
      } else {
        page_num++;
        var next_page_pattern = '<a href="/followers/' + encodeURIComponent(my_id) + '/p.' + page_num + '">下一页</a>';
        if (html.indexOf(next_page_pattern) > -1) {
          checkPage(page_num, target_id);
        } else {
          $check.text(gender_text + '没有关注你… :(');
        }
      }
    });
  }

  return {
    load: function() {
      $check.click(check);
      $check.html('检查<span id="friendship-check-gender"></span>是否关注了你');
      $check.css('cursor', 'pointer');
      $insert.append($check);
      getUserGender();
      gender_text = ({
        '男': '他',
        '女': '她'
      })[gender];
      $('#friendship-check-gender').text(gender_text);
    },
    unload: function() {
      $check.detach();
    }
  };
})(jQuery));