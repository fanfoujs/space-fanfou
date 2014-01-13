SF.pl.replace_self_name = new SF.plugin((function($) {
	var $style = $('<style>');
	var code = '.author[href="/#id"],' +
		'.content [href="http://fanfou.com/#id"] {' +
		'font-size: 0;' +
		'}' +
		'.author[href="/#id"]::after,' +
		'.content [href="http://fanfou.com/#id"]::after {' +
		'content: "我";' +
		'margin-right: .3em;' +
		'font-size: 14px;' +
		'}'+
		'.author[href="/#id"]::after {' +
		'float: left;' +
		'text-decoration: underline;' +
		'}';
	var url = '';

	return {
		load: function() {
			SF.fn.waitFor(function() {
				return url = SF.fn.getMyPageURL();
			}, function() {
				var id = url.replace('http://fanfou.com/', '');
				$style.text(code.replace(/#id/g, id));
				$style.appendTo('head');
				if (SF.fn.isMyPage()) {
					var $h1;
					SF.fn.waitFor(function() {
						$h1 = $('#panel h1');
						return $h1.length;
					}, function() {
						$h1.text('我');
					});
				} else if (SF.fn.isUserPage()) {
					var $me;
					SF.fn.waitFor(function() {
						$me = $('#friends li a[href="/' + id + '"]');
						return $me.length;
					}, function() {
						$me.find('span').text('我');
					});
				}
			});
		},
		unload: function() {
			$style.detach();
		}
	};
})(Zepto));