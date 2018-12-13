SF.pl.logo_remove_beta = new SF.plugin((function($) {
  var $header = $('.global-header-content');
  if (! $header.length) return;

  var attr = 'data-original-logo';
  var beta_re = /url\("?https?:\/\/static\d?\.fanfou\.com\/img\/fanfou_beta\.(png|svg)"?\)/;

  $header.attr(attr, true);
  var origin = $header.css('background-image');
  $header.removeAttr(attr);

  return {
    load: function() {
      if (! beta_re.test(origin)) {
        $('#sf_style_logo_remove_beta').remove();
      }
    },
    unload: function() {
      $header.css('background-image', origin);
    }
  };
})(jQuery));
