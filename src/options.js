$(function() {

    function getValue($elem) {
        if ($elem.is(':checkbox'))
            return $elem.is(':checked');
        else
            return $elem.val();
    }

    function setValue($elem, value) {
        if ($elem.is(':checkbox'))
            $elem.prop('checked', value);
        else
            $elem.val(value);
    }

    // 获取选项信息
    $('[key]').each(function() {
        var $t = $(this);
        setValue($t, SF.st.settings[$t.attr('key')]);
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
});
