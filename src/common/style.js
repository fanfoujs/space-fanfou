(function() {
	function $i(id) { return document.getElementById(id); }
	function $t(elem, tagName) {
		return elem ? elem.getElementsByTagName(tagName) : null;
	}
	function $cn(elem, className) {
		return elem ? elem.getElementsByClassName(className) : null;
	}
	function $c(tagname) { return document.createElement(tagname); }

	function removeBrackets(elems) {
		if (! elems) return;
		for (var i = 0; i < elems.length; ++i) {
			if (elems[i].innerHTML[0] != '(') continue;
			elems[i].innerHTML = elems[i].innerHTML.slice(1, -1);
		}
	}

	SF.fn.waitFor(function() {
		var $li = $t($i('navigation'), 'li');
		return $li && $li[3];
	}, function() {
		removeBrackets($cn($i('navigation'), 'count'));
	});

	SF.fn.waitFor(function() {
		var $li = $t($i('navtabs'), 'li');
		return $li && $li[3];
	}, function() {
		removeBrackets($cn($i('navtabs'), 'count'));
	});

	SF.fn.waitFor(function() {
		return $i('pagination-totop') || $i('footer');
	}, function() {
		var $, $totop;
		var hidden = false;

		function hideTotop() {
			if (! hidden && $totop) {
				$totop.css({
					display: 'none',
					visibility: 'hidden',
					opacity: 0,
					cursor: 'default',
					'-webkit-transition': ''
				});
				hidden = true;
			}
		}

		function showTotop() {
			if (hidden && $totop) {
				$totop.css('display', '');
				setTimeout(function() {
					$totop.css({
						visibility: 'visible',
						opacity: .5,
						cursor: 'pointer',
						'-webkit-transition': 'opacity .4s ease-in-out'
					});
				}, 0);
				hidden = false;
			}
		}

		var totop = $i('pagination-totop');
		if (! totop) {
			var pagination = $cn(document, 'pagination')[0];

			if (! pagination) {
				pagination = $c('div');
				pagination.className = 'pagination';
				pagination.style = 'display: none;';

				if ($i('content')) {
					$i('content').appendChild(pagination);
				} else if ($i('stream')) {
					$i('stream').parentNode.appendChild(pagination);
				} else if ($cn(document, 'inner-content').length) {
					$cn(document, 'inner-content')[0].appendChild(pagination);
				}
			}

			totop = $c('a');
			totop.id = 'pagination-totop';
			totop.innerHTML = '返回顶部';

			pagination.appendChild(totop);
		}

		totop.removeAttribute('href');
		totop.addEventListener('click', function(e) {
			hideTotop();
			SF.fn.goTop(e);
		}, false);

		SF.fn.waitFor(function() {
			return $ = window.jQuery;
		}, function() {
			var $win = $(window);
			var main_top = 66;

			$totop = $(totop);
			$totop.removeClass('more more-right');
			hideTotop();

			var onscroll = SF.fn.throttle(function() {
				if ($win.scrollTop() < main_top)
					hideTotop();
				else
					showTotop();
			}, 500);

			$win.scroll(function() {
				hideTotop();
				onscroll();
			});
		});
	});

	SF.fn.waitFor(function() {
		return $i('upload-file') && $i('upload-button') &&
			$cn(document, 'upload-close-handle').length;
	}, function() {
		var upload_button = $i('upload-button');

		$i('upload-file').addEventListener('change', function(e) {
			upload_button.classList[this.files.length ? 'add' : 'remove']('file-chosen');
		}, false);

		$cn(document, 'upload-close-handle')[0].addEventListener('click', function(e) {
			upload_button.classList.remove('file-chosen');
		}, false);
	});

	SF.fn.waitFor(function() {
		return $i('timeline-notification') && $i('timeline-count');
	}, function() {
		var body = document.body;
		var notif = $i('timeline-notification');
		var unread_count = $i('timeline-count');
		var btn = $t(notif, 'a')[0];
		var count = 0;
		var timeout;
		var input_tags = ['textarea', 'input', 'TEXTAREA', 'INPUT'];
		var waiting;

		function doCount(x) {
			count += x;
			btn.dataset.pullProgress = count
		}

		addEventListener('mousewheel', function(e) {
			if (waiting) return;
			if (body.scrollTop) return;
			if (e.wheelDeltaY <= 0) return;
			if (input_tags.indexOf(e.target.tagName) > -1) return;
			if (notif.style.display == 'none') return;
			if (! parseInt(unread_count.textContent)) return;

			clearTimeout(timeout);
			doCount(1);

			if (count === 3) {
				count = 0;

				waiting = setTimeout(function() {
					waiting = null;
					SF.fn.emulateClick(btn, true);
					notif.classList.remove('onpull');
				}, 250);
			} else {
				notif.classList.add('onpull');

				timeout = setTimeout(function recover() {
					count = Math.min(3, count);
					count = Math.max(1, count);

					doCount(-1);

					if (! count) {
						notif.classList.remove('onpull');
					} else {
						timeout = setTimeout(recover, 500);
					}
				}, 500);
			}
		}, false);
	});

	(function($) {
		SF.fn.waitFor(function() {
			return ($ = window.jQuery) && $i('footer');
		}, function() {
			$('.colltab:not(.fav_friends)').each(function() {
				var $colltab = $(this);
				var $h2 = $('>h2', $colltab);
				var $b = $('>b', $colltab);
				var $ul = $('>ul', $colltab);
				var id = $colltab.attr('id');
				var collapsed = !! SF.fn.getData(id + '-collapsed');
				function toggle() {
					if (collapsed) {
						$b.addClass('collapse');
						$ul.hide();
					} else {
						$b.removeClass('collapse');
						$ul.show();
					}
				}
				$h2.click(function(e) {
					console.log($b, collapsed);
					collapsed = ! collapsed;
					SF.fn.setData(id + '-collapsed', collapsed);
					toggle();
				});
				if (collapsed) toggle();
			});
		});
	})();
})();
