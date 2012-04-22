SF.pl.auto_pager = new SF.plugin((function($) {
  var $more = $('#pagination-more');
  if (! $more.length) return;
  
  var is_loaded;
  
  var $win = $(window);
  var $html = $('html');
  var body = document.body;
  var docelem = document.documentElement;
  var $totop = $('#pagination-totop');
  
  var t;
  var currentPos;
  
  var remain = 500;
  
  function onScroll(e) {
    clearTimeout(t);
    t = setTimeout(autoPager, 250);
  }
  
  function autoPager() {
    currentPos = body.scrollTop + docelem.clientHeight;
    if (currentPos <= $more.offset().top - remain)
      return;
    if (currentPos >= body.clientHeight)
      return;
    if ($more.hasClass('loading'))
      return;

		SF.fn.emulateClick($more);
  }
  
  function onKeypress(e) {
    if (e.target !== body) return;
    if (e.ctrlKey || e.altKey) return;
    var key = e.which;
    switch (key) {
      case 97: case 116:
        e.preventDefault();
        break;
    }
    switch (key) {
      case 116:
				SF.fn.emulateClick($totop);
        break;
      case 97:
        is_loaded ? unload() : load();
        break;
    }
  }

  function load() {
    if (is_loaded) return;
    is_loaded = true;
    
    $win.bind('scroll', onScroll);
  }
  
  function unload() {
    if (! is_loaded) return;
    is_loaded = false;
    
    $win.unbind('scroll', onScroll);
  }

  return {
    'load': function() {
      load();
      $win.bind('keypress', onKeypress);
    },
    'unload': function() {
      unload();
      $win.unbind('keypress', onKeypress);
    }
  };
})(jQuery));
