function $c(tagname) { return document.createElement(tagname); }
function $t(text) { return document.createTextNode(text); }

var docelem = document.documentElement;

function insertStyle(style, name) {
    var $style = $c('style');
    $style.appendChild($t(style));
    if (name) $style.id = 'sf_style_' + name;
    $style.className = 'space-fanfou';
    docelem.appendChild($style);
}

function insertScript(script, name) {
    var $script = $c('script');
    $script.appendChild($t(script));
    if (name) $script.id = 'sf_script_' + name;
    $script.className = 'space-fanfou';
    docelem.appendChild($script);
}

function init(msg) {
    insertStyle(msg.common.style);
    insertScript(msg.common.script);
    var load_plugins = [];
    for (var i = 0; i < msg.data.length; ++i) {
        var item = msg.data[i];
        if (item.style) insertStyle(item.style, item.name);
        if (item.script) {
            insertScript(item.script, item.name);
            var plugin = 'SF.pl.' + item.name;
            if (item.options) {
                load_plugins.push(
                    plugin + '.update.apply(' + plugin + ', ' +
                    JSON.stringify(item.options) + ');');
            }
            load_plugins.push(plugin + '.load();');
        }
    }
    insertScript(load_plugins.join('\n'));
}

var port = chrome.extension.connect();
port.onMessage.addListener(function(msg) {
    if (msg.type == 'init') {
        insertScript(msg.common.probe);
        function waitForFlag() {
            setTimeout(function() {
                if (document.getElementById('sf_flag_libs_ok')) {
                    init(msg);
                } else {
                    waitForFlag();
                }
            }, 200);
        }
        waitForFlag();
    } else if (msg.type == 'update') {
    }
});
