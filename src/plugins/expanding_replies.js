SF.pl.expanding_replies = new SF.plugin((function($) {
    var $stream = $('#stream');
    if (! $stream.length) return;

    var replies_number;
    var auto_expand;

    var MSG_DELETED = '已删除';
    var MSG_NOPUBLIC = '不公开';
    
    function showWaiting($e) {
        var $wait = $('<li>');
        $wait.addClass('reply waiting');
        var id = 'waiting_' + Math.random().toString().slice(2);
        $wait.attr('id', id);
        $e.replaceWith($wait);
        return id;
    }

    function displayReplyList(url, before, num, type) {
        if (num == 0) {
            var $more = $('<li>');
            $more.attr('href', url);
            $more.addClass('reply more');
            $more.text('继续展开');
            var $before = $('#' + before);
            $more.insertBefore($before);
            $before.remove();
            return;
        }
        $.get(url, function(data) {
            var $before = $('#' + before);
            var avatar = /<div id="avatar">(.+?)<\/div>/.exec(data)[1];
            var author_exp = /<h1>(.+?)<\/h1>/g;
            author_exp.lastIndex = data.indexOf('id="latest"');
            var author = author_exp.exec(data)[1];
            var content = /<h2>([\s\S]+?)<\/h2>/.exec(data);
            var avail = false;
            if (! content) {
                content = MSG_DELETED;
                spans = '';
            } else {
                content = content[1];
                var stamp_pos = content.indexOf('<span class="stamp">');
                var spans;
                if (stamp_pos == -1) {
                    content = MSG_NOPUBLIC;
                    spans = '';
                } else {
                    spans = content.substring(stamp_pos);
                    content = content.substring(0, stamp_pos);
                    spans = spans.replace('redirect="/home" ', '');
                    avail = true;
                }
            }
            var $li = $('<li>');
            if (avail) {
                $li.attr('expended', 'expended');
                $li.addClass('reply unlight');
                $li.html(avatar + author +
                    '<span class="content">' + content + '</span>' + spans);
                FF.app.Stream.attach($li[0]);
                if (content.indexOf('<img '))
                    FF.app.Zoom.init($li[0]);
                var $links = $('a', $li);
                $links.eq(0).addClass('avatar');
                $links.eq(1).addClass('author');
                var $stamp = $('.stamp', $li);
                if (! $stamp.length) {
                    url = '';
                } else {
                    var $reply = $('.reply', $stamp);
                    if ($reply.length == 0) {
                        url = '';
                    } else {
                        url = $('a', $reply).attr('href');
                    }
                }
                if (type) {
                    var $hide_replies = $('<li>');
                    $hide_replies.addClass('reply hide');
                    $hide_replies.attr('expended', 'expended');
                    $hide_replies.text('隐藏原文');
                    $hide_replies.insertBefore($before);
                }
                $li.insertBefore($before);
                if (! url) {
                    $li.addClass('last');
                    $before.remove();
                } else {
                    displayReplyList(url, before, num - 1);
                }
            } else {
                $li.addClass('reply notavail');
                $li.attr('href', url);
                $li.text(content);
                $before.replaceWith($li);
            }
        });
    }

    function showExpand($item) {
        if ($item.attr('expended')) return;
        var $reply = $('.stamp .reply', $item);
        if (! $reply.length) return;
        $item.attr('expended', 'expended');
        var $expand = $('<li>');
        var $link = $('a', $reply);
        if ($link.html().indexOf('转自') == 0)
            $expand.attr('type', '转发');
        else
            $expand.attr('type', '回复');
        $expand.attr('href', $link.attr('href'));
        $expand.addClass('reply more first');
        if ($link.html().indexOf('转自') == 0)
            $expand.text('转自');
        else
            $expand.text('展开');
        $expand.insertAfter($item);
        if (auto_expand) {
            displayReplyList($expand.attr('href'),
                showWaiting($expand), 1, $item.attr('type'));
        }
    }

    function hideReplyList() {
        var $t = $(this);
        $t.hide();
        var $item = $t.prev();
        $item.removeAttr('expended');
        showExpand($item);
        for (var $i = $t.next(); $i.hasClass('reply'); $i = $i.next())
            $t = $t.add($i);
        $t.removeAttr('expended');
        $t.remove();
    }

    function processItem($item) {
        if (! $item.is('li')) return;
        if ($item.hasClass('reply hide')) {
            $item.click(hideReplyList);
        } else if (! $item.attr('href')) {
            showExpand($item);
        } else if (! $item.hasClass('notavail')) {
            $item.click(function() {
                var $t = $(this);
                displayReplyList($item.attr('href'),
                    showWaiting($t), replies_number,
                    $t.hasClass('first') ? $item.attr('type') : false);
            });
        }
    }

    function removeReplies($item) {
        if (! $item.attr('expended')) return;
        var $replies = [];
        for (var $i = $item.next('.reply'); $i.is('.reply'); $i = $i.next())
            $replies.push($i);
        var $prev;
        if ($item.hasClass('reply')) {
            $prev = $item.prev();
            if ($prev.hasClass('hide'))
                $prev.fadeOut();
        }
        function fadeOut() {
            if (! $replies.length) {
                if ($prev) {
                    var $deleted = $('<li>');
                    $deleted.addClass('reply notavail');
                    $deleted.text(MSG_DELETED);
                    if ($prev.hasClass('hide')) {
                        $prev.replaceWith($deleted);
                    } else {
                        $prev.after($deleted);
                    }
                }
                return;
            }
            var $i = $replies.shift();
            $i.fadeOut(function() {
                fadeOut();
                $i.removeAttr('expended');
                $item.remove();
            });
        }
        fadeOut();
    }

    function onDOMNodeInserted(e) {
        processItem($(e.target));
    }

    function onDOMNodeRemoved(e) {
        removeReplies($(e.target));
    }

    function processStream($ol) {
        $ol.bind('DOMNodeInserted', onDOMNodeInserted);
        $('li', $ol).each(function() { showExpand($(this)); });
        $ol.bind('DOMNodeRemoved', onDOMNodeRemoved);
    }

    function onStreamInserted(e) {
        processStream($(e.target));
    }

    return {
        update: function(number, is_auto_expand) {
            replies_number = number;
            auto_expand = is_auto_expand;
        },
        load: function() {
            $stream.bind('DOMNodeInserted', onStreamInserted);
            processStream($('>ol', $stream));
        },
        unload: function() {
            $stream.unbind('DOMNodeInserted', onStreamInserted);
            var $ol = $('>ol', $stream);
            if (! $ol.length) return;
            $ol.unbind('DOMNodeInserted', onDOMNodeInserted);
            $ol.unbind('DOMNodeRemoved', onDOMNodeRemoved);
            $('li.reply', $ol).remove();
            $('li[expended]', $ol).removeAttr('expended');
        }
    };
})(jQuery));
