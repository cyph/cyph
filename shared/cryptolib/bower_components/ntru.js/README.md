# ntru.js

## Overview

The [NTRU](https://github.com/NTRUOpenSourceProject/ntru-crypto) post-quantum asymmetric
cipher compiled to pure JavaScript using [Emscripten](https://github.com/kripken/emscripten).
A simple wrapper is provided to make NTRU easy to use in Web applications.

The default parameter set is EES439EP1 (roughly equivalent to 256-bit ECC, as per
[NTRU's documentation](https://github.com/NTRUOpenSourceProject/ntru-crypto/blob/master/reference-code/C/Encrypt/doc/UserNotes-NTRUEncrypt.pdf)).
To change this, modify line 6 of Makefile and rebuild with `make`.

## Example Usage

	var plaintext	= new Uint8Array([104, 101, 108, 108, 111]); // ("hello")

	var keyPair		= ntru.keyPair();
	var encrypted	= ntru.encrypt(plaintext, keyPair.publicKey);
	var decrypted	= ntru.decrypt(encrypted, keyPair.privateKey); // same as plaintext

Note: NTRU generally shouldn't be used to directly encrypt your data; in most cases, you'll
want to pair it with a symmetric cipher and use it to encrypt symmetric keys.
