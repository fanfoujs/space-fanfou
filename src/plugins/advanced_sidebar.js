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
                var regDuration = Math.round((new Date() - created) /
                                             (1000 * 3600 * 24));
                var regYear = Math.round(regDuration / 365);
                var regMonth = Math.round((regDuration - regYear * 365) / 30);
                var duration = (regYear > 0 || regMonth > 0 ? '约 ' : '') +
                    (regYear > 0 ? regYear + ' 年' +
                     (regMonth > 0 ? '零 ' + regMonth + ' 个月' : '') :
                     (regMonth > 0 ? regMonth + ' 个月' : ' 不足一个月'));
                var statusFreq = (data.statuses_count / regDuration).toFixed(2); // TODO: 以下全部整合进一个下拉栏里。
                $vcard
                .append(
                    $('<li />').addClass('advanced')
                               .text('注册于 ' + SF.fn.formatDate(created))
                       )
                .append(
                    $('<li />').addClass('advanced')
                               .html('饭龄：' + duration + '（' + regDuration + ' 天）' +
                                   '<div class="statbar"><div style="width:' + (regDuration / 20) + '%;"></div></div>') // TODO: 以 @王兴 为 100%
                       )
                .append(
                    $('<li />').addClass('advanced')
                               .html('饭量：平均 ' + statusFreq + ' 条消息 / 天' +
                                   '<div class="statbar"><div style="width:' + (statusFreq / 1.5) + '%;"></div></div>') // TODO: 以 @苹果流冰 为 100%
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
