SF.pl.rescale_background = new SF.plugin((function($) {
	var docelem = document.documentElement;
	var $body;

	function onResize() {
		SF.fn.waitFor(function() {
			$body = $('body');
			return $body.length;
		}, rescaleBackground);
	}
	function rescaleBackground() {
		var bg_img = $body.css('background-image');
		if (! bg_img || bg_img === 'none')
			return;
		if ($body.css('background-repeat') !== 'no-repeat')
			return;
		if ($body.css('background-attachment') !== 'fixed')
			return;
		var img_url = bg_img.match(/url\("?(\S+)"?\)/)[1];
		function process(dimentions) {
			var width = docelem.clientWidth;
			var height = docelem.clientHeight;
			var img_ratio = dimentions.width / dimentions.height;
			var new_width, new_height;
			if (width <= dimentions.width && height <= dimentions.height) {
				$('body').css('background-size', '');
				if (dimentions.width >= innerWidth &&
					dimentions.height >= innerHeight) {
					var ratio = innerWidth / innerHeight;
					if (ratio > img_ratio) {
						new_width = innerWidth;
						new_height = new_width / dimentions.width * dimentions.height;
					} else {
						new_height = innerHeight;
						new_width = new_height / dimentions.height * dimentions.width;
					}
				}
			} else if (dimentions.width > 500) {
				var ratio = width / height;
				if (ratio > img_ratio) {
					new_width = width;
					new_height = new_width / dimentions.width * dimentions.height;
				} else {
					new_height = height;
					new_width = new_height / dimentions.height * dimentions.width;
				}
			}
			if (new_width && new_height) {
				$('body').css('background-size', new_width + 'px ' + new_height + 'px');
			}
		}
		var dimentions = SF.fn.getData('dimentions-' + img_url);
		if (dimentions) {
			process(dimentions);
		} else {
			var img = new Image;
			img.src = img_url;
			function onload() {
				var dimentions = {
					width: img.naturalWidth,
					height: img.naturalHeight
				};
				img = null;
				SF.fn.setData('dimentions-' + img_url, dimentions);
				process(dimentions);
			}
			if (img.complete) {
				onload();
			} else {
				img.onload = onload;
			}
		}
	}

	return {
		load: function() {
			$(window).on('resize', onResize);
			onResize();
		},
		unload: function() {
			$(window).off('resize', onResize);
			$('body').css('background-size', '');
		}
	};
})(Zepto));