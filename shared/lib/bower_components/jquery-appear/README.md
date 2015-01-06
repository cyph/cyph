# jQuery-appear
A jQuery plugin provides appear and disappear events to do lazyload, infinite scroll or else effect.

## Download
[Compress](https://raw.github.com/emn178/jquery-appear/master/build/jquery.appear.min.js)  
[Uncompress](https://raw.github.com/emn178/jquery-appear/master/src/jquery.appear.js)

## Installation
You can also install jquery-appear by using Bower.
```
bower install jquery-appear
```

## Demo
[Lazyload](http://emn178.github.io/jquery-appear/samples/lazyload/) ([Overflow and Tabs](http://emn178.github.io/jquery-appear/samples/overflow/)) (You could also refer to [jQuery-lazyload-any](http://github.io/emn178/jquery-lazyload-any/))  
[Infinite Scroll](http://emn178.github.io/jquery-appear/samples/infinite-scroll/)  

## Browser Support
jQuery-appear currently supports IE7+, Chrome, Firefox, Safari and Opera.

## Usage
You could just use jQuery `bind`, `delegate` or `on` to listen event.
HTML
```HTML
<div id="#you-want-to-detect">
</div>
```
JavaScript
```JavaScript
$('#you-want-to-detect').bind('appear', appearHandler);
$('#you-want-to-detect').bind('disappear', disappearHandler);
```

### Methods

#### $.appear.check()

Force to trigger detection event.

#### $.appear.setInterval(inverval)

Set interval of timer that check container display status.

##### *inverval: `Number` (default: `50`)*

Interval of timer. Set 0 to disable timer, and you can use `$.appear.check()` to trigger detection manually.

#### $.appear.refresh(selector)

Refresh status of elements bound event. Element will bind scroll event to parent scrollable automatically when binding appear event. If you move element, you should use this method to bind again.

##### *selector: `String` or `Object` (default: `undefined`)*

The elements that you want to refresh. It will refresh all elements bound appear event if you don't pass this parameter.

### Notice
* You should initialize after the element add to page. Or it can't detect whether it's in screen. If you do that, you still can use `$.appear.check()` to force detection.
* Detection uses jQuery `element.is(':visible')`, it will return false if element's width and height are equal to zero. So you have to make sure the appear element with any width or height.

## Example
HTML
```HTML
<div id="loading">
  <img src="loading.gif" />
</div>
```
JavaScript
```JavaScript
$('#loading').bind('appear', ajaxLoad);
```

## License
The project is released under the [MIT license](http://www.opensource.org/licenses/MIT).

## Contact
The project's website is located at https://github.com/emn178/jquery-appear  
Author: emn178@gmail.com
