SF.pl.backup_avatar = new SF.plugin((function($) {
  var avatar_data = SF.fn.getData('sf_avatar');
  localStorage.removeItem('sf_avatar');

  if (location.pathname !== '/settings')
    return;

  var $form = $('#setpicture');
  var file = $('#pro_bas_picture')[0];

  function onSubmit(e) {
    if (! file.files.length) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    var fr = new FileReader;
    fr.onload = function(e) {
      cacheImage(fr.result);
      $form.off('submit', onSubmit).submit();
    }
    fr.readAsDataURL(file.files[0]);
  }
  function cacheImage(data) {
    SF.fn.setData('sf_avatar', data);
  }
  function loadCache() {
    if (! avatar_data) return;
    if (confirm('是否发表消息告诉大家你更换了新头像?')) {
      var data = {
        token: $form[0].token.value,
        photo_base64: avatar_data,
        desc: '我刚刚上传了新头像',
        action: 'photo.upload',
        ajax: 'yes'
      };
      $.ajax('/home/upload', {
        data: data,
        type: 'POST',
        success: function(e) {
          alert('发表成功! :)');
        }
      });
    }
  }

  return {
    load: function() {
      $form.on('submit', onSubmit);
      loadCache();
    },
    unload: function() {
      $form.off('submit', onSubmit);
    }
  };
})(jQuery));
