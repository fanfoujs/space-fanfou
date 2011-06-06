(function() {
    var interval = setInterval(function() {
        if (jQuery && FF) {
            clearInterval(interval);
            var $ = jQuery;
            var $meta = $('<meta>');
            $meta.attr('name', 'spacefanfou-flags');
            $meta.attr('content', 'libs_ok');
            $meta.attr('id', 'sf_flag_libs_ok');
            $('head').append($meta);
        }
    }, 200);
})();
