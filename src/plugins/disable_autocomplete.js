SF.pl.disable_autocomplete = new SF.plugin((function($) {
    if (location.pathname != '/home')
        return new SF.plugin();
    var $content = $('textarea[name="content"]');
    return {
        load: function() {
            SF.fn.waitFor(function() {
                return $content.autocomplete('option', 'disabled') === false;
            }, function() {
                $content.autocomplete('disable');
            });
        },
        unload: function() {
            $content.autocomplete('enable');
        }
    };
})(jQuery));
