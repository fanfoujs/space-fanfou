var SF = (function() {
    return {
        pl: { },
        plugin: function(func) {
            var empty_func = function() { };
            if (! func) func = { };
            this.update = func.update ? func.update : empty_func;
            this.load = func.load ? func.load : empty_func;
            this.unload = func.unload ? func.unload : empty_func;
        }
    };
})();
