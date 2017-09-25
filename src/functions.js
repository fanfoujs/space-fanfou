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
  var listeners = [];
  var intervalId = null;
  var last = get();

  function get() {
    return {
      x: document.documentElement.scrollLeft || document.body.scrollLeft,
      y: document.documentElement.scrollTop || document.body.scrollTop
    };
  }

  function start() {
    intervalId = setInterval(check, 100);
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
  }

  function check() {
    var curr = get();
    var is_scrolled = curr.x !== last.x || curr.y !== last.y;
    if (curr.x !== last.x || curr.y !== last.y) call();
    last = curr;
  }

  function call() {
    listeners.forEach(function(listener) {
      listener();
    });
  }

  SF.fn.scrollHandler = {
    addListener: function(listener) {
      if (listeners.indexOf(listener) === -1) {
        listeners.push(listener);
      }
    },
    removeListener: function(listener) {
      var index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    },
    getScrollTop: function() {
      return get().y;
    }
  };

  start();
});

(function() {
  var s = 0;
  var current, id;
  var stop = function() {
    if (id) {
      cancelAnimationFrame(id);
      id = null;
    }
  };
  SF.fn.goTop = function(e) {
    stop();
    if (e) {
      e.preventDefault && e.preventDefault();
      s = SF.fn.scrollHandler.getScrollTop();
    }
    var breakpoint;
    id = requestAnimationFrame(function(timestamp) {
      if (breakpoint) {
        current = SF.fn.scrollHandler.getScrollTop();
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
  };
})();

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
