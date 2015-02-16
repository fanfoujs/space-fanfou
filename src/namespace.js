var SF = (function() {
  var empty_func = function() { };

  function pluginLoader(load_func) {
    return function() {
      if (this.loaded) return false;
      this.loaded = true;
      load_func.call(this);
      return true;
    };
  }

  function pluginUnloader(unload_func) {
    return function() {
      if (! this.loaded) return false;
      this.loaded = false;
      unload_func.call(this);
      return true;
    };
  }

  return {
    fn: { },
    pl: { },
    cb: { },
    plugin: function(func) {
      if (! func) func = { };
      for (var name in func) {
        if (! func.hasOwnProperty(name)) continue;
        this[name] = func[name];
      }
      this.loaded = false;
      this.update = func.update || empty_func;
      this.load = pluginLoader(func.load || empty_func);
      this.unload = pluginUnloader(func.unload || empty_func);
    },
    unload: function() {
      for (var plugin in SF.pl) {
        if (! SF.pl.hasOwnProperty(plugin)) continue;
        try {
          SF.pl[plugin].unload();
        } catch (e) {
          console.log('An error occurs while unloading SF.pl.' + plugin, e);
        }
      }
      SF.pl = { };
      if (typeof FF == 'undefined') return;
      var $ = jQuery;
      var reserved_scripts = [
        'sf_script_common',
        'sf_script_style'
      ];
      var items = [
        '#sf_flag_libs_ok',
        'script.space-fanfou',
        'style.space-fanfou',
        'link.space-fanfou[rel="stylesheet"]'
      ];
      $(items.join(', ')).each(function() {
        if (reserved_scripts.indexOf(this.id) === -1) {
          this.parentNode.removeChild(this);
        }
      });
    }
  };
})();
