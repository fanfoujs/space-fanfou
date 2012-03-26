SF.pl.friend_manage = new SF.plugin((function($) {
    if (!$('div#friends>.tabs').length)
        return;
    
    var $li = $('#stream li');
    var $manage = $('<div>');
    $manage.addClass('batch-manage actions');
    var $unfo = $('<a>取消关注选定</a>');
    $unfo.addClass('friend-remove');
    $unfo.attr('href', '#');
    $unfo.click(function(evt) {
        evt.preventDefault();
        var $tounfo = $('#stream li input[type=checkbox]:checked');
        if (!$tounfo.length) return;
        if (!confirm('确定要取消关注选定的' + $tounfo.length + '个人吗？'))
            return;
        $tounfo.each(function() {
            var $t = $(this);
            var $unfo = $t.parent().find('a.friend-remove');
            $.ajax({
                type: 'POST',
                url: location.href,
                data: {
                    action: 'friend.remove',
                    friend: $t.attr('userid'),
                    token: $unfo.attr('token'),
                    ajax: 'yes',
                },
                dataType: 'json',
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                success: function(data) {
                    if (data.status) {
                        FF.util.yFadeRemove($unfo.get(0), 'li');
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
    $manage.append($unfo).append($all);

    $('#stream ol').change(function(evt) {
        if (!evt.target.checked)
            $all.removeAttr('checked');
    });

    return {
        load: function() {
            $li.each(function() {
                var $chk = $('<input>');
                $chk.attr('type', 'checkbox');
                var userid = $('>.actions>.friend-remove', this).attr('href').split('/').pop();
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
