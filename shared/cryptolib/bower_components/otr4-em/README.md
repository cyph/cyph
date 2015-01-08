# OTR4-em - Off-the-Record Messaging [emscripten]

This module exposes a simple event emitting API which wraps around libotr4.1.0 compiled to javascript using the emscripten compiler.

You can install the module directly from npm registry:

    npm install otr4-em

A short [tutorial](https://github.com/mnaamani/otr4-em/blob/master/doc/tutorial.md) is available.

Latest API documentation can be found [here](http://www.mokhtar.net/projects/otr4-em/docs/)

For version's older than v0.1.0 see documentation [here](https://github.com/mnaamani/otr4-em/blob/master/doc/api_old.md)

Example Use:
- [node](https://github.com/mnaamani/otr4-em/blob/master/examples/index.js)
- [in the browser](https://github.com/mnaamani/otr4-em/blob/master/examples/index.html)
- [chrome packaged app](https://github.com/mnaamani/TEO/tree/master/build/chrome)

Related projects:
- [otr talk](https://github.com/mnaamani/node-otr-talk) p2p chat (command line chat app)

### License
The module is dual licensed: GPLv2 and LGPL
You may choose the license that is more suitable for your application.

### built on
- [crypto-emscipten](https://github.com/mnaamani/crypto-emscripten/) libgcrypt/libotr builder.
- [libotr4](https://otr.cypherpunks.ca/) Off-The-Record Messaging library (GPLv2)
- [Emscripten](https://github.com/kripken/emscripten) Emscripten (MIT)

Important Note:
The package includes an optimised/minified precompiled libotr4.js to simplify npm package installation.
You may rebuild libotr4.js from source if required. [How-to build libotr4.js](https://github.com/mnaamani/otr4-em/blob/master/BUILDING)
