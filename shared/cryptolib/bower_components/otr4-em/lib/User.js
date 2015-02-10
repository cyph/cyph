var BigInt = require('./bigint.js');
var expandHomeDir = require("./homedir.js");
var libotr = require("./bindings");
var otr = require("../index.js");

module.exports.User = User;

/** Represents a users's keys, fingerprints and instance tags
 *  stored in files on the virtual file system. Passing in the optional files argument to
 *  the constructor will load the the keystore files (keys, fingerprints and instags) automatically, using
 *  the loadKeysFromFS, loadFingerprintsFromFS and loadInstagsFromFS methods.
 *  @alias module:otr.User
 *  @constructor
 *  @param {Object} [files] object with string properties: keys, fingerprints, instags
 */
function User(files) {
	this.state = new libotr.UserState();
	this.keys = libotr.VFS.nextFileName();
	this.fingerprints = libotr.VFS.nextFileName();
	this.instags = libotr.VFS.nextFileName();

	//load files from the real file system
	if (files) {
		if (files.keys) {
			try {
				this.loadKeysFromFS(files.keys);
			} catch (e) {
				console.error("Warning Reading Keys:", e);
			}
		}
		if (files.fingerprints) {
			try {
				this.loadFingerprintsFromFS(files.fingerprints);
			} catch (e) {
				console.error("Warning Reading Fingerprints:", e);
			}
		}
		if (files.instags) {
			try {
				this.loadInstagsFromFS(files.instags);
			} catch (e) {
				console.error("Warning Reading Instags:", e);
			}
		}
	}
}

/** Reads a file from filesystem, imports it into the the internal virtual file system and
* parses it to load private keys.
* @method
* @param {string} filename - path to private keys file.
* @param {Function} [transform] - function thats takes a Buffer as its only argument and returns a Buffer.
	The returned buffer will be stored in the imported file. (This could be used to decrypt a file, or transform it from a different format)
	If no function is provided the the file is imported as is.
* @throws {Error}
* @throws {TypeError}
*/
User.prototype.loadKeysFromFS = function (filename, transform) {
	libotr.VFS.importFile(expandHomeDir(filename), this.keys, transform);
	this.state.readKeysSync(this.keys);
};

/** Reads a file from filesystem, imports it into the the internal virtual file system and
* parses it to load fingerprints.
* @method
* @param {string} filename - path to fingerprints file.
* @param {Function} [transform] - function thats takes a Buffer as its only argument and returns a Buffer.
The returned buffer will be stored in the imported file. (This could be used to decrypt a file, or transform it from a different format)
If no function is provided the the file is imported as is.
* @throws {Error}
* @throws {TypeError}
*/
User.prototype.loadFingerprintsFromFS = function (filename, transform) {
	libotr.VFS.importFile(expandHomeDir(filename), this.fingerprints, transform);
	this.state.readFingerprintsSync(this.fingerprints);
};

/** Reads a file from filesystem, imports it into the the internal virtual file system and
* parses it to load instags.
* @method
* @param {string} filename - path to instags file.
* @param {Function} [transform] - function thats takes a Buffer as its only argument and returns a Buffer.
The returned buffer will be stored in the imported file. (This could be used to decrypt a file, or transform it from a different format)
If no function is provided the the file is imported as is.
* @throws {Error}
* @throws {TypeError}
*/
User.prototype.loadInstagsFromFS = function (filename, transform) {
	libotr.VFS.importFile(expandHomeDir(filename), this.instags, transform);
	this.state.readInstagsSync(this.instags);
};

/** Deletes the keystore files from the virtual file system.
 * @method
 */
User.prototype.deleteVfsFiles = function () {
	libotr.VFS.deleteFile(this.keys);
	libotr.VFS.deleteFile(this.instags);
	libotr.VFS.deleteFile(this.fingerprints);
};

/** Saves the keys file from the internal virtual file system back to the real file system.
* @method
* @param {string} filename - destination path to save private keys file.
* @param {Function} [transform] - function thats takes a Buffer as its only argument and returns a Buffer.
The returned buffer will be saved to the file system. (This could be used to encrypt a file, or transform it to a different format)
* @throws {Error}
* @throws {TypeError}
*/
User.prototype.saveKeysToFS = function (filename, transform) {
	libotr.VFS.exportFile(this.keys, expandHomeDir(filename), transform);
};

/** Saves the fingerprints file from the internal virtual file system back to the real file system.
* @method
* @param {string} filename - destination path to save fingerprints file.
* @param {Function} [transform] - function thats takes a Buffer as its only argument and returns a Buffer.
The returned buffer will be saved to the file system. (This could be used to encrypt a file, or transform it to a different format)
* @throws {Error}
* @throws {TypeError}
*/
User.prototype.saveFingerprintsToFS = function (filename, transform) {
	libotr.VFS.exportFile(this.fingerprints, expandHomeDir(filename), transform);
};

/** Saves the instags file from the internal virtual file system back to the real file system.
* @method
* @param {string} filename - destination path to save instags file.
* @param {Function} [transform] - function thats takes a Buffer as its only argument and returns a Buffer.
The returned buffer will be saved to the file system. (This could be used to encrypt a file, or transform it to a different format)
* @throws {Error}
* @throws {TypeError}
*/
User.prototype.saveInstagsToFS = function (filename, transform) {
	libotr.VFS.exportFile(this.instags, expandHomeDir(filename), transform);
};

/**
 * Reads the keys file from the virtual file system and returns it as a string. This can be useful in a web
 * environment for persisting the account data.
 * @method
 * @returns {string}
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.keysToString = function () {
	return libotr.VFS.readFileData(this.keys).toString();
};

/**
 * Reads the fingerprints file from the virtual file system and returns it as a string. This can be useful in a web
 * environment for persisting the account data.
 * @method
 * @returns {string}
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.fingerprintsToString = function () {
	return libotr.VFS.readFileData(this.fingerprints).toString();
};

/**
 * Reads the instags file from the virtual file system and returns it as a string. This can be useful in a web
 * environment for persisting the account data.
 * @method
 * @returns {string}
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.instagsToString = function () {
	return libotr.VFS.readFileData(this.instags).toString();
};

/**
 * Creates the keys file on the virtual file system from a string.
 * @method
 * @param {string} data - keys data in libotr format
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.stringToKeys = function (str) {
	libotr.VFS.makeFile(this.keys, new Buffer(str));
	this.state.readKeysSync(this.keys);
};

/**
 * Creates the fingerprints file on the virtual file system from a string.
 * @method
 * @param {string} data - fingerprints data in libotr format
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.stringToFingerprints = function (str) {
	libotr.VFS.makeFile(this.fingerprints, new Buffer(str));
	this.state.readFingerprintsSync(this.fingerprints);
};

/**
 * Creates the instags file on the virtual file system from a string.
 * @method
 * @param {string} data - instags data in libotr format
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.stringToInstags = function (str) {
	libotr.VFS.makeFile(this.instags, new Buffer(str));
	this.state.readInstagsSync(this.instags);
};

/**
 * Returns and array of {@link module:otr.Account Account} instances, representing all the user accounts.
 * If no accounts exist, the return value will be an empty array.
 * @method
 * @returns {Array} Array of {@link module:otr.Account Account} instances.
 */
User.prototype.accounts = function () {
	var user = this,
		accounts = this.state.accounts(),
		list = [];
	accounts.forEach(function (account) {
		list.push(new otr.Account(user, account.accountname, account.protocol));
	});
	return list;
};

/**
 * Writes fingerprints from memory to the virtual fingerprints file. Use this method to save new fingerprints
 * and when they get marked as trusted following SMP authentication. You will still need to persist the file to
 * real file system or elswehere using fingerprintsToString or saveFingerprintsToFS methods.
 * @method
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.writeFingerprints = function () {
	this.state.writeFingerprintsSync(this.fingerprints);
};

/**
 * Writes only fingerprints which have been authenticated from memory to the virtual fingerprints file.
 * You will still need to persist the file to real file system or elswehere using fingerprintsToString
 * or saveFingerprintsToFS methods.
 * @method
 * @throws {Error}
 * @throws {TypeError}
 */
User.prototype.writeTrustedFingerprints = function () {
	this.state.writeTrustedFingerprintsSync(this.fingerprints);
};

User.prototype.getMessagePollDefaultInterval = function () {
	return this.state.getMessagePollDefaultInterval();
};

User.prototype.messagePoll = function (ops, opdata) {
	this.state.messagePoll(ops, opdata);
};

/**
 * Select an account or create a new account with given accountname and protocol
 * @method
 * @argument {string}  accountname
 * @argument {string}  protocol
 * @returns  {Account} instance of {@link module:otr.Account Account} class
 */
User.prototype.account = function (accountname, protocol) {
	return new otr.Account(this, accountname, protocol);
};
