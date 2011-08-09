SF.pl.privatemsg_manage = new SF.plugin((function($) {
    if (! $('#main.privatemsg').length)
        return;
    
    var $li = $('#stream li');

    var $manage = $('<div>');
    $manage.addClass('batch-manage');
    var $del = $('<a>删除选定</a>');
    $del.addClass('delete');
    $del.attr('href', '#');
    $del.click(function(evt) {
        evt.preventDefault();
        var $todel = $('#stream li input[type=checkbox]:checked');
        if (! $todel.length) return;
        if (! confirm('确定要删除选定的' + $todel.length + '条私信吗？'))
            return;
        $todel.each(function() {
            var $t = $(this);
            var $del = $t.parent().find('a.delete');
            $.ajax({
                type: 'POST',
                url: location.href,
                data: {
                    action: 'privatemsg.del',
                    privatemsg: $t.attr('msgid'),
                    token: $del.attr('token'),
                    ajax: 'yes',
                },
                dataType: 'json',
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                success: function(data) {
                    if (data.status) {
                        FF.util.yFadeRemove($del.get(0), 'li');
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
        if ($all.is(':checked')) {
            $chks.attr('checked', 'checked');
        } else {
            $chks.removeAttr('checked');
        }
    });
    $manage.append($del).append($all);
    
    $('#stream ol').change(function(evt) {
        if (! evt.target.checked)
            $all.removeAttr('checked');
    });

    return {
        load: function() {
            $li.each(function() {
                var $chk = $('<input>');
                $chk.attr('type', 'checkbox');
                var msgid = $('>.op>a', this).attr('href').split('/').pop();
                $chk.attr('msgid', msgid);
                $chk.appendTo(this);
            });
            $manage.appendTo('#main .tabs');
        },
        unload: function() {
            $('#stream li input[type=checkbox]').remove();
            $manage.detach();
        }
    };
})(jQuery));
