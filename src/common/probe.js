(function() {
    SF.fn.waitFor(function() {
        return window.jQuery && window.YAHOO && window.FF;
    }, function() {
        var $ = jQuery;
        var $meta = $('<meta>');
        $meta.attr('name', 'spacefanfou-flags');
        $meta.attr('content', 'libs_ok');
        $meta.attr('id', 'sf_flag_libs_ok');
        $('head').append($meta);
    });
})();
