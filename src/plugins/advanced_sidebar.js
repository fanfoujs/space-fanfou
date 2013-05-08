SF.pl.advanced_sidebar = new SF.plugin((function($) {
	var $insert = $('.stabs');

	var userid = $('meta[name=author]').attr('content');
	if (!userid) return;
	userid = /\((.+)\)/.exec(userid)[1];

	var $script;

	return {
		load: function() {
			SF.cb.advanced_sidebar = function(data, isInit) {
				if (! isInit) {
					SF.cb.advanced_sidebar = undefined;
				}

				var created = new Date(isInit ? 0 : data.created_at);
				var bgImage = data.profile_background_image_url;

				var regDuration = Math.floor((new Date() - created) /
											 (1000 * 3600 * 24));
				var regYear = Math.floor(regDuration / 365.2425);
				var regMonth = Math.floor(
					(regDuration - regYear * 365.2425) / 30.4369);

				var duration = (regYear > 0 || regMonth > 0 ? '约 ' : '') +
					(regYear > 0 ? regYear + ' 年' +
					 (regMonth > 0 ? '零 ' + regMonth + ' 个月' : '') :
					 (regMonth > 0 ? regMonth + ' 个月' :
					  (regDuration >= 7 ? '不足一个月' :
					   (regDuration > 0 ? '不足一周' : '刚来不到一天'))));


				if (isInit) {
					duration = '';
					regDuration = 0;
				}

				// 从饭否诞生开始计算
				var sinceFanfouStart = Math.round(
						(new Date() - new Date(2007, 4, 12)) /
						(1000 * 3600 * 24))

				var statusFreq =
					(data.statuses_count /
					 (regDuration -
					  (created < new Date(2009, 6, 8) ? 505 : 0)))
					 .toFixed(2);

				if (!isFinite(statusFreq))
					statusFreq = data.statuses_count;

				if (isInit) statusFreq = 0;

				// 饭粒公式
				var actIndex = ((40 * statusFreq) - (statusFreq * statusFreq)) / 400;
				if (statusFreq > 20)
					actIndex = 1;
				if (data.protected)
					actIndex = actIndex * 0.75

				if (isInit) actIndex = 0;

				var infIndex = (
					(10 *(Math.sqrt(data.followers_count)) / Math.log(regDuration + 100)) +
					((data.followers_count / 100) + (regDuration / 100)) * actIndex
				).toFixed(0);

				if (isInit) infIndex = 0;

				$('div.stabs.advanced_group').remove();

				$insert.after(
					$('<div />').addClass('stabs advanced_group')
				);

				$('.advanced_group')
					.append(
						$('<h2 />').addClass('advanced_title')
							.text('统计信息')
					)
					.append($('<ul />'));

				$('.advanced_group>ul')
					.append(
						$('<li />').addClass('advanced ptest')
							.text('注册于 ' + (isInit ? '加载中...' : SF.fn.formatDate(created)))
					)
					.append(
						$('<li />').addClass('advanced')
						.text('饭龄：' + duration +
							' (' + regDuration + ' 天)')
						.prop('title', '注册时长')
						.append(
							$('<div />')
							.addClass('statbar statbar_a')
							.append(
								$('<div />').each(function() {
									var $elem = $(this);
									setTimeout(function() {
										$elem.width(regDuration / sinceFanfouStart * 100 + '%');
									}, 0);
								})
							)
						)
					)
					.append(
						$('<li />')
							.addClass('advanced')
							.text('饭量：平均 ' + statusFreq + ' 条消息 / 天')
							.prop('title', '消息频率')
							.append(
								$('<div />')
									.addClass('statbar statbar_b')
									.append(
										$('<div />').each(function() {
											var $elem = $(this);
											setTimeout(function() {
												$elem.width(Math.min(100, statusFreq / 0.5) + '%');
											}, 0);
										})
									)
							)
					)
					.append(
						$('<li />').addClass('advanced')
						.text('饭粒：' + infIndex + ' 个')
						.prop('title', '影响力')
						.append(
							$('<div />')
							.addClass('statbar statbar_c')
							.append(
								$('<div />').each(function() {
									var $elem = $(this);
									setTimeout(function() {
										$elem.width(Math.min(100, infIndex) + '%');
									}, 0);
								})
							)
						)
					);

				$('.ptest').addClass(data.protected ?
					'protected' : 'notprotected');

				var bgImageStyle = $('body').css('background-image');
				if (bgImageStyle != 'none' && bgImage) {
					$('<li />').addClass('advanced')
						.append(
							$('<a />')
								.attr('href', bgImage)
								.addClass('more')
								.text('» 查看背景图片')
						)
						.appendTo('.advanced_group ul');
				}
			};
			SF.cb.advanced_sidebar({}, true);

			function init() {
				var script = document.createElement('script');
				script.src = 'http://api.fanfou.com/users/show.json?id=' +
					encodeURIComponent(userid) +
					'&callback=SF.cb.advanced_sidebar' +
					'&unique=' + (new Date().getTime());
				script.onerror = function(e) {
					console.log('由于饭否服务器的 bug, 太空饭否的 "侧栏详细统计信息" 插件加载失败, 并即将重试. ', e);
					setTimeout(init, 250);
				}
				document.body.appendChild(script);
			}
			init();
		},
		unload: function() {
			SF.cb.advanced_sidebar = undefined;
			if ($script) {
				$script.remove();
				$script = null;
			}
			$('.advanced_group').remove();
		}
	};
})(jQuery));
