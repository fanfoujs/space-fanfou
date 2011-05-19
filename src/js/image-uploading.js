SF.checkAndExec('image_uploading', [], function() {
	var $message = $('#message');
	if (! $message.size()) return;
	var $h2 = $('h2', $message);
	var $textarea = $('textarea', $message);
	var $action = $('input[name=action]', $message);
	var $button = $('<a>');
	$button.attr('href', 'javascript:;');
	$button.attr('id', 'u_button');
	var $upload = $('<input>');
	$upload.attr('type', 'file');
	$upload.attr('name', 'picture');
	$upload.attr('size', '1');
	$button.append($upload);
	$h2.append($button);
	var $file = $('<span>');
	$file.attr('id', 'u_filename');
	$h2.append($file);
	$upload.change(function() {
		$file.text('');
		$file.text($upload.value);
		var $iframe = $('<iframe>');
		$iframe.attr('name', 'upload_image');
		$message.append($iframe);
		$photo = $('<input>');
		$photo.attr('type', 'hidden');
		$photo.attr('name', 'photo');
		$message.append($photo);
		$textarea.attr('name', 'desc');
		$action.val('photo.upload');
		$message.attr('enctype', 'multipart/form-data');
		$message.attr('action', 'http://m.fanfou.com/home');
		$message.attr('target', 'upload_image');
		$message.submit(function() {
			$iframe.load(function() {
				window.location.reload();
			});
		});
	});
});
