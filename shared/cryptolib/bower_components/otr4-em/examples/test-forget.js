var otr = require("../index");

var alice = new otr.User({
	keys: "./alice.keys",
	fingerprints: "./alice.fp"
}).account("alice@telechat.org", "telechat");
var contact = alice.contact("BOB");

//test deleting contact
console.log("before deleting contact...total fingerprints:", contact.fingerprints().length);
contact.delete();
console.log("after deleting contact...total fingerprints:", contact.fingerprints().length);

//test deleting fingerprints
alice = new otr.User({
	keys: "./alice.keys",
	fingerprints: "./alice.fp"
}).account("alice@telechat.org", "telechat");
contact = alice.contact("BOB");

var fingerprints = contact.fingerprints();
var fp;
if (fingerprints.length) {
	fp = fingerprints[0];
	console.log("before deleting fingerprint...total fingerprints:", fingerprints.length);
	console.log("%s trust: %s", fp, fp.trust("verified"));
	fp.delete();
	console.log("after deleting fingerprints...total fingerprints:", contact.fingerprints().length);
} else {
	console.log("no fingerprints to delete");
}
