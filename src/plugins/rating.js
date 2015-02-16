SF.pl.rating = new SF.plugin((function() {
  var is_page_shown = SF.fn.getData('rating_page_shown');
  if (is_page_shown) return;

  return {
    load: function() {
      function accumulateTime() {
        var time = SF.fn.getData('timer') || 0;
        time++;

        if (time % (60 * 24) === 0) {
          clearInterval(interval);
          SF.fn.setData('rating_page_shown', true);

          if (! SF.st.settings.notification)
            return;

          showNotification({
            content: '喜欢太空饭否吗? 请点击这里为它评分, 并留下您的宝贵意见!',
            timeout: false
          }).
          addEventListener('click', function(e) {
            var url = 'https://chrome.google.com/webstore/detail/%E5%A4%AA%E7%A9%BA%E9%A5%AD%E5%90%A6/mfofmcdbaeajgdeihmcjjohmhepcdcol/reviews';
            createTab(url);
            this.cancel();
          }, false);
        }

        SF.fn.setData('timer', time);
      }

      var interval = setInterval(accumulateTime, 60000);
    }
  };
})());
