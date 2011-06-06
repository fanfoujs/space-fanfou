SF.pl.share_to_fanfou = (function($) {
    var menu_share = null;
    var window_param =
        'toolbar=0,status=0,resizable=0,width=600,height=400';
    return {
        load: function() {
            menu_share = chrome.contextMenus.create({
                title: '分享到饭否',
                contexts: ['page', 'selection'],
                onclick: function(info, tab) {
                    var params = $.param({
                        u: tab.url, t: tab.title, s: 'bm',
                        d: info.selectionText ? info.selectionText: ''
                    });
                    window.open('http://fanfou.com/sharer?' + params,
                                'sharer', window_param);
                }
            });
        },
        unload: function() {
            if (! menu_share) return;
            chrome.contextMenus.remove(menu_share);
            menu_share = null;
        }
    };
})(jQuery);
