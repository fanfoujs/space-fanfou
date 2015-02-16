SF.pl.logo_remove_beta = new SF.plugin((function($) {
  var $header = $('.global-header-content');
  if (! $header.length) return;
  
  var attr = 'data-original-logo';
  var beta_re = /url\("?http:\/\/static\d?\.fanfou\.com\/img\/fanfou_beta\.png"?\)/;

  $header.attr(attr, true);
  var origin = $header.css('background-image');
  $header.removeAttr(attr);

  return {
    load: function() {
      $('#sf_style_logo_remove_beta').remove();
      if (beta_re.test(origin)) {
        $header.css('background-image', 'url(http://static2.fanfou.com/img/fanfou.png)');
      }
    },
    unload: function() {
      $header.css('background-image', origin);
    }
  };
})(jQuery));