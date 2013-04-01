SF.pl.unread_statuses = new SF.plugin((function($) {
	var $notification_bar = $('#timeline-notification');
	if (! $notification_bar.length)
		return;

	var auto_show, playsound;

	var button = $('a', $notification_bar)[0];
	var $counter = $('a strong', $notification_bar);

	var interval;
	var period = 500;
	var ud_top = 230;
	var unread_counter;

	var ext_domain = SF.fn.getExtDomain();
	var my_page_url = SF.fn.getMyPageURL();

	var sound;

	return {
		update: function(a, b) {
			auto_show = a;
			playsound = b;
		},
		load: function() {
			if (playsound) {
				sound = new Audio;
				sound.src = ext_domain + 'resources/sounds/dingdong.mp3';
			}

			function check() {
				var counter = 0;
				var all_is_mine = false;

				if (! $notification_bar.is(':hidden')) {
					counter = parseInt($counter.text(), 10) || 0;

					if (counter) {
						var $unread_statuses = $('#stream li.buffered');
						all_is_mine = ! [].some.call($unread_statuses, function($item) {
							var avatar = $('.avatar', $item)[0];
							return avatar.href != my_page_url;
						});
					}

					if (counter > unread_counter &&
						(! all_is_mine || ! auto_show) &&
						playsound) {
						sound.play();
					}

					if (auto_show && all_is_mine && scrollY <= ud_top) {
						SF.fn.emulateClick(button, true);
					}
				}

				unread_counter = counter;
			}

			unread_counter = 0;
			interval = setInterval(check, period);
		},
		unload: function() {
			clearInterval(interval);
			sound = null;
		}
	};
})(jQuery));
