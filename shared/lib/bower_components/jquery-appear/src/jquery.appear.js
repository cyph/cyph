/*
 * jQuery-appear v0.2.2
 * https://github.com/emn178/jquery-appear
 *
 * Copyright 2014-2015, emn178@gmail.com
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */
;(function($, window, document, undefined) {
  var KEY = 'jquery-appear';
  var APPEAR_EVENT = 'appear';
  var DISAPPEAR_EVENT = 'disappear';
  var SELECTOR = ':' + KEY;
  var SCROLLER_KEY = KEY + '-scroller';
  var DISPLAY_KEY = KEY + '-display';
  var WATCH_KEY = KEY + '-watch';
  var WATCH_SELECTOR = ':' + WATCH_KEY;
  var screenHeight, screenWidth, init = false, observations = $(), watchObservations = $();

  $.expr[':'][KEY] = function(element) {
    return $(element).data(KEY) !== undefined;
  };

  $.expr[':'][WATCH_KEY] = function(element) {
    return $(element).data(WATCH_KEY) !== undefined;
  };

  function test() {
    var element = $(this);
    var v = element.is(':visible') && visible(this);
    if(v != element.data(KEY)) {
      if(v) {
        element.trigger(APPEAR_EVENT);
      } else {
        element.trigger(DISAPPEAR_EVENT);
      }
    }
    element.data(KEY, v);
  }

  function visible(element) {
    var rect = element.getBoundingClientRect();
    return (rect.top >= 0 && rect.top <= screenHeight || rect.bottom >= 0 && rect.bottom <= screenHeight) &&
      (rect.left >= 0 && rect.left <= screenWidth || rect.right >= 0 && rect.right <= screenWidth);
  }

  function resize() {
    screenHeight = window.innerHeight || document.documentElement.clientHeight;
    screenWidth = window.innerWidth || document.documentElement.clientWidth;
    detect();
  }

  function detect() {
    observations = observations.filter(SELECTOR);
    if(this.nodeType == 1) {
      $(this).find(SELECTOR).each(test);
    } else {
      observations.each(test);
    }
  }

  function watch() {
    var element = $(this);
    if(!(watchScroller(element) | watchDisplay(element))) {
      return;
    }
    if(element.data(WATCH_KEY)) {
      return;
    }
    element.data(WATCH_KEY, 1);
    watchObservations = watchObservations.add(element);
  }

  function unwatch() {
    var element = $(this);
    if(!element.data(WATCH_KEY)) {
      return;
    }
    if(element.find(SELECTOR).length === 0) {
      element.removeData(SCROLLER_KEY).removeData(DISPLAY_KEY).removeData(WATCH_KEY);
      element.unbind('scroll', detect)._unbindShow(detect);
    }
  }

  function watchScroller(element) {
    if(element.data(SCROLLER_KEY)) {
      return false;
    }
    var overflow = element.css('overflow');
    if(overflow != 'scroll' && overflow != 'auto') {
      return false;
    }
    element.data(SCROLLER_KEY, 1);
    element.bind('scroll', detect);
    return true;
  }

  function watchDisplay(element) {
    if(element.data(DISPLAY_KEY)) {
      return;
    }
    var display = element.css('display');
    if(display != 'none') {
      return;
    }
    element.data(DISPLAY_KEY, 1);
    element._bindShow(detect);
    return true;
  }

  function bind(handleObj) {
    var element = $(this);
    if(element.is(SELECTOR)) {
      return;
    }

    if(!init) {
      init = true;
      resize();
      $(document).ready(function() {
        $(window).on('resize', resize).on('scroll', detect);
      });
    }

    element.data(KEY, false);
    element.parents().each(watch);
    setTimeout(function() {
      test.call(element[0]);
    }, 1);
    observations = observations.add(this);
  }

  function unbind(handleObj) {
    var element = $(this);
    setTimeout(function() {
      var events = $._data(element[0], 'events') || {};
      if(!events[APPEAR_EVENT] && !events[DISAPPEAR_EVENT]) {
        element.removeData(KEY);
        watchObservations = watchObservations.filter(WATCH_SELECTOR);
        watchObservations.each(unwatch);
      }
    }, 1);
  }

  function refresh(selector) {
    var elements = selector === undefined ? observations : $(selector);
    elements.each(function() {
      var element = $(this);
      if(!element.is(SELECTOR)) {
        return;
      }
      element.parents().each(watch);
    });
  }

  $.appear = {
    check: detect,
    refresh: refresh
  };

  $.event.special.appear = $.event.special.disappear = {
    add: bind,
    remove: unbind
  };

  // SHOW EVENT
  (function() {
    var EVENT = 'show';
    var SELECTOR_KEY = KEY + '-' + EVENT;
    var SELECTOR = ':' + SELECTOR_KEY;
    var interval = 50, timer, observations = $();

    $.expr[':'][SELECTOR_KEY] = function(element) {
      return $(element).data(SELECTOR_KEY) !== undefined;
    };

    function test() {
      var element = $(this);
      var status = element.css('display') != 'none';
      if(element.data(SELECTOR_KEY) != status) {
        element.data(SELECTOR_KEY, status);
        if(status) {
          element.trigger(EVENT);
        }
      }
    }

    function detect() {
      observations = observations.filter(SELECTOR);
      observations.each(test);
      if(observations.length === 0) {
        timer = clearInterval(timer);
      }
    }

    $.fn._bindShow = function(handler) {
      this.bind(EVENT, handler);
      this.data(SELECTOR_KEY, this.css('display') != 'none');
      observations = observations.add(this);
      if(interval && !timer) {
        timer = setInterval(detect, interval);
      }
    };

    $.fn._unbindShow = function(handler) {
      this.unbind(EVENT, handler);
      this.removeData(SELECTOR_KEY);
    };

    $.appear.setInterval = function(v) {
      if(v == interval || !$.isNumeric(v) || v < 0) {
        return;
      }
      interval = v;
      timer = clearInterval(timer);
      if(interval > 0) {
        timer = setInterval(detect, interval);
      }
    };
  })();
})(jQuery, window, document);
