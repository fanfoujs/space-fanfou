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

function tryEval(script) {
  script = 'try {' + script + '}' +
    'catch(e) { console.log("An error occurs", e); }';
  eval(script);
}

function unload() {
  location.assign('javascript:SF.unload();');
  SF.unload();
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
    apply(true);
    scripts.push([msg.common.common, 'common']);
    var load_plugins = [];
    for (var i = 0; i < msg.data.length; ++i) {
      var item = msg.data[i];
      if (item.style) insertStyle(item.style, item.name);
      if (item.script) {
        var plugin = 'SF.pl.' + item.name;
        var load_code = 'try {';
        if (item.options) {
          load_code += plugin + '.update.apply(' + plugin + ', ' +
            JSON.stringify(item.options) + ');';
        }
        load_code += plugin + '.load();';
        load_code += '} catch(e) { ';
        load_code += 'console.log("An error occurs while loading ' + plugin + '", e, e.message);';
        load_code += '}';
        if (item.earlyload) {
          eval(item.script);
          eval(load_code);
        } else {
          scripts.push([item.script, 'plugin_' + item.name]);
          load_plugins.push(load_code);
        }
      }
      if (item.sync || item.earlyload) apply(true);
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
          var update = 'if(' + plugin + ')' +
            plugin + '.update.apply(' + plugin + ',' +
            JSON.stringify(item.options) + ');';
          if (item.earlyload) {
            tryEval(update);
          } else {
            updates.push(update);
          }
          break;
        case 'enable':
          if (item.style)
            insertStyle(item.style, item.name);
          if (item.script) {
            if (item.earlyload) {
              tryEval(item.script);
              if (item.options) {
                tryEval(
                  plugin + '.update.apply(' + plugin + ',' +
                  JSON.stringify(item.options) + ');');
              }
              tryEval(plugin + '.load();');
            } else {
              loadScript(item.script, item.name);
              if (item.options) {
                updates.push(
                    plugin + '.update.apply(' + plugin + ',' +
                    JSON.stringify(item.options) + ');');
              }
              updates.push(plugin + '.load();');
            }
          }
          break;
        case 'disable':
          if (item.earlyload) {
            tryEval(plugin + '.unload();');
          } else {
            updates.push('if(' + plugin + ')' + plugin + '.unload();');
            updates.push('jQuery(' +
                   '"#sf_script_' + item.name + '").remove();');
          }
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