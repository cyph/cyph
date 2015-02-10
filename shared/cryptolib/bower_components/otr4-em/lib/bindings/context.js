var Module = require("../../build/libotr4.js");
var otrl_ = Module.libotrl;
var gcry_ = Module.libgcrypt;
var jsapi_ = Module.jsapi;

var _malloc = Module._malloc;
var _free = Module._free;
var _pointerStringify = Module.Pointer_stringify;

var helper_ = {};
helper_.unsigned_int32 = Module.unsigned_int32;

var Fingerprint = require("./fingerprint.js").Fingerprint;

module.exports.OtrlConnContext = OtrlConnContext;

function OtrlConnContext(userstate, accountname, protocol, recipient) {
	if (typeof userstate == 'object' &&
		typeof accountname == 'string' &&
		typeof protocol == 'string' &&
		typeof recipient == 'string') {

		var addedp_addr = _malloc(4); //allocate(1, "i32", ALLOC_STACK);
		var instag = 0; //OTRL_INSTAG_MASTER
		this._pointer = otrl_.context_find(userstate._pointer, recipient, accountname, protocol,
			instag, 1,
			addedp_addr, 0, 0);
		_free(addedp_addr);
	} else {
		if (arguments.length == 1 && typeof arguments[0] == 'number') {
			//assume arguments[0] == pointer to existing context;
			this._pointer = arguments[0];
		} else {
			throw new TypeError("invalid-arguments");
		}
	}
}

OtrlConnContext.prototype.protocol = function () {
	return jsapi_.conncontext_get_protocol(this._pointer);
};

OtrlConnContext.prototype.username = function () {
	return jsapi_.conncontext_get_username(this._pointer);
};

OtrlConnContext.prototype.accountname = function () {
	return jsapi_.conncontext_get_accountname(this._pointer);
};

OtrlConnContext.prototype.msgstate = function () {
	return jsapi_.conncontext_get_msgstate(this._pointer);
};

OtrlConnContext.prototype.protocol_version = function () {
	return jsapi_.conncontext_get_protocol_version(this._pointer);
};

OtrlConnContext.prototype.smstate = function () {
	return jsapi_.conncontext_get_smstate(this._pointer);
};

OtrlConnContext.prototype.fingerprint = function () {
	var fp = _malloc(45);
	jsapi_.conncontext_get_active_fingerprint(this._pointer, fp);
	var human = _pointerStringify(fp);
	_free(fp);
	return human;
};

OtrlConnContext.prototype.trust = function () {
	return jsapi_.conncontext_get_trust(this._pointer);
};

OtrlConnContext.prototype.their_instance = function () {
	return helper_.unsigned_int32(jsapi_.conncontext_get_their_instance(this._pointer));
};

OtrlConnContext.prototype.our_instance = function () {
	return helper_.unsigned_int32(jsapi_.conncontext_get_our_instance(this._pointer));
};

OtrlConnContext.prototype.master = function () {
	return new OtrlConnContext(jsapi_.conncontext_get_master(this._pointer));
};

OtrlConnContext.prototype.masterFingerprints = function () {
	var list = [];
	var ptr = jsapi_.conncontext_get_master_fingerprint(this._pointer);
	while (ptr !== 0) {
		list.push(new Fingerprint(ptr));
		ptr = jsapi_.fingerprint_get_next(ptr);
	}
	return list;
};

OtrlConnContext.prototype.toJSON = function () {
	return ({
		'protocol': this.protocol(),
		'username': this.username(),
		'accountname': this.accountname(),
		'msgstate': this.msgstate(),
		'protocol_version': this.protocol_version(),
		'smstate': this.smstate(),
		'fingerprint': this.fingerprint(),
		'trust': this.trust(),
		'their_instance': this.their_instance(),
		'our_instance': this.our_instance()
	});
};
OtrlConnContext.prototype.obj = OtrlConnContext.prototype.fields = OtrlConnContext.prototype.toJSON;
 
OtrlConnContext.prototype.toString = OtrlConnContext.prototype.inspect = function () {
	return JSON.stringify(this.toJSON());
};

OtrlConnContext.prototype.next = function () {
	return new OtrlConnContext(jsapi_.conncontext_get_next(this._pointer));
};

OtrlConnContext.prototype.forget = function () {
	var ptr = this._pointer;
	this._pointer = 0;
	return otrl_.context_forget(ptr);
};
