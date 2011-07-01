function $i(id) { return document.getElementById(id); }
function $c(tagname) { return document.createElement(tagname); }
function $t(text) { return document.createTextNode(text); }

var docelem = document.documentElement;

function insertStyle(style, name) {
    var id ='sf_style_' + name;
    if ($i(id)) return;
    var $style = $c('style');
    $style.appendChild($t(style));
    if (name) $style.id = id;
    $style.className = 'space-fanfou';
    docelem.appendChild($style);
}

function insertScript(script, name) {
    var id = 'sf_script_' + name;
    if ($i(id)) return;
    var $script = $c('script');
    $script.appendChild($t(script));
    if (name) $script.id = id;
    $script.className = 'space-fanfou';
    docelem.appendChild($script);
}

var port = chrome.extension.connect();
port.onMessage.addListener(function(msg) {
    if (msg.type == 'init') {
        insertStyle(msg.common.style.css, 'common');
        var scripts = [];
        insertScript(msg.common.namespace, 'namespace');
        insertScript(msg.common.functions, 'functions');
        insertScript(msg.common.style.js, 'style');
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
        }
        scripts.push([load_plugins.join('\n')]);
        insertScript(msg.common.probe, 'probe');
        SF.fn.waitFor(function() {
            return $i('sf_flag_libs_ok');
        }, function() {
            for (var i = 0; i < scripts.length; ++i)
                insertScript.apply(insertScript, scripts[i]);
            delete scripts;
        });
    } else if (msg.type == 'update') {
        for (var i = 0; i < msg.data.length; ++i) {
            var item = msg.data[i];
            var plugin = 'SF.pl.' + item.name;
            var updates = [];
            switch (item.type) {
                case 'update':
                    updates.push(
                            plugin + '.update.apply(' + plugin + ',' +
                            JSON.stringify(item.options) + ');');
                    break;
                case 'enable':
                    if (item.style)
                        insertStyle(item.style, item.name);
                    if (item.script) {
                        insertScript(item.script, item.name);
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
            location.assign('javascript:' + updates.join(''));
        }
    }
});
