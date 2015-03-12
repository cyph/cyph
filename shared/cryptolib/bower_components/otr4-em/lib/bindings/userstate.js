var Module = require("../../build/libotr4.js");
var otrl_ = Module.libotrl;
var gcry_ = Module.libgcrypt;
var jsapi_ = Module.jsapi;

var _malloc = Module._malloc;
var _free = Module._free;
var _pointerStringify = Module.Pointer_stringify;

var helper_ = {};
helper_.bigint2mpi = Module.bigint2mpi;

var BigInt = require("../bigint.js");

var OtrlPrivKey = require("./privkey.js").OtrlPrivKey;
var OtrlInsTag = require("./instag.js").OtrlInsTag;
var GcryptError = require("./error.js").GcryptError;
var OtrlConnContext = require("./context.js").OtrlConnContext;

module.exports.OtrlUserState = OtrlUserState;

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
		var human = (res ? _pointerStringify(fp) : undefined);
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
