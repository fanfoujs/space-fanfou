/* 扩展信息 */

var plugins = [

    /* 页面样式扩展 */

    {
        name: 'font_reset',
        css: 'font_reset.css',
    },
    {
        name: 'translucent_sidebar',
        css: 'translucent_sidebar.css',
    },

    /* 页面功能性扩展 */

    {
        name: 'expanding_replies',
        options: ['number'],
        js: 'expanding_replies.js',
        css: 'expanding_replies.css',
    },
    {
        name: 'image_uploading',
        js: 'image_uploading.js',
        css: 'image_uploading.css',
    },
    {
        name: 'user_switcher',
        js: 'user_switcher.js',
        css: 'user_switcher.css',
    },
    {
        name: 'float_message',
        js: 'float_message.js',
        css: 'float_message.css',
    },
    {
        name: 'repost_photo_preview',
        js: 'repost_photo_preview.js',
    },

    /* 其他扩展 */

    {
        name: 'share_to_fanfou',
        type: 'background',
        js: 'share_to_fanfou.js',
    },

];

/* 选项默认值 */

var default_settings = {
    font_reset: false,
    translucent_sidebar: true,
    expanding_replies: true,
    'expanding_replies.number': 3,
    image_uploading: true,
    user_switcher: false,
    float_message: false,
    repost_photo_preview: true,
    share_to_fanfou: true,
};
