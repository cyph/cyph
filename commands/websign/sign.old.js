#!/usr/bin/env node

var fs			= require('fs');
var glob		= require('glob');
var read		= require('read');
var sodium		= require('libsodium-wrappers');
var args		= process.argv.slice(2);

var data	= args[0];

/* Set PUBLIC_KEYS */
eval(fs.readFileSync('../../shared/websign/js/keys.js').toString().trim());


glob(process.env['HOME'] + '/.cyph/*.key', function (err, paths) {
	if (paths.length < 1) {
		read({
			prompt: 'NO KEYS. STOP THE DEPLOYMENT, BITCH.',
			output: process.stderr
		}, function () {});
		return;
	}

	var keys	= paths.map(function (path) { return fs.readFileSync(path).toString().trim() });

	sign(data, keys, 'Password: ', function (innerSignature, innerKey, innerKeyIndex) {
		sign(innerSignature, keys, 'Password: ', function (outerSignature, outerKey, outerKeyIndex) {
			console.log(outerSignature + '\n' + outerKeyIndex + '\n' + innerKeyIndex);
		}, innerKey);
	});
});

function sign (data, keys, prompt, callback, blacklistedKey) {
	read({prompt: prompt, silent: true, output: process.stderr}, function (err, password) {
		for (var i = 0 ; i < keys.length ; ++i) {
			try {
				if (keys[i] !== blacklistedKey) {
					var key	= decryptKey(keys[i], password);
					var publicKeyString	= JSON.stringify(Array.prototype.slice.apply(key).slice(-32));

					for (var j = 0 ; j < PUBLIC_KEYS.length ; ++j) {
						if (publicKeyString === JSON.stringify(PUBLIC_KEYS[j])) {
							callback(sodium.crypto_sign(data, key, 'hex'), keys[i], j);
							return;
						}
					}
				}
			}
			catch (_) {}
		}

		sign(data, keys, 'Incorrect password; please try again: ', callback, blacklistedKey);
	});
}

function decryptKey (key, password) {
	return new sodium.crypto_secretbox_open_easy(
		sodium.from_hex(key),
		new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
		sodium.crypto_pwhash_scryptsalsa208sha256(
			sodium.crypto_secretbox_KEYBYTES,
			password,
			new Uint8Array(sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES),
			sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
			sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE
		)
	);
}
