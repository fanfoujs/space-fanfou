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
      for (var i = 0;i < waiting_list.length; ++i) {
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

      if (! not_avail ||
        (document.readyState == 'complete' &&
          document.getElementById('sf_flag_libs_ok'))) {
        interval = 0 * clearInterval(interval);
      }

      lock = false;
    }, 40);
  }

  return function(checker, worker) {
    if (checker()) return worker();
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
}

SF.fn.formatDate = function(date) {
  var datestr;
  if (! datestr) {
    datestr = SF.fn.fixNumber(date.getFullYear(), 4) + '-' +
          SF.fn.fixNumber(date.getMonth() + 1, 2) + '-' +
          SF.fn.fixNumber(date.getDate(), 2);
  }
  return datestr;
}

SF.fn.getExtDomain = function() {
  var ext_domain;
  var elems = document.getElementsByClassName('space-fanfou');

  [].some.call(elems, function(elem) {
    var url = elem.href;
    if (! url || url.indexOf('chrome-extension://') !== 0)
      return false;
    ext_domain = url.match(/^(chrome-extension:\/\/[^\/]+\/)/)[1];
    return true;
  });

  return ext_domain;
}

SF.fn.getMyPageURL = function() {
  var my_page_url;
  var nav_links = document.querySelectorAll('#navigation li a');
  for (var i = 0; i < nav_links.length; i++) {
    var link = nav_links[i];
    if (link.textContent === '我的空间') {
      my_page_url = link.href;
      break;
    }
  }
  return my_page_url;
}

SF.fn.isHomePage = function() {
  return location.pathname === '/home'
}

SF.fn.isUserPage = function() {
  return !! document.getElementById('overlay-report');
}

SF.fn.isMyPage = function() {
  var my_page_url = SF.fn.getMyPageURL();
  return my_page_url != null &&
    location.href.indexOf(my_page_url) === 0;
}

SF.fn.emulateClick = function(elem, canBubble) {
  var e = document.createEvent('MouseEvents');
  e.initMouseEvent('click', canBubble === true, true);
  elem.dispatchEvent(e);
}

SF.fn.throttle = function(func, delay) {
  var timeout, context, args;
  return function() {
    context = this;
    args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      func.apply(context, args);
    }, delay);
  }
}

SF.fn.waitFor(function() {
  return document.body;
}, function() {
  SF.fn.scrollHandler = (function() {
    function ScrollHandler(elem) {
      this.elem = elem;
      this._listeners = [];
      this._interval = null;
      this.start();
    }

    ScrollHandler.prototype = {
      addListener: function(listener) {
        if (this._listeners.indexOf(listener) === -1) {
          this._listeners.push(listener);
        }
      },
      removeListener: function(listener) {
        var index = this._listeners.indexOf(listener);
        if (index > -1) {
          this._listeners.splice(index, 1);
        }
      },
      start: function() {
        this._interval = setInterval(this._check.bind(this), 100);
      },
      stop: function() {
        clearInterval(this._interval);
        this.interval = null;
      },
      _call: function() {
        var elem = this.elem;
        this._listeners.forEach(function(listener) {
          listener.call(elem);
        });
      },
      _check: function() {
        var is_scrolled = false;
        var scroll_top = this.elem.scrollTop;
        var scroll_left = this.elem.scrollLeft;
        if (scroll_top !== this.scrollTop) {
          is_scrolled = true;
        } else if (scroll_left !== this.scrollLeft) {
          is_scrolled = true;
        }
        this.scrollTop = scroll_top;
        this.scrollLeft = scroll_left;
        if (is_scrolled) {
          this._call();
        }
      }
    };

    return new ScrollHandler(document.body);
  })();
});

SF.fn.waitFor(function() {
  return document.body;
}, function() {
  var body = document.body;
  var s = 0;
  var current, id;
  var stop = function() { };
  SF.fn.goTop = window.requestAnimationFrame ? function(e) {
    stop();
    stop = function() {
      stop = function() { };
      cancelAnimationFrame(id);
    }
    if (e) {
      e.preventDefault && e.preventDefault();
      s = body.scrollTop;
    }
    var breakpoint;
    id = requestAnimationFrame(function(timestamp) {
      if (breakpoint) {
        current = body.scrollTop;
        if (Math.abs(s - current) > 2) {
          return stop();
        }
        var to = Math.floor(s / 1.15);
        scrollTo(0, (s = to));
      }
      if (s >= 1 || ! breakpoint) {
        breakpoint = timestamp;
        id = requestAnimationFrame(arguments.callee);
      };
    });
  } : function(e) {
    if (e) {
      e.preventDefault();
      s = body.scrollTop;
    }
    current = body.scrollTop;
    if (Math.abs(s - current) > 2) return;
    var to = Math.floor(s / 1.15);
    scrollTo(0, (s = to));
    if (s >= 1) setTimeout(SF.fn.goTop, 24);
  };
});

SF.fn.getData = function(key) {
  var data = null;
  try {
    data = JSON.parse(localStorage.getItem(key));
  } catch (e) { }
  return data;
}

SF.fn.setData = function(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

SF.fn.openURL = function(url) {
  var event = document.createEvent('MessageEvent');
  var msg = {
    type: 'openURL',
    url: url
  };

  event.initMessageEvent('SFMessage', false, false, JSON.stringify(msg));
  dispatchEvent(event);
}
