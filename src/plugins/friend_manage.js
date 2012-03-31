SF.pl.friend_manage = new SF.plugin((function($) {
    if (!$('div#friends>.tabs').length)
        return;
    var pageUrl = $('.tabs>a.crumb').attr('href');
    var myPageUrl = $('#navigation ul>li:nth-child(2)>a').attr('href');
    if (pageUrl.split('/').pop() != myPageUrl.split('/').pop())
        return;
    
    var isFriend = $('.tabs li.current').is(':first-child');
    
    var $li = $('#stream li');
    var $manage = $('<div>');
    $manage.addClass('batch-manage actions');
    var $del = isFriend ? $('<a>取消关注选定</a>') : $('<a>删除选定用户</a>');
    $del.addClass('friend-remove');
    $del.attr('href', '#');
    $del.click(function(evt) {
        evt.preventDefault();
        var $todel = $('#stream li input[type=checkbox]:checked');
        if (!$todel.length) return;
        var text = isFriend ? '取消关注' : '删除';
        if (!confirm('确定要' + text + '选定的' + $todel.length + '个人吗？'))
            return;
        $todel.each(function() {
            var $t = $(this);
            var $post_act = $t.parent().find('a.post_act');
            var data = {
                action: isFriend ? 'friend.remove' : 'follower.remove',
                token: $post_act.attr('token'),
                ajax: 'yes',
            };
            if (isFriend) {
                data.friend = $t.attr('userid');
            } else {
                data.follower = $t.attr('userid');
            }
            $.ajax({
                type: 'POST',
                url: location.href,
                data: data,
                dataType: 'json',
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                success: function(data) {
                    if (data.status) {
                        FF.util.yFadeRemove($post_act.get(0), 'li');
                    } else {
                        alert(data.msg);
                    }
                },
            });
        });
    });

    var $all = $('<input>');
    $all.attr('type', 'checkbox');
    $all.change(function() {
        var $chks = $('#stream li input[type=checkbox]');
        $chks.attr('checked', $all.is(':checked'));
    });
    $manage.append($del).append($all);

    $('#stream ol').change(function(evt) {
        if (!evt.target.checked)
            $all.removeAttr('checked');
    });

    return {
        load: function() {
            $li.each(function() {
                var $chk = $('<input>');
                $chk.attr('type', 'checkbox');
                var userid = $('>a.name', this).attr('href').split('/').pop();
                $chk.attr('userid', userid);
                $chk.appendTo(this);
            });
            $manage.insertAfter('#friends h2');
        },
        unload: function() {
            $('#stream li input[type=checkbox]').remove();
            $manage.detach();
        }
    };
})(jQuery));
