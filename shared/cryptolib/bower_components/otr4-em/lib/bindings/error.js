var Module = require("../../build/libotr4.js");
var gcry_ = Module.libgcrypt;

module.exports.GcryptError = GcryptError;

function GcryptError(num) {
	var err = new Error(gcry_.strerror(num || 0));
	err.num = num || 0;
	return err;
}
