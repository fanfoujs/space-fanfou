(function() {
  function removeBrackets($elems) {
    if (! $elems.length) return;
    $elems.each(function() {
      var $elem = $(this);
      var html = $elem.html();
      if (html[0] != '(') return;
      $elem.html(html.slice(1, -1));
    });
  }

  SF.fn.waitFor(function() {
    var $li = $('#navigation li');
    return $li && $li[3];
  }, function() {
    removeBrackets($('#navigation .count'));
  });

  SF.fn.waitFor(function() {
    var $li = $('#navtabs li');
    return $li && $li[3];
  }, function() {
    removeBrackets($('#navtabs .count'));
  });

  SF.fn.waitFor(function() {
    return $('#navigation').length;
  }, function() {
    if (SF.fn.isMyPage()) {
      $('body').attr('self', '');
    }
  });

  SF.fn.waitFor(function() {
    return $('#pagination-totop').length || $('#footer').length;
  }, function() {
    var $totop = $('#pagination-totop');
    var hidden = false;

    function hideTotop() {
      if (! hidden && $totop.length) {
        $totop.css({
          display: 'none',
          visibility: 'hidden',
          opacity: 0,
          cursor: 'default',
          '-webkit-transition': '',
          'transition': '',
        });
        hidden = true;
      }
    }

    function showTotop() {
      if (hidden && $totop.length) {
        $totop.css('display', '');
        setTimeout(function() {
          $totop.css({
            visibility: 'visible',
            opacity: .5,
            cursor: 'pointer',
            '-webkit-transition': 'opacity .4s ease-in-out',
            'transition': 'opacity .4s ease-in-out',
          });
        }, 0);
        hidden = false;
      }
    }

    if (! $totop.length) {
      var $pagination = $('.pagination');

      if (! $pagination.length) {
        $pagination = $('<div />');
        $pagination.addClass('pagination');

        var $content = $('#content');
        var $stream = $('#stream');
        var $inner_content = $('.inner-content');
        if ($content.length) {
          $content.append($pagination);
        } else if ($stream.length) {
          $stream.parent().append($pagination);
        } else if ($inner_content.length) {
          $inner_content.first().append($pagination);
        }
      }

      $totop = $('<a />');
      $totop.prop('id', 'pagination-totop').html('返回顶部').hide();

      $pagination.append($totop);
    }

    $totop.removeAttr('href');
    $totop.click(function(e) {
      hideTotop();
      SF.fn.goTop(e);
    });

    var $win = $(window);
    var main_top = 66;

    $totop.removeClass('more more-right');
    hideTotop();

    var onscroll = SF.fn.throttle(function() {
      if ($win.scrollTop() < main_top)
        hideTotop();
      else
        showTotop();
    }, 500);

    SF.fn.scrollHandler.addListener(function() {
      hideTotop();
      onscroll();
    });
  });

  SF.fn.waitFor(function() {
    return $('#upload-file').length && $('#upload-button').length &&
      $('.upload-close-handle').length;
  }, function() {
    var $upload_button = $('#upload-button');

    $('#upload-file').change(function(e) {
      $upload_button[(this.files.length ? 'add' : 'remove') + 'Class']('file-chosen');
    });

    $('.upload-close-handle').click(function(e) {
      $upload_button.removeClass('file-chosen');
    });
  });

  SF.fn.waitFor(function() {
    return $('#timeline-notification').length &&
      $('#timeline-count').length;
  }, function() {
    var $body = $('body');
    var $notif = $('#timeline-notification');
    var $unread_count = $('#timeline-count');
    var $btn = $notif.find('a');
    var count = 0;
    var timeout;
    var input_tags = ['textarea', 'input', 'TEXTAREA', 'INPUT'];
    var waiting;

    function doCount(x) {
      count += x;
      $btn.data('pullProgress', count);
    }

    $(window).on('mousewheel', function(e) {
      if (waiting) return;
      if ($body[0].scrollTop) return;
      if (e.wheelDeltaY <= 0) return;
      if (input_tags.indexOf(e.target.tagName) > -1) return;
      if ($notif.css('display') === 'none') return;
      if (! parseInt($unread_count.text(), 10)) return;

      clearTimeout(timeout);
      doCount(1);

      if (count === 3) {
        count = 0;

        waiting = setTimeout(function() {
          waiting = null;
          SF.fn.emulateClick($btn[0], true);
          $notif.removeClass('onpull');
        }, 250);
      } else {
        $notif.addClass('onpull');

        timeout = setTimeout(function recover() {
          count = Math.min(3, count);
          count = Math.max(1, count);

          doCount(-1);

          if (! count) {
            $notif.removeClass('onpull');
          } else {
            timeout = setTimeout(recover, 500);
          }
        }, 500);
      }
    }, false);
  });
})();
