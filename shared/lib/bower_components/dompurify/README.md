# DOMPurify [![NPM version](http://img.shields.io/npm/v/dompurify.svg)](https://www.npmjs.org/package/dompurify)

DOMPurify is a DOM-only, super-fast, uber-tolerant XSS sanitizer for HTML, MathML and SVG.

It's written in JavaScript and works in all modern browsers (Safari, Opera (15+), Internet Explorer (10+), Spartan, Firefox and Chrome - as well as almost anything else using Blink or WebKit). It doesn't break on IE6 or other legacy browsers. It simply does nothing there.

DOMPurify is written by security people who have vast background in web attacks and XSS. Fear not. For more details please also read about our [Security Goals & Threat Model](https://github.com/cure53/DOMPurify/wiki/Security-Goals-&-Threat-Model)


## What does it do?

DOMPurify sanitizes HTML and prevents XSS attacks. You can feed DOMPurify with string full of dirty HTML and it will return a string with clean HTML. DOMPurify will strip out everything that contains dangerous HTML and thereby prevent XSS attacks and other nastiness. It's also damn bloody fast. We use the technologies the browser provides and turn them into an XSS filter. The faster your browser, the faster DOMPurify will be.


## How do I use it?

It's easy. Just include DOMPurify on your website. 

```html
<script type="text/javascript" src="purify.js"></script>
```

Afterwards you can sanitize strings by executing the following code:

```javascript
var clean = DOMPurify.sanitize(dirty);
```

If you're using an [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) module loader like [Require.js](http://requirejs.org/), you can load this script asynchronously as well:

```javascript
require(['dompurify'], function(DOMPurify) {
    var clean = DOMPurify.sanitize(dirty);
});
```

You can also grab the files straight from npm (requires either [io.js](https://iojs.org) or [Browserify](http://browserify.org/), **Node.js 0.x is not supported**):  

```bash
npm install dompurify
```

```javascript
var DOMPurify = require('dompurify');
var clean = DOMPurify.sanitize(dirty);
```


## Is there a demo?

Of course there is a demo! [Play with DOMPurify](https://cure53.de/purify)

## What if I find a bypass?

If that happens, you probably qualify for a juicy bug bounty! The fine folks over at [FastMail](https://www.fastmail.com/) use DOMPurify for their services and added our library to their bug bounty scope. So, if you find a way to bypass or weaken DOMPurify, please have a look at their website and the [bug bounty info](https://www.fastmail.com/about/bugbounty.html).

## Some purification samples please?

How does purified markup look like? Well, [the demo](https://cure53.de/purify) shows it for a big bunch of nasty elements. But let's also show some smaller examples!

```javascript
DOMPurify.sanitize('<img src=x onerror=alert(1)//>'); // becomes <img src="x">
DOMPurify.sanitize('<svg><g/onload=alert(2)//<p>'); // becomes <svg><g></g></svg>
DOMPurify.sanitize('<p>abc<iframe/\/src=jAva&Tab;script:alert(3)>def'); // becomes <p>abc</p>
DOMPurify.sanitize('<math><mi//xlink:href="data:x,<script>alert(4)</script>">'); // becomes <math></math>

DOMPurify.sanitize('<TABLE><tr><td>HELLO</tr></TABL>'); // becomes <table><tbody><tr><td>HELLO</td></tr></tbody></table>
DOMPurify.sanitize('<UL><li><A HREF=//google.com>click</UL>'); // becomes <ul><li><a href="//google.com">click</a></li></ul>
```

## What is supported?

DOMPurify currently supports HTML5, SVG and MathML. DOMPurify per default allows CSS, HTML custom data attributes. DOMPurify also supports the Shadow DOM - and sanitizes DOM templates recursively. DOMPurify also allows you to sanitize HTML for being used with the jQuery `$()` and `elm.html()` methods.


## Can I configure it?

Yes. The included default configuration values are pretty good already - but you can of course override them. Check out the `/demos` folder to see a bunch of examples on how you can customize DOMPurify.

```javascript
// allow only <b>
var clean = DOMPurify.sanitize(dirty, {ALLOWED_TAGS: ['b']});

// allow only <b> and <q> with style attributes (for whatever reason)
var clean = DOMPurify.sanitize(dirty, {ALLOWED_TAGS: ['b', 'q'], ALLOWED_ATTR: ['style']});

// leave all as it is but forbid <style>
var clean = DOMPurify.sanitize(dirty, {FORBID_TAGS: ['style']});

// leave all as it is but forbid style attributes
var clean = DOMPurify.sanitize(dirty, {FORBID_ATTR: ['style']});

// extend the existing array of allowed tags
var clean = DOMPurify.sanitize(dirty, {ADD_TAGS: ['my-tag']});

// extend the existing array of attributes
var clean = DOMPurify.sanitize(dirty, {ADD_ATTR: ['my-attr']});

// prohibit HTML5 data attributes (default is true)
var clean = DOMPurify.sanitize(dirty, {ALLOW_DATA_ATTR: false});

// return a DOM HTMLBodyElement instead of an HTML string (default is false)
var clean = DOMPurify.sanitize(dirty, {RETURN_DOM: true});

// return a DOM DocumentFragment instead of an HTML string (default is false)
var clean = DOMPurify.sanitize(dirty, {RETURN_DOM_FRAGMENT: true});

// return a DOM DocumentFragment instead of an HTML string (default is false)
// also import it into the current document (default is false).
// RETURN_DOM_IMPORT must be set if you would like to append
// the returned node to the current document
var clean = DOMPurify.sanitize(dirty, {RETURN_DOM_FRAGMENT: true, RETURN_DOM_IMPORT: true});
document.body.appendChild(clean);

// return entire document including <html> tags (default is false)
var clean = DOMPurify.sanitize(dirty, {WHOLE_DOCUMENT: true});

// make output safe for usage in jQuery's $()/html() method (default is false)
var clean = DOMPurify.sanitize(dirty, {SAFE_FOR_JQUERY: true});

// disable DOM Clobbering protection on output (default is true, handle with care!)
var clean = DOMPurify.sanitize(dirty, {SANITIZE_DOM: false});

// discard an element's content when the element is removed (default is true)
var clean = DOMPurify.sanitize(dirty, {KEEP_CONTENT: false});
```
There is even [more examples here](https://github.com/cure53/DOMPurify/tree/master/demos#what-it-this), showing how you can run, customize and configure DOMPurify to fit your needs.

## Hooks

DOMPurify allows you to augment its functionality by attaching one or more functions with the `DOMPurify.addHook` method to one of the following hooks:

- `beforeSanitizeElements`
- `uponSanitizeElement`
- `afterSanitizeElements`
- `beforeSanitizeAttributes`
- `uponSanitizeAttribute`
- `afterSanitizeAttributes`
- `beforeSanitizeShadowDOM`
- `uponSanitizeShadowNode`
- `afterSanitizeShadowDOM`

It passes the currently processed DOM node, when needed a literal with verified node and attribute data and the DOMPurify configuration to the callback. Check out the [MentalJS hook demo](https://github.com/cure53/DOMPurify/blob/master/demos/hooks-mentaljs-demo.html) to see how the API can be used nicely.

_Example_:

```javascript
DOMPurify.addHook('beforeSanitizeElements', function(currentNode, data, config) {
    // Do something with the current node and return it
    return currentNode;
});
```


## Unit tests

To run the test suite, you need [Node.js](http://nodejs.org/download/) first. Install the dependencies with `npm install`, then start the test server with `npm test`. You can run the tests in your browser from **http://localhost:8000/test/**.


## Security Mailing List

We maintain a mailing list that notifies whenever a security-critical release of DOMPurify was published. This means, if someone found a bypass and we fixed it with a release (which always happens when a bypass was found) a mail will go out to that list. This usually happens within minutes or few hours after learning about a bypass. The list can be subscribed to here:

[https://lists.ruhr-uni-bochum.de/mailman/listinfo/dompurify-security](https://lists.ruhr-uni-bochum.de/mailman/listinfo/dompurify-security)


## What's on the road-map?

We recently implemented a Hook-API allowing developers to create their own DOMPurify plugins and customize its functionality without changing the core. Thus, we are looking forward for plugins and extensions - pull requests are welcome!

## Who contributed?

Several people need to be listed here! [@garethheyes](https://twitter.com/garethheyes) for invaluable help, [@shafigullin](https://twitter.com/shafigullin) for breaking the library multiple times and thereby strengthening it, [@mmrupp](https://twitter.com/mmrupp) and [@irsdl](https://twitter.com/irsdl) for doing the same. 

Big thanks also go to [@asutherland](https://twitter.com/asutherland), [@mathias](https://twitter.com/mathias), [@cgvwzq](https://twitter.com/cgvwzq), [@robbertatwork](https://twitter.com/robbertatwork), [@giutro](https://twitter.com/giutro) and [@fhemberger](https://twitter.com/fhemberger)! Further, thanks [@neilj](https://twitter.com/neilj) for his code review and countless small optimizations, fixes and beautifications.
