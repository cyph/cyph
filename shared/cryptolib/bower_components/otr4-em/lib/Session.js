var libotr = require("./bindings");
var otr = require("../index.js");

var util = require('util');
var events = require('events');
var Buffer = require("buffer").Buffer;

module.exports.Session = Session;

util.inherits(Session, events.EventEmitter);

var nextTick = process.nextTick ? process.nextTick : function (func) {
	setTimeout(func, 0);
};

var nextSessionID = (function () {
	var COUNTER = 0;
	return (function () {
		COUNTER = COUNTER + 1;
		return COUNTER;
	});
})();

/** Session class is an EventEmitter, that handles the OTR protocol.
 * You can optionally add an online() method to the instance which should return true if contact is online.
 * This determines wether to send hearbeats or not. If method is not added contact is assumed to be online.
 * @constructor
 * @alias module:otr.Session
 * @param {User} user -
 * @param {Account} account -
 * @param {Contact} contact -
 * @param {OTRParams} [parameters] -
 */
function Session(user, account, contact, parameters) {
	var session = this;
	session._id = nextSessionID();

	events.EventEmitter.call(this);

	session.user = user;
	session.context = new libotr.ConnContext(user.state, account.name(), account.protocol(), contact.name());
	session.parameters = parameters;
	session.ops = new libotr.MessageAppOps(
		function (o) {
			if (parameters && parameters.debug) {
				console.error(o);
			}
			switch (o.EVENT) {
				/**
				 * "smp" Session event, combines multiple smp event types
				 *
				 * @event module:otr.Session#smp
				 * @type {function}
				 * @param {string} type - one of "failed", "request","complete", "aborted"
				 * @param {string} [question] - if an smp request came with a question
				 */
			case "smp_error":
				session.smpAbort();
				session.emit("smp", "failed");
				return;
			case "smp_request":
				session.emit("smp", "request", o.question);
				return;
			case "smp_complete":
				session.emit("smp", "complete");
				return;
			case "smp_failed":
				session.emit("smp", "failed");
				return;
			case "smp_aborted":
				session.emit("smp", "aborted");
				return;

			case "is_logged_in":
				if (typeof session.online === 'function') {
					if (session.online()) return 1;
					return 0;
				}
				return 1; //remote party is assumed to be online

			case "gone_secure":
				/** "gone_secure" Session event, is called when connection becomes encrypted
				 * @event module:otr.Session#gone_secure
				 */
				session.emit(o.EVENT);
				return;

			case "gone_insecure":
				//never get's called by libotr4.0.0?
				session.emit(o.EVENT);
				return;

			case "policy":
				if (!session.parameters) {
					return otr.POLICY.DEFAULT;
				}
				if (typeof session.parameters.policy === 'number') {
					return (session.parameters.policy); //todo: validate policy
				}
				return otr.POLICY.DEFAULT;

			case "max_message_size":
				if (!session.parameters) return 0;
				return session.parameters.MTU || 0;

			case "inject_message":
				/** "inject_message" Session event, is fired when a message fragment should be sent to contact
				 * @event module:otr.Session#inject_message
				 * @type {function}
				 * @param {string} message - message fragment to be sent.
				 */
				if (!session.listeners(o.EVENT).length) {
					if (parameters && parameters.debug) console.error(
						"no listeners for inject_message event");
				}
				session.emit(o.EVENT, o.message);
				return;

			case "new_fingerprint":
				/** "new_fingerprint" Session event is fired when we see a fingerprint not on file.
				 * This is fired before gone_secure event and will be followed by write_fingerprints event.
				 * @event module:otr.Session#new_fingerprint
				 * @type {function}
				 * @param {string} fingerprint
				 */
				session.emit(o.EVENT, o.fingerprint);
				return;

			case "write_fingerprints":
				/** "write_fingerprints" Session event is fired when a new fingerprint is seen and when a fingerprint is
				 * successfully authenticated with SMP
				 * @event module:otr.Session#write_fingerprints
				 */
				session.emit(o.EVENT);
				return;

			case "still_secure":
				/** "still_secure" Session event is fired when otr session is re-negotiated.
				 * @event module:otr.Session#still_secure
				 */
				session.emit(o.EVENT);
				return;

			case "msg_event":
				/** "msg_event" Session event is fired when some type of exceptional event has occured
					that your application may want to be aware of. Your application may want
					to write an event to a log file, display a message to the user, or
					ignore the event.  While it is not required to implement this operation,
					it is probably a good idea.
				* @event module:otr.Session#msg_event
				* @type {function}
				* @param {Object} msgevent - properties value (otr.MSGEVENT),name,message,error
				*/
				session.emit(o.EVENT, otr.MSGEVENT.make(o.event, o.message, o.err));
				return;

			case "received_symkey":
				/** "received_symkey" Session event is fired when contact has decided to use the extra symmetric key
				 * @event module:otr.Session#received_symkey
				 * @type {function}
				 * @param {number} use
				 * @param {ArrayBuffer} usedata
				 * @param {ArrayBuffer} key
				 */
				session.emit(o.EVENT, o.use, o.usedata, o.key);
				return;

			case "remote_disconnected":
				/** "disconnect" Session event is fired when contact ends the private conversation. The session will be in Finished state.
				 * @event module:otr.Session#disconnect
				 */
				session.emit("disconnect");
				return;

			case "update_context_list":
				/** "update_context_list" Session event is fired when contacts are added or removed.
				 * @event module:otr.Session#update_context_list
				 */
				session.emit(o.EVENT);
				return;

			case "create_privkey":
				/** "create_privkey" Session event will be raised if an OTR conversation was attempted an the account does not have an OTR key.
				 * It is a good practice to make sure a private key is generated before starting a session.
				 * @event module:otr.Session#create_privkey
				 */
				if (!session.listeners(o.EVENT).length) {
					if (parameters && parameters.debug) console.error(
						"no listeners for create_privkey event");
				}
				session.emit(o.EVENT, o.accountname, o.protocol);
				return;

			case "create_instag":
				if (!session.listeners(o.EVENT).length) {
					if (parameters && parameters.debug) console.error(
						"no listeners for create_instag event");
				}
				/** "create_instag" Session event will be raised if an OTR conversation was attempted an the account does not have an instance tag.
				 * It is a good practice to make sure an instance tag is generated before starting a session.
				 * @event module:otr.Session#create_instag
				 */
				session.emit(o.EVENT, o.accountname, o.protocol);
				return;
			}
		}

	);

	this.message_poll_interval = setInterval(function () {
		user.messagePoll(session.ops, 0);
	}, user.getMessagePollDefaultInterval() * 1000 || 70 * 1000);
}

/** Sends the OTR query message to start the OTR protocol.
 * @method
 */
Session.prototype.start = function () {
	return this.send("?OTR?");
};

/** Send a message to contact
 * @method
 * @param {string} message - a string or object with a toString() method
 * @param {number} instag - instance tag of contact if known.
 */
Session.prototype.send = function (message, instag) {
	var session = this;
	var buff = message instanceof Buffer ? new Buffer(message) : message;
	nextTick(function () {
		instag = instag || 1; //default instag = BEST
		//message can be any object that can be serialsed to a string using it's .toString() method.
		var msgout = session.ops.messageSending(session.user.state, session.context.accountname(),
			session.context
			.protocol(),
			session.context.username(), buff.toString(), instag, session);
		if (msgout) {
			//frag policy something other than SEND_ALL.. results in a fragment to be sent manually
			session.emit("inject_message", msgout);
		}
	});
};

/** Pass incoming data/messages from contact to this method to be handled by OTR
 * @method
 * @param {string} message - a string or object with a toString() method
 */
Session.prototype.recv = function (message) {
	var session = this;
	var buff = message instanceof Buffer ? new Buffer(message) : message;
	nextTick(function () {
		//message can be any object that can be serialsed to a string using it's .toString() method.
		var msg = session.ops.messageReceiving(session.user.state, session.context.accountname(),
			session.context
			.protocol(),
			session.context.username(), buff.toString(), session);
		if (msg) {
			/** "message" Session event is fired when receiving a plaintext or decrypted message from contact
			 * @event module:otr.Session#message
			 * @type {function}
			 * @param {string} message
			 * @param {boolean} isEncrypted - true if message was received in private
			 */
			session.emit("message", msg, session.isEncrypted());
		}
	});
};

/** Ends an OTR conversation and returns to plaintext.
 * @method
 */
Session.prototype.end = function () {
	var session = this;
	nextTick(function () {
		if (session.message_poll_interval) {
			clearInterval(session.message_poll_interval);
		}
		session.ops.disconnect(session.user.state, session.context.accountname(), session.context.protocol(),
			session.context.username(),
			session.context.their_instance());
		/** "plaintext" Session event is fired after ending our side of the private conversation and returning to
		 * plaintext mode.
		 * @event module:otr.Session#plaintext
		 */
		session.emit("plaintext");
	});

};

/** Starts SMP authentication
 * @method
 * @param {string} [secret] - secret to use for authentication. If not provided it will be taken from session parameters.
 * @throws {Error}
 */
Session.prototype.smpStart = function (secret) {
	var session = this;
	var sec = secret;
	sec = sec || (this.parameters ? this.parameters.secret : undefined);
	if (sec) {
		nextTick(function () {
			session.ops.initSMP(session.user.state, session.context, sec);
		});
	} else {
		throw (new Error("No Secret Provided"));
	}
};

/** Starts SMP authentication with a question.
 * @method
 * @param {string} question - question to display to contact when they receive the SMP authentication request.
 * @param {string} secret - secret to use for authentication.
 * @throws {Error}
 */
Session.prototype.smpStartQuestion = function (question, secret) {
	var session = this;
	if (!question) {
		throw (new Error("No Question Provided"));
	}
	var sec = secret;
	if (!sec) {
		sec = this.parameters ? this.parameters.secrets : undefined;
		if (!sec) {
			throw (new Error("No Secrets Provided"));
		}
		sec = sec[question];
	}
	if (!sec) {
		throw (new Error("No Secret Matched for Question"));
	}
	nextTick(function () {
		session.ops.initSMP(session.user.state, session.context, sec, question);
	});
};

/** Respond to an SMP authentication request.
 * @method
 * @param {string} [secret] - secret to use for authentication. If not provided it will be taken from session parameters.
 * @throws {Error}
 */
Session.prototype.smpRespond = function (secret) {
	var session = this;
	var sec = secret || undefined;
	if (!sec) {
		sec = this.parameters.secret || undefined;
	}
	if (!sec) {
		throw (new Error("No Secret Provided"));
	}
	nextTick(function () {
		session.ops.respondSMP(session.user.state, session.context, sec);
	});
};

/** Abort active SMP authentication
 * @method
 */
Session.prototype.smpAbort = function () {
	var session = this;
	nextTick(function () {
		session.ops.abortSMP(session.user.state, session.context);
	});
};

/** Return true if session is encrypted (private)
 * @method
 * @returns {boolean}
 */
Session.prototype.isEncrypted = function () {
	return (this.context.msgstate() === 1);
};

/** Return true if session is in Plaintext mode (not private)
 * @method
 * @returns {boolean}
 */
Session.prototype.isPlaintext = function () {
	return (this.context.msgstate() === 0);
};

/** Return true if remote contact has disconnected
 * @method
 * @returns {boolean}
 */
Session.prototype.isFinished = function () {
	return (this.context.msgstate() === 2);
};

/** Return true if contact's public key fingerpint is trusted. (authenticated with SMP)
 * @method
 * @returns {boolean}
 */
Session.prototype.isAuthenticated = function () {
	return this.context.trust();
};

/** Returns the extra symmetric key and informs contact that we want to use it. They symmetric key
 *  will be returned as the first argument of the callback back function.
 * @method
 * @param {number} use
 * @param {ArrayBuffer} usedata
 * @param {function} callback
 */
Session.prototype.extraSymKey = function (use, usedata, callback) {
	var session = this;
	nextTick(function () {
		var key = session.ops.extraSymKey(session.user.state, session.context, use, usedata);
		callback(key);
	});
};

/** Returns contact's instance tag
 * @method
 * @return {number}
 */
Session.prototype.theirInstance = function () {
	return this.context.their_instance();
};

/** Returns our instance tag
 * @method
 * @return {number}
 */
Session.prototype.ourInstance = function () {
	return this.context.our_instance();
};

/** Returns the active OTR protocol version
 * @method
 * @return {number}
 */
Session.prototype.protocolVersion = function () {
	return this.context.protocol_version();
};

/** Returns the contact's human readable public key fingerprint
 * @method
 * @return {string}
 */
Session.prototype.theirFingerprint = function () {
	return this.context.fingerprint();
};

/** Call the destroy method to remove all event listeners and release resources used by the session.
 * @method
 */
Session.prototype.destroy = function () {
	var session = this;
	if (session.message_poll_interval) {
		clearInterval(session.message_poll_interval);
	}
	session.removeAllListeners();
	this.user = undefined;
	this.context = undefined;
	this.parameters = undefined;
	this.ops = undefined; //todo - free allocated memory for OtrlMessageAppOps structure.
};

/**
 * Optional OTR Session parameters.
 * @typedef {Object} OTRParams
 * @property {number} policy - {@link module:otr.POLICY POLICY} default is otr.POLICY.DEFAULT
 * @property {string} secret - shared secret to use during SMP authentication if not specified as argument in smp methods.
 * @property {number} MTU - max message fragment size in bytes, default is 0 which means no fragmentation.
 */
