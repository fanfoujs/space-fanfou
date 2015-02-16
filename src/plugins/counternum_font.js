SF.pl.counternum_font = new SF.plugin((function() {
  var fontname;
  var fontname2;
  var docelem = document.documentElement;
  var style = document.createElement('style');
  var code =
    '#phupdate .tip .counter, ' +
    '#update .tip .counter, ' +
    '#PopupBox .tip .counter {' +
      'font-family: #fontname#, Helvetica, Arial, sans-serif !important;' +
    '} ' +
    '#user_top:first-child>h3 {' +
      'font-family: #fontname2#, Helvetica, Arial, "Hiragino Sans GB", "Hiragino Sans GB W3", "WenQuanYi Micro Hei", "Microsoft Yahei", sans-serif !important;' +
    '} ' +
    '#user_stats .count {' +
      'font-family: #fontname#, "Helvetica Neue", Helvetica, Arial, sans-serif !important;' +
    '} ' +
    '#panel h1 {' +
      'font-family: #fontname2#, Helvetica, Arial, "Hiragino Sans GB W3", "WenQuanYi Micro Hei", "Microsoft Yahei", sans-serif !important;' +
    '}';

  return {
    load: function() {
      fontname = '"' + fontname + '"';
      fontname2 = '"' + fontname2 + '"';
      style.textContent = code.replace(/#fontname#/g, fontname).replace(/#fontname2#/g, fontname2);
      docelem.appendChild(style);
    },
    unload: function() {
      docelem.removeChild(style);
    },
    update: function(font) {
      fontname = font;
      fontname2 = fontname == 'Georgia' ? 'Lato' : fontname;
      var plugin = SF.pl.counternum_font;
      if (plugin.loaded) {
        plugin.unload();
        plugin.load();
      }
    }
  };
})());
