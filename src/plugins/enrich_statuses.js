SF.pl.enrich_statuses = new SF.plugin((function($) {
  var DAY_IN_SECONDS = 24 * 60 * 60;

  var is_status_page = location.href.indexOf('http://fanfou.com/statuses/') == 0;

  var $stream;

  var $temp = $('<div>');

  var set_position_interval;

  var short_url_re = /https?:\/\/(?:bit\.ly|goo\.gl|v\.gd|is\.gd|tinyurl\.com|to\.ly|yep\.it|j\.mp|t.cn|t.co)\//;
  var fanfou_url_re = /^http:\/\/(?:\S+\.)?fanfou\.com\//;

  var MutationObserver = MutationObserver || WebKitMutationObserver;
  var slice = Array.prototype.slice;

  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      var added = slice.call(mutation.addedNodes, 0);
      var $prev = $(mutation.previousSibling);
      if ($prev.is('ol')) {
        $prev.find('li').each(function() {
          processItem($(this));
        });
      }
      if (added.length) {
        added.forEach(function(item) {
          processItem($(item));
        });
      }
    });
  });

  var waitFor = (function() {
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

  function getNaturalDimentions(url, callback) {
    var image = new Image;
    image.src = url;
    waitFor(function() {
      return image.naturalWidth;
    }, function() {
      callback({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
      image.src = '';
      image = null;
    });
  }

  function findAndCount(text, pattern) {
    var re = new RegExp(pattern, 'g');
    var result = text.match(re);
    return result ? result.length : 0;
  }

  function setLink($link, url) {
    var original_url = $link.prop('href');
    $link.attr('original-url', original_url);
    $link.prop('title', url);
    $link.prop('href', url);
    var trailing_slash_re = /\/$/;
    var display_url = url.replace(/^https?:\/\/(?:www\.)?/, '');
    if (findAndCount(display_url, '/') === 1 && trailing_slash_re.test(display_url)) {
      display_url = display_url.replace(trailing_slash_re, '');
    } else if (display_url.length > 25) {
      display_url = display_url.substring(0, 25) + '...';
    }
    $link.text(display_url);
  }

  var cached_short_urls = SF.fn.getData('cached_short_urls') || { };
  function expandUrl(url, callback, original_url) {
    original_url = original_url || url;
    if (cached_short_urls[url]) {
      setTimeout(function() {
        callback(cached_short_urls[url]);
      });
    } else {
      $.ajax({
        type: 'GET',
        url: 'http://urlex.org/txt/' + url,
        success: function(long_url) {
          long_url = long_url && long_url.trim();
          if (! long_url || long_url.indexOf('http') !== 0) {
            setTimeout(function() {
              expandUrl(url, callback, original_url);
            }, 5000);
            return;
          }
          if (short_url_re.test(long_url) && url != long_url) {
            return expandUrl(long_url, callback, original_url);
          }
          cached_short_urls[original_url] = long_url;
          SF.fn.setData('cached_short_urls', cached_short_urls);
          callback(long_url);
        }
      });
    }
  }

  var enrichStatus = (function() {
    var lib = [];

    function UrlItem(url) {
      this.url = url;
      this.status = 'initialized';
      this.callbacks = [];
      this.fetch();
      lib.push(this);
    }

    UrlItem.prototype.fetch = function fetch() {
      var self = this;
      var url = this.longUrl || this.url;
      this.status = 'loading';

      function markAsIgnored() {
        self.status = 'ignored';
        locache.set('sf-url-' + self.url, self, DAY_IN_SECONDS);
      }

      if (short_url_re.test(url)) {
        expandUrl(url, function(long_url) {
          self.longUrl = long_url;
          self.fetch();
        });
        return;
      } else if (self.url.indexOf('fanfou.com') === -1 &&
        ! self.longUrl) {
        setTimeout(function() {
          self.longUrl = self.url;
          markAsIgnored();
        });
      }

      if (! isPhotoLink(url) && ! isMusicLink(url)) {
        markAsIgnored();
        return;
      }

      var result = url.match(xiami_song_re);
      if (result) {
        var music_url = result[0];
        self.data = {
          type: 'music',
          url: music_url,
          id: music_url.match(/\d+$/)[0]
        };
        $.get(music_url, function(html) {
          var re = /<img class="cdCDcover185" src="(\S+)" \/>/;
          var cover_url = (html.match(re) || [])[1];
          self.data.cover_url = cover_url || '';
          self.data.cover_url_large = cover_url.replace(/_2\.jpg/, '.jpg');
          if (cover_url) {
            getNaturalDimentions(cover_url, function(dimentions) {
              self.cover_width = dimentions.width;
              self.cover_height = dimentions.height;
              self.status = 'completed';
              SF.fn.setData('sf-url-' + self.url, self);
              setTimeout(function() {
                self.call();
              });
            });
          }
        });
        return;
      }

      var result = url.match(instagram_re);
      if (result) {
        var original_url = result[0];
        if (! original_url.match(/\/$/)) {
          original_url += '/';
        }
        var image_url = original_url + 'media/';
        image_url = image_url.replace('instagr.am', 'instagram.com');
        $.get(original_url, function(html) {
          var re = /<meta property="og:image" content="(\S+)" \/>/;
          var large_url = (html.match(re) || [])[1];
          if (large_url) {
            loadImage({
              url: self.url,
              large_url: large_url,
              thumbnail_url: image_url + '?size=t',
              urlItem: self
            });
          } else {
            markAsIgnored();
          }
        });
        return;
      }

      var result = url.match(pinsta_re);
      if (result) {
        var id = result[1];
        $.get(url, function(html) {
          var $html = $(html);
          var large_url;
          var thumbnail_url;
          [].some.call($html.find('script'), function(script) {
            var code = script.textContent;
            if (code.indexOf('var mediaJson') > -1) {
              code = (code.match(/var mediaJson = ([^;]+);/) || [ null, '[]' ])[1];
              var media_json = JSON.parse(code);
              media_json.some(function(item) {
                if (item.id === id) {
                  large_url = item.images.standard_resolution;
                  thumbnail_url = item.images.thumbnail;
                  return true;
                }
              });
              return true;
            }
          });
          $html.length = 0;
          $html = null;
          if (large_url) {
            loadImage({
              url: self.url,
              large_url: large_url,
              thumbnail_url: thumbnail_url,
              urlItem: self
            });
          } else {
            markAsIgnored();
          }
        });
        return;
      }

      var result = url.match(weibo_re);
      if (result) {
        var large_url = url.replace(/\/(?:mw1024|bmiddle|thumbnail)\//, '/large/');
        loadImage({
          url: self.url,
          large_url: large_url,
          thumbnail_url: large_url.replace('/large/', '/thumbnail/'),
          urlItem: self
        });
        return;
      }

      var result = url.match(imgly_re);
      if (result) {
        $.get(url, function(html) {
          var $html = $(html);
          var full_url = $html.find('#button-fullview a').attr('href') || '';
          $html.length = 0;
          $html = null;
          if (full_url) {
            if (! /^http/.test(full_url)) {
              full_url = 'http://img.ly' + full_url;
            }
            $.get(full_url, function(html) {
              var $html = $(html);
              var large_url = $html.find('#image-full img').attr('src');
              $html.length = 0;
              $html = null;
              if (large_url) {
                loadImage({
                  url: self.url,
                  large_url: large_url,
                  urlItem: self
                });
              } else {
                markAsIgnored();
              }
            });
          } else {
            markAsIgnored();
          }
        });
        return;
      }

      var result = url.match(lofter_re);
      if (result) {
        $.get(url, function(html) {
          var $html = $(html);
          var large_url = $html.find('[bigimgsrc]').attr('bigimgsrc');
          $html.length = 0;
          $html = null;
          if (large_url) {
            loadImage({
              url: self.url,
              large_url: large_url,
              urlItem: self
            });
          } else {
            markAsIgnored();
          }
        });
        return;
      }

      var result = url.match(fanfou_re);
      if (result) {
        $.get(url, function(html) {
          var $html = $(html);
          var large_url = $html.find('#photo img').attr('src') || '';
          var thumbnail_url = large_url.replace('/n0/', '/m0/');
          $html.length = 0;
          $html = null;
          if (large_url) {
            loadImage({
              url: self.url,
              large_url: large_url,
              thumbnail_url: thumbnail_url,
              urlItem: self
            });
          } else {
            markAsIgnored();
          }
        });
        return;
      }

      var result = url.match(flickr_re);
      if (result) {
        $.get(url, function(html) {
          var images = html.match(/<img.+>/g);
          if (!images) return;
          images = [].slice.call(images);
          var thumbnail_url, large_url;
          images.some(function(image) {
            if (!large_url && image.indexOf('class="main-photo is-hidden"') > -1) {
              var result = image.match(/src="(.+?)"/);
              large_url = result && result[1];
            } else if (!thumbnail_url && image.indexOf('class="low-res-photo"') > -1) {
              var result = image.match(/src="(.+?)"/);
              thumbnail_url = result && result[1];
            }
            return thumbnail_url && large_url;
          });
          if (large_url) {
            loadImage({
              url: self.url,
              large_url: large_url,
              thumbnail_url: thumbnail_url,
              urlItem: self
            });
          } else {
            markAsIgnored();
          }
        });
        return;
      }

      var result = url.match(xiami_album_re);
      if (result) {
        var album_url = result[0];
        $.get(album_url, function(html) {
          var re = /<img class="cdCover185"\s+src="(\S+)"\s+rel="v:photo"\s+alt="/;
          var cover_url = (html.match(re) || [])[1] || '';
          var cover_url_large = cover_url.replace(/_2\.jpg/, '.jpg');
          if (cover_url_large) {
            loadImage({
              url: self.url,
              large_url: cover_url_large,
              thumbnail_url: cover_url,
              urlItem: self
            });
          }
        });
        return;
      }

      var result = url.match(xiami_collection_re);
      if (result) {
        var collection_url = result[0];
        $.get(collection_url, function(html) {
          var $html = $(html);
          var cover_url = $html.find('#cover_logo .bigImgCover img').attr('src') || '';
          var cover_url_large = $html.find('#cover_logo .bigImgCover').attr('href') || '';
          $html.length = 0;
          $html = null;
          if (cover_url_large) {
            loadImage({
              url: self.url,
              large_url: cover_url_large,
              thumbnail_url: cover_url,
              urlItem: self
            });
          }
        });
        return;
      }

      var result = picture_re.test(url);
      if (result) {
        loadImage({
          url: self.url,
          large_url: url,
          urlItem: self
        });
      }
    }

    UrlItem.prototype.call = function() {
      var callback;
      while (callback = this.callbacks.shift()) {
        callback();
      }
    }

    UrlItem.prototype.done = function(callback) {
      if (this.status === 'ignored')
        return;
      if (this.status === 'error') {
        this.fetch();
      }
      if (this.status === 'loading') {
        this.callbacks.push(callback);
      } else if (this.status === 'completed') {
        callback();
      }
    }

    function process($item, url_item) {
      var data = url_item.data;
      if (! data) return;
      if (data.type === 'music') {
        if (data.url.indexOf('xiami.com') > -1) {
          var id = data.id + '-' + Math.round(10000 * Math.random());
          var code = '<embed src="http://www.xiami.com/widget/0_';
          code += data.id + '/singlePlayer.swf" ';
          code += 'type="application/x-shockwave-flash" ';
          code += 'width="257" height="33" wmode="transparent"></embed>'
          var $player = $('<span>');
          $player.addClass('xiami-player');
          $player.attr('player-id', id);
          $player.attr('status', 'paused');
          $player.mouseup(function() {
            var status = $player.attr('status');
            status = status === 'paused' ? 'playing' : 'paused';
            $player.attr('status', status);
          });
          $player.append($(code));
          var $placeholder = $('<span>');
          $placeholder.addClass('xiami-player-placeholder');
          $placeholder.attr('player-id', id);
          var $music_link;
          waitFor(function() {
            $music_link = $item.find('[href^="' + data.url + '"]');
            return $music_link.length;
          }, function() {
            $music_link.after($placeholder);
            $('body').append($player);
            removeRepeatingPlayers($item);
          });
          data = $.extend({ }, data);
          data.type = 'photo';
          data.large_url = data.cover_url_large;
          data.thumbnail_url = data.cover_url;
          data.width = data.cover_width;
          data.height = data.cover_height;
        }
      }
      if (data.type !== 'photo' || $item.find('.photo').length) {
        return;
      }
      var width = data.width;
      var height = data.height;
      if (width > height) {
        if (width > 100) {
          var k = width / 100;
          width = 100;
          height /= k;
        }
      } else {
        if (height > 100) {
          var k = height / 100;
          height = 100;
          width /= k;
        }
      }
      var thumb_width = Math.round(width) + 'px';
      var thumb_height = Math.round(height) + 'px';
      var $content = $item.find('.content');
      if (! $content.length) return;
      if (data.large_url) {
        data.large_url = data.large_url.replace(/#\S*$/, '');
      }
      if (data.thumbnail_url) {
        data.thumbnail_url = data.thumbnail_url.replace(/#\S*$/, '');
      }
      var $a = $('<a>');
      $a.addClass('photo zoom');
      $a.prop('href', data.large_url || data.thumbnail_url);
      var id = 'photo-item-' + Math.round(Math.random() * 1000000);
      $item.attr('data-id', id);
      var $img = $('<img>');
      $img.css({
        width: thumb_width,
        height: thumb_height
      });
      $img.attr('src', data.thumbnail_url || data.large_url);
      $a.append($img);
      $a.append('<span>');
      $content.prepend($a);
      if (fanfou_re.test(data.url)) {
        $a.attr('name', data.url.replace('http://fanfou.com', ''))
      } else if (width / height > 3 || height / width > 3 ||
          ! picture_re.test(data.large_url)) {
        $img.click(function(e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          SF.fn.openURL(data.large_url || data.url);
        });
      }
      $a.click(function(e) {
        e.preventDefault();
        init();
      });
      function init() {
        var code = 'javascript:void((function() {';
        code += 'var id = "[data-id=\\"' + id +'\\"]";';
        code += 'var elem = ';
        code += 'document.querySelector(id);';
        code += 'FF.app.Zoom.init(elem);';
        code += '})());';
        // location.assgin 在短时间内连续使用会导致失败
        // 所以延迟到最多两秒内触发
        setTimeout(function() {
          location.assign(code);
        }, Math.max(2000 * Math.random(), 250));
      }
      init();
    }

    function loadImage(options) {
      var url_item = options.urlItem;
      var url = options.thumbnail_url || options.large_url;
      getNaturalDimentions(url, function(dimentions) {
        url_item.data = {
          url: options.url,
          large_url: options.large_url,
          width: dimentions.width,
          height: dimentions.height,
          type: 'photo',
          thumbnail_url: options.thumbnail_url
        };
        url_item.status = 'completed';
        SF.fn.setData('sf-url-' + options.url, url_item);
        setTimeout(function() {
          url_item.call();
        });
      });
    }

    var instagram_re = /https?:\/\/(?:instagram\.com|instagr.am)\/p\/[a-zA-Z0-9_\-]+\/?/;
    var pinsta_re = /https?:\/\/pinsta\.me\/p\/([a-zA-Z0-9_\-]+)/;
    var weibo_re = /https?:\/\/[w0-9]+\.sinaimg\.cn\/\S+\.jpg/;
    var imgly_re = /https?:\/\/img\.ly\//;
    var lofter_re = /\.lofter\.com\/post\/[a-zA-Z0-9_\-]+/;
    var fanfou_re = /https?:\/\/fanfou\.com\/photo\//;
    var flickr_re = /https?:\/\/(?:www\.)?flickr\.com\/photos\//;
    var xiami_album_re = /https?:\/\/(?:www\.)?xiami\.com\/album\/(\d+)/;
    var xiami_collection_re = /https?:\/\/(?:www\.)?xiami\.com\/song\/showcollect\/id\/(\d+)/;
    var picture_re = /\.(?:jpg|jpeg|png|gif|webp)(?:\??\S*)?$/i;

    var photo_res = [
      instagram_re,
      pinsta_re,
      weibo_re,
      imgly_re,
      lofter_re,
      fanfou_re,
      flickr_re,
      xiami_album_re,
      xiami_collection_re,
      picture_re
    ];

    function isPhotoLink(url) {
      return photo_res.some(function(re) {
          return re.test(url);
        });
    }

    var xiami_song_re = /https?:\/\/(?:www\.)?xiami\.com\/song\/(\d+)/;

    var music_res = [
      xiami_song_re
    ];

    function isMusicLink(url) {
      return music_res.some(function(re) {
          return re.test(url);
        });
    }

    return function($item) {
      var $links = $('.content a', $item).filter(function() {
        return this.href.indexOf('http') === 0;
      });
      $links.each(function() {
        var $link = $(this);
        var url = $link.prop('href');
        // 过滤掉形似 http://example.com/ 的 URL
        if (! url.split('/')[3]) {
          setLink($link, url);
          return;
        }
        // 过滤掉非饭否图片的饭否链接
        if (fanfou_url_re.test(url)) {
          var $link = $item.find('.content [href="' + url + '"]');
          if ($link.length) {
            var text = $link.text();
            if (/^https?:\/\//.test(text)) {
              setLink($link, url);
            }
          }
          if (! fanfou_re.test(url))
            return;
        }
        var cached, url_item;
        lib.some(function(url_item) {
          if (url_item.url === url) {
            cached = url_item;
            return true;
          }
        });
        var ls_cached = locache.get('sf-url-' + url);
        cached = cached || ls_cached;
        if (cached) {
          cached.__proto__ = UrlItem.prototype;
          cached.done(function() {
            process($item, cached);
          });
          url_item = cached;
        } else {
          url_item = new UrlItem(url);
          url_item.done(function() {
            process($item, url_item);
          });
        }
        setTimeout(function() {
          waitFor(function() {
            return url_item.longUrl;
          }, function() {
            var $link = $('.content [href="' + url_item.url + '"]');
            if ($link.find('img').length)
              return;
            var long_url = url_item.longUrl;
            setLink($link, long_url);
          });
        });
      });
    }
  })();

  function processItem($item) {
    if (! $item.is('li')) return;
    if ($item.attr('enriched') == 'true') return;

    enrichStatus($item);
    $item.attr('enriched', 'true');
  }

  function onStorage(e) {
    if (e.oldValue == e.newValue) return;
    if (e.key === 'short_url_services') {
      cached_short_urls = SF.fn.getData('short_url_services');
    }
  }

  function removeRepeatingPlayers($item) {
    $item.find('.xiami-player-placeholder + .xiami-player-placeholder').remove();
    var $players = $item.find('.xiami-player-placeholder');
    var ids = [];
    $players.each(function() {
      var $player = $(this);
      var id = $player.attr('player-id').split('-')[0];
      if (ids.indexOf(id) === -1) {
        ids.push(id);
      } else {
        $player.remove();
      }
    });
  }

  function setPlayerPosition() {
    $('.xiami-player').each(function() {
      var $player = $(this);
      var id = $player.attr('player-id');
      var $placeholder = $('.xiami-player-placeholder[player-id="' + id + '"]');
      if (! $placeholder.length) {
        $player.remove();
      } else {
        var offset = $placeholder.offset();
        $player.css({
          left: offset.left + 'px',
          top: offset.top + 'px'
        });
      }
    });
  }

  function revertLinks($textarea, links) {
    var value = $textarea.val();
    if (! value || ! value.trim().length)
      return;
    links.forEach(function(item) {
      value = value.replace(item.expanded_url, item.original_url);
    });
    $textarea.val(value);
    $textarea[0].selectionStart = $textarea[0].selectionEnd = 0;
  }

  function onRepost(e) {
    var $status = $(e.target).parents('li');
    var $links = $status.find('.content a[original-url]');
    var links = [].map.call($links, function(link) {
      var $link = $(link);
      return {
        original_url: $link.attr('original-url'),
        expanded_url: $link.prop('href')
      };
    });
    var $repost_textarea = $('#PopupForm textarea');
    var $message_textarea = $('#message textarea');
    setTimeout(function(){
      revertLinks($repost_textarea, links);
      revertLinks($message_textarea, links);
    });
  }

  return {
    load: function() {
      waitFor(function() {
        $stream = $('#stream');
        return ($stream.length || $('#latest').length) && SF.loaded;
      }, function() {
        if (! is_status_page && ! $stream.length) return;
        if (is_status_page) {
          enrichStatus($('#latest'));
          $('ol.replymsg li').each(function() { processItem($(this)); });
        } else {
          observer.observe($stream[0], { childList: true, subtree: true });
          $stream.find('ol li').each(function() { processItem($(this)); });
        }
        addEventListener('storage', onStorage, false);
      });
      set_position_interval = setInterval(setPlayerPosition, 100);
      $('html').on('click', '.op .repost', onRepost);
    },
    unload: function() {
      observer.disconnect();
      removeEventListener('storage', onStorage, false);
      clearInterval(set_position_interval)
      $('html').off('click', '.op .repost', onRepost);
    }
  };
})(Zepto));
