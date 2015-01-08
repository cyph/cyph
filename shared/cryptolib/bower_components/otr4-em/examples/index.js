if (typeof exports !== 'undefined') {
	var async = require("../lib/async");
	var OTR = require("../index.js");
}

var otr = OTR;
var document = document || {};

var FORCE_SMP = false;
var SEND_BAD_SECRET = false;

var SMP_TEST_DONE = false;
var SMP_TEST_IN_PROGRESS = false;
var SMP_TEST_PASSED = false;
var SMP_TEST_PERFORMED = false;

var SYMKEY_TEST_DONE = false;
var SYMKEY_TEST_IN_PROGRESS = false;
var SYMKEY_TEST_PASSED = false;
var SYMKEY_TEST_VALUES = {};

if (typeof process !== "undefined") {
	process.argv.forEach(function (arg) {
		if (arg == "--force-smp") FORCE_SMP = true;
		if (arg == "--bad-secret") SEND_BAD_SECRET = true;
	});
}

var debug = debug || function debug() {
	console.log([].join.call(arguments, " "));
};

debug("== loaded libotr version:", otr.version());


var alice_settings = {
	accountname: "alice@telechat.org",
	protocol: "telechat"
};
var bob_settings = {
	accountname: "bob@telechat.org",
	protocol: "telechat"
};

///setting up Alice's side of the connection
var alice = new otr.User({
	keys: "./alice.keys",
	fingerprints: "./alice.fp"
});
alice.name = "Alice";
var alice_account = alice.account(alice_settings.accountname, alice_settings.protocol);

var BOB = alice_account.contact("BOB");
dumpFingerprints(BOB.fingerprints());
var session_a = BOB.openSession({
	policy: otr.POLICY.DEFAULT,
	secret: 's3cr37',
	MTU: 3000
});

///setting up Bob's side of the connection
var bob = new otr.User({
	keys: "./bob.keys",
	fingerprints: "./bob.fp"
});
bob.name = "Bob";
var bob_account = bob.account(bob_settings.accountname, bob_settings.protocol);


var ALICE = bob_account.contact("ALICE");
dumpFingerprints(ALICE.fingerprints());
var session_b = ALICE.openSession({
	policy: otr.POLICY.DEFAULT,
	secret: 's3cr37',
	MTU: 3000
});

dumpConnContext(session_a, "Alice's ConnContext:");
dumpConnContext(session_b, "Bob's ConnContext:");

var NET_QUEUE_A = async.queue(handle_messages, 1);
var NET_QUEUE_B = async.queue(handle_messages, 1);

function handle_messages(O, callback) {
	O.session.recv(O.msg);
	callback();
}

//simulate a network connection between two parties
session_a.on("inject_message", function (msg) {
	debug("ALICE:", msg);
	NET_QUEUE_A.push({
		session: session_b,
		msg: msg
	});
});
session_b.on("inject_message", function (msg) {
	debug("BOB:", msg);
	NET_QUEUE_B.push({
		session: session_a,
		msg: msg
	});
});

session_a.on("create_privkey", function (a, p) {
	debug("Alice doesn't have a key.. creating a new key for:", a, p);
	alice_account.generateKey(function (err, key) {
		if (!err) {
			debug("Alice's Key Generated Successfully");
			try {
				alice.saveKeysToFS("./alice.keys");
			} catch (e) {
				debug("not saving keys.. in browser");
			}
		}
	});
});
session_b.on("create_privkey", function (a, p) {
	debug("Bob doesn't have a key.. creating a new key for:", a, p);
	bob_account.generateKey(function (err, key) {
		if (!err) {
			debug("Bob's Key Generated Successfully");
			try {
				bob.saveKeysToFS("./bob.keys");
			} catch (e) {
				debug("not saving keys.. in browser");
			}
		}
	});
});
session_a.on("create_instag", function (a, p) {
	alice_account.generateInstag();
});
session_b.on("create_instag", function (a, p) {
	bob_account.generateInstag();
});

session_a.on("gone_secure", function () {
	debug("[Alice] Encrypted Connection Established - Gone Secure.");
});
session_a.on("gone_secure", function () {
	debug("[Bob] Encrypted Connection Established - Gone Secure.");
});

//output incoming messages to console
function print_message(name, msg, encrypted) {
	if (encrypted) {
		debug(name + '[ENCRYPTED]:', msg);
	} else {
		debug(name + '[PLAINTEXT]:', msg);
	}
}

session_a.on("msg_event", function (e) {
	debug(JSON.stringify(e));
});

session_b.on("msg_event", function (e) {
	debug(JSON.stringify(e));
});

//alice received message from bob
session_a.on("message", function (msg, encrypted) {
	print_message('<<', msg, encrypted);
	session_b.end();
});

//bob received message from alice
session_b.on("message", function (msg, encrypted) {
	print_message('>>', msg, encrypted);
	this.send("got your message '" + msg + "'");
});

session_a.on("disconnect", function () {
	debug("Session was closed remotely");
	exit_test("", true);
});

session_b.on("received_symkey", function (use, usedata, key) {
	SYMKEY_TEST_IN_PROGRESS = false;
	SYMKEY_TEST_DONE = true;
	debug("Received Symmetric Key");
	debug("    use:", use);
	debug("usedata:", ab2str(usedata));
	debug("    key:", ab2str(key));
	SYMKEY_TEST_PASSED = (
		(SYMKEY_TEST_VALUES.use === use) &&
		(SYMKEY_TEST_VALUES.usedata === ab2str(usedata)) &&
		(SYMKEY_TEST_VALUES.key === ab2str(key))
	);
});

session_a.on("write_fingerprints", function () {
	alice.writeFingerprints();
	try {
		debug("Saving Bob's fingerprint");
		alice.saveFingerprintsToFS("./alice.fp");
	} catch (e) {
		debug("not saving fingerprints.. in browser");
	}
	dumpFingerprints(BOB.fingerprints());
});

session_b.on("write_fingerprints", function () {
	bob.writeFingerprints();
	try {
		debug("Saving Alice's fingerprint");
		bob.saveFingerprintsToFS("./bob.fp");
	} catch (e) {
		debug("not saving fingerprints.. in browser");
	}

	dumpFingerprints(ALICE.fingerprints());
});

function end_smp_test() {
	debug("SMP TEST DONE");
	SMP_TEST_PASSED = session_a.isAuthenticated();
	SMP_TEST_DONE = true;
	SMP_TEST_IN_PROGRESS = false;
}

session_b.on("smp", function (type) {
	if (type !== "request") return;
	debug("Received SMP Request.");
	if (!SEND_BAD_SECRET) {
		debug("responding with correct secret");
		this.smpRespond('s3cr37');
	} else {
		debug("responding with wrong secret");
		this.smpRespond("!!wrong_secret!!");
	}
});

session_a.on("smp", end_smp_test);

//start OTR
session_a.send("?OTR?"); //or session_a.start();
//session_b.send("?OTR?"); //don't start OTR simultaneously on both ends!

var loop = setInterval(function () {
	debug("_");

	//wait for secure session to be established
	if (!session_a.isEncrypted() && !session_b.isEncrypted()) return;

	//dont do anything if tests are in progress
	if (SMP_TEST_IN_PROGRESS || SYMKEY_TEST_IN_PROGRESS) {
		debug("entered loop, tests in progress...");
		return;
	}

	//smp test
	if (session_a.isEncrypted() && !SMP_TEST_DONE) {
		if (!session_a.isAuthenticated() || FORCE_SMP) {
			SMP_TEST_IN_PROGRESS = true;
			SMP_TEST_PERFORMED = true;
			debug("Starting SMP Test");
			session_a.smpStart();
		} else {
			debug("Skipping SMP Test buddies previously authenticated");
			SMP_TEST_DONE = true;
		}
		return;
	}

	//start symkey test (after smp test is done)
	if (!SYMKEY_TEST_DONE && SMP_TEST_DONE) {
		SYMKEY_TEST_IN_PROGRESS = true;
		debug("Starting Extra Symmertic Key Test");
		SYMKEY_TEST_VALUES = {
			'use': 1000,
			'usedata': 'ftp://website.net/files.tgz'
		};
		SYMKEY_TEST_VALUES.key = ab2str(session_a.extraSymKey(
			SYMKEY_TEST_VALUES.use, SYMKEY_TEST_VALUES.usedata));
		return;
	}

	//send an encrypted message
	if (session_a.isEncrypted() && SYMKEY_TEST_DONE && SMP_TEST_DONE) {
		debug("sending message");
		session_a.send("test encrypted message");
		session_a.recv("this is an unencrypted message, during a secure session!"); //should raise a msg_event UNENCRYPTED
		return;
	}

	exit_test("Tests did not complete...", false);

}, 500);

function exit_test(msg, TEST_PASSED) {
	debug(msg);
	if (loop) clearInterval(loop);

	dumpConnContext(session_a, "Alice's ConnContext:");
	dumpConnContext(session_b, "Bob's ConnContext:");

	if (SMP_TEST_PERFORMED) {
		debug("SMP TEST PERFORMED");
		debug("Trusted connection after SMP? ", SMP_TEST_PASSED);
	}
	if (SYMKEY_TEST_DONE) debug("SYMKEY TEST", SYMKEY_TEST_PASSED ?
		"PASSED" : "FAILED");

	if (TEST_PASSED) {
		debug("== TEST PASSED ==\n");
	} else {
		debug("== TEST FAILED ==\n");
	}

	process.exit();
}

function dumpConnContext(session, msg) {
	debug(msg, "\n", JSON.stringify(session.context.fields()));
}

function dumpFingerprints(fingerprints) {
	fingerprints.forEach(function (fp) {
		debug(fp.fingerprint(), fp.trust());
	});
}

function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint16Array(buf));
}
