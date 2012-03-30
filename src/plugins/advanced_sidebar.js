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
                var bgImage = data.profile_background_image_url;
                var regDuration = Math.floor((new Date() - created) /
                                             (1000 * 3600 * 24));
                var regYear = Math.floor(regDuration / 365.2425);
                var regMonth = Math.floor(
                    (regDuration - regYear * 365.2425) / 30.4369);
                var duration = (regYear > 0 || regMonth > 0 ? '约 ' : '') +
                    (regYear > 0 ? regYear + ' 年' +
                     (regMonth > 0 ? '零 ' + regMonth + ' 个月' : '') :
                     (regMonth > 0 ? regMonth + ' 个月' :
                      (regDuration >= 7 ? '不足一个月' :
                       (regDuration > 0 ? '不足一周' : '刚来不到一天'))));
                // 从饭否出现开始计算
                var sinceFanfouStart = Math.round(
                        (new Date() - new Date(2007, 4, 12)) /
                        (1000 * 3600 * 24))
                var statusFreq =
                    (data.statuses_count /
                     (regDuration -
                      (created < new Date(2009, 6, 8) ? 505 : 0)))
                     .toFixed(2);
                if (statusFreq == Infinity)
                    statusFreq = data.statuses_count;
                // TODO: 以下全部整合进一个下拉栏里。
                $vcard
                .append(
                    $('<li />').addClass('advanced')
                    .text('注册于 ' + SF.fn.formatDate(created))
                    )
                .append(
                    $('<li />').addClass('advanced')
                    .text('饭龄：' + duration +
                        ' (' + regDuration + ' 天)')
                    .append(
                        $('<div />')
                        .addClass('statbar')
                        .append(
                            $('<div />').width(
                                (regDuration / sinceFanfouStart * 100) + '%')
                            )
                       )
                    )
                .append(
                    // 这里以300条为基准，目前看到的最多的是傻妹 290+
                    $('<li />').addClass('advanced')
                               .text('饭量：平均 ' +
                                   statusFreq + ' 条消息 / 天')
                               .append(
                                   $('<div />')
                                   .addClass('statbar')
                                   .append(
                                       $('<div />').width(
                                           (statusFreq / 3) + '%')
                                       )
                                   )
                       );
                if (data.protected) {
                    $vcard.append(
                        $('<li />').addClass('advanced protected')
                                   .text('设置了隐私保护') // TODO: 是否需要这玩意儿？
                            );
                } else {
                    $vcard.append(
                        $('<li />').addClass('advanced notprotected')
                                   .text('没有设置隐私保护')
                            );
                }
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
            $('.advanced', $vcard).remove();
        }
    };
})(jQuery));
