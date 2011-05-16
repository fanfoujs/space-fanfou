(function() {
    var $login = $('form#login');
    if (! $login.size()) return;
    var $al = $('#autologin');
    $al.attr('checked', true);
    $al.parent().contents().not($al).remove();
    $al.after(' 保存到“多账户切换列表”');
})();
