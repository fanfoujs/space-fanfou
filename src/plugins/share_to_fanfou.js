SF.pl.share_to_fanfou = new SF.plugin((function() {
  var menu_share = null;

  function onClick(info, tab) {
    var select = info.selectionText;
    var encode = encodeURIComponent;
    window.open('http://fanfou.com/sharer?' +
          'u=' + encode(tab.url) +
          '&t=' + encode(tab.title) +
          '&s=bm' +
          '&d=' + encode(select ? select : ''),
          'sharer',
          'toolbar=0,status=0,resizable=0,width=630,height=400');
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
