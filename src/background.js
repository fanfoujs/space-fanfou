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
        $(document.head).append($script);
    }
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

function updateBackgroundPlugin(name) {
    var plugin = SF.pl[name];
    plugin.update.apply(plugin, getPluginOptions(name));
}

function enableBackgroundPlugin(name) {
    if (details[name].options)
        updateBackgroundPlugin(name);
    SF.pl[name].load();
}

for (var name in SF.pl) {
    if (! SF.pl.hasOwnProperty(name)) continue;
    if (typeof SF.pl[name].load != 'function') continue;
    if (SF.st.settings[name]) enableBackgroundPlugin(name);
}

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
            namespace: cacheFile('namespace.js'),
            style: {
                css: cacheFile('common/main.css'),
                js: cacheFile('common/style.js')
            },
            probe: cacheFile('common/probe.js')
        },
        data: page_cache
    });
});

// 连接已打开的页面
function connectTab(tab) {
    if (! tab) return;
    if (tab.url.substr(0, 18) == 'http://fanfou.com/' ||
        tab.url.substr(0, 18) == 'http://fanwai.com/')
        chrome.tabs.executeScript(tab.id, { file: 'load.js' });
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

addEventListener('storage', function(e) {
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
                    updateBackgroundPlugin(main_name);
                } else {
                    if (SF.st.settings[main_name]) {
                        enableBackgroundPlugin(main_name);
                    } else {
                        SF.pl[main_name].unload();
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
}, false);
