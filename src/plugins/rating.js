SF.pl.rating = new SF.plugin((function() {
	var is_page_shown = SF.fn.getData('rating_page_shown');
	if (is_page_shown) return;

	return {
		load: function() {
			function accumulateTime() {
				var time = SF.fn.getData('timer') || 0;
				time++;

				if (time % (60 * 24) === 0) {
					showNotification({
						content: '喜欢太空饭否吗? 请点击这里为它评分, 并留下您的宝贵意见! (点击后本提示将不会再重复显示)',
						timeout: 60000
					}).
					addEventListener('click', function(e) {
						var url = 'https://chrome.google.com/webstore/detail/%E5%A4%AA%E7%A9%BA%E9%A5%AD%E5%90%A6/mfofmcdbaeajgdeihmcjjohmhepcdcol/reviews';
						createTab(url);

						SF.fn.setData('rating_page_shown', true);
						clearInterval(interval);

						showNotification({
							content: '喜欢太空饭否请点击这里把它推荐给你的饭友! :)',
							timeout: 60000
						}).
						addEventListener('click', function(e) {
							var url = 'http://fanfou.com/sharer?u=http%3A%2F%2Fis.gd%2Fsfanfou?t=%E5%A4%AA%E7%A9%BA%E9%A5%AD%E5%90%A6%20-%20Chrome%20%E7%BD%91%E4%B8%8A%E5%BA%94%E7%94%A8%E5%BA%97?d=%E5%90%91%E5%A4%A7%E5%AE%B6%E6%8E%A8%E8%8D%90%E5%A4%AA%E7%A9%BA%E9%A5%AD%E5%90%A6%EF%BC%8C%E8%B6%85%E5%BC%BA%E5%A4%A7%E7%9A%84%E9%A5%AD%E5%90%A6%20Chrome%20%E6%B5%8F%E8%A7%88%E5%99%A8%E6%89%A9%E5%B1%95%E7%A8%8B%E5%BA%8F%E3%80%82?s=bl';
							createTab(url);

							this.cancel();
						}, false);

						this.cancel();
					}, false);
				}

				SF.fn.setData('timer', time);
			}

			var interval = setInterval(accumulateTime, 60000);
		}
	};
})());
