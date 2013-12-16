SF.pl.xmas_spec_theme = new SF.plugin(function($) {
	var end_date = new Date(2013, 11, 26);
	var now = Date.now();
	if (now > end_date) {
		return new SF.plugin;
	}

	var enable_snowstorm, enable_song, enable_hat;
	var is_snowing = false,
		is_playing = false,
		is_worn = false;
	var giftbox_collected = SF.fn.getData('giftbox_count') || 0;
	var initialized = false;

	function postMessage(data) {
		var event = document.createEvent('MessageEvent');
		var msg = {
			from: 'xmas_spec_theme',
			data: data
		};
		event.initMessageEvent('SFMessage', false, false, JSON.stringify(msg));
		dispatchEvent(event);
	}

	function disableSetting(key) {
		postMessage({
			type: 'disable_setting',
			key: 'xmas_spec_theme.' + key
		});
	}

	function showNotification(text, flag) {
		var $notice = $('<div>');
		$notice.addClass(flag ? 'errmsg' : 'sysmsg');
		$notice.text(text);
		$notice.hide();
		var $header = $('#header');
		$('.errmsg, .sysmsg', $header).remove();
		$header.append($notice);
		$notice.fadeIn(500).delay(3500).fadeOut(500,
			function() { $(this).remove(); });
	}

	function enableCheat() {
		// javascript:jQuery(window).trigger('这是一个酷炫的事件');
		$(window).bind('这是一个酷炫的事件', function(e) {
			SF.fn.setData('giftbox_count', 9);
			newGiftboxCollected();
		});
	}

	function newGiftboxCollected() {
		giftbox_collected = SF.fn.getData('giftbox_count') || 0;
		SF.fn.setData('giftbox_count', ++giftbox_collected);

		if (giftbox_collected >= 10) {
			postMessage({
				type: 'ten_giftboxes_collected'
			});
			showNotification('您成功收集到了 10 个圣诞礼盒！快去设置页看看吧~', true);
		} else {
			postMessage({
				type: 'new_giftbox_collected',
				count: giftbox_collected
			});
			showNotification('您成功收集到了 ' + giftbox_collected +
				'/10 个圣诞礼盒！');
		}
	}

	function getRandomNumber(max) {
		var s = Date.now() / (max * 10);
		return Math.round((s - Math.floor(s)) * (max * 10)) / 10;
	}

	function showGiftBox() {
		SF.fn.setData('last_giftbox_collected_at', Date.now());
		if ($('#sf-giftbox').length) return;
		var de = document.documentElement;
		var avail_width = de.clientWidth;
		var avail_height = de.clientHeight;
		var r1 = getRandomNumber(100);
		var r2 = getRandomNumber(1000) / 10;
		var left = avail_width * r1 / 100;
		var top = avail_height * r2 / 100;
		var $giftbox = $('<div />');
		$giftbox.prop('id', 'sf-giftbox');
		$giftbox.prop('title', '圣诞礼盒！');
		$giftbox.addClass('space-fanfou');
		$giftbox.css({
			left: Math.min(left, avail_width - 65) + 'px',
			top: Math.min(top, avail_height - 65) + 'px'
		});
		$giftbox.click(function() {
			newGiftboxCollected();
			[ 1, 2, 3, 4 ].forEach(function(i) {
				setTimeout(function() {
					$giftbox.css('background-position', '0 -' + (i  * 65) + 'px');
				}, i * 150);
				setTimeout(function() {
					$giftbox.fadeOut(function() {
						$giftbox.remove();
					});
				}, 300);
			});
		});
		$giftbox.hide();
		$giftbox.appendTo('body').fadeIn();
	}

	function initGiftBox() {
		var r = getRandomNumber(100);
		var chance = SF.fn.getData('sf-giftbox-chance') || 0;
		chance = Math.min(chance, 25);
		chance += 2.5;
		if (SF.fn.getData('posted_a_picture')) {
			chance += 12.5;
			SF.fn.setData('posted_a_picture', false);
		} else if (SF.fn.getData('posted_a_status')) {
			chance += 7.5;
			SF.fn.setData('posted_a_status', false);
		} else if (SF.fn.getData('posted_a_pm')) {
			chance += 17.5;
			SF.fn.setData('posted_a_pm', false);
		}
		var last_time = new Date(SF.fn.getData('last_giftbox_collected_at') || 0);
		var now = Date.now();
		chance = 100;
		if (r <= chance) {
			if (now - last_time > 10 * 60 * 1000) {
				setTimeout(showGiftBox, getRandomNumber(1000000) / 10000);
				chance = 0;
			}
		} else {
			chance = 0;
			initEvent();
		}
		SF.fn.setData('sf-giftbox-chance', chance);
	}

	function initEvent() {
		if (initialized) return;
		initialized = true;
		initMessageEvent();
		initPictureMessageEvent();
		initPrivateMessageEvent();
		initPopupMessageEvent();
	}

	function initMessageEvent() {
		bindEvent($('form#message'), 'posted_a_status');
	}

	function initPictureMessageEvent() {
		bindEvent($('form#message'), function() {
			var $file = $('input[type=file]');
			var $base64 = $('#upload-base64');
			if (($file.length && $file[0].files.length) ||
				$base64[0].value) {
				SF.fn.setData('posted_a_picture', true);
			}
		});
	}

	function initPrivateMessageEvent() {
		bindEvent($('form#privatemessage'), 'posted_a_pm');
	}

	function initPopupMessageEvent() {
		bindEvent($('form#PopupForm'), 'posted_a_status');
	}

	function bindEvent($form, key) {
		if (! $form.length) return;
		function onsubmit(e) {
			if ($.isFunction(key)) {
				var callback = key;
				callback();
			} else {
				SF.fn.setData(key, true);
			}
			if (e.type === 'form_submit' &&
				this.id === 'message') {
				initGiftBox();
			}
		}
		$form.on('submit form_submit', onsubmit);
		$form.on('keydown', function(e) {
			if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
				onsubmit();
			}
		});
	}

	function snow() {
		if (is_snowing) return;
		is_snowing = true;
		storm.toggleSnow();

        var $stop_snow = $('<a />');
        $stop_snow.attr('title', '停止下雪效果');
        $stop_snow.attr('innerHTML', '停止！');
        $stop_snow.attr('id', 'sf_stop_snow');

        $stop_snow.click(function(e) {
            e.preventDefault();
            disableSetting('snowstorm');
        });
        $('body').append($stop_snow);
	}

	function stopSnowing() {
		if (! is_snowing) return;
		is_snowing = false;
		storm.toggleSnow();
        $('#sf_stop_snow').fadeOut(function() {
			$(this).remove();
		});
	}

	function playMusic() {
		if (is_playing) return;
		is_playing = true;

		sound = new Audio;
		sound.src = ext_domain + 'resources/sounds/jingle-bells.mp3';
		sound.play();

		sound.addEventListener('timeupdate', function(e) {
			if (sound && sound.duration == sound.currentTime)
				$stop_music.click();
		}, false);

        var $stop_music = $('<a />');
        $stop_music.attr('title', '停止播放音乐');
        $stop_music.attr('innerHTML', '停止！');
        $stop_music.attr('id', 'sf_stop_music');

        $stop_music.click(function(e) {
            e.preventDefault();
            disableSetting('song');
        });
        $('body').append($stop_music);
	}

	function stopMusic() {
		if (! is_playing) return;
		is_playing = false;
		sound.currentTime = 0;
		sound.pause();
		sound = null;
		$('#sf_stop_music').fadeOut(function() {
			$(this).remove();
		});
	}

	function showHat() {
		is_worn = true;
		$('body').addClass('show-hat');
	}

	function hideHat() {
		is_worn = false;
		$('body').removeClass('show-hat');
	}

	function updateState() {
		if (enable_snowstorm) {
			if (! is_snowing) {
				snow();
			}
		} else {
			if (is_snowing) {
				stopSnowing();
			}
		}
		if (enable_song) {
			if (! is_playing) {
				playMusic();
			}
		} else {
			if (is_playing) {
				stopMusic();
			}
		}
		if (enable_hat) {
			if (! is_worn) {
				showHat();
			}
		} else {
			if (is_worn) {
				hideHat();
			}
		}
	}

	function initSpecTheme() {
		if (enable_snowstorm) {
			snow();
		}
		if (enable_song) {
			playMusic();
		}
		if (enable_hat) {
			showHat();
		}
	}

	var ext_domain, sound,
		elems = document.getElementsByClassName('space-fanfou');

	[].some.call(elems, function(elem) {
		var url = elem.href;
		if (! url || url.indexOf('chrome-extension://') !== 0)
			return false;
		ext_domain = url.match(/^(chrome-extension:\/\/[^\/]+\/)/)[1];
		return true;
	});

	var s = { },
		storm = s,
		area = null,
		factor = null,
		screenX = null,
		screenX2 = null,
		screenY = null,
		scrollY = null,
		vRndX = null,
		vRndY = null,
		windOffset = 1,
		windMultiplier = 2,
		flakeTypes = 8,
		fixedForEverything = false,
		didInit = false,
		docFrag = document.createDocumentFragment();

	storm.animationInterval = 42;
	storm.flakeBottom = null;
	storm.followMouse = true;
	storm.snowCharacter = 'C';
	storm.snowColor = '#fff';
	storm.snowCharacterColor = storm.snowCharacterColor || storm.snowColor;
	storm.snowStick = true;
	storm.targetElement = null;
	storm.useMeltEffect = true;
	storm.useTwinkleEffect = false;
	storm.usePositionFixed = true;
	storm.freezeOnBlur = true;
	storm.flakeLeftOffset = 0;
	storm.flakeRightOffset = 0;
	storm.vMaxX = 2.5;
	storm.vMaxY = 2.5;
	storm.zIndex = 100000;
	storm.timers = [];
	storm.flakes = [];
	storm.disabled = false;
	storm.active = false;
	storm.meltFrameCount = 20;
	storm.meltFrames = [];

	storm.events = (function () {
		var slice = Array.prototype.slice,
			evt = {
				add: 'addEventListener',
				remove: 'removeEventListener'
			};

		function getArgs(oArgs) {
			var args = slice.call(oArgs),
				len = args.length;
			if (len === 3)
				args.push(false);
			return args;
		}

		function apply(args, sType) {
			var element = args.shift(),
				method = evt[sType];
			element[method].apply(element, args);
		}

		function addEvent() {
			apply(getArgs(arguments), 'add');
		}

		function removeEvent() {
			apply(getArgs(arguments), 'remove');
		}
		return {
			add: addEvent,
			remove: removeEvent
		};
	}());

	function rnd(n, min) {
		if (isNaN(min))
			min = 0;
		return (Math.random() * n) + min;
	}

	function plusMinus(n) {
		return (parseInt(rnd(2), 10) === 1 ? -n : n);
	}

	storm.randomizeWind = function () {
		vRndX = plusMinus(rnd(s.vMaxX, 0.2));
		vRndY = rnd(s.vMaxY, 0.2);
		if (this.flakes)
			for (var i = 0; i < this.flakes.length; i++)
				if (this.flakes[i].active)
					this.flakes[i].setVelocities();
	};

	storm.randomizeFlakesMax = function () {
		area = innerHeight * innerWidth;
		while (factor === null || factor < 0.75 || factor > 1) {
			factor = Math.random();
		}
		factor = factor * 15000;

		storm.flakesMax = area / factor;
		storm.flakesMaxActive = area / factor;
	};

	storm.scrollHandler = function () {
		scrollY = (s.flakeBottom ? 0 : parseInt(window.scrollY, 10));
		if (isNaN(scrollY))
			scrollY = 0;
		if (!fixedForEverything && !s.flakeBottom && s.flakes)
			for (var i = s.flakes.length; i--;)
				if (s.flakes[i].active === 0)
					s.flakes[i].stick();
	};

	storm.resizeHandler = function () {
		if (window.innerWidth || window.innerHeight) {
			screenX = window.innerWidth - 16 - s.flakeRightOffset;
			screenY = (s.flakeBottom ? s.flakeBottom : window.innerHeight);
		} else {
			screenX = document.documentElement.clientWidth - 8 - s.flakeRightOffset;
			screenY = s.flakeBottom ? s.flakeBottom : document.documentElement.clientHeight;
		}
		screenX2 = parseInt(screenX / 2, 10);
		s.randomizeFlakesMax();
	};

	storm.resizeHandlerAlt = function () {
		screenX = s.targetElement.offsetLeft + s.targetElement.offsetWidth - s.flakeRightOffset;
		screenY = s.flakeBottom ? s.flakeBottom : s.targetElement.offsetTop + s.targetElement.offsetHeight;
		screenX2 = parseInt(screenX / 2, 10);
		s.randomizeFlakesMax();
   };

	storm.freeze = function () {
		if (!s.disabled)
			s.disabled = 1;
		else
			return false;
		for (var i = s.timers.length; i--;)
			clearInterval(s.timers[i]);
	};

	storm.resume = function () {
		if (s.disabled)
			s.disabled = 0;
		else
			return false;
		s.timerInit();
	};

	storm.toggleSnow = function () {
		if (!s.flakes.length) {
			s.start();
		} else {
			s.active = !s.active;
			if (s.active) {
				s.show();
				s.resume();
			} else {
				s.stop();
				s.freeze();
			}
		}
	};

	storm.stop = function () {
		this.freeze();
		for (var i = this.flakes.length; i--;)
			this.flakes[i].o.style.display = 'none';
		s.events.remove(window, 'scroll', s.scrollHandler);
		s.events.remove(window, 'resize', s.resizeHandler);
		if (s.freezeOnBlur) {
			s.events.remove(window, 'blur', s.freeze);
			s.events.remove(window, 'focus', s.resume);
		}
		localStorage.removeItem('sf_snow_storm');
	};

	storm.show = function () {
		for (var i = this.flakes.length; i--;)
			this.flakes[i].o.style.display = 'block';
	};

	storm.SnowFlake = function (parent, type, x, y) {
		var s = this,
			storm = parent;
		s.type = type;
		s.x = x || parseInt(rnd(screenX - 20), 10);
		s.y = (!isNaN(y) ? y : -rnd(screenY) - 12);
		s.vX = null;
		s.vY = null;
		s.vAmpTypes = [1, 1.2, 1.4, 1.6, 1.8, 3, 2, 1];
		s.vAmp = s.vAmpTypes[s.type];
		s.melting = false;
		s.meltFrameCount = storm.meltFrameCount;
		s.meltFrames = storm.meltFrames;
		s.meltFrame = 0;
		s.twinkleFrame = 0;
		s.active = 1;
		s.o = document.createElement('div');
		s.o.style.position = (fixedForEverything ? 'fixed' : 'absolute');
		if (type >= 6) {
			s.isSnowCharacter = true;
			s.flakeWidth = s.flakeHeight = 32;
			s.o.innerHTML = storm.snowCharacter;
			s.o.style.color = storm.snowCharacterColor;
			var size = 32;
			this.o.className = 'storm-snow-character';
			this.o.classList.add(parseInt(rnd(2), 10) ? 'storm-snowflake-cw' : 'storm-snowflake-ccw');
			this.o.style.webkitAnimationDuration = parseInt(rnd(2, 15 - (s.vAmp * 3)), 10) + 's';
		} else {
			s.flakeWidth = s.flakeHeight = 3;
			s.o.style.backgroundColor = storm.snowColor;
			s.o.style.boxShadow = '0 2px 2px rgba(0, 0, 0, .1)';
			var size = 3 + s.type;
			s.o.style.width = s.o.style.height = size + 'px';
			s.o.style.borderRadius = (size / 2) + 'px';
		}
		s.o.style.zIndex = storm.zIndex;
		docFrag.appendChild(s.o);

		s.refresh = function () {
			if (isNaN(s.x) || isNaN(s.y))
				return false;
			s.o.style.left = s.x + 'px';
			s.o.style.top = s.y + 'px';
		};

		s.stick = function () {
			if ((storm.targetElement !== document.documentElement && storm.targetElement !== document.body)) {
				s.o.style.top = (screenY + scrollY - s.flakeHeight) + 'px';
			} else if (storm.flakeBottom) {
				s.o.style.top = storm.flakeBottom + 'px';
			} else {
				s.o.style.display = 'none';
				s.o.style.top = 'auto';
				s.o.style.bottom = '0px';
				s.o.style.position = 'fixed';
				s.o.style.display = 'block';
			}
		};

		s.vCheck = function () {
			if (s.vX >= 0 && s.vX < 0.2)
				s.vX = 0.2;
			else if (s.vX < 0 && s.vX > -0.2)
				s.vX = -0.2;
			if (s.vY >= 0 && s.vY < 0.2)
				s.vY = 0.2;
		};

		s.move = function () {
			var vX = s.vX * windOffset,
				yDiff;
			s.x += vX;
			s.y += s.vY * s.vAmp;
			if (s.x >= screenX || screenX - s.x < s.flakeWidth)
				s.x = 0;
			else if (vX < 0 && s.x - storm.flakeLeftOffset < -s.flakeWidth)
				s.x = screenX - s.flakeWidth - 1;
			s.refresh();
			yDiff = screenY + scrollY - s.y;
			if (yDiff < s.flakeHeight) {
				s.active = 0;
				if (storm.snowStick)
					s.stick();
				else
					s.recycle();
			} else {
				if (storm.useMeltEffect && s.active && s.type < 3 && !s.melting && Math.random() > 0.998) {
					s.melting = true;
					s.melt();
				}
				if (storm.useTwinkleEffect) {
					if (!s.twinkleFrame) {
						if (Math.random() > 0.9)
							s.twinkleFrame = parseInt(Math.random() * 20, 10);
					} else {
						s.twinkleFrame--;
						s.o.style.visibility = (s.twinkleFrame && s.twinkleFrame % 2 === 0 ? 'hidden' : 'visible');
					}
				}
			}
		};

		s.setVelocities = function () {
			s.vX = vRndX + rnd(storm.vMaxX * 0.12, 0.1);
			s.vY = vRndY + rnd(storm.vMaxY * 0.12, 0.1);
		};

		s.melt = function () {
			if (!storm.useMeltEffect || !s.melting) {
				s.recycle();
			} else {
				if (s.meltFrame < s.meltFrameCount) {
					s.meltFrame++;
					s.setOpacity(s.meltFrames[s.meltFrame]);
					if (! s.isSnowCharacter) {
						s.o.style.fontSize = s.fontSize - (s.fontSize * (s.meltFrame / s.meltFrameCount)) + 'px';
						s.o.style.lineHeight = s.flakeHeight + 2 + (s.flakeHeight * 0.75 * (s.meltFrame / s.meltFrameCount)) + 'px';
					}
				} else {
					s.recycle();
				}
			}
		};

		s.recycle = function () {
			s.o.style.display = 'none';
			s.o.style.position = (fixedForEverything ? 'fixed' : 'absolute');
			s.o.style.bottom = 'auto';
			s.setVelocities();
			s.vCheck();
			s.meltFrame = 0;
			s.melting = false;
			s.setOpacity(1);
			s.o.style.padding = '0px';
			s.o.style.margin = '0px';
			if (! s.isSnowCharacter) {
				s.o.style.fontSize = s.fontSize + 'px';
				s.o.style.lineHeight = (s.flakeHeight + 2) + 'px';
			}
			s.o.style.textAlign = 'center';
			s.o.style.verticalAlign = 'baseline';
			s.x = parseInt(rnd(screenX - s.flakeWidth - 20), 10);
			s.y = parseInt(rnd(screenY) * -1, 10) - s.flakeHeight;
			s.refresh();
			s.o.style.display = 'block';
			s.o.style.webkitAnimationName = '';
			s.active = 1;
		};
		s.recycle();
		s.refresh();
	};

	storm.SnowFlake.prototype.setOpacity = function (opacity) {
		this.o.style.opacity = opacity;
	};

	storm.SnowFlake.prototype.animate = function () {
		this.move();
	};

	storm.snow = function () {
		var active = 0,
			used = 0,
			waiting = 0,
			flake = null;
		for (var i = s.flakes.length; i--;) {
			if (s.flakes[i].active === 1) {
				s.flakes[i].move();
				active++;
			} else if (s.flakes[i].active === 0) {
				used++;
			} else {
				waiting++;
			}
			if (s.flakes[i].melting)
				s.flakes[i].melt();
		}
		s.flakes.forEach(function(flake) {
			if (flake.isSnowCharacter && flake.active === 0) {
				flake.o.style.webkitAnimationName = 'none';
			}
		});
		if (active < s.flakesMaxActive) {
			flake = s.flakes[parseInt(rnd(s.flakes.length), 10)];
			if (flake.active === 0)
				flake.melting = true;
		}
	};

	storm.mouseMove = function (e) {
		if (!s.followMouse)
			return true;
		var x = parseInt(e.clientX, 10);
		if (x < screenX2) {
			windOffset = -windMultiplier + (x / screenX2 * windMultiplier);
		} else {
			x -= screenX2;
			windOffset = (x / screenX2) * windMultiplier;
		}
	};

	storm.createSnow = function (limit, allowInactive) {
		for (var i = 0; i < limit; i++) {
			s.flakes[s.flakes.length] = new s.SnowFlake(s, parseInt(rnd(flakeTypes), 10));
			if (allowInactive || i > s.flakesMaxActive)
				s.flakes[s.flakes.length - 1].active = -1;
		}
		storm.targetElement.appendChild(docFrag);
	};

	storm.timerInit = function () {
		s.timers = [setInterval(s.snow, s.animationInterval)];
	};

	storm.init = function () {
		for (var i = 0; i < s.meltFrameCount; i++)
			s.meltFrames.push(1 - (i / s.meltFrameCount));
		s.randomizeWind();
		s.createSnow(s.flakesMax);
		s.events.add(window, 'resize', s.resizeHandler);
		s.events.add(window, 'scroll', s.scrollHandler);
		if (s.freezeOnBlur) {
			s.events.add(window, 'blur', s.freeze);
			s.events.add(window, 'focus', s.resume);
		}
		s.resizeHandler();
		s.scrollHandler();
		if (s.followMouse)
			s.events.add(window, 'mousemove', s.mouseMove);
		s.animationInterval = Math.max(20, s.animationInterval);
		s.timerInit();
	};

	storm.start = function (bFromOnLoad) {
		if (!didInit)
			didInit = true;
		else if (bFromOnLoad)
			return true;
		if (typeof s.targetElement === 'string') {
			var targetID = s.targetElement;
			s.targetElement = document.getElementById(targetID);
			if (!s.targetElement)
				throw new Error('Snowstorm: Unable to get targetElement "' + targetID + '"');
		}
		s.targetElement = s.targetElement || document.documentElement;
		if (s.targetElement !== document.documentElement && s.targetElement !== document.body)
			s.resizeHandler = s.resizeHandlerAlt;
		s.resizeHandler();
		fixedForEverything = s.usePositionFixed;
		if (screenX && screenY && !s.disabled) {
			s.init();
			s.active = true;
		}
	};

	return {
		update: function(a, b, c) {
			enable_snowstorm = a;
			enable_song = b;
			enable_hat = c;
			if (this.loaded) {
				updateState();
			}
		},
		load: function() {
			enableCheat();
			if (giftbox_collected < 10) {
				initGiftBox();
			} else {
				initSpecTheme();
			}
		}
	}
}(jQuery));