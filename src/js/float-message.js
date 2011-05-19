(function() {
    var $i = function(id) { return document.getElementById(id); };
    var $main = $i('main');
    var $update = $i('update');
    var ud_top = -10;
    for (var $p = $update; $p && $p.offsetParent; $p = $p.offsetParent)
        ud_top += $p.offsetTop;
    var ud_height = $update.offsetHeight;
    window.addEventListener('scroll', function() {
        if (window.scrollY > ud_top) {
            $update.className = 'float-message';
            $main.style.paddingTop = (ud_height + 20) + 'px';
        } else {
            $update.className = '';
            $main.style.paddingTop = '20px';
        }
    }, false);
})(); 
