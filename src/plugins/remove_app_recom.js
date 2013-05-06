SF.pl.remove_app_recom = new SF.plugin((function($) {
	var $goodapp = $('#goodapp');
	if (! $goodapp.length) return;

	var default_list = [
		"http://is.gd/sfanfou",
		"http://imach.me/gohanapp",
		"http://feed.fanfouapps.com/",
		"http://help.fanfou.com/share_button.html",
		"http://2012.fanfou.com/",
		"http://bang.fanfou.com/?fr=apitips",
		"http://blog.fanfou.com"
	];

	var list = [];
	var app_url = $('>a', $goodapp).attr('href');

	function getList() {
		list = SF.fn.getData('spacefanfou_hidden_app_recommendation_list') || default_list;
	}

	function saveList() {
		SF.fn.setData('spacefanfou_hidden_app_recommendation_list', list);
	}

	var $btn = $('<span />');
	$btn
		.text('\u00D7')
		.prop('title', '\u4E0D\u518D\u63A8\u8350\u8FD9\u4E2A\u5E94\u7528')
		.click(function(e) {
			e.stopPropagation();
			e.preventDefault();

			$goodapp.fadeOut();

			if (list.indexOf(app_url) === -1) {
				list.push(app_url);
				saveList();
			}
		})
		.appendTo($goodapp);

	return {
		load: function() {
			getList();

			if (list.indexOf(app_url) > -1) {
				$goodapp.hide();
			} else {
				$goodapp.show();
			}

			$('>a>strong', $goodapp).append($btn);
		},
		unload: function() {
			$goodapp.show();
			$btn.detach();
		}
	};
})(jQuery));
