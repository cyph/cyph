# OTR4-em - Off-the-Record Messaging [emscripten]

This module exposes a simple event emitting API which wraps around libotr4.1.0 compiled to javascript using the emscripten compiler.

You can install the module directly from npm registry:

    npm install otr4-em

Read the [API Documentation](https://github.com/mnaamani/otr4-em/blob/master/doc/API.md)

Example Use:
- [node](https://github.com/mnaamani/otr4-em/blob/master/test/index.js)
- [in the browser](https://github.com/mnaamani/otr4-em/blob/master/test/index.html)
- [chrome packaged app](https://github.com/mnaamani/TEO/tree/master/build/chrome)

Related projects:
- [TEO Network Stack](https://github.com/mnaamani/TEO)
- [otrTalk](https://github.com/mnaamani/node-otr-talk)

### License
GPLv2

### built on
- [crypto-emscipten](https://github.com/mnaamani/crypto-emscripten/) libgcrypt/libotr builder.
- [libotr4](http://www.cypherpunks.ca/otr/) Off-The-Record Messaging library (GPLv2)
- [Emscripten](https://github.com/kripken/emscripten) Emscripten (MIT)

Important Note:
The package includes an optimised/minified precompiled libotr4.js to simplify npm package installation.
You may rebuild libotr4.js from source if required. [How-to build libotr4.js](https://github.com/mnaamani/otr4-em/blob/master/BUILDING)
