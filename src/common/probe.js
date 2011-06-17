(function() {
    function setWaiting() {
        setTimeout(function() {
            if (! window.jQuery || ! window.YAHOO || ! window.FF) {
                setWaiting();
            } else {
                var $ = jQuery;
                var $meta = $('<meta>');
                $meta.attr('name', 'spacefanfou-flags');
                $meta.attr('content', 'libs_ok');
                $meta.attr('id', 'sf_flag_libs_ok');
                $('head').append($meta);
            }
        }, 200);
    }
    setWaiting();
})();
