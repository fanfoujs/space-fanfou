SF.pl.float_message = new SF.plugin((function($, $Y) {
    var $main = $('#main');
    if ($main.hasClass('privatemsg')) return;
    var $update = $('>#update', $main);
    if (! $update.length) return;
    var noajaxattop = false;

    /* 处理悬浮 */
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
    var $popup = $('#PopupBox');
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
        history.replaceState({ msg: $msg.val(), reply: $in_reply.val() }, null,
                location.pathname +
                '?status=' + encodeURIComponent($msg.val()) +
                '&in_reply_to_status_id=' + $in_reply.val());
        return false;
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
        history.replaceState({ msg: $msg.val(), repost: $repost.val() }, null,
                location.pathname +
                '?status=' + encodeURIComponent($msg.val()) +
                '&repost_status_id=' + $repost.val());
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

    /* AJAX化提交 */
    var $loading = $('.loading', $form);
    function onFormSubmit(e) {
        $loading.css('visibility', 'visible');
        if ($form.attr('target')) return;
        if (noajaxattop && $update.is(':not(.float-message)')) return;
        e.preventDefault();
        var data = $form.serialize() + '&ajax=yes';
        $.post('/home', data, function(data) {
            var $notice = $('<div>');
            if (data.status) {
                $notice.addClass('sysmsg');
                $msg.val('');
            } else {
                $notice.addClass('errmsg');
            }
            $notice.text(data.msg);
            $notice.hide();
            $('#header').append($notice);
            $notice.fadeIn(500).delay(3500).fadeOut(500,
                function() { $(this).remove(); });
            $loading.css('visibility', 'hidden');

            // 清理网址后面不必要的残余部分
            if (data.status && location.search) {
                var q = location.search;
                var match = q.match(/\bstatus=([^&]+)/);
                if (match) {
                    var text = decodeURIComponent(match[1]);
                    match = text.match(/^(转?)(@[^\+]+)/);
                    var state = { msg: text.replace('+', ' ') };
                    if (match[1]) {
                        var repost = q.match(/\brepost_status_id=([^&]+)/);
                        if (repost) state['repost'] = repost[1];
                    } else {
                        var reply = q.match(/\bin_reply_to_status_id=([^&]+)/);
                        if (reply) state['reply'] = reply[1];
                    }
                    q = q.replace(/\b(status|in_reply_to_status_id|repost_status_id)=[^&]+&?/g, '');
                    if (q == '?') q = '';
                    history.pushState(state, null, location.pathname + q);
                }
            }
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

    /* 历史记录 */
    // 历史记录不在禁用时关闭是为了已经加入的历史可以被正确处理
    window.onpopstate = function(e) {
        var state = e.state;
        if (! state) return;
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

    return {
        update: function(is_noajaxattop) {
            noajaxattop = is_noajaxattop;
        },
        load: function() {
            // 添加悬浮
            $win.scroll(onWinScroll);
            // 清理按钮事件
            var $items = $('>li', '.wa');
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
            $('body').unbind('keydown');
            $('#PopupClose', '#PopupBox').unbind('click');
            $('#PopupForm').unbind('keydown');
            $('#PopupForm').unbind('submit');
            $popup.appendTo('body');
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
})(jQuery, YAHOO));
