/* 文件缓存 */

var cache = { };
function cacheFile(file) {
    if (cache[file] === undefined) {
        var result = null;
        var req = $.ajax({
            async: false,
            url: file,
            success: function(data) {
                result = data;
            }
        });
        cache[file] = result;
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
    if (detail.type == 'background') {
        var $script = $('<script>');
        $script.html(detail.script);
    }
}

// 读取选项
var settings = default_settings;
for (var key in settings) {
    if (! settings.hasOwnProperty(key)) continue;
    if (localStorage[key] !== undefined)
        settings[key] = JSON.parse(localStorage[key]);
}

// 建立为页面提供的数据缓存
var page_cache;
function buildPageCache() {
    page_cache = [];
    for (var name in details) {
        if (! details.hasOwnProperty(name)) continue;
        var item = details[name];
        if (item.type || ! settings[name]) continue;
        var detail = {
            name: name,
            style: item.style,
            script: item.script,
        };
        if (item.options) {
            var options = [];
            for (var i = 0; i < item.options.length; ++i)
                options.push(settings[name + '.' + item.options[i]]);
            detail.options = options;
        }
        page_cache.push(detail);
    }
}
buildPageCache();

/* 加载背景页面扩展 */

/* 与页面交互 */

var ports = {};

// 等待页面连接
chrome.extension.onConnect.addListener(function(port) {
    var tabId = port.sender.tab.id;
    // 将连接添加到广播列表
    var portId = 'port_' + tabId;
    ports[portId] = port;
    port.onDisconnect.addListener(function() {
        delete ports[portId];
    });
    // 显示太空饭否图标
    chrome.pageAction.show(tabId);
    // 向目标发送初始化数据
    port.postMessage({
        type: 'init',
        common: {
            style: cacheFile('common/main.css'),
            script: cacheFile('common/common.js'),
            probe: cacheFile('common/probe.js')
        },
        data: page_cache
    });
});

// 连接已打开的页面
function connectTab(tab) {
    if (! tab) return;
    if (tab.url.substr(0, 18) != 'http://fanfou.com/')
        return;
    chrome.tabs.executeScript(tab.id, { file: 'extensions.js' });
}
chrome.tabs.getCurrent(connectTab);
chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    if (ports['port_' + tabId] === undefined)
        return;
    chrome.tabs.get(tabId, function(tab) {
        connectTab(tab);
    });
});
