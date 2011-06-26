/* 全局支持回复全部 */

(function($) {

    /* 自动选择 */

    var $msg = $('#update textarea');
    if ($msg.length && location.search.match(/\bstatus=/)) {
        var text = $msg.val();
        var msg = $msg[0];
        if (text[0] == '转') {
            msg.setSelectionRange(0, 0);
        } else if (text[0] != '@') {
            msg.setSelectionRange(text.length, text.length);
        } else {
            var at_names = text.split(' ');
            if (at_names.length > 1) {
                var start_pos = at_names[0].length + 1;
                var end_pos = start_pos;
                for (var i = 1; i < at_names.length; ++i) {
                    if (at_names[i][0] != '@')
                        break;
                    end_pos += at_names[i].length + 1;
                }
                msg.setSelectionRange(start_pos, end_pos);
            }
        }
    }
    
    /* 将回复链接全部处理为回复到所有 */
    
    function changeHref($item) {
        if (! $item.is('li')) return;
        if ($item.attr('replytoall')) return;
        var $formers = $('>.content>a.former', $item);
        if (! $formers.length) return;

        var myurl = $('#navigation li>a').eq(1).attr('href');
        var $reply = $('>.op>a.reply', $item);
        var ffname = $reply.attr('ffname');
        var msg = '@' + ffname + ' ';
        var at_ed = { };
        at_ed[ffname] = true;
        $formers.each(function() {
            if ($(this).attr('href') == myurl) return;
            var name = $(this).text();
            if (at_ed[name] !== true) {
                msg += '@' + name + ' ';
                at_ed[name] = true;
            }
        });
        $reply.attr('href', '/home?' + $.param({
            status: msg,
            in_reply_to_status_id: $reply.attr('ffid')
        }));
        $item.attr('replytoall', true);
    }
    function processStream($ol) {
        $ol.bind('DOMNodeInserted',
                function(e) { changeHref($(e.target)); });
        $('>li', $ol).each(function() { changeHref($(this)); });
    }
    $('#stream').bind('DOMNodeInserted',
            function(e) { processStream($(e.target)); });
    processStream($('#stream>ol'));

})(jQuery);
