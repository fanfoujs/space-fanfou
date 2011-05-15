(function() {
	var css_switches = [
		['font_reset', 'font-reset-all.css', 'font-reset-en.css'],
		['translucent_sidebar', 'translucent-sidebar.css', null]
	];

	var keys = [];
	for (var i = 0; i < css_switches.length; ++i)
		keys.push(css_switches[i][0]);
	chrome.extension.sendRequest(
		{
			func: 'readData',
			data: keys
		},
		function(data) {
			for (var i = 0; i < css_switches.length; ++i) {
				var css_file = data[i] ?
					css_switches[i][1] : css_switches[i][2];
				if (! css_file) continue;
				var $style = $('<link>');
				$style.attr('rel', 'stylesheet');
				$style.attr('href',
					chrome.extension.getURL('styles/' + css_file));
				$('head').append($style);
			}
		}
	);
})();
