SF.pl.check_saved_searches = new SF.plugin((function() {
	function request(options) {
		var xhr = new XMLHttpRequest;
		xhr.open('GET', options.url, true);
		xhr.responseType = options.responseType || 'text';
		if (options.ajax) {
			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		}
		xhr.onload = function(e) {
			if (xhr.status === 200) {
				options.success(xhr.response);
				xhr = null;
			}
		}
		xhr.send(null);
	}

	function ItemToCheck(keyword) {
		this.keyword = keyword;
		this.interval = setInterval(this.check.bind(this), 3 * 60 * 1000);
		this.last_timestmap = 0;
		this.check();
	}
	ItemToCheck.prototype = {
		stopTimer: function() {
			clearInterval(this.interval);
		},
		check: function() {
			var self = this;
			request({
				url: 'http://fanfou.com/q/' + 
					encodeURIComponent(this.keyword),
				ajax: true,
				success: function(data) {
					data = JSON.parse(data);
					var div = document.createElement('div');
					div.innerHTML = data.data.timeline;
					var time = div.querySelector('li .stamp .time');
					if (! time) return;
					var timestamp;
					var items = [].slice.call(div.querySelectorAll('li'));
					items.some(function(li) {
						var userid = li.querySelector('.author').
							getAttribute('href').replace('/', '');
						userid = decodeURIComponent(userid);
						if (userid === current_userid) {
							return false;
						}
						var content = li.querySelector('.content');
						var html = content.innerHTML;
						var pattern = '<a href="http://fanfou.com/' +
							current_userid +
							'" class="former">';
						if (html.indexOf(pattern) > -1) {
							return false;
						}
						var time = li.querySelector('.stamp .time');
						timestamp = Date.parse(time.title);
						return true;
					})
					self.data = [ self.keyword, timestamp ];
					broadcast(self.data);
					if (timestamp && show_notification) {
						if (timestamp > self.last_timestmap &&
							self.last_timestmap) {
							showNotification({
								content: '您关注的话题 "' + self.keyword +
									'" 有了新消息',
								id: 'saved-search-' + self.keyword,
								timeout: 30000
							}).addEventListener('click', function(e) {
								this.cancel();
								createTab('http://fanfou.com/q/' + self.keyword);
							});
						}
					}
					self.last_timestmap = timestamp;
				}
			});
		}
	}

	function getCode(data) {
		data = data.map(function(item) {
			return JSON.stringify(item);
		}).join(', ');
		var code = 'javascript:';
		code += '(function() { ';
		code += 'if (! SF.pl.check_saved_searches) return; ';
		code += 'SF.pl.check_saved_searches.loadData(';
		code +=	data + '); ';
		code += '})();';
		return 'location.assign(\'' + code + '\');';
	}

	function onCreated(tab) {
		if (! checkURL(tab.url)) return;
		var len = items_to_check.length;
		var i = 0;
		(function executeScript(i) {
			var item = items_to_check[i];
			if (! item) return;
			if (! item.data) {
				executeScript(++i);
			} else {
				chrome.tabs.executeScript(tab.id, {
					code: getCode(item.data)
				}, function() {
					executeScript(++i);
				});
			}
		})(i);
	}

	function onUpdated(tab_id, change_info, tab) {
		if (change_info.status !== 'complete')
			return;
		return onCreated(tab);
	}

	function broadcast(data) {
		chrome.tabs.query({ }, function(tabs) {
			tabs.forEach(function(tab) {
				if (! checkURL(tab.url)) return;
				chrome.tabs.executeScript(tab.id, {
					code: getCode(data)
				});
			});
		});
	}

	function reset() {
		clearTimeout(timeout);
		items_to_check.forEach(function(item) {
			item.stopTimer();
		});
		items_to_check = [];
	}

	function getKeywordList() {
		reset();
		request({
			url: 'http://fanfou.com/home',
			responseType: 'document',
			success: function(document) {
				var selector = '#navigation ul li:nth-of-type(2) a';
				var userpage = document.querySelector(selector);
				if (userpage) {
					var url = userpage.href;
					current_userid = url.replace('http://fanfou.com/', '');
					current_userid = decodeURIComponent(current_userid);
					extractKeywords(document);
				} else {
					current_userid = '';
				}
			}
		});
		timeout = setTimeout(getKeywordList, 20 * 60 * 1000);
	}

	function extractKeywords(document) {
		var saved_searches = document.getElementById('savedsearchs');
		if (! saved_searches) return;
		var items = saved_searches.querySelectorAll('ul li a span');
		var keywords = [].slice.call(items).map(function(item) {
			return item.textContent;
		});
		items_to_check = keywords.map(function(keyword) {
			return new ItemToCheck(keyword);
		});
	}

	var items_to_check = [];
	var show_notification = false;
	var timeout;
	var current_userid;

	return {
		load: function() {
			getKeywordList();
			chrome.tabs.onCreated.addListener(onCreated);
			chrome.tabs.onUpdated.addListener(onUpdated);
		},
		unload: function() {
			reset();
			chrome.tabs.onCreated.removeListener(onCreated);
			chrome.tabs.onUpdated.removeListener(onUpdated);
			notifications.forEach(function(n) {
				if (n.id && n.id.indexOf('saved-search-') === 0)
					n.cancel();
			});
		},
		update: function(option) {
			show_notification = option;
		}
	};
})());