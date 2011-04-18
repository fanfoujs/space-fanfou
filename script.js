function addJQuery(callback) {
  var script = document.createElement("script");
  script.setAttribute("src", "http://code.jquery.com/jquery-1.4.4.min.js");
  script.addEventListener('load', function() {
    var script = document.createElement("script");
    script.textContent = "(" + callback.toString() + ")();";
    document.body.appendChild(script);
  }, false);
  
  document.body.appendChild(script);
};

function init() {

// Expanding repies
(function() {
    var $t = function(text) { return document.createTextNode(text); };
    var $c = function(tagname) { return document.createElement(tagname); };
    var $style = $c('style');
    $style.innerHTML = 
        '#stream .buffered + li.reply, #stream li.reply .share { display: none; }' +
        '#stream li.reply { min-height: 38px; padding: 6px 50px 6px 52px; border-left: 3px solid #e5e5e5; font-size: 12px; margin-left: 30px; width: 365px; }' +
        '#stream li.reply.last { border-bottom: 1px solid #e5e5e5; }' +
        '#stream li.reply a.avatar { margin-left: -44px; }' +
        '#stream li.reply a.avatar img { width: 32px; height: 32px; }' +
        '#stream li.reply.more {' + 
            'font-size: 90%; height: 1.5em !important; line-height: 1.5em; margin-left: 70%; margin-top: -1.6em; ' +
            'background: #eee; color: #666; text-align: center; padding: 0; ' +
            'width: 20%; min-height: 0; cursor: pointer; text-shadow: 0 1px 0 white; ' +
            'border-left: none; border-bottom: 1px solid #e5e5e5;' +
        '}' +
        '#stream li.reply.more:hover { background: #e5e5e5; color: #666; }' +
        '#stream li.reply.waiting {' +
            'height: 39px !important; min-height: 0; margin-top: 0; ' +
            'background: url("http://static1.fanfou.com/img/ajax.gif") ' +
            'no-repeat scroll 50% 50% transparent; border: 0; ' +
        '}';
    document.getElementsByTagName('head')[0].appendChild($style);
    var showWaiting = function(e) {
        var $wait = $c('li');
        $wait.className = 'reply waiting';
        $ol.replaceChild($wait, e);
        return $wait;
    };
    var displayReplyList = function(url, before, num) {
        if (num == 0) {
            var $more = $c('li');
            $more.setAttribute('href', url);
            $more.className = 'reply more';
            $more.appendChild($t('继续展开'));
            $ol.insertBefore($more, before);
            $ol.removeChild(before);
            return;
        }
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState != 4) return;
            if (req.status != 200) {
                var $error = $c('li');
                $error.className = 'error';
                $error.appendChild(
                        $t('获取回复时发生错误 ' + req.status));
                $ol.insertBefore($error, before);
                url = '';
                return;
            }
            var content = req.responseText;
            var avatar = /<div id="avatar">(.+?)<\/div>/.exec(content)[1];
            var author_exp = /<h1>(.+?)<\/h1>/g;
            author_exp.lastIndex = content.indexOf('<div id="latest">');
            var author = author_exp.exec(content)[1];
            var content = /<h2>(.+?)<\/h2>/.exec(content);
            if (! content) {
                content = '<strong>此消息已删除</strong>';
                spans = '';
            } else {
                content = content[1];
                var stamp_pos = content.indexOf('<span class="stamp">');
                var spans;
                if (stamp_pos == -1) {
                    content = '<strong>此用户设置了隐私保护</strong>';
                    spans = '';
                } else {
                    spans = content.substring(stamp_pos);
                    content = content.substring(0, stamp_pos);
                }
            }
            var $li = $c('li');
            $li.setAttribute('expended', 'expended');
            $li.className = 'reply unlight';
            $li.innerHTML = avatar + author +
                '<span class="content">' + content + '</span>' + spans;
            $li.addEventListener('mouseover', function() {
                this.className =
                    this.className.replace(/\bunlight\b/, 'light');
            }, true);
            $li.addEventListener('mouseout', function() {
                this.className =
                    this.className.replace(/\blight\b/, 'unlight');
            }, true);
            var $links = $li.getElementsByTagName('a');
            $links[0].className = 'avatar';
            $links[1].className = 'author';
            var $stamp = $li.getElementsByClassName('stamp')[0];
            if (! $stamp) {
                url = '';
            } else {
                var $reply = $stamp.getElementsByClassName('reply');
                if ($reply.length == 0) {
                    url = '';
                } else {
                    $reply = $reply[0];
                    url = $reply.getElementsByTagName('a')[0].href;
                }
            }
            $ol.insertBefore($li, before);
            if (! url) {
                $li.className += ' last';
                $ol.removeChild(before);
            } else {
                displayReplyList(url, before, num - 1);
            }
        };
        req.open('GET', url, true);
        req.send(null);
    };
    var showExpand = function($item) {
        if ($item.hasAttribute('expended')) return;
        var $stamp = $item.getElementsByClassName('stamp')[0];
        if (! $stamp) return;
        var $reply = $stamp.getElementsByClassName('reply')[0];
        if (! $reply) return;
        $item.setAttribute('expended', 'expended');
        var $expand = $c('li');
        $expand.setAttribute('href',
                $reply.getElementsByTagName('a')[0].href);
        $expand.className = 'reply more';
        $expand.appendChild($t('展开回复原文'));
        $ol.insertBefore($expand, $item.nextSibling);
    };
    var processItem = function($item) {
        if (! $item.hasAttribute('href')) {
            showExpand($item);
        } else {
            $item.addEventListener('click', function() {
                var $before = showWaiting(this);
                displayReplyList($item.getAttribute('href'), $before, 3);
            }, true);
        }
    };
    var $ol = document.getElementById('stream').getElementsByTagName('ol')[0];
    var $statuses = $ol.getElementsByTagName('li');
    $ol.addEventListener('DOMNodeInserted',
            function(e) { processItem(e.target); }, false);
    for (var i = 0; i < $statuses.length; ++i)
        showExpand($statuses[i]);
})();

// Image uploading function
(function() {
    if (! document) document = window.document;
    var $t = function(text) { return document.createTextNode(text); }
    var $c = function(tagname) { return document.createElement(tagname); };

    var $style = $c('style');
    $style.innerHTML =
        '#message iframe[name=upload_image] { display: none; }' +
        '#message #u_button { ' +
            'display: inline-block; width: 20px; height: 15px; ' +
            'overflow: hidden; text-decoration: none; cursor: default; ' +
            'vertical-align: middle; margin-left: 4px; margin-top: -1px; ' +
            'background: #fff url(data:image/gif;base64,' +
                'R0lGODlhFAAPAKUBAAAAAP////z+/wDM/wHL/Q' +
                'PN/w/P/xjR/zPW/zbX/z/Z/0LZ/0ja/1fd/1re' +
                '/2Pg/2bg/2/i/4Hm/4ro/43o/5nr/6Xt/8Pz/8' +
                'b0/+H5/+r7//D8/xy0nlrCpCamZTGnYTKjUjqe' +
                'QF2vYTqePTudO0CfQEKhQkmkSU+nT1OoU16vXl' +
                '6uXmGwYWWyZXm8eZfLl53OnaLRoqTSpPj7+P3+' +
                '/f////////////////////////////////////' +
                '///////yH5BAEKAD8ALAAAAAAUAA8AAAaNQMhg' +
                'SCwaI4GkcWk0JAMD53M63USf14ACIZhOMAGrFC' +
                'plJKaXQiOcJU8tSM1hUMiIseNKYeBYDAkdIiMf' +
                'MjRuARRLBB4kJicmJC00VxJMHCQoLAEsKCQwbV' +
                'QBKSYsLgEuLCYpTEUhJ1QnJQ+sQyCkpqiqoVQv' +
                'mJqcJC+7UzMsjY8kKjPDUzQxKyQrMYZBADs=) ' +
                'no-repeat bottom left;' +
        '}' +
        '#message #u_button input { margin-left: -20px; ' +
            'opacity: 0; cursor: pointer; width: 20px; height: 15px; ' +
        '}' +
        '#message #u_filename { vertical-align: top; ' +
            'font-size: 12px; font-weight: normal; margin-left: 5px; ' +
        '}';
    document.getElementsByTagName('head')[0].appendChild($style);
    
    var $message = document.getElementById('message');
    var $h2 = $message.getElementsByTagName('h2')[0];
    var $textarea = $message.getElementsByTagName('textarea')[0];
    var $action = document.getElementsByName('action')[0];
    var $button = $c('a');
    $button.href = 'javascript:;';
    $button.id = 'u_button';
    var $upload = $c('input');
    $upload.type = 'file';
    $upload.name = 'picture';
    $upload.size = 1;
    $button.appendChild($upload);
    $h2.appendChild($button);
    var $file = $c('span');
    $file.id = 'u_filename';
    $h2.appendChild($file);
    $upload.addEventListener('change', function() {
        $file.innerHTML = '';
        $file.appendChild($t($upload.value));
        var $iframe = $c('iframe');
        $iframe.name = 'upload_image';
        $message.appendChild($iframe);
        $photo = $c('input');
        $photo.type = 'hidden';
        $photo.name = 'photo';
        $message.appendChild($photo);
        $textarea.name = 'desc';
        $action.value = 'photo.upload';
        $message.enctype = 'multipart/form-data';
        $message.action = 'http://m.fanfou.com/home';
        $message.target = 'upload_image';
        $message.addEventListener('submit', function() {
            $iframe.addEventListener('load', function() {
                window.location.reload();
            }, true);
        }, false);
    }, false);
})();

};

addJQuery(init);
