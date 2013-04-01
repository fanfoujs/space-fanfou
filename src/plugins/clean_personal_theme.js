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
					  .attr('href', 'javascript:void(0)')
					  .attr('title', '使用饭否默认模板')
					  .click(function(e) {
							e.preventDefault();
							var $button = $(this);
							if ($('#sf_default_theme').length) {
								$('#sf_default_theme').remove();
								$button.attr('title', '使用饭否默认模板');
							} else {
								$('<style />').prop('id', 'sf_default_theme')
											  .text(default_style).appendTo('head');
								$button.attr('title', '使用用户自定义模板');
							}
							$button.toggleClass('sf_default_theme');

					  })
					  .appendTo('body');
		},
		unload: function() {
			$('#sf_clean_personal_theme, #sf_default_theme').remove();
		}
	};
})(jQuery));
