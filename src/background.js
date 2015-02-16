/* 文件缓存 */

function getURL(path) {
  return path && chrome.extension.getURL(path) + '?v=' + SF.version;
}

function loadFile(file) {
  if (! file) return;
  var req = new XMLHttpRequest();
  req.open('GET', file, false);
  req.send(null);
  return req.responseText;
}

/* 扩展信息 */

var manifest = chrome.app.getDetails();

SF.version = manifest.version;
SF.old_version = localStorage['sf_version'];
localStorage['sf_version'] = SF.version;

SF.updated = SF.old_version && SF.old_version != SF.version;
SF.contentScripts = manifest['content_scripts'][0];

/* 通知 */

window.Notifications = window.Notifications || window.webkitNotifications;
var notifications = [];

function showNotification(options) {
  var notification;

  options.icon = options.icon || '/icons/icon-128.png';
  options.title = options.title || '太空饭否';

  if (Notifications) {
    notification = Notifications.createNotification(options.icon,
      options.title, options.content);
  } else {
    notification = new Notification(options.title, {
      icon: options.icon,
      body: options.content
    });
  }

  if (options.id) {
    notification.id = options.id;
    notifications = notifications.filter(function(n) {
      if (n.id != options.id)
        return true;
      n.cancel();
      return false;
    });
  }

  notification.addEventListener('close', function(e) {
    clearTimeout(notification.timeout);
    hideNotification(notification);
  }, false);
  notification.addEventListener('show', playSound, false);

  notification.show && notification.show();
  notification.cancel = notification.cancel || notification.close;
  notifications.push(notification);

  if (options.timeout !== false) {
    notification.addEventListener('show', function() {
      notification.timeout = setTimeout(function() {
        hideNotification(notification);
      }, options.timeout || 30000);
    }, false);
  }

  return notification;
}
function hideAllNotifications() {
  notifications.
  slice(0, notifications.length).
  forEach(hideNotification);
}
function hideNotification(notification) {
  notification.cancel();
  if (notification.timeout)
    clearTimeout(notification.timeout);
  var index = notifications.indexOf(notification);
  if (index > -1)
    notifications.splice(index, 1);
}

var playSound = (function() {
  var audio = new Audio;
  audio.src = '/resources/sounds/ding.mp3';
  var timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      if (! SF.st.settings['notification.playsound'])
        return;
      if (audio.networkState !== 1)
        return playSound();
      audio.play();
    }, 50);
  }
})();

function createTab(url) {
  chrome.tabs.create({
    url: url,
    active: true
  }, function(tab) {
    chrome.windows.update(tab.windowId, {
      focused: true
    });
  });
}


/* 更新历史 */

var updates = (function() {
  function fixVersionNum(version) {
    return parseInt(version.replace(/\./g, ''), 10);
  }

  var updated_items = [];
  var old_version = fixVersionNum(SF.old_version || '0.6.4.0');

  var updates = Object.keys(update_history).filter(function(version_num) {
    return fixVersionNum(version_num) > old_version;
  });

  updates.forEach(function(version) {
    update_history[version].forEach(function(item) {
      if (updated_items.indexOf(item) === -1)
        updated_items.push(item);
    });
  });

  return updated_items;
})();

/* 初始化插件 */

var PLUGINS_DIR = 'plugins/';

// 初始化扩展信息
var details = { };
for (var i = 0; i < plugins.length; ++i) {
  var item = plugins[i];
  var detail = {
    options: item.options,
    type: item.type,
    earlyload: item.earlyload === true,
    sync: item.sync === true
  };
  // 同步缓存样式内容
  if (item.css)
    detail.style = PLUGINS_DIR + item.css;
  if (item.js)
    detail.script = PLUGINS_DIR + item.js;
  details[item.name] = detail;

  // 处理其他类型扩展
  if (item.bg_js) (function(name) {
    detail.bg_script = item.bg_js;
    var script = document.createElement('script');
    script.src = PLUGINS_DIR + detail.bg_script;
    script.onload = function(e) {
      initBgPlugin(name);
    }
    document.body.appendChild(script);
  })(item.name);
}
plugins = void(0);

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
    if ((! item.script && ! item.style) || ! SF.st.settings[name]) continue;
    var detail = {
      name: name,
      earlyload: item.earlyload,
      sync: item.sync,
      style: getURL(item.style),
      script: (item.sync || item.earlyload) ?
        loadFile(item.script) : getURL(item.script),
    };
    if (item.options)
      detail.options = getPluginOptions(name);
    page_cache.push(detail);
  }
  var init_message = {
    type: 'init',
    common: {
      probe: loadFile('common/probe.js'),
      namespace: loadFile('namespace.js'),
      functions: loadFile('functions.js'),
      style: {
        css: getURL('common/main.css')
      },
      font: getURL('resources/fonts/Lato-Regular.css'),
      common: getURL('common/common.js')
    },
    data: page_cache
  };
  page_cache = JSON.stringify(init_message);
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

var ports = { };

function checkURL(url) {
  if (typeof url != 'string') return false;
  return url.substr(0, 18) == 'http://fanfou.com/';
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
    } else if (msg.type == 'openURL') {
      createTab(msg.url);
    }
  });
  // 显示太空饭否图标
  chrome.pageAction.show(tabId);
  // 向目标发送初始化数据
  port.postMessage(page_cache);
});

// 维持太空饭否图标
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (checkURL(tab.url))
    chrome.pageAction.show(tabId);
});

// 连接已打开的页面
function connectTab(tab) {
  if (tab && checkURL(tab.url)) {
    (function loadJS(i) {
      chrome.tabs.executeScript(tab.id, {
        file: SF.contentScripts.js[i++]
      }, function() {
        if (SF.contentScripts.js[i]) loadJS(i);
      });
    })(0);

    SF.contentScripts.css.forEach(function(css) {
      chrome.tabs.insertCSS(tab.id, {
        file: css
      });
    });
  }
}
chrome.tabs.query({}, function(tabs) {
  tabs.forEach(connectTab);
});

/* 监听选项变动 */

function updateSettings(e) {
  if (e.key != 'settings') return;
  if (e.oldValue == e.newValue) return;

  // 查找发生变动的选项
  var old_settings = e.oldValue ? JSON.parse(e.oldValue) : SF.st.default_settings;
  var new_settings = JSON.parse(e.newValue);
  var changed_keys = [];
  for (var key in new_settings) {
    if (! new_settings.hasOwnProperty(key)) continue;
    if (new_settings[key] != old_settings[key])
      changed_keys.push(key);
  }
  if (! changed_keys) return;

  var update_info = [];
  var processed_plugins = [];
  changed_keys.forEach(function(setting_name) {
    SF.st.settings[setting_name] = new_settings[setting_name];
  });
  changed_keys.forEach(function(setting_name) {
    // 分离选项信息
    var main_name, option_name;
    var dot_pos = setting_name.indexOf('.');
    if (dot_pos > -1) {
      main_name = setting_name.substr(0, dot_pos);
      option_name = setting_name.substr(dot_pos + 1);
    } else {
      main_name = setting_name;
    }
    if (processed_plugins.indexOf(main_name) > -1) return;
    processed_plugins.push(main_name);

    // 确定处理方式
    if (details[main_name]) {
      var detail = details[main_name];
      if (detail.bg_script) {
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
      }
      if (detail.script || detail.style) {
        // 页面扩展
        if (option_name) {
          if (new_settings[main_name] &&
            old_settings[main_name]) {
            update_info.push({
              type: 'update',
              name: main_name,
              options: getPluginOptions(main_name),
              earlyload: detail.earlyload
            });
          }
        } else {
          if (! SF.st.settings[main_name]) {
            update_info.push({
              type: 'disable',
              name: main_name,
              earlyload: detail.earlyload
            });
          } else {
            update_info.push({
              type: 'enable',
              name: main_name,
              style: getURL(detail.style),
              script: detail.earlyload ?
                loadFile(detail.script) : getURL(detail.script),
              options: getPluginOptions(main_name),
              earlyload: detail.earlyload
            });
          }
        }
      }
    }
  });

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
}
addEventListener('storage', updateSettings, false);

if (! SF.old_version) {
  // 首次使用太空饭否
  createTab('http://fanfou.com/home');
  setTimeout(function() {
    var text = '太空饭否已经安装到您的浏览器! ' +
      '请注意地址栏右端的 "饭" 字图标, 点击它将会弹出设置界面, ' +
      '在这里可以开启和关闭太空饭否的各种功能, 以满足您的个性化需求.';
    showNotification({
      content: text,
      timeout: 120000
    })
    .addEventListener('click', function() {
      this.cancel();
    });
  }, 1000);
}