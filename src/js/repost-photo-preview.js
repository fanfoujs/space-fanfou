(function() {
    var $ol = $('#stream ol');
    var r_img = /<img src="(http:\/\/photo\.fanfou\.com\/n[^\.]+\.jpg)"/;
    var processItem = function($item) {
        var $content = $('>.content', $item);
        if ($('>a.photo', $content).length) return;
        var $image = $('a[href^="http://fanfou.com/photo/"]', $content);
        if (! $image.length) return;
        $.get($image.attr('href'), function(data) {
            var photo = r_img.exec(data);
            if (! photo) return;
            var src = photo[1];
            var preview = src.substring(0, 24) + 'm' + src.substring(25);
            var $a = $('<a>');
            $a.attr('href', src);
            $a.addClass('photo zoom');
            var $img = $('<img>');
            $img.attr('src', preview);
            $a.append($img);
            $a.append($('<span>'));
            $content.prepend($a);
            if (! $item.attr('id'))
                $item.attr('id', 'status-' + Math.random());
            location.assign('javascript: FF.app.Zoom.init(' + 
                            'document.getElementById("' +
                            $item.attr('id') + '"));');
        });
    };
    $ol.bind('DOMNodeInserted', 
        function(e) { processItem($(e.target)); });
    $('li', $ol).each(function() { processItem($(this)); });
})();
