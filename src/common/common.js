var SF = (function() {
    var empty_func = function() { };

    function pluginLoader(load_func) {
        return function() {
            if (this.loaded) return;
            this.loaded = true;
            load_func.call(this);
        };
    }

    function pluginUnloader(unload_func) {
        return function() {
            if (! this.loaded) return;
            this.loaded = false;
            unload_func.call(this);
        };
    }

    return {
        pl: { },
        plugin: function(func) {
            if (! func) func = { };
            this.loaded = false;
            this.update = func.update ? func.update : empty_func;
            this.load = pluginLoader(func.load ? func.load : empty_func);
            this.unload = pluginUnloader(func.unload ? func.unload : empty_func);
        }
    };
})();
