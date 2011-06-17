(function() {
    function $i(id) { return document.getElementById(id); }
    function $cn(elem, className) {
        return elem ? elem.getElementsByClassName(className) : null;
    }

    function removeBrackets(elems) {
        if (! elems) return;
        for (var i = 0; i < elems.length; ++i) {
            if (elems[i].innerHTML[0] != '(') return;
            elems[i].innerHTML = elems[i].innerHTML.slice(1, -1);
        }
    }

    function onInterval() {
        removeBrackets($cn($i('navigation'), 'count'));
        removeBrackets($cn($i('navtabs'), 'count'));
    }

    var interval = setInterval(onInterval, 200);
    document.addEventListener('DOMContentLoaded', function() {
        clearInterval(interval);
        onInterval();
    }, false);
})();
