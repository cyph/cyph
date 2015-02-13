var Module = require("../../build/libotr4.js");
var jsapi_ = Module.jsapi;
var otrl_ = Module.libotrl;
var _malloc = Module._malloc;
var _free = Module._free;
var _pointerStringify = Module.Pointer_stringify;

module.exports.Fingerprint = Fingerprint;

function Fingerprint(ptr) {
	if (ptr !== 0) {
		this._pointer = ptr;
	} else {
		return undefined;
	}
}

Fingerprint.prototype.fingerprint = Fingerprint.prototype.toString = function () {
	if (!this._pointer) return undefined;
	var fp = _malloc(45);
	jsapi_.fingerprint_get_fingerprint(this._pointer, fp);
	var human = _pointerStringify(fp);
	_free(fp);
	return human;
};

Fingerprint.prototype.equals = function (str) {
	if (!this._pointer || str === "" || !str) return false; //dont compare null strings or undefined
	return this.toString() === str;
};

Fingerprint.prototype.trust = function (trust) {
	if (typeof trust === 'string') otrl_.context_set_trust(this._pointer, trust);
	return jsapi_.fingerprint_get_trust(this._pointer);
};

Fingerprint.prototype.untrust = function () {
	this.trust("");
};

Fingerprint.prototype.delete = Fingerprint.prototype.forget = function () {
	otrl_.context_forget_fingerprint(this._pointer, 1);
	this._pointer = 0;
};
