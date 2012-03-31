SF.pl.disable_autocomplete = new SF.plugin((function($) {
    var $content = $('textarea[name="content"]');
    if (! $content.length) return;
    return {
        load: function() {
            SF.fn.waitFor(function() {
                return $content.autocomplete &&
                    $content.autocomplete('option', 'disabled') === false;
            }, function() {
                $content.autocomplete('disable');
            });
        },
        unload: function() {
            $content.autocomplete('enable');
        }
    };
})(jQuery));
