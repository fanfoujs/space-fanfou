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

function insertScript(script, name, is_source) {
    var $script = $c('script');
    if (is_source) {
        $script.appendChild($t(script));
    } else {
        $script.src = script;
    }
    if (name) $script.id = 'sf_script_' + name;
    $script.className = 'space-fanfou';
    docelem.appendChild($script);
}

var port = chrome.extension.connect();
port.onMessage.addListener(function(msg) {
    if (msg.type == 'init') {
        var load_plugins = [];
        for (var i = 0; i < msg.data.length; ++i) {
            var item = msg.data[i];
            if (item.style) insertStyle(item.style, item.name);
            if (item.script) {
                insertScript(item.script, item.name);
                var prefix = 'SF.pl.' + item.name;
                if (item.options) {
                    load_plugins.push(
                        prefix + '.update.apply(this, ' +
                        JSON.stringify(item.options) + ');');
                }
                load_plugins.push(prefix + '.load();');
            }
        }
        insertScript(load_plugins.join('\n'), null, true);
    } else if (msg.type == 'update') {
    }
});
