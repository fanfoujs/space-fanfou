$(function() {
    function getValue($elem) {
        if ($elem.is(':checkbox'))
            return $elem.is(':checked');
        else
            return $elem.val();
    }

    function setValue($elem, value) {
        if ($elem.is(':checkbox'))
            $elem.attr('checked', value);
        else
            $elem.val(value);
    }

    $('[key]').change(function() {
        var $t = $(this);
        var $opts = $('[key^="' + $t.attr('key') + '."]').parents('p');
        if (getValue($t)) {
            $opts.show();
        } else {
            $opts.hide();
        }
    });

    // 获取选项信息
    $('[key]').each(function() {
        var $t = $(this);
        setValue($t, SF.st.settings[$t.attr('key')]);
        $t.change();
    });

    $('#btn_apply').click(function() {
        $('[key]').each(function() {
            var $t = $(this);
            var key = $t.attr('key');
            if (getValue($t) != SF.st.settings[key])
                SF.st.settings[key] = getValue($t);
        });
        localStorage['settings'] = JSON.stringify(SF.st.settings);
    });

    $(window).unload(function() {
        $('#btn_apply').click();
    });
});
