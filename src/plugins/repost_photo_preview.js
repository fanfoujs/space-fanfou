SF.pl.repost_photo_preview = new SF.plugin((function($) {
    var $ol = $('#stream ol');
    if (! $ol.length) return;
    var r_img = /<img src="(http:\/\/photo\.fanfou\.com\/n[^\.]+\.jpg)"/;
    var item_list = [];
    function processItem($item) {
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
            FF.app.Zoom.init($item[0]);
            item_list.push($item);
        });
    }
    function onDOMNodeInserted(e) {
        processItem($(e.target));
    }
    return {
        load: function() {
            $ol.bind('DOMNodeInserted', onDOMNodeInserted);
            $('li', $ol).each(function() { processItem($(this)); });
        },
        unload: function() {
            $ol.unbind('DOMNodeInserted', onDOMNodeInserted);
            for (var i = 0; i < item_list.length; ++i) {
                var $item = item_list[i];
                $('.photo.zoom', $item).remove();
            }
            item_list = [];
        }
    };
})(jQuery));
