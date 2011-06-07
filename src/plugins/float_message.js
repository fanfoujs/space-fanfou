SF.pl.float_message = (function($, $Y) {
    var $update = $('#update');
    if (! $update.length) return SF.empty_pl;

    /* 处理悬浮 */
    var $main = $('#main');
    var $win = $(window);
    var ud_top = $update.offset().top -11;
    var main_padtop = $main.css('padding-top');
    function resetFloat() {
        $update.removeClass('float-message');
        $main.css('padding-top', main_padtop);
    }
    function onWinScroll() {
        if ($win.scrollTop() <= ud_top) {
            resetFloat();
        } else {
            $update.addClass('float-message');
            $main.css('padding-top',
                      ($update.outerHeight() + parseInt(main_padtop)) +
                       -16 +'px');
        }
    }

    /* 重载事件 */
    var myurl = $('#navigation li>a').eq(1).attr('href');
    var $ol = $('#stream ol');
    var $form = $('form#message', $update);
    var $msg = $('textarea', $update);
    var padding = parseInt($msg.css('padding-top'));
    var $in_reply = $('[name=in_reply_to_status_id]', $update);
    var $repost = $('[name=repost_status_id]', $update);
    function onReplyClick(e) {
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
    }
    function onRepostClick(e) {
        e.preventDefault();
        $in_reply.val('');
        var $t = $(this);
        $repost.val($t.attr('ffid'));
        var old_msg = $msg.val();
        $msg.val(old_msg + $t.get(0).getAttribute('text'));
        $msg.get(0).setSelectionRange(old_msg.length, old_msg.length);
        $msg.focus();
    }

    /* 备份相关事件 */
    var $E = $Y.util.Event;
    var msg_keyup = $E.getListeners($msg[0], 'keyup');
    var update_submit = $E.getListeners($form[0], 'submit');
    var backup = {
        msg_keyup: msg_keyup ? msg_keyup[0].fn : null,
        update_submit: update_submit ? update_submit[0].fn : null
    };

    /* AJAX化提交 */
    var $loading = $('.loading', $form);
    function onFormSubmit(e) {
		if ($form.attr('target')) return;
        e.preventDefault();
        $loading.css('visibility', 'visible');
        var data = $form.serialize() + '&ajax=yes';
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
        return false;
    }
    function onMsgKeyup(e) {
        if (e.ctrlKey && (e.keyCode == 10 || e.keyCode == 13)) {
            $(this).blur();
            $form.submit();
            return false;
        }
    }

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

    return {
        load: function() {
            // 添加悬浮
            $win.scroll(onWinScroll);
            // 清理按钮事件
            var $items = $('>li', '.wa');
            $('>span.op>a.reply', $items).die('click');
            $('>span.op>a.repost', $items).die('click');
            // 重载事件
            $('>span.op>a.reply', $items).live('click', onReplyClick);
            $('>span.op>a.repost', $items).live('click', onRepostClick);
            // 清除原有事件
            if (backup.msg_keyup)
                $E.removeListener($msg[0], 'keyup', backup.msg_keyup);
            if (backup.update_submit)
                $E.removeListener($form[0], 'submit', backup.update_submit);
            // AJAX 化提交
            $form.submit(onFormSubmit);
            $msg.keyup(onMsgKeyup);
            // 设置样式调节
            interval = setInterval(onInterval, 50);
            $msg.focus(onMsgFocus);
        },
        unload: function() {
            // 取消悬浮
            $win.unbind('scroll', onWinScroll);
            resetFloat();
            // 清除绑定的事件
            var $items = $('>li', '.wa');
            $('>span.op>a.reply', $items).die('click');
            $('>span.op>a.repost', $items).die('click');
            // 恢复按钮事件
            $('#PopupClose', '#PopupBox').unbind('click');
            $('body').unbind('keydown');
            $('#PopupForm').unbind('keydown');
            $('#PopupForm').unbind('submit');
            FF.app.QuickReply();
            FF.app.Repost();
            // 回退 AJAX 化提交
            $form.unbind('submit', onFormSubmit);
            $msg.unbind('keypress', onMsgKeyup);
            // 恢复原有事件
            if (backup.msg_keyup)
                $E.on($msg[0], 'keyup', backup.msg_keyup);
            if (backup.update_submit)
                $E.on($form[0], 'submit', backup.update_submit);
            // 删除样式调节
            clearInterval(interval);
            interval = 0;
            $msg.unbind('focus', onMsgFocus);
        }
    };
})(jQuery, YAHOO);
