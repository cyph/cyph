var Module = require("../../build/libotr4.js");
var jsapi_ = Module.jsapi;
var helper_ = {};
helper_.unsigned_int32 = Module.unsigned_int32;

module.exports.OtrlInsTag = OtrlInsTag;

function OtrlInsTag(ptr) {
	this._pointer = ptr;
}

OtrlInsTag.prototype.instag = function () {
	return helper_.unsigned_int32(jsapi_.instag_get_tag(this._pointer));
};

OtrlInsTag.MASTER = 0;
