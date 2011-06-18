(function() {
    function $i(id) { return document.getElementById(id); }
    function $cn(elem, className) {
        return elem ? elem.getElementsByClassName(className) : null;
    }

    function removeBrackets(elems) {
        if (! elems) return;
        for (var i = 0; i < elems.length; ++i) {
            if (elems[i].innerHTML[0] != '(') continue;
            elems[i].innerHTML = elems[i].innerHTML.slice(1, -1);
        }
    }

    function onInterval() {
        removeBrackets($cn($i('navigation'), 'count'));
        removeBrackets($cn($i('navtabs'), 'count'));
    }

    var interval = setInterval(onInterval, 40);
    // FIXME 此处不一定会被执行，请修复这个问题
    window.addEventListener('DOMContentLoaded', function() {
        clearInterval(interval);
        onInterval();
        $i('pagination-totop').addEventListener('click', function(e) {
            e.preventDefault();
            jQuery('body').animate({ scrollTop: 0 }, 500);
        }, false);
    }, true);
})();
