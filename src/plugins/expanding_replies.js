SF.pl.expanding_replies = (function($) {
    var $ol = $('#stream ol');
    if (! $ol.length) return SF.empty_pl;

    var replies_number;

    function showWaiting($e) {
        var $wait = $('<li>');
        $wait.addClass('reply waiting');
        $e.replaceWith($wait);
        return $wait;
    }

    function displayReplyList(url, $before, num) {
        if (num == 0) {
            var $more = $('<li>');
            $more.attr('href', url);
            $more.addClass('reply more');
            $more.text('继续展开');
            $more.insertBefore($before);
            $before.remove();
            return;
        }
        $.get(url, function(data) {
            var avatar = /<div id="avatar">(.+?)<\/div>/.exec(data)[1];
            var author_exp = /<h1>(.+?)<\/h1>/g;
            author_exp.lastIndex = data.indexOf('<div id="latest">');
            var author = author_exp.exec(data)[1];
            var content = /<h2>([\s\S]+?)<\/h2>/.exec(data);
            if (! content) {
                content = '<strong>此消息已删除</strong>';
                spans = '';
            } else {
                content = content[1];
                var stamp_pos = content.indexOf('<span class="stamp">');
                var spans;
                if (stamp_pos == -1) {
                    content = '<strong>此用户设置了隐私保护</strong>';
                    spans = '';
                } else {
                    spans = content.substring(stamp_pos);
                    content = content.substring(0, stamp_pos);
                }
            }
            var $li = $('<li>');
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
            if (! $stamp.size()) {
                url = '';
            } else {
                var $reply = $('.reply', $stamp);
                if ($reply.size() == 0) {
                    url = '';
                } else {
                    url = $('a', $reply).attr('href');
                }
            }
            $li.insertBefore($before);
            if (! url) {
                $li.addClass('last');
                $before.remove();
            } else {
                displayReplyList(url, $before, num - 1);
            }
        });
    }

    function showExpand($item) {
        if ($item.attr('expended')) return;
        var $reply = $('.stamp .reply', $item);
        if (! $reply.size()) return;
        $item.attr('expended', 'expended');
        var $expand = $('<li>');
        $expand.attr('href', $('a', $reply).attr('href'));
        $expand.addClass('reply more first');
        $expand.text('展开回复原文');
        $expand.insertAfter($item);
    }

    function hideReplyList() {
        var $t = $(this);
        $t.hide();
        var $item = $t.prev();
        $item.removeAttr('expended');
        showExpand($item);
        for (var $i = $t.next(); $i.hasClass('reply'); $i = $i.next())
            $t = $t.add($i);
        $t.remove();
    }

    function processItem($item) {
        if (! $item.is('li')) return;
        if (! $item.attr('href')) {
            showExpand($item);
        } else {
            $item.click(function() {
                var $t = $(this);
                var $before = showWaiting($t);
                if ($t.hasClass('first')) {
                    var $hide_replies = $('<li>');
                    $hide_replies.addClass('reply hide');
                    $hide_replies.attr('expended', 'expended');
                    $hide_replies.text('隐藏回复原文');
                    $hide_replies.insertBefore($before);
                    $hide_replies.click(hideReplyList);
                }
                displayReplyList($item.attr('href'), $before, replies_number);
            });
        }
    }

    return {
        update: function(number) {
            replies_number = number;
        },
        load: function() {
            $ol.bind('DOMNodeInserted',
                     function(e) { processItem($(e.target)); });
            $('li', $ol).each(function() { showExpand($(this)); });
        },
        unload: function() {
            $('li.reply', $ol).fadeOut();
            $('li[expended]', $ol).removeAttr('expended');
        }
    };
})(jQuery);
