# Page Visibility shim for jQuery

This plugin gives you a very simple API that allows you to execute callbacks when the page’s visibility state changes.

It does so by using [the Page Visibility API](http://www.w3.org/TR/page-visibility/) where it’s supported, and falling back to good old `focus` and `blur` in older browsers.

## Demo

<http://mathiasbynens.be/demo/jquery-visibility>

## When to use?

Example use cases include but are not limited to pausing/resuming slideshows, video, and/or embedded audio clips.

## Example usage

This plugin simply provides two custom events for you to use: `show` and `hide`. When the page visibility state changes, the appropriate event will be triggered.

You can use them separately:

```js
$(document).on('show', function() {
  // the page gained visibility
});
```

```js
$(document).on('hide', function() {
  // the page was hidden
});
```

Since most of the time you’ll need both events, your best option is to use an events map. This way, you can bind both event handlers in one go:

```js
$(document).on({
  'show': function() {
    console.log('The page gained visibility; the `show` event was triggered.');
  },
  'hide': function() {
    console.log('The page lost visibility; the `hide` event was triggered.');
  }
});
```

The plugin will detect if the Page Visibility API is natively supported in the browser or not, and expose this information as a boolean (`true`/`false`) in `$.support.pageVisibility`:

```js
if ($.support.pageVisibility) {
  // Page Visibility is natively supported in this browser
}
```

## Notes

Both events live under the `visibility` namespace — so if you ever need to remove all event handlers added by this plugin, you could just use `$(document).off('.visibility');` (or `$(document).unbind('.visibility');` in jQuery 1.6 or older).

This plugin is not a Page Visibility [polyfill](http://mths.be/polyfills), as it doesn’t aim to mimic the standard API. It merely provides a simple way to use this functionality (or a fallback) in your jQuery code.

## License

This plugin is available under the MIT license.

## Author

[Mathias Bynens](http://mathiasbynens.be/)

## Contributors

[John-David Dalton](http://allyoucanleet.com/)
