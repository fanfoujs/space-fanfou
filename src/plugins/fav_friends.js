SF.pl.fav_friends = new SF.plugin((function($) {
  var is_user_page = SF.fn.isUserPage() || SF.fn.isMyPage();
  var is_home_page = SF.fn.isHomePage();

  var FAVED_TIP = '从有爱饭友列表去除';
  var UNFAVED_TIP = '加入有爱饭友列表';

  function openURL(url) {
    return SF.fn.openURL(url);
  }

  if (is_user_page) {
    var $avatar_link = $('#avatar a');
    var my_page_url = $('#navigation li a').eq(1).prop('href');
    var avatar_link_url = $avatar_link.prop('href');

    var user_data = {
      userid: SF.fn.isMyPage() ?
        (my_page_url || '').split('/').reverse()[0] : decodeURIComponent(avatar_link_url.split('/').reverse()[0]),
      nickname:  $('#panel h1').text(),
      avatar_url: $avatar_link.find('img').prop('src').replace(/^https?:/, '')
    };
    user_data.user_url = '/' + user_data.userid;

    var $fav = $('<span />');
    $fav.addClass('fav_friends');

    var $star = $('<a />');
    $star
    .attr('href', 'javascript:void(0)')
    .attr('title', UNFAVED_TIP)
    .append($fav)
    .click(function(e) {
      e.stopPropagation();
      var faved = toggle(user_data);
      process(faved);
    });
    
  }

  if (is_home_page) {
    var $insert = $('.colltab:not(.stabs)').first();
    var $fav_friends = $('<div />').addClass('colltab fav_friends');
    var $toggle = $('<b />').appendTo($fav_friends);

    var $fav_friends_title = $('<h2 />');
    $fav_friends_title
    .addClass('fav_friends_title')
    .text('有爱饭友')
    .prop('title',
      '1. 在用户个人页面通过点击名字右方的\n星形图标添加好友\n' +
      '2. 拖拽头像重新排序\n' +
      '3. 按住 Shift 键点击头像删除\n' +
      '4. 右击这里清空列表')
    .contextmenu(function(e) {
      if (! fav_friends.length) return;
      e.preventDefault();
      if (confirm('确定要清空有爱饭友列表？')) {
        var t = 500;
        $fav_friends_list.slideUp(t, function() {
          fav_friends = [];
          saveData();
          initializeList();
          $fav_friends_list.show();
          $('p', $fav_friends_list).hide().slideDown(t);
        });
      }
    })
    .click(function(e) {
      $fav_friends_list.toggle();
      var visible = $fav_friends_list.is(':visible');
      if (visible) {
        $toggle.removeClass('collapse');
        oneClickAll();
      } else {
        $toggle.addClass('collapse');
        $showAll.hide();
      }
      SF.fn.setData('fav_friends_list_visible', visible);
    })
    .appendTo($fav_friends);

    var $fav_friends_list = $('<ul />').prop('id', 'friends');
    $fav_friends_list
    .addClass('alist')
    .prop('draggable', true)
    .on({
      'dragover': function(e) {
        e.preventDefault();
      },
      'drop': function(e) {
        var $dragsource = $('.drag-source', $fav_friends_list);
        if (! $dragsource.length) {
          e.preventDefault();
          alert('请在用户个人页面通过点击名字右方的星形图标添加好友。');
          return;
        }
        if (! e.srcElement) return;
        var $li = $(e.srcElement).closest('div.fav_friends>ul>li');
        if ($li.hasClass('drag-source')) return;
        var $placeholder = $('<span />');
        $dragsource
        .after($placeholder)
        .insertAfter($li)
        .removeClass('drag-source');
        $li.insertAfter($placeholder);
        $placeholder.remove();
        saveListData();
      },
      'drop mouseleave': resetDragging
    })
    .appendTo($fav_friends);

    var $showAll = $('<a />');
    $showAll
    .addClass('more')
    .text('» 打开所有')
    .click(function(e) {
      fav_friends.forEach(function(user, i) {
        setTimeout(function() {
          openURL(user.user_url);
        }, i * 1000);
      });
    })
    .insertAfter($fav_friends_list);
  }

  var fav_friends;

  function getIndex(userid) {
    var index = -1;

    fav_friends.some(function(item, i) {
      if (user_data.userid === item.userid) {
        index = i;
        return true;
      }
      return false;
    });

    return index;
  }

  function toggle(user_data) {
    fav_friends = getData();
    var index = getIndex(user_data.userid);

    if (index > -1)
      fav_friends.splice(index, 1);
    else
      fav_friends.push(user_data);

    saveData();
    return index === -1;
  }

  function process(faved) {
    $('#info')[faved ? 'addClass' : 'removeClass']('faved');
    $star.prop('title', faved ? FAVED_TIP : UNFAVED_TIP);
  }

  function updateUserData(index) {
    fav_friends.splice(index, 1, user_data);
    saveData();
  }

  function resetDragging() {
    $('.drag-source', $fav_friends_list).removeClass('drag-source');
  }

  function initializeList() {
    $fav_friends_list.empty();

    if (fav_friends.length) {
      fav_friends.forEach(function(user_data, i) {
        var $li = $('<li />');
        $li
        .data('user_data', user_data)
        .append(
          $('<a />')
          .prop('href', user_data.user_url)
          .prop('title', user_data.nickname)
          .append(
            $('<img />')
            .prop('src', user_data.avatar_url)
            .prop('alt', user_data.nickname)
            .click(function(e) {
              if (! e.shiftKey) return;
              e.preventDefault();
              e.stopPropagation();
              var t = parseFloat($li.css('transition-duration')) * 1000;
              $li.css('opacity', 0);
              setTimeout(function() {
                $li.remove();
                saveListData();
                oneClickAll();
                if (! fav_friends.length) {
                  initializeList();
                }
              }, t);
            })
          )
          .append(
            $('<span />').text(user_data.nickname)
          )
        )
        .prop('draggable', true)
        .on({
          'drag': function(e) {
            $li.addClass('drag-source');
          },
          'dragover': function(e) {
            if ($li.hasClass('drag-source')) return;
            e.preventDefault();
            $li.addClass('dragover');
          },
          'dragleave drop': function(e) {
            $li.removeClass('dragover');
          }
        })
        .appendTo($fav_friends_list);
      });
    } else {
      $fav_friends_list
      .append(
        $('<p />')
        .text('把你常常翻看的饭友添加到这里…')
        .prop('title', '在用户个人页面通过点击名字右方的星形图标添加好友')
      );
    }

    oneClickAll();
  }

  function saveListData() {
    fav_friends = [];
    $('>li', $fav_friends_list).each(function() {
      fav_friends.push($(this).data('user_data'));
    });

    saveData();
  }

  function oneClickAll() {
    $showAll[fav_friends.length > 2 ? 'show' : 'hide']();
  }

  function getData() {
    var default_data = [ {
      userid: 'fanfou',
      nickname:  '饭否',
      avatar_url: '//s3.meituan.net/v1/mss_3d027b52ec5a4d589e68050845611e68/avatar/l0/00/37/9g.jpg?1181650871',
      user_url: '/fanfou'
    } ];

    return SF.fn.getData('fav_friends') || default_data;
  }

  function saveData() {
    SF.fn.setData('fav_friends', fav_friends);
  }

  function onStorage(e) {
    if (e.key != 'fav_friends') return;
    if (e.oldValue == e.newValue) return;

    SF.pl.fav_friends.unload();
    SF.pl.fav_friends.load();
  }

  return {
    load: function() {
      fav_friends = getData();
      if (is_user_page) {
        var index = getIndex(user_data.userid);
        var faved = index > -1;

        if (faved) {
          updateUserData(index);
        }

        process(faved);

        $fav.appendTo('#avatar');
        $star.appendTo('#panel h1');
      } else if (is_home_page) {
        initializeList();
        $insert.before($fav_friends);

        if (SF.fn.getData('fav_friends_list_visible') === false) {
          $fav_friends_title.click();
        }
      }
      addEventListener('storage', onStorage, false);
    },
    unload: function() {
      if (is_user_page) {
        $fav.detach();
        $star.detach();
      } else if (is_home_page) {
        $fav_friends.detach();
      }

      removeEventListener('storage', onStorage, false);
    }
  };
})(jQuery));
