SF.pl.clean_personal_theme = new SF.plugin((function($) {
    if (! SF.fn.isUserPage()) return;

    var default_style = 
            'body{background-color:#acdae5;' + 
            'background-image:url(http://static.fanfou.com/img/bg/0.png);' +
            'background-repeat:no-repeat;background-attachment:fixed;' +
            'background-position:top left;color:#222222}' +
            'a,#sidebar a:hover,.pagination .more:hover,.stamp a:hover,' +
            '.light .stamp a{color:#0066cc}' +
            'a:hover,.light .stamp .reply a{background-color:#0066cc}' +
            'a:hover .label,a.photo:hover img,.stamp a:hover,.light .stamp a' +
            '{border-color:#0066cc}.actions .open-notice:hover{color:#0066cc}' +
            '#sidebar{background-color:#e2f2da;border-left:1px solid #b2d1a3}' +
            '#sidebar .sect{border-top-color:#b2d1a3}' +
            '#sidebar .stabs{border-bottom-color:#b2d1a3}' +
            '#sidebar .stabs li.current a{color:#222222}' +
            '#user_stats li{border-left-color:#b2d1a3}' +
            '#user_stats .count{color:#222222}' +
            '#user_stats a:hover .count{color:#0066cc}' +
            '#goodapp span{color:#222222}';

    return {
        load: function() {
            $('<a />').attr('id', 'sf_clean_personal_theme')
                      .attr('href', '#').text('清除页面风格')
                      .click(function(e) {
                            e.preventDefault();
                            if ($('#sf_default_theme').length) {
                                $('#sf_default_theme').remove();
                                $(this).text('清除页面风格');
                            } else {
                                $('<style />').attr('id', 'sf_default_theme')
                                              .html(default_style).insertAfter('head style');
                                $(this).text('恢复页面风格');
                            }
                      })
                      .appendTo('body');
        },
        unload: function() {
            $('#sf_default_theme').add('#sf_default_theme').remove();
        }
    };
})(jQuery));
