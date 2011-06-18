SF.pl.image_uploading = (function($) {
    var $message = $('#message');
    if (! $message.length) return new SF.plugin();

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
    $upload.attr('title', '上传图片');
    $button.append($upload);

    $upload.change(function() {
        var $iframe = $('<iframe>');
        $iframe.attr('name', 'upload_image');
        $message.append($iframe);
        var $photo = $('<input>');
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

    return new SF.plugin({
        load: function() {
            $h2.append($button);
        },
        unload: function() {
            $button.detach();
        }
    });
})(jQuery);
