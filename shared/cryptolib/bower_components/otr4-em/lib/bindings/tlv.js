var Module = require("../../build/libotr4.js");
var otrl_ = Module.libotrl;

module.exports.OtrlTLV = OtrlTLV;

function OtrlTLV(ptr) {
	this._pointer = ptr;
}

OtrlTLV.prototype.find = function (type) {
	return this._pointer ? otrl_.tlv_find(this._pointer, type) : undefined;
};

OtrlTLV.prototype.free = function () {
	if (this._pointer) {
		otrl_.tlv_free(this._pointer);
		this._pointer = 0;
	}
};

OtrlTLV.DISCONNECTED = 1;
