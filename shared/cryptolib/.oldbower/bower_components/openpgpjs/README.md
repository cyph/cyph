OpenPGP.js
==========

[OpenPGP.js](http://openpgpjs.org/) is a Javascript implementation of the OpenPGP protocol. This is defined in [RFC 4880](http://tools.ietf.org/html/rfc4880).

[![Build Status](https://travis-ci.org/openpgpjs/openpgpjs.svg?branch=master)](https://travis-ci.org/openpgpjs/openpgpjs)

### Node support

For server side use, install via npm:

    npm install openpgp


### Browser support

For use in browser, install via bower:

    bower install --save openpgp

Or Fetch a minified build under [releases](https://github.com/openpgpjs/openpgpjs/releases).

The library can be loaded via  AMD/require.js or accessed globally via `window.openpgp`.


### Dependencies

OpenPGP.js only supports browsers that implement `window.crypto.getRandomValues`. Also, if the browsers support [native WebCrypto](http://www.w3.org/TR/WebCryptoAPI/) via the `window.crypto.subtle` api, this will be used. Though this can be deactivated by setting `config.useWebCrypto = false`. In this case the library will fall back to Web Worker operations if the `initWorker(workerPath)` is set.

OpenPGP.js uses ES6 promises which are available in [most modern browsers](http://caniuse.com/#feat=promises). If you need to support browsers that do not support Promises, fear not! There is a [polyfill](https://github.com/jakearchibald/es6-promise), which is included in the build step. So no action required on the developer's part for promises!


### Examples

#### Encryption
```js
var openpgp = require('openpgp');
var key = '-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----';
var publicKey = openpgp.key.readArmored(key);
openpgp.encryptMessage(publicKey.keys, 'Hello, World!').then(function(pgpMessage) {
    // success
}).catch(function(error) {
    // failure
});
```

#### Decryption
```js
var openpgp = require('openpgp');
var key = '-----BEGIN PGP PRIVATE KEY BLOCK ... END PGP PRIVATE KEY BLOCK-----';
var privateKey = openpgp.key.readArmored(key).keys[0];
privateKey.decrypt('passphrase');
var pgpMessage = '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----';
pgpMessage = openpgp.message.readArmored(pgpMessage);
openpgp.decryptMessage(privateKey, pgpMessage).then(function(plaintext) {
    // success
}).catch(function(error) {
    // failure
});
```

### Security recommendations

It should be noted that js crypto apps deployed via regular web hosting (a.k.a. [**host-based security**](https://www.schneier.com/blog/archives/2012/08/cryptocat.html)) provide users with less security than installable apps with auditable static versions. Installable apps can be deployed as a [Firefox](https://developer.mozilla.org/en-US/Marketplace/Publishing/Packaged_apps) or [Chrome](http://developer.chrome.com/apps/about_apps.html) packaged app. These apps are basically signed zip files and their runtimes typically enforce a strict [Content Security Policy (CSP)](http://www.html5rocks.com/en/tutorials/security/content-security-policy/) to protect users against [XSS](http://en.wikipedia.org/wiki/Cross-site_scripting). This [blogpost](http://tonyarcieri.com/whats-wrong-with-webcrypto) explains the trust model of the web quite well.

It is also recommended to set a strong passphrase that protects the user's private key on disk.

### Development

To create your own build of the library, just run the following command after cloning the git repo. This will download all dependencies, run the tests and create a minifed bundle under `dist/openpgp.min.js` to use in your project:

    npm install && npm test

### Documentation

A jsdoc build of our code comments is available at [doc/index.html](http://openpgpjs.org/openpgpjs/doc/index.html). Public calls should generally be made through the OpenPGP object [doc/openpgp.html](http://openpgpjs.org/openpgpjs/doc/module-openpgp.html).

### Mailing List

You can [sign up](http://list.openpgpjs.org/) for our mailing list and ask for help there.  We've recently worked on getting our [archive up and running](http://www.mail-archive.com/list@openpgpjs.org/).

### How do I get involved?

You want to help, great! Go ahead and fork our repo, make your changes and send us a pull request.

### License

GNU Lesser General Public License (3.0 or any later version). Please take a look at the [LICENSE](LICENSE) file for more information.

### Resources

Below is a collection of resources, many of these were projects that were in someway a precursor to the current OpenPGP.js project. If you'd like to add your link here, please do so in a pull request or email to the list.

* [http://www.hanewin.net/encrypt/](http://www.hanewin.net/encrypt/)
* [https://github.com/seancolyer/gmail-crypt](https://github.com/seancolyer/gmail-crypt)
* [https://github.com/mete0r/openpgp-js](https://github.com/mete0r/openpgp-js)
* [http://fitblip.github.com/JSPGP-Stuffs/](http://fitblip.github.com/JSPGP-Stuffs/)
* [http://qooxdoo.org/contrib/project/crypto](http://qooxdoo.org/contrib/project/crypto)
* [https://github.com/GPGTools/Mobile/wiki/Introduction](https://github.com/GPGTools/Mobile/wiki/Introduction)
* [http://gpg4browsers.recurity.com/](http://gpg4browsers.recurity.com/)
