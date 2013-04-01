/* 文件缓存 */

var cache = { };
function cacheFile(file) {
    if (cache[file] === undefined) {
        var req = new XMLHttpRequest();
        req.open('GET', file, false);
        req.send();
        cache[file] = req.responseText;
    }
    return cache[file];
}

/* 初始化插件 */

PLUGINS_DIR = 'plugins/';

// 初始化扩展信息
var details = { };
for (var i = 0; i < plugins.length; ++i) {
    var item = plugins[i];
    var detail = {
        options: item.options,
        type: item.type
    };
    // 同步缓存样式内容
    if (item.css)
        detail.style = cacheFile(PLUGINS_DIR + item.css);
    if (item.js)
        detail.script = cacheFile(PLUGINS_DIR + item.js);
    details[item.name] = detail;

    // 处理其他类型扩展
	if (detail.type == 'background') (function(name) {
		var script = document.createElement('script');
		script.src = PLUGINS_DIR + item.js;
		script.onload = function(e) {
			initBgPlugin(name);
		}
		document.body.appendChild(script);
	})(item.name);
}

// 获取一个插件的全部选项信息
function getPluginOptions(name) {
    var option_names = details[name].options;
    if (! option_names) return null;
    var options = [];
    for (var i = 0; i < option_names.length; ++i)
        options.push(SF.st.settings[name + '.' + option_names[i]]);
    return options;
}

// 建立为页面提供的数据缓存
var page_cache;
function buildPageCache() {
    page_cache = [];
    for (var name in details) {
        if (! details.hasOwnProperty(name)) continue;
        var item = details[name];
        if (item.type || ! SF.st.settings[name]) continue;
        var detail = {
            name: name,
            style: item.style,
            script: item.script,
        };
        if (item.options)
            detail.options = getPluginOptions(name);
        page_cache.push(detail);
    }
}
buildPageCache();

/* 加载背景页面扩展 */

function updateBgPlugin(name) {
    var plugin = SF.pl[name];
    setTimeout(function() {
        plugin.update.apply(plugin, getPluginOptions(name));
    }, 0);
}

function loadBgPlugin(name) {
    setTimeout(function() {
        if (details[name].options)
            updateBgPlugin(name);
        SF.pl[name].load();
    }, 0);
}

function unloadBgPlugin(name) {
    setTimeout(function() {
        SF.pl[name].unload();
    }, 0);
}

function initBgPlugin(name) {
    if (SF.st.settings[name]) loadBgPlugin(name);
}

/* 与页面交互 */

var ports = {};

function checkURL(url) {
    if (typeof url != 'string') return false;
    return url.substr(0, 18) == 'http://fanfou.com/' &&
           url.substr(0, 24) != 'http://fanfou.com/home.2';
}

// 等待页面连接
chrome.extension.onConnect.addListener(function(port) {
    var tabId = port.sender.tab.id;
    // 将连接添加到广播列表
    var portId = 'port_' + tabId;
    ports[portId] = port;
    port.onDisconnect.addListener(function() {
        delete ports[portId];
    });
    // 接收消息
    port.onMessage.addListener(function(msg) {
        if (msg.type == 'egg') {
            var name = msg.name;
            var old_settings = localStorage.settings;
            var settings = JSON.parse(old_settings);
            if (msg.act == 'enable')
                settings[msg.name] = true;
            else if (msg.act == 'disable')
                settings[msg.name] = false;
            settings = JSON.stringify(settings);
            localStorage.settings = settings;
            updateSettings({
                key: 'settings',
                oldValue: old_settings,
                newValue: settings
            });
        }
    });
    // 显示太空饭否图标
    chrome.pageAction.show(tabId);
    // 向目标发送初始化数据
    port.postMessage({
        type: 'init',
        common: {
            probe: cacheFile('common/probe.js'),
            namespace: cacheFile('namespace.js'),
            functions: cacheFile('functions.js'),
            style: {
                css: cacheFile('common/main.css'),
                js: cacheFile('common/style.js')
            },
            common: cacheFile('common/common.js')
        },
        data: page_cache
    });
});

// 维持太空饭否图标
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (checkURL(tab.url))
        chrome.pageAction.show(tabId);
});

// 连接已打开的页面
function connectTab(tab) {
    if (tab && checkURL(tab.url)) {
        chrome.tabs.executeScript(tab.id, { file: 'namespace.js' });
        chrome.tabs.executeScript(tab.id, { file: 'functions.js' });
        chrome.tabs.executeScript(tab.id, { file: 'load.js' });
    }
}
chrome.tabs.getCurrent(connectTab);
chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    if (ports['port_' + tabId] !== undefined)
        return;
    chrome.tabs.get(tabId, function(tab) {
        connectTab(tab);
    });
});

/* 监听选项变动 */

function updateSettings(e) {
    if (e.key != 'settings') return;
    if (e.oldValue == e.newValue) return;

    // 查找发生变动的选项
    var old_settings = JSON.parse(e.oldValue);
    var new_settings = JSON.parse(e.newValue);
    var changed_keys = [];
    for (var key in new_settings) {
        if (! new_settings.hasOwnProperty(key)) continue;
        if (new_settings[key] != old_settings[key])
            changed_keys.push(key);
    }
    if (! changed_keys) return;

    var update_info = [];
    for (var i = 0; i < changed_keys.length; ++i) {
        var setting_name = changed_keys[i];
        SF.st.settings[setting_name] = new_settings[setting_name];
        // 分离选项信息
        var main_name, option_name;
        var dot_pos = setting_name.indexOf('.');
        if (dot_pos > -1) {
            main_name = setting_name.substr(0, dot_pos);
            option_name = setting_name.substr(dot_pos + 1);
        } else {
            main_name = setting_name;
        }

        // 确定处理方式
        if (details[main_name]) {
            var detail = details[main_name];
            if (detail.type == 'background') {
                // 背景页面扩展
                if (option_name) {
                    updateBgPlugin(main_name);
                } else {
                    if (SF.st.settings[main_name]) {
                        loadBgPlugin(main_name);
                    } else {
                        unloadBgPlugin(main_name);
                    }
                }
            } else {
                // 页面扩展
                if (option_name) {
                    update_info.push({
                        type: 'update',
                        name: main_name,
                        options: getPluginOptions(main_name)
                    });
                } else {
                    if (! SF.st.settings[main_name]) {
                        update_info.push({
                            type: 'disable',
                            name: main_name,
                        });
                    } else {
                        update_info.push({
                            type: 'enable',
                            name: main_name,
                            style: detail.style,
                            script: detail.script,
                            options: getPluginOptions(main_name)
                        });
                    }
                }
            }
        }
    }

    // 更新缓存
    if (update_info)
        buildPageCache();

    // 广播更新
    for (var name in ports) {
        if (name.indexOf('port_') !== 0) continue;
        var port = ports[name];
        port.postMessage({
            type: 'update',
            data: update_info
        });
    }
};
addEventListener('storage', updateSettings, false);

var Notifications = window.Notifications || window.webkitNotifications;

var message = '此太空饭否版本已经过期。请点击此处安装新版，然后卸载当前版本。如在安装过程中遇到问题，请联系 @.rex。';
var notification = Notifications.createNotification('/icons/icon-128.png',
		'请安装新版太空饭否 :)', message);

notification.addEventListener('click', function(e) {
	chrome.tabs.create({
		url: 'https://chrome.google.com/webstore/detail/mfofmcdbaeajgdeihmcjjohmhepcdcol'
	});
}, false);

notification.show();
