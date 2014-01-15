SF.pl.disguise_username = new SF.plugin((function($) {
	var $style = $('<style>');
	var code = '#user_top:first-child > h3 {' +
		'font-size: 0;' +
		'}' +
		'#user_top:first-child > h3::before,' +
		'#user_top:first-child > h3::after {' +
		'font-size: 18px;' +
		'}' +
		'#user_top:first-child > h3::before {' +
		'content: "#fake_name" !important;' +
		'float: left;' +
		'}' +
		'#user_top:hover:first-child > h3 {' +
		'font-size: 18px;' +
		'}' +
		'#user_top:hover:first-child > h3::before {' +
		'display: none;' +
		'}';
	var fake_name = '';

	return {
		update: function(a) {
			fake_name = a;
			if (this.loaded) {
				this.unload();
				this.load();
			}
		},
		load: function() {
			$style.text(code.replace(/#fake_name/, fake_name));
			$style.appendTo('head');
		},
		unload: function() {
			$style.detach();
		}
	};
})(Zepto));