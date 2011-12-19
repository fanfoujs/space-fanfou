// 圣诞彩蛋
(function(port) {
    var end_time = new Date(2011, 11, 26);
    var cond = /下雪[吧啊哇!！]/;
    var now = new Date();
    var is_enabled = false;

    function stopSnow() {
        port.postMessage({
            type: 'egg',
            name: 'snowstorm',
            act: 'disable'
        });
        is_enabled = false;
    }

    SF.fn.waitFor(function() {
        return SF.loaded;
    }, function() {
        is_enabled = !! $i('sf_script_plugin_snowstorm');
        if (now >= end_time && is_enabled)
            stopSnow();
        if (is_enabled)
            showStopSnow();
    });

    if (now >= end_time)
        return;

    function showStopSnow() {
        var stop_snow = $c('a');
        console.log(stop_snow);
        stop_snow.href = '#';
        stop_snow.innerHTML = '停止！';
        stop_snow.id = 'sf_stop_snow';
        stop_snow.addEventListener('click', function() {
            stopSnow();
            document.body.removeChild(this);
        }, false);
        document.body.appendChild(stop_snow);
    }

    var $update = $i('update');
    var $form = $i('message');
    if (! $update) return;
    var $msg = $update.getElementsByTagName('textarea')[0];

    function onMsgSubmit(e) {
        if (is_enabled) return;
        var value = $msg.value;
        if (! cond.exec(value))
            return;
        port.postMessage({
            type: 'egg',
            name: 'snowstorm',
            act: 'enable'
        });
        is_enabled = true;
        showStopSnow();
    }
    $form.addEventListener('submit', onMsgSubmit, false);
    $form.addEventListener('form_submit', onMsgSubmit, false);
})(port);
