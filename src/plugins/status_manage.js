SF.pl.status_manage = new SF.plugin((function($) {
	if (! SF.fn.isMyPage()) return;
	if (! $('#stream li .op .delete').length) return;

	var $li = $('#stream li:not(.reply)');

	if (! $li.length) return;

	var REPLY_ATTR = 'repost-status',
		REPOST_ATTR = 'reply-status',
		START_ATTR = 'batch-manage-start',
		INDEX_ATTR = 'status-index',
		HL_ATTR = 'highlighted',
		UP_ATTR = 'batch-manage-upward',
		DOWN_ATTR = 'batch-manage-downward';

	var ALL_ATTRS = [
		REPLY_ATTR,
		REPOST_ATTR,
		INDEX_ATTR,
		START_ATTR,
		HL_ATTR,
		UP_ATTR,
		DOWN_ATTR
	];

	var SEL_ATTRS = [
		START_ATTR,
		HL_ATTR,
		UP_ATTR,
		DOWN_ATTR
	];

	var HL_ATTRS = [
		HL_ATTR,
		UP_ATTR,
		DOWN_ATTR
	];

	var $stream = $('#stream');

	var $manage = $('<div />');
	$manage.addClass('batch-manage statuses');

	var $start;

	function getIndex($li) {
		return parseInt($li.attr(INDEX_ATTR), 10);
	}

	function onClick(e) {
		if ($(e.target).is('input')) return;
		if (! e.shiftKey) return;
		e.preventDefault();
		getSelection().collapse();
		var $current_li = $(e.currentTarget);
		if ($start) {
			if ($start[0] !== e.currentTarget) {
				var start_index = getIndex($start);
				var end_index = getIndex($current_li);
				var min = Math.min(start_index, end_index);
				var max = Math.max(start_index, end_index);
				for (var i = min; i <= max; i++) {
					var $item = $('[' + INDEX_ATTR + '=' + i + ']');
					$item.find('input[type=checkbox][msgid]').prop('checked', true);
				}
			}
			$li.removeAttr(SEL_ATTRS.join(' '));
			$start = null;
		} else {
			$start = $current_li;
			$start.attr(START_ATTR, '');
		}
	}

	function onMouseenter(e) {
		if (! $start) return;
		$li.removeAttr(HL_ATTRS.join(' '));
		var $current_li = $(e.currentTarget);
		var index = getIndex($current_li);
		var start_index = getIndex($start);
		if (index > start_index) {
			$start.attr(UP_ATTR, '');
			$start.nextAll().each(function() {
				var $li = $(this);
				if (getIndex($li) <= index)
					$li.attr(HL_ATTR, '');
			});
			$current_li.attr(DOWN_ATTR, '');
		} else if (index < start_index) {
			$start.attr(DOWN_ATTR, '');
			$start.prevAll().each(function() {
				var $li = $(this);
				if (getIndex($li) >= index)
					$li.attr(HL_ATTR, '');
			});
			$current_li.attr(UP_ATTR, '');
		}
	}

	function getCheckboxes(selector) {
		selector = 'li input[type=checkbox][msgid]' + (selector || '');
		return $(selector, $stream);
	}

	var $select = $('<select />');
	$select
	.append(
		$('<option />')
		.val('default')
		.text('批量处理..')
	)
	.append(
		$('<option />')
		.val('select-all')
		.text('全选')
	)
	.append(
		$('<option />')
		.val('toggle')
		.text('反选')
	)
	.append(
		$('<option />')
		.val('select-replies')
		.text('选中回复')
	)
	.append(
		$('<option />')
		.val('select-reposts')
		.text('选中转发')
	)
	.append(
		$('<option />')
		.val('cancel')
		.text('取消选择')
	)
	.val('default')
	.change(function(evt) {
		switch (this.value) {
		case 'default':
			break;
		case 'select-all':
			getCheckboxes().prop('checked', true);
			break;
		case 'toggle':
			getCheckboxes()
			.each(function() {
				var $checkbox = $(this);
				$checkbox.
				prop('checked', ! $checkbox.prop('checked'));
			});
			break;
		case 'select-replies':
			$('li[reply-status] input[type=checkbox][msgid]', $stream)
			.prop('checked', true);
			break;
		case 'select-reposts':
			$('li[repost-status] input[type=checkbox][msgid]', $stream)
			.prop('checked', true);
			break;
		case 'cancel':
			getCheckboxes()
			.prop('checked', false);
			break;
		}
		this.value = 'default';
	})
	.appendTo($manage);

	var $button = $('<a />');
	$button
	.addClass('bl')
	.text('删除消息')
	.click(function() {
		var $todel = getCheckboxes(':checked');
		var length = $todel.length;
		if (! length || ! confirm('确定要删除选定的 ' + length + ' 条消息吗？'))
			return;

		$button.unbind('click', arguments.callee);

		$select.remove();
		$button.text('处理中..');

		var count = 0;
		$todel.each(function() {
			var $t = $(this);
			var $del = $t.parent().find('a.delete');
			$.ajax({
				type: 'POST',
				url: location.href,
				data: {
					action: 'msg.del',
					msg: $t.attr('msgid'),
					token: $del.attr('token'),
					ajax: 'yes',
				},
				dataType: 'json',
				contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
				success: function(data) {
					if (data.status) {
						FF.util.yFadeRemove($del.get(0), 'li');
						if (++count === length) location.reload();
					} else {
						alert(data.msg);
					}
				},
			});
		});
	})
	.appendTo($manage);

	return {
		load: function() {
			var $checkbox = $('<input>').attr('type', 'checkbox');
			$li
			.each(function(i) {
				var $item = $(this);
				$item.attr(INDEX_ATTR, i);
				var op_btns = $('.op a', this);
				if (! op_btns.length) return;
				var msgid = op_btns.attr('href').split('/').pop();
				var $chk = $checkbox.clone();
				$chk.attr('msgid', msgid);
				$chk.appendTo(this);
				var $reply = $('>.stamp>.reply', this);
				if ($reply.length) {
					var attr;
					var text = $reply.text();
					if (/^转自(.+)(\(查看\))?$/.test(text))
						attr = 'repost-status';
					else if (/^给(.+)的回复(\(查看\))?/.test(text))
						attr = 'reply-status';
					attr && $(this).attr(attr, '');
				}
			})
			.mouseenter(onMouseenter);
			$stream.delegate('li:not(.reply)', 'click.batch-manage', onClick);
			$manage.appendTo('#info');
			$start = null;
		},
		unload: function() {
			getCheckboxes().remove();
			$li.off('mouseenter', onMouseenter).removeAttr(ALL_ATTRS.join(' '));
			$stream.undelegate('.batch-manage');
			$manage.detach();
		}
	};
})(jQuery));
