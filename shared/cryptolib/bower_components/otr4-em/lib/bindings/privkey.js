var Module = require("../../build/libotr4.js");
var otrl_ = Module.libotrl;
var gcry_ = Module.libgcrypt;
var jsapi_ = Module.jsapi;

var _malloc = Module._malloc;
var _free = Module._free;
var _pointerStringify = Module.Pointer_stringify;

var BigInt = require("../bigint.js");

var GcryptError = require("./error.js").GcryptError;

module.exports.OtrlPrivKey = OtrlPrivKey;

function OtrlPrivKey(ptr) {
	this._pointer = ptr;
}
OtrlPrivKey.prototype.next = function () {
	var ptr = jsapi_.privkey_get_next(this._pointer);
	if (ptr) return new OtrlPrivKey(ptr);
	return null;
};
OtrlPrivKey.prototype.accountname = function () {
	return jsapi_.privkey_get_accountname(this._pointer);
};
OtrlPrivKey.prototype.protocol = function () {
	return jsapi_.privkey_get_protocol(this._pointer);
};
OtrlPrivKey.prototype.forget = function () {
	otrl_.privkey_forget(this._pointer);
	this._pointer = 0;
};
OtrlPrivKey.prototype.export = function (format) {
	var self = this;
	var buffer = _malloc(1024);
	var dsakey = {};
	var err = 0;
	['p', 'q', 'g', 'y', 'x'].forEach(function (token) {
		err = jsapi_.privkey_get_dsa_token(self._pointer, token, buffer, 1024, 0);
		if (err) {
			_free(buffer);
			console.error("error exporting key:", gcry_.strerror(err));
			throw new GcryptError(err);
		} else {
			dsakey[token] = _pointerStringify(buffer);
		}
	});
	_free(buffer);

	if (format == "BIGINT") {
		['p', 'q', 'g', 'y', 'x'].forEach(function (token) {
			dsakey[token] = BigInt.str2bigInt(dsakey[token], 16);
		});
	}
	dsakey.type = '\u0000\u0000';

	return dsakey;
};
OtrlPrivKey.prototype.exportPublic = function (format) {
	var key = this.export(format);
	if (key) {
		delete key.x;
		return key;
	}
};
OtrlPrivKey.prototype.toString = function () {
	return this.exportPublic("HEX");
};
