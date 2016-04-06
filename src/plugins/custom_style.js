SF.pl.custom_style = new SF.plugin((function($) {
  var $style = $('<style>');
  var code_content = '';

  return {
    update: function(a) {
      code_content = a;
      if (this.loaded) {
        this.unload();
        this.load();
      }
    },
    load: function() {
      $style.text(code_content);
      $style.appendTo('head');
    },
    unload: function() {
      $style.detach();
    }
  };
})(Zepto));