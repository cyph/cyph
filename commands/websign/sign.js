#!/usr/bin/env node

var fs			= require('fs');
var glob		= require('glob');
var read		= require('read');
var sodium		= require('libsodium-wrappers');
var args		= process.argv.slice(2);

var data	= args[0];


glob(process.env['HOME'] + '/.cyph/*.key', function (err, paths) {
	if (paths.length < 1) {
		read({
			prompt: 'NO KEYS. STOP THE DEPLOYMENT, BITCH.',
			output: process.stderr
		}, function () {});
		return;
	}

	var keys	= paths.map(function (path) { return fs.readFileSync(path).toString().trim() });

	sign(data, keys, 'Password: ', function (innerSignature, innerKey) {
		sign(innerSignature, keys, 'Password: ', function (outerSignature) {
			console.log(outerSignature);
		}, innerKey);
	});
});

function sign (data, keys, prompt, callback, blacklistedKey) {
	read({prompt: prompt, silent: true, output: process.stderr}, function (err, password) {
		for (var i = 0 ; i < keys.length ; ++i) {
			try {
				if (keys[i] !== blacklistedKey) {
					var key	= decryptKey(keys[i], password);
					callback(sodium.crypto_sign(data, key, 'hex'), keys[i]);
					return;
				}
			}
			catch (_) {}
		}

		sign(data, keys, 'Incorrect password; please try again: ', callback, blacklistedKey);
	});
}

function decryptKey (key, password) {
	return new Uint8Array(
		JSON.parse(
			sodium.crypto_secretbox_open_easy(
				sodium.from_hex(key),
				new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
				sodium.crypto_pwhash_scryptsalsa208sha256(
					password,
					new Uint8Array(sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES),
					0,
					0,
					sodium.crypto_secretbox_KEYBYTES
				),
				'text'
			)
		)
	);
}
