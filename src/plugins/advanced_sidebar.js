SF.pl.advanced_sidebar = new SF.plugin((function($) {
    var $info = $('#user_infos');
    if (! $info.length) return;
    var $vcard = $('.vcard', $info);
    if (! $vcard.length) return;

    var userid = $('meta[name=author]').attr('content');
    userid = /\((.+)\)/.exec(userid)[1];

    var $script;

    return {
        'load': function() {
            SF.cb.advanced_sidebar = function(data) {
                SF.cb.advanced_sidebar = undefined;
                var created = new Date(data.created_at);
                created = SF.fn.formateDate(created);
                $vcard.prepend(
                    $('<li />').addClass('advanced')
                               .text('注册于：' + created)
                );
            };
            $script = $('<script />').attr('src',
                'http://api.fanfou.com/users/show.json?id=' +
                encodeURIComponent(userid) + 
                '&callback=SF.cb.advanced_sidebar');
            $script.appendTo('body');
        },
        'unload': function() {
            SF.cb.advanced_sidebar = undefined;
            if ($script) {
                $script.remove();
                $script = null;
            }
        }
    };
})(jQuery));
