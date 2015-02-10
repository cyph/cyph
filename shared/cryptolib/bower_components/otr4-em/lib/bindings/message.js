var Module = require("../../build/libotr4.js");
var otrl_ = Module.libotrl;
var gcry_ = Module.libgcrypt;
var jsapi_ = Module.jsapi;

var _malloc = Module._malloc;
var _free = Module._free;
var _getValue = Module.getValue;
var _setValue = Module.setValue;
var _pointerStringify = Module.Pointer_stringify;

var helper_ = {};
helper_.ptr_to_ArrayBuffer = Module.ptr_to_ArrayBuffer;
helper_.ab2str = Module.ab2str;
helper_.str2ab = Module.str2ab;

var OtrlTLV = require("./tlv.js").OtrlTLV;

var MAO = []; //OtrlMessageAppOps instances and their callback handlers

module.exports.OtrlMessageAppOps = OtrlMessageAppOps;
module.exports.ops_event = ops_event;

function ops_event(opsdata, event_object, event_name) {
	var index, instance;
	if (opsdata && MAO.length) {
		index = _getValue(opsdata, "i32");
		instance = MAO[index];
		if (instance && typeof instance._event_handler === 'function') {
			event_object.EVENT = event_name;
			return instance._event_handler(event_object);
		}
	}

}

function OtrlMessageAppOps(event_handler) {
	//keep track of all created instances
	//index into array will be passed around as opdata to tie
	//the event_handler to the relevant instance.

	var self = this;
	this._event_handler = event_handler;
	this._opsdata = _malloc(4);
	_setValue(this._opsdata, MAO.length, "i32");
	MAO[MAO.length] = self;
	this._pointer = jsapi_.messageappops_new();
}

OtrlMessageAppOps.prototype.messageSending = function (userstate, accountname, protocol, recipient,
	message,
	to_instag, otrchannel) {
	if (!(
			typeof userstate == 'object' &&
			typeof accountname == 'string' &&
			typeof protocol == 'string' &&
			typeof recipient == 'string' &&
			typeof message == 'string'
		)) {
		throw new TypeError("invalid-arguments");
	}
	var messagep_ptr = _malloc(4); //char**
	_setValue(messagep_ptr, 0, "i32");

	var frag_policy = 1; //OTRL_FRAGMENT_SEND_ALL
	var contextp_ptr = _malloc(4); //pointer to context used to send to buddy
	var instag = to_instag || 1; //OTRL_INSTAG_BEST

	var err = otrl_.message_sending(userstate._pointer, this._pointer, this._opsdata, accountname,
		protocol,
		recipient, instag,
		message, 0, messagep_ptr, frag_policy, contextp_ptr, 0, 0);

	//update the channel with the active context used
	otrchannel.context._pointer = _getValue(contextp_ptr, "i32");

	var retvalue;
	var messagep = 0;
	if (err === 0) {
		messagep = _getValue(messagep_ptr, "i32");
		if (messagep !== 0 && frag_policy !== 1) {
			//we will handle sending the encrypted fragment
			retvalue = _pointerStringify(messagep);
		}
	} else {
		//encryption error occured (msg_event will be fired)
	}
	if (messagep !== 0) otrl_.message_free(messagep);

	_free(messagep_ptr);
	_free(contextp_ptr);
	return retvalue;

};
OtrlMessageAppOps.prototype.messageReceiving = function (userstate, accountname, protocol, sender,
	message,
	otrchannel) {
	if (!(
			typeof userstate == 'object' &&
			typeof accountname == 'string' &&
			typeof protocol == 'string' &&
			typeof sender == 'string' &&
			typeof message == 'string'
		)) {
		throw new TypeError("invalid-arguments");
	}
	var contextp_ptr = _malloc(4); //pointer to context of buddy used to receive the message
	var newmessagep_ptr = _malloc(4); //char**
	var tlvsp_ptr = _malloc(4); //OtrlTLV**
	var status = otrl_.message_receiving(userstate._pointer, this._pointer, this._opsdata,
		accountname, protocol, sender, message, newmessagep_ptr, tlvsp_ptr, contextp_ptr, 0, 0);

	//update the channel with the active context used
	otrchannel.context._pointer = _getValue(contextp_ptr, "i32");

	var tlvs = new OtrlTLV(_getValue(tlvsp_ptr, "i32"));
	if (tlvs.find(OtrlTLV.DISCONNECTED)) {
		ops_event(this._opsdata, {}, "remote_disconnected");
	}
	tlvs.free();


	var newmessagep = _getValue(newmessagep_ptr, "i32"); //char*

	var retvalue;
	if (status == 1) retvalue = null;
	if (status === 0) {
		retvalue = (newmessagep === 0) ? message : _pointerStringify(newmessagep);
	}
	if (newmessagep !== 0) otrl_.message_free(newmessagep);

	_free(tlvsp_ptr);
	_free(newmessagep_ptr);
	_free(contextp_ptr);

	return retvalue;
};
OtrlMessageAppOps.prototype.disconnect = function (userstate, accountname, protocol, recipient, instag) {
	if (!(
			typeof userstate == 'object' &&
			typeof accountname == 'string' &&
			typeof protocol == 'string' &&
			typeof recipient == 'string'
		)) {
		throw new TypeError("invalid-arguments");
	}

	otrl_.message_disconnect(userstate._pointer, this._pointer, this._opsdata, accountname,
		protocol,
		recipient, instag);
};
OtrlMessageAppOps.prototype.initSMP = function (userstate, context, secret, question) {
	if (!(
			typeof userstate == 'object' &&
			typeof context == 'object' &&
			typeof secret == 'string'
		)) {
		throw new TypeError("invalid-arguments");
	}

	if (jsapi_.can_start_smp(context._pointer)) {
		if (question) {
			otrl_.message_initiate_smp_q(userstate._pointer, this._pointer, this._opsdata, context._pointer,
				question, secret, secret.length);
		} else {
			otrl_.message_initiate_smp(userstate._pointer, this._pointer, this._opsdata, context._pointer,
				secret, secret.length);
		}
	}
};
OtrlMessageAppOps.prototype.respondSMP = function (userstate, context, secret) {
	if (!(
			typeof userstate == 'object' &&
			typeof context == 'object' &&
			typeof secret == 'string'
		)) {
		throw new TypeError("invalid-arguments");
	}
	otrl_.message_respond_smp(userstate._pointer, this._pointer, this._opsdata, context._pointer,
		secret,
		secret.length);
};
OtrlMessageAppOps.prototype.abortSMP = function (userstate, context) {
	if (!(
			typeof userstate == 'object' &&
			typeof context == 'object'
		)) {
		throw new TypeError("invalid-arguments");
	}
	otrl_.message_abort_smp(userstate._pointer, this._pointer, this._opsdata, context._pointer);
};

OtrlMessageAppOps.prototype.extraSymKey = function (userstate, context, use, usedata) {
	//return ArrayBuffer() 32bytes in length (256bit extra symmetric key)

	var symkey_ptr = _malloc(32); //OTRL_EXTRAKEY_BYTES
	var symkey;

	if (typeof usedata == 'string') {
		usedata = helper_.str2ab(usedata);
	}
	var usedata_view = new Uint8Array(usedata);
	var usedata_ptr = _malloc(usedata_view.length);
	for (var i = 0; i < usedata_view.length; i++) {
		_setValue(usedata_ptr + i, usedata_view[i], "i8");
	}

	var err = otrl_.message_symkey(userstate._pointer, this._pointer, this._opsdata, context._pointer,
		use,
		usedata_ptr, usedata_view.length, symkey_ptr);

	if (!err) {
		symkey = helper_.ptr_to_ArrayBuffer(symkey_ptr, 32);
	}

	_free(symkey_ptr);
	_free(usedata_ptr);

	return symkey;
};
