SF.fn.waitFor = (function() {
    var waiting_list = [];

    var interval = 0;
    var lock = false;
    function setWaiting() {
        if (interval) return;
        interval = setInterval(function() {
            if (lock) return;
            lock = true;

            var not_avail = 0;
            for (var i = 0; i < waiting_list.length; ++i) {
                var item = waiting_list[i];
                if (item) {
                    if (item.checker()) {
                        item.worker();
                        waiting_list[i] = null;
                    } else {
                        ++not_avail;
                    }
                }
            }

            if (! not_avail) {
                var t = interval;
                interval = 0;
                clearInterval(t);
            }

            lock = false;
        }, 40);
    }

    return function(checker, worker) {
        waiting_list.push({ checker: checker, worker: worker });
        setWaiting();
    };
})();

SF.fn.fixNumber = function(num, width) {
    var num = num.toString();
    var delta = width - num.length;
    while (delta > 0) {
        num = '0' + num;
        --delta;
    }
    return num;
};

SF.fn.formatDate = function(date) {
    var datestr;
    if (! datestr) {
        datestr = SF.fn.fixNumber(date.getFullYear(), 4) + '-' +
                  SF.fn.fixNumber(date.getMonth() + 1, 2) + '-' +
                  SF.fn.fixNumber(date.getDate(), 2);
    }
    return datestr;
};

SF.fn.isUserPage = function() {
    return !! document.getElementById('overlay-report');
};

SF.fn.emulateClick = function(elem) {
	var e = document.createEvent('MouseEvents');
	e.initMouseEvent('click', false, true)
	elem[0].dispatchEvent(e);
}

SF.fn.waitFor(function() {
    return document && document.body;
}, function() {
    var body = document.body;
    var s = 0;
    var current;
    SF.fn.goTop = function(e) {
        if (e) {
            e.preventDefault();
            s = body.scrollTop;
        }
        current = body.scrollTop;
        if (s != current) return;
        var to = Math.floor(s / 1.15);
        window.scrollTo(0, (s = to));
        if (s >= 1) setTimeout(SF.fn.goTop, 24);
    }
});