SF.checkAndExec('float_message', [], function() {
    /* 处理悬浮 */
    var $main = $('#main');
    var $update = $('#update');
    var $win = $(window);
    var ud_top = $update.offset().top;
    var main_padtop = $main.css('padding-top');
    $win.scroll(function() {
        if ($win.scrollTop() > ud_top) {
            $update.addClass('float-message');
            $main.css('padding-top',
                      ($update.outerHeight() + parseInt(main_padtop)) + 'px');
        } else {
            $update.removeClass('float-message');
            $main.css('padding-top', main_padtop);
        }
    });

    /* 重载事件 */
    var $script = $('<script>');
    $script.html(
        'var $a = jQuery(">li", ".wa");' +
        'jQuery(">span.op>a.reply", $a).die("click");' +
        'jQuery(">span.op>a.repost", $a).die("click");'
        );
    $('body').append($script);
    var myurl = $('#navigation li>a').eq(1).attr('href');
    var $ol = $('#stream ol');
    var $msg = $('textarea', $update);
    var padding = parseInt($msg.css('padding-top'));
    var $in_reply = $('[name=in_reply_to_status_id]', $update);
    var $repost = $('[name=repost_status_id]', $update);
    $('span.op>a.reply', $ol).live('click', function(e) {
        e.preventDefault();
        var $t = $(this);
        $in_reply.val($t.attr('ffid'));
        $repost.val('');
        var ffname = $t.attr('ffname');
        var msg = '@' + ffname + ' ';
        $('.content a.former', $t.parents('li')).each(function() {
            if ($(this).attr('href') == myurl) return;
            msg += '@' + $(this).text() + ' ';
        });
        var select_end = msg.length;
        msg += $msg.val();
        msg = msg.split(' ');
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
        $msg.val(new_msg.join(' '));
        $msg.get(0).setSelectionRange(ffname.length + 2, select_end);
        $msg.focus();
    });
    $('span.op>a.repost', $ol).live('click', function(e) {
        e.preventDefault();
        $in_reply.val('');
        var $t = $(this);
        $repost.val($t.attr('ffid'));
        var old_msg = $msg.val();
        $msg.val(old_msg + $t.get(0).getAttribute('text'));
        $msg.get(0).setSelectionRange(old_msg.length, old_msg.length);
        $msg.focus();
    });

    $.fn.removeEvents = function() {
        var $elem = $(this);
        if ($elem.length > 1) {
            return $.map($elem,
                         function($e) { return $(e).removeEvents(); });
        }
        var $inner = $elem.children();
        $inner.detach();
        var $wrap = $elem.wrap('<div/>').parent();
        $wrap.children().replaceWith($wrap.html());
        $elem = $wrap.children();
        $wrap.replaceWith($elem);
        $inner.appendTo($elem);
        return $elem;
    };

    /* AJAX化提交 */
    var $form = $('form#message');
    var $ajax = $('<input>');
    $ajax.attr('type', 'hidden');
    $ajax.attr('name', 'ajax');
    $ajax.val('yes');
    $form.append($ajax);
    $form = $form.removeEvents();
    var $loading = $('.loading', $form);
    $form.submit(function(e) {
		if ($form.attr('target')) return;
        e.preventDefault();
        $loading.css('visibility', 'visible');
        var data = $form.serialize();
        $.post('/home', data, function(data) {
            var $notice = $('<div>');
            if (data.status) {
                $notice.addClass('sysmsg');
            } else {
                $notice.addClass('errmsg');
            }
            $notice.text(data.msg);
            $notice.hide();
            $('#header').append($notice);
            $notice.fadeIn(500).delay(3500).fadeOut(500,
                function() { $(this).remove(); });
            $msg.val('');
            $loading.css('visibility', 'hidden');
        }, 'json');
    });
    $msg = $msg.removeEvents();
    $msg.keypress(function(e) {
        if (e.ctrlKey && e.keyCode == 10)
            $form.submit();
    });
}); 
