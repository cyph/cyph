var otr = require("../index.js");
var BigInt = require('./bigint.js');

module.exports.Account = Account;

/** Represents a single user account.
 * @alias module:otr.Account
 * @constructor
 * @argument {User} user - {@link module:otr.User User} object to associate the account with
 * @argument {string} accountname
 * @argument {string} protocol
 */
function Account(user, accountname, protocol) {
	if (!(user instanceof otr.User)) {
		throw new TypeError("first argument must be an instance of User");
	}

	if (typeof accountname !== 'string') {
		throw new TypeError("second argument must be a string");
	}

	if (typeof protocol !== 'string') {
		throw new TypeError("third argument must be a string");
	}

	var account = this;

	/**
	 * Getter for the accountname of the account.
	 * @method
	 * @returns {string} The accountname.
	 */
	this.name = function () {
		return accountname;
	};

	/**
	 * Getter for the protocol of the account.
	 * @method
	 * @returns {string} The protocol.
	 */
	this.protocol = function () {
		return protocol;
	};

	/**
	 * Generates a new OTR key for the account. Will replace current key if it exists.
	 * @method
	 * @argument {module:otr.Account~generateKey_Callback} callback
	 */
	this.generateKey = function (callback) {
		user.state.generateKey(user.keys, accountname, protocol, function (err, key) {
			if (callback) {
				callback.apply(account, [err, key ? key.export() : undefined]);
			}
		});
	};

	/** Deletes OTR key of the account.
	 * @method
	 */
	this.deleteKey = function () {
		user.state.deleteKeyOnFile(user.keys, accountname, protocol);
	};

	/** Returns the OTR key of the account.
	 * @method
	 * @returns {PrivKey} in base 16 (hexadecimal)
	 */
	this.exportKey = function () {
		var key = user.state.findKey(accountname, protocol);
		if (key) return key.export();
		return undefined;
	};

	/* Returns the OTR key fingerprint in human readable format.
	 * @method
	 * @returns {string}
	 */
	this.fingerprint = function () {
		return user.state.fingerprint(accountname, protocol);
	};

	/** Imports and replaces the OTR key of the account.
	 * @method
	 * @argument {PrivKey} key
	 * @argument {number} [base] - decimal representation of components of key. Default 16 (hexadecimal)
	 * @throws {Error} If key import fails.
	 */
	this.importKey = function (key, base) {
		user.state.importKey(accountname, protocol, key, base);
		user.state.writeKeysSync(user.keys);
	};

	/** Generates a new instance tag for the account.
	 * @method
	 * @argument {module:otr.Account~generateInstag_Callback} callback
	 */
	this.generateInstag = function (callback) {
		try {
			user.state.generateInstag(user.instags, accountname, protocol);
			if (typeof callback === 'function') {
				callback(undefined, user.state.findInstag(accountname, protocol));
			}
		} catch (e) {
			if (typeof callback === 'function') {
				callback(e, undefined);
			}
		}
	};

	/** Getter for instance tag of account.
	 * @method
	 * @returns {number} Instance tag
	 */
	this.instag = function () {
		return user.state.findInstag(accountname, protocol);
	};

	/** Creates and instance of {@link module:otr.Contact Contact}.
	 * @method
	 * @argument {string} recipient - Name of recipient/contact
	 * @returns {Contact} instance of {@link module:otr.Contact Contact}
	 */
	this.contact = function (name) {
		return new otr.Contact(user, account, name);
	};

	/** Returns an array of Contact instances, representing all contacts
	 * @method
	 * @returns {array} of Contact instances
	 */
	this.contacts = function () {
		var contexts = user.state.masterContexts(),
			contacts = [];
		contexts.forEach(function (context) {
			if (context.their_instance() !== 0) {
				return;
			}
			contacts.push(new otr.Contact(user, account, context.username()));
		});
		return contacts;
	};

	/**
	 * @callback module:otr.Account~generateKey_Callback
	 * @param {Error} err - If there was an error generating the key
	 * @param {PrivKey} key - If key was successfully generated, undefined otherwise.
	 */

	/**
	 * @callback module:otr.Account~generateInstag_Callback
	 * @param {Error} err - If there was an error generating the instance tag
	 * @param {number} instag - If instag was successfully generated, undefined otherwise.
	 */

	/**
	 * An OTR key is a DSA key. This object stores the values of the components that make up the private and
	 * public key. It is provided as a means to easily export and import a key into an Account. It is returned
	 * in the callback supplied to generateKey method and  returned by the exportKey method of an Account instance.
	 * @typedef {Object} PrivKey
	 * @property {string} p - p
	 * @property {string} q - q
	 * @property {string} g - g
	 * @property {string} y - y
	 * @property {string} x - x
	 */
}
