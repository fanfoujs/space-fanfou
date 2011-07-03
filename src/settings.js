SF.st = {};

/* 选项默认值 */

SF.st.default_settings = {
    font_reset: false,
    translucent_sidebar: true,
    newstyle_trendlist: true,
    logo_remove_beta: true,
    expanding_replies: true,
    'expanding_replies.number': 3,
    'expanding_replies.auto_expand': false,
    image_uploading: true,
    user_switcher: false,
    float_message: false,
    'float_message.noajaxattop': false,
    repost_photo_preview: true,
    disable_autocomplete: false,
    share_to_fanfou: true,
};

/* 更新选项数据 */

(function() {
    var storage_version = localStorage['version'];

    // 将原始存储方式更新为新的存储方式
    if (! storage_version) {
        var setting_names = [
            'font_reset', 'translucent_sidebar', 'newstyle_trendlist', 
            'logo_remove_beta', 'expanding_replies', 'expanding_replies.number',
            'image_uploading', 'user_switcher', 'float_message',
            'repost_photo_preview', 'share_to_fanfou'
        ];
        var settings = { };
        for (var i = 0; i < setting_names.length; ++i) {
            var key = setting_names[i];
            if (localStorage[key] !== undefined) {
                settings[key] = JSON.parse(localStorage[key]);
                localStorage.removeItem(key);
            }
        }
        localStorage['settings'] = JSON.stringify(settings);
        localStorage['version'] = storage_version = 1;
    }
})();

/* 读取选项 */

SF.st.settings = (function() {
    var settings = JSON.parse(localStorage['settings']);
    for (var key in SF.st.default_settings) {
        if (! SF.st.default_settings.hasOwnProperty(key)) continue;
        if (settings[key] === undefined)
            settings[key] = SF.st.default_settings[key];
    }

    return settings;
})();
