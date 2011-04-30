// 太空饭否脚本页

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
    var $inputs = $message.getElementsByTagName('input');
    var $action;
    for (var i = 0; i < $inputs.length; ++i) {
        if ($inputs[i].name == 'action') {
            $action = $inputs[i];
            break;
        }
    }
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
