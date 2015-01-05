SF.st = {};

/* 选项默认值 */

SF.st.default_settings = {
	/* 页面功能*/
		/* Timeline 时间线 */
			expanding_replies: true,
				'expanding_replies.number': 3,
				'expanding_replies.auto_expand': false,
			auto_pager: true,
			enrich_statuses: true,
		/* 输入框 */
			float_message: false,
				'float_message.notlostfocus': false,
				'float_message.keepmentions': false,
			disable_autocomplete: true,
				'disable_autocomplete.sf_autocomplete': true,
		/* 侧栏 */
			fav_friends: false,
			check_saved_searches: true,
				'check_saved_searches.show_notification': true,
		/* 批量管理 */
			status_manage: true,
			privatemsg_manage: true,
			friend_manage: true,
		/* 更多设置 */
			unread_statuses: true,
				'unread_statuses.auto_show': true,
				'unread_statuses.playsound': false,
			user_switcher: true,
			friendship_check: false,
			advanced_sidebar: true,
	/* 页面外观 */
		/* 功能 */
			clean_personal_theme: false,
			remove_app_recom: true,
				'remove_app_recom.completely_remove': false,
			disguise_username: false,
			'disguise_username.fake_name': '\u7565',
			replace_self_name: false,
		/* 字体 */
			relaxed_letter_spacing: true,
			emoji: true,
			font_reset_cn: false,
			counternum_font: true,
				'counternum_font.fontname': navigator.platform == 'Win32' ?
					'Lato' : 'Helvetica Neue',
		/* 细节 */
			translucent_sidebar: true,
			box_shadows: false,
			logo_remove_beta: true,
			rescale_background: true,
		/* 更多设置 */
			newstyle_trendlist: true,
			newstyle_op_icons: true,
	/* 工具 */
		/* 桌面通知 */
			notification: true,
				'notification.timeout': 15,
				'notification.mentions': true,
				'notification.privatemsgs': true,
				'notification.followers': true,
				'notification.notdisturb': true,
				'notification.updates': true,
				'notification.playsound': true,
		/* 右键菜单 */
			share_to_fanfou: false,
	/* 系统 */
		rating: true,
		backup_avatar: true,
		restoring_state: true,
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

	localStorage['settings'] = JSON.stringify(settings);

	return settings;
})();
