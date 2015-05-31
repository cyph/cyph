(function () {
	"use strict";

	/*
	 *  Off-the-Record Messaging bindings for node/javascript
	 *  Copyright (C) 2012  Mokhtar Naamani,
	 *                      <mokhtar.naamani@gmail.com>
	 *
	 *  This program is free software; you can redistribute it and/or modify
	 *  it under the terms of version 2 of the GNU General Public License as
	 *  published by the Free Software Foundation.
	 *
	 *  This program is distributed in the hope that it will be useful,
	 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
	 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	 *  GNU General Public License for more details.
	 *
	 *  You should have received a copy of the GNU General Public License
	 *  along with this program; if not, write to the Free Software
	 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
	 */

	var root = this,
		Module, ASYNC, fs, path, BigInt;

	if (typeof exports !== 'undefined') {
		Module = require("../build/libotr4.js");
		ASYNC = require("../lib/async");
		fs = require("fs");
		path = require("path");
		BigInt = require("../lib/bigint.js");
		var fs_existsSync = fs.existsSync || path.existsSync;
		if (!path.sep) {
			path.sep = (process.platform.indexOf("win") === 0) ? "\\" : "/";
		}
		module.exports = OTRBindings;

	} else {
		Module = root.libotr4Module;
		ASYNC = root.async;
		fs = undefined; //local storage?
		BigInt = root.BigInt;
		root.OTRBindings = OTRBindings;
	}


	var otrl_ = Module.libotrl; //cwrap()'ed functions from libotr
	var gcry_ = Module.libgcrypt; //cwrap()'ed functions from libgcrypt
	var jsapi_ = Module.jsapi;

	var helper_ = {};
	helper_.ptr_to_ArrayBuffer = Module.ptr_to_ArrayBuffer;
	helper_.ab2str = Module.ab2str;
	helper_.str2ab = Module.str2ab;
	helper_.unsigned_int32 = Module.unsigned_int32;
	helper_.bigint2mpi = Module.bigint2mpi;
	helper_.mpi2bigint = Module.mpi2bigint;

	var _malloc = Module._malloc;
	var _free = Module._free;
	var getValue = Module.getValue;
	var setValue = Module.setValue;
	var Pointer_stringify = Module.Pointer_stringify;

	if (Module.init) {
		Module.init({
			OpsEvent: ops_event,
			OtrlConnContext: OtrlConnContext
		});
	} else {
		Module.ops_event = ops_event;
		Module.ConnContext = OtrlConnContext;
	}

	var OPS_QUEUE;
	var MAO = []; //OtrlMessageAppOps instances and their callback handlers

	//otrBindings = Exported Interface
	function OTRBindings() {
		this.init();
	}

	OTRBindings.prototype = {

		constructor: OTRBindings,

		init: jsapi_.initialise,

		UserState: OtrlUserState,

		ConnContext: OtrlConnContext,

		MessageAppOps: OtrlMessageAppOps,

		VFS: new VirtualFileSystem(),

		version: function () {
			return otrl_.version() + "-emscripten";
		},

		GcryptError: GcryptError
	};

	var OTRL_TLV_DISCONNECTED = 1;

	//OtrlTLV
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
	//OtrlInsTag
	function OtrlInsTag(ptr) {
		this._pointer = ptr;
	}
	OtrlInsTag.prototype.instag = function () {
		return helper_.unsigned_int32(jsapi_.instag_get_tag(this._pointer));
	};

	//OtrlPrivKey
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
				dsakey[token] = Pointer_stringify(buffer);
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


	//OtrlUserState
	function OtrlUserState() {
		this._pointer = otrl_.userstate_create();
	}
	OtrlUserState.prototype.free = function () {
		otrl_.userstate_free(this._pointer);
	};
	OtrlUserState.prototype.privkey_root = function () {
		var ptr = jsapi_.userstate_get_privkey_root(this._pointer);
		if (ptr) return new OtrlPrivKey(ptr);
		return undefined;
	};
	OtrlUserState.prototype.accounts = function () {
		var p = this.privkey_root();
		var accounts = [];
		var accountname, protocol;
		var self = this;
		while (p) {
			accountname = p.accountname();
			protocol = p.protocol();
			accounts.push({
				"accountname": accountname,
				"protocol": protocol,
				"fingerprint": self.fingerprint(accountname, protocol),
				"privkey": p,
				"instag": self.findInstag(accountname, protocol)
			});
			p = p.next();
		}
		return accounts;
	};

	OtrlUserState.prototype.masterContexts = function () {
		var list = [];
		var ctx_ptr = jsapi_.userstate_get_context_root(this._pointer);
		while (ctx_ptr !== 0) {
			list.push(new OtrlConnContext(ctx_ptr));
			ctx_ptr = jsapi_.conncontext_get_next(ctx_ptr);
		}
		return list;
	};

	OtrlUserState.prototype.generateKey = function (filename, accountname, protocol, callback) {
		var self = this;
		if (typeof filename == 'string' && typeof accountname == 'string' && typeof protocol == 'string' &&
			typeof callback == 'function') {
			var err = otrl_.privkey_generate(this._pointer, filename, accountname, protocol);
			if (callback) {
				callback.apply(self, [err ? new GcryptError(err) : null, err ? undefined : this.findKey(
					accountname, protocol)]);
			}
		} else {
			callback(new TypeError("invalid-arguments"));
		}
	};
	OtrlUserState.prototype.fingerprint = function (accountname, protocol) {
		if (typeof accountname == 'string' && typeof protocol == 'string') {
			var fp = _malloc(45);
			var res = otrl_.privkey_fingerprint(this._pointer, fp, accountname, protocol);
			var human = (res ? Pointer_stringify(fp) : undefined);
			_free(fp);
			return human;
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.readKeysSync = function (filename) {
		if (typeof filename == 'string') {
			var err = otrl_.privkey_read(this._pointer, filename);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.writeKeysSync = function (filename) {
		if (typeof filename == 'string') {
			var err = jsapi_.userstate_write_to_file(this._pointer, filename);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.readFingerprintsSync = function (filename) {
		if (typeof filename == 'string') {
			var err = otrl_.privkey_read_fingerprints(this._pointer, filename, 0, 0);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.writeFingerprintsSync = function (filename) {
		if (typeof filename == 'string') {
			var err = otrl_.privkey_write_fingerprints(this._pointer, filename);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.writeTrustedFingerprintsSync = function (filename) {
		if (typeof filename == 'string') {
			var err = jsapi_.privkey_write_trusted_fingerprints(this._pointer, filename);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.readInstagsSync = function (filename) {
		if (typeof filename == 'string') {
			var err = otrl_.instag_read(this._pointer, filename);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.writeInstagsSync = function (filename) {
		if (typeof filename == 'string') {
			var err = otrl_.instag_write(this._pointer, filename);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};

	OtrlUserState.prototype.generateInstag = function (filename, accountname, protocol) {
		if (typeof filename == 'string' &&
			typeof accountname == 'string' &&
			typeof protocol == 'string'
		) {
			var err = otrl_.instag_generate(this._pointer, filename, accountname, protocol);
			if (err) throw new GcryptError(err);
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.findInstag = function (accountname, protocol) {
		if (typeof accountname == 'string' &&
			typeof protocol == 'string'
		) {
			var ptr = otrl_.instag_find(this._pointer, accountname, protocol);
			if (ptr) return (new OtrlInsTag(ptr)).instag();
			return undefined;
		} else {
			throw new TypeError("invalid-arguments");
		}
	};
	OtrlUserState.prototype.findKey = function (accountname, protocol) {
		var ptr = otrl_.privkey_find(this._pointer, accountname, protocol);
		if (ptr) return new OtrlPrivKey(ptr);
		return null;
	};
	OtrlUserState.prototype.forgetAllKeys = function () {
		otrl_.privkey_forget_all(this._pointer);
	};
	OtrlUserState.prototype.deleteKeyOnFile = function (filename, accountname, protocol) {
		jsapi_.privkey_delete(this._pointer, filename, accountname, protocol);
	};
	OtrlUserState.prototype.importKey = function (accountname, protocol, dsa, base) {
		var err = 0;
		var mpi = {
			p: gcry_.mpi_new(1024),
			q: gcry_.mpi_new(1024),
			g: gcry_.mpi_new(1024),
			y: gcry_.mpi_new(1024),
			x: gcry_.mpi_new(1024)
		};
		var doImport = true;
		['p', 'q', 'g', 'y', 'x'].forEach(function (t) {
			var bi;
			switch (typeof dsa[t]) {
			case 'string':
				bi = BigInt.str2bigInt(dsa[t], base || 16);
				break;
			case 'object':
				bi = dsa[t];
				break;
			default:
				doImport = false;
				bi = null;
			}
			if (bi !== null) {
				//console.log("converting BI to mpi:",bi);
				helper_.bigint2mpi(mpi[t], bi);
			}
		});
		if (doImport) {
			//console.log("importing mpi:",mpi);
			err = jsapi_.userstate_import_privkey(this._pointer, accountname, protocol, mpi.p, mpi.q,
				mpi.g,
				mpi.y, mpi.x);
			//console.log( "import result:", gcry_.strerror(err));
		}

		['p', 'q', 'g', 'y', 'x'].forEach(function (t) {
			gcry_.mpi_release(mpi[t]);
		});
		if (doImport && err) throw new GcryptError(err);
		if (!doImport) throw new Error("DSA Key import failed. Unsupported Format.");
	};
	OtrlUserState.prototype.getMessagePollDefaultInterval = function () {
		return otrl_.message_poll_get_default_interval(this._pointer);
	};
	OtrlUserState.prototype.messagePoll = function (ops, opdata) {
		otrl_.message_poll(this._pointer, ops._pointer, opdata);
	};

	//ConnContext
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
		var human = Pointer_stringify(fp);
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


	OtrlConnContext.prototype.obj = function () {
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
	OtrlConnContext.prototype.fields = OtrlConnContext.prototype.obj;

	OtrlConnContext.prototype.next = function () {
		return new OtrlConnContext(jsapi_.conncontext_get_next(this._pointer));
	};

	function Fingerprint(ptr) {
		if (ptr !== 0) {
			this._pointer = ptr;
		} else {
			return undefined;
		}
	}

	Fingerprint.prototype.fingerprint = function () {
		var fp = _malloc(45);
		jsapi_.fingerprint_get_fingerprint(this._pointer, fp);
		var human = Pointer_stringify(fp);
		_free(fp);
		return human;
	};

	Fingerprint.prototype.trust = function () {
		return jsapi_.fingerprint_get_trust(this._pointer);
	};

	//OtrlMessageAppOps
	function OtrlMessageAppOps(event_handler) {
		//keep track of all created instances
		//index into array will be passed around as opdata to tie
		//the event_handler to the relevant instance.
		if (!OPS_QUEUE) OPS_QUEUE = ASYNC.queue(ops_handle_event, 1);

		var self = this;
		this._event_handler = event_handler;
		this._opsdata = _malloc(4);
		setValue(this._opsdata, MAO.length, "i32");
		MAO[MAO.length] = {
			"instance": self
		};
		this._pointer = jsapi_.messageappops_new();
	}

	function ops_handle_event(O, callback) {
		var instance = O._;
		delete O._;
		instance._event_handler(O);
		callback();
	}

	function ops_event($opsdata, ev_obj, ev_name) {
		var $index = getValue($opsdata, "i32");
		if (ev_name) ev_obj.EVENT = ev_name;
		var event_handled = false;
		var ret_value;

		//handle ops synchronously
		['is_logged_in', 'policy', 'max_message_size', 'create_instag', 'create_privkey'].forEach(
			function (E) {
				if (ev_name == E) {
					event_handled = true;
					ret_value = MAO[$index].instance._event_handler(ev_obj);
				}
			});

		if (event_handled) {
			return ret_value;
		} else {
			//fire events asynchronously
			ev_obj._ = MAO[$index].instance;
			OPS_QUEUE.push(ev_obj);
		}
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
		setValue(messagep_ptr, 0, "i32");

		var frag_policy = 1; //OTRL_FRAGMENT_SEND_ALL
		var contextp_ptr = _malloc(4); //pointer to context used to send to buddy
		var instag = to_instag || 1; //OTRL_INSTAG_BEST

		var err = otrl_.message_sending(userstate._pointer, this._pointer, this._opsdata, accountname,
			protocol,
			recipient, instag,
			message, 0, messagep_ptr, frag_policy, contextp_ptr, 0, 0);

		//update the channel with the active context used
		otrchannel.context._pointer = getValue(contextp_ptr, "i32");

		var retvalue;
		var messagep = 0;
		if (err === 0) {
			messagep = getValue(messagep_ptr, "i32");
			if (messagep !== 0 && frag_policy !== 1) {
				//we will handle sending the encrypted fragment
				retvalue = Pointer_stringify(messagep);
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
		otrchannel.context._pointer = getValue(contextp_ptr, "i32");

		var tlvs = new OtrlTLV(getValue(tlvsp_ptr, "i32"));
		if (tlvs.find(OTRL_TLV_DISCONNECTED)) {
			ops_event(this._opsdata, {}, "remote_disconnected");
		}
		tlvs.free();


		var newmessagep = getValue(newmessagep_ptr, "i32"); //char*

		var retvalue;
		if (status == 1) retvalue = null;
		if (status === 0) {
			retvalue = (newmessagep === 0) ? message : Pointer_stringify(newmessagep);
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
			setValue(usedata_ptr + i, usedata_view[i], "i8");
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


	function VirtualFileSystem() {

		function path_real(p) {
			return p.replace(new RegExp('/', 'g'), path.sep);
		}

		function path_vfs(p) {
			return p.replace(new RegExp(/\\/g), '/');
		}

		this.nextFileName = (function () {
			var FILE_COUNTER = 0;
			return (function () {
				FILE_COUNTER = FILE_COUNTER + 1;
				return "/auto-file-" + FILE_COUNTER;
			});
		})();

		//cp a file from real file system to virtual file system - full paths must be specified.
		this.importFile = function (source, destination, transform) {
			if (!fs) {
				throw new Error("node filesystem not available.");
			}
			if (typeof source !== 'string') {
				throw new TypeError("first argument must be a string.");
			}
			if (typeof destination !== 'string') {
				throw new TypeError("second argument must be a string.");
			}
			if (transform && typeof transform !== 'function') {
				throw new TypeError("third argument must be a function.");
			}

			destination = path_vfs(destination);
			source = path_real(source);
			var target_folder, data, virtual_file;
			var filename = destination.split('/').reverse()[0];
			if (filename) {
				target_folder = Module.FS_findObject(path_vfs(path.dirname(destination)));
				if (!target_folder) {
					target_folder = Module.FS_createPath("/", path_vfs(path.dirname(destination)),
						true,
						true);
				}
				if (target_folder) {
					if (fs_existsSync(source)) {
						data = fs.readFileSync(source);
						data = transform ? transform(data) : data;
						virtual_file = Module.FS_findObject(path_vfs(destination));
						if (virtual_file) {
							//delete existing vfs file
							Module.FS_destroyNode(virtual_file);
						}
						virtual_file = Module.FS_createDataFile(target_folder, filename, data, true,
							true);
					} else throw new Error("No such file or directory '" + source + "'");
				}
			}
		};

		//cp a file from virtual file system to real file system
		this.exportFile = function (source, destination, transform) {
			if (!fs) {
				throw new Error("node filesystem not available.");
			}
			if (typeof source !== 'string') {
				throw new TypeError("first argument must be a string.");
			}
			if (typeof destination !== 'string') {
				throw new TypeError("second argument must be a string.");
			}
			if (transform && typeof transform !== 'function') {
				throw new TypeError("third argument must be a function.");
			}

			var data, fd;
			destination = path_real(destination);
			source = path_vfs(source);
			//TODO preserve same file permissions (mode) - make sure files only readable by user
			data = Module.FS_readDataFile(source);
			if (data) {
				data = transform ? transform(data) : data;
				if (!fs_existsSync(path_real(path.dirname(destination)))) {
					fs.mkdirSync(path_real(path.dirname(destination)));
				}
				fd = fs.openSync(destination, "w");
				fs.writeSync(fd, data, 0, data.length, 0);
				fs.closeSync(fd);
			} else throw new Error("virtual file not found '" + source + "'");
		};

		this.readFileData = function (source) {
			if (typeof source !== "string") {
				throw new TypeError("first argument must be a string.");
			}
			source = path_vfs(source);
			var virtual_file = Module.FS_findObject(path_vfs(source));
			if (virtual_file) {
				return Module.FS_readDataFile(source);
			} else {
				throw new Error("virtual file not found '" + source + "'");
			}
		};

		this.makeFile = function (destination, data) {
			if (typeof destination !== 'string') {
				throw new TypeError('first argument must be a string.');
			}
			if (!(data instanceof Buffer)) {
				throw new TypeError("second argument must be a Buffer.");
			}
			destination = path_vfs(destination);
			var target_folder, virtual_file;
			var filename = destination.split('/').reverse()[0];
			if (filename) {
				target_folder = Module.FS_findObject(path_vfs(path.dirname(destination)));
				if (!target_folder) {
					target_folder = Module.FS_createPath("/", path_vfs(path.dirname(destination)),
						true,
						true);
				}

				if (target_folder && data) {
					virtual_file = Module.FS_findObject(path_vfs(destination));
					if (virtual_file) {
						//delete existing vfs file
						Module.FS_destroyNode(virtual_file);
					}
					Module.FS_createDataFile(target_folder, filename, data, true, true);
				}
			}
		};

		this.deleteFile = function (destination) {
			var virtual_file = Module.FS_findObject(path_vfs(destination));
			if (virtual_file) Module.FS_destroyNode(virtual_file);
		};
	}

	function GcryptError(num) {
		var err = new Error(gcry_.strerror(num || 0));
		err.num = num || 0;
		return err;
	}


}).call(this);
