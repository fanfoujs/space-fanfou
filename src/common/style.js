(function() {
    function $i(id) { return document.getElementById(id); }
    function $t(elem, tagName) {
        return elem ? elem.getElementsByTagName(tagName) : null;
    }
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

    SF.fn.waitFor(function() {
        var $li = $t($i('navigation'), 'li');
        return $li && $li[3];
    }, function() {
        removeBrackets($cn($i('navigation'), 'count'));
    });

    SF.fn.waitFor(function() {
        var $li = $t($i('navtabs'), 'li');
        return $li && $li[3];
    }, function() {
        removeBrackets($cn($i('navtabs'), 'count'));
    });

    SF.fn.waitFor(function() {
        return $i('pagination-totop');
    }, function() {
        var totop = $i('pagination-totop');
        totop.addEventListener('click', function(e) {
            e.preventDefault();
            jQuery('body').animate({ scrollTop: 0 }, 500);
        }, false);
        SF.fn.waitFor(function() {
            return window.jQuery;
        }, function() {
            var $ = jQuery;
            var $totop = $(totop), $win = $(window);
            var main_top = $('#main').offset().top;
            $totop.hide();
            $totop.css('visibility', 'visible');
            $win.scroll(function() {
                if ($totop.is(':visible')) {
                    if ($win.scrollTop() < main_top)
                        $totop.fadeOut();
                } else {
                    if ($win.scrollTop() > main_top)
                        $totop.fadeIn();
                }
            });
        });
    });
})();
