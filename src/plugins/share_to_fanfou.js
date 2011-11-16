SF.pl.share_to_fanfou = new SF.plugin((function() {
    var menu_share = null;
    var share_script = "var d=document,w=window,l=d.location,e=encodeURIComponent,p='?u='+e(l.href)+'&t='+e(d.title)+'&d='+e(w.getSelection?w.getSelection().toString():d.getSelection?d.getSelection():d.selection.createRange().text)+'&s=bm';w.open('http://fanfou.com/sharer'+p,'sharer','toolbar=0,status=0,resizable=0,width=600,height=400');void(0)";

    function onClick(info, tab) {
        chrome.tabs.executeScript(tab.id, { code: share_script });
    }

    return {
        load: function() {
            menu_share = chrome.contextMenus.create({
                title: '分享到饭否',
                contexts: ['page', 'selection'],
                onclick: onClick
            });
        },
        unload: function() {
            if (! menu_share) return;
            chrome.contextMenus.remove(menu_share);
            menu_share = null;
        }
    };
})());
