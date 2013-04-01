function $i(id) { return document.getElementById(id); }
function $c(tagname) { return document.createElement(tagname); }
function $t(text) { return document.createTextNode(text); }

var docelem = document.documentElement;
var fragment = document.createDocumentFragment();

function insertCode(type, code, name) {
	var id ='sf_' + type + '_' + name;
	if (name && $i(id)) return;
	var $code = $c(type);
	if (code.indexOf('chrome-extension://') === 0) {
		if (type == 'style') {
			$code = $c('link');
			$code.href = code;
			$code.rel = 'stylesheet';
		} else {
			$code.src = code;
		}
	} else {
		$code.appendChild($t(code));
	}
	if (name) $code.id = id;
	$code.className = 'space-fanfou';

	fragment.appendChild($code);
	apply();

	return $code;
}

function insertStyle(style, name) {
	return insertCode('style', style, name);
}

function insertScript(script, name) {
	return insertCode('script', script, name);
}

var apply = (function() {
	var timeout;
	function applyChange() {
		try {
			docelem.appendChild(fragment);
		} catch (e) { }
	}
	return function(force_apply) {
		clearTimeout(timeout);
		if (force_apply)
			return applyChange();
		else
			timeout = setTimeout(applyChange, 0);
	}
})();

var loadScript = (function() {
	var waiting_list = [];
	var slice = Array.prototype.slice;
	var load = SF.fn.throttle(function() {
		if (! waiting_list.length) return;
		var $code = insertScript.apply(
			insertScript, waiting_list.shift());
		if (! $code || $code.complete || ! $code.src)
			load();
		else
			$code.onload = $code.onerror = load;
	}, 0);
	return function() {
		waiting_list.push(slice.call(arguments, 0));
		load();
	}
})();

function unload() {
	location.assign('javascript:SF.unload();');
}

if (($i('sf_flag_libs_ok') || {}).name == 'spacefanfou-flags') {
	location.assign('javascript:(' + SF.unload + ')();');
}

addEventListener('beforeunload', function() {
	port.onDisconnect.removeListener(unload);
}, false);

var port = chrome.extension.connect();
port.onDisconnect.addListener(unload);
port.onMessage.addListener(function(msg) {
	if (typeof msg == 'string')
		msg = JSON.parse(msg);

	if (msg.type == 'init') {
		var scripts = [];
		insertStyle(msg.common.font, 'font');
		insertStyle(msg.common.style.css, 'common');
		loadScript(msg.common.namespace, 'namespace');
		loadScript(msg.common.functions, 'functions');
		loadScript(msg.common.style.js, 'style');
		apply(true);
		scripts.push([msg.common.common, 'common']);
		var load_plugins = [];
		for (var i = 0; i < msg.data.length; ++i) {
			var item = msg.data[i];
			if (item.style) insertStyle(item.style, item.name);
			if (item.script) {
				scripts.push([item.script, 'plugin_' + item.name]);
				load_plugins.push('setTimeout(function() {');
				var plugin = 'SF.pl.' + item.name;
				if (item.options) {
					load_plugins.push(
						plugin + '.update.apply(' + plugin + ', ' +
						JSON.stringify(item.options) + ');');
				}
				load_plugins.push(plugin + '.load();');
				load_plugins.push('}, 0);');
			}
			if (item.sync) apply(true);
		}
		scripts.push([load_plugins.join('\n')]);
		load_plugins = void 0;
		loadScript(msg.common.probe, 'probe');
		SF.fn.waitFor(function() {
			return $i('sf_flag_libs_ok');
		}, function() {
			for (var i = 0; i < scripts.length; ++i)
				loadScript.apply(null, scripts[i]);
			SF.loaded = true;
			scripts = void 0;
		});
	} else if (msg.type == 'update') {
		for (var i = 0; i < msg.data.length; ++i) {
			var item = msg.data[i];
			var plugin = 'SF.pl.' + item.name;
			var updates = [];
			switch (item.type) {
				case 'update':
          updates.push('if(' + plugin + ')');
          updates.push(
              plugin + '.update.apply(' + plugin + ',' +
              JSON.stringify(item.options) + ');');
					break;
				case 'enable':
					if (item.style)
						insertStyle(item.style, item.name);
					if (item.script) {
						loadScript(item.script, item.name);
						if (item.options) {
							updates.push(
									plugin + '.update.apply(' + plugin + ',' +
									JSON.stringify(item.options) + ');');
						}
						updates.push(plugin + '.load();');
					}
					break;
				case 'disable':
					updates.push('if(' + plugin + ')' + plugin + '.unload();');
					updates.push('jQuery(' +
								 '"#sf_script_' + item.name + '").remove();');
					updates.push('jQuery(' +
								 '"#sf_style_' + item.name + '").remove();');
					break;
			}
			// 对每个插件单独执行可以防止一个更新错误影响后面的更新
			loadScript(updates.join(''), 'update_' + item.name);
		}
		loadScript('jQuery("' +
			'[id^=sf_script_update_]").remove();', 'update_clear');
	}
});

addEventListener('SFMessage', function(e) {
	var msg = JSON.parse(e.data);
	if (msg.type == 'openURL') {
		port.postMessage(msg);
	}
});