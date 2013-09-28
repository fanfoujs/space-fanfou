SF.st = {};

/* 选项默认值 */

SF.st.default_settings = {
	font_reset_cn: false,
	translucent_sidebar: true,
	box_shadows: false,
	newstyle_trendlist: true,
	newstyle_op_icons: true,
	logo_remove_beta: true,
	remove_app_recom: true,
	expanding_replies: true,
	'expanding_replies.number': 3,
	'expanding_replies.auto_expand': false,
	user_switcher: false,
	float_message: false,
	'float_message.notlostfocus': false,
	'float_message.keepmentions': false,
	disable_autocomplete: false,
	'disable_autocomplete.sf_autocomplete': true,
	share_to_fanfou: false,
	privatemsg_manage: true,
	friend_manage: true,
	advanced_sidebar: true,
	clean_personal_theme: false,
	auto_pager: true,
	notification: true,
	'notification.updates': true,
	'notification.mentions': true,
	'notification.privatemsgs': true,
	'notification.followers': true,
	'notification.notdisturb': false,
	'notification.playsound': true,
	'notification.timeout': 15,
	status_manage: true,
	fav_friends: false,
	rating: true,
	unread_statuses: true,
	'unread_statuses.auto_show': true,
	'unread_statuses.playsound': false,
	counternum_font: true,
	'counternum_font.fontname': navigator.platform == 'Win32' ?
		'Lato' : 'Helvetica Neue',
	repost_self_statuses: false,
	emoji: true,
	friendship_check: true,
	restoring_state: true,
	backup_avatar: true
};

/* 读取选项 */

SF.st.settings = (function() {
	var settings = {};
	var local_settings = JSON.parse(localStorage['settings'] || '{}');

	for (var key in SF.st.default_settings) {
		if (! SF.st.default_settings.hasOwnProperty(key)) continue;
		if (local_settings[key] === undefined)
			settings[key] = SF.st.default_settings[key];
		else
			settings[key] = local_settings[key];
	}

	return settings;
})();
