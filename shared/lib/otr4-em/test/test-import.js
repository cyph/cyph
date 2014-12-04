var name = "alice@-weir.dAdfh.com_";
var proto = "telechat";

var otr4 = require("../index.js");

otr4.VFS().importFile('./alice.keys','alice.keys');

var a = new otr4.User({keys: "alice.keys", fingerprints:"/tmp/tmp.fp", instags:"/tmp/tmp.tag"});
var b = new otr4.User({keys: "otr.private_key", fingerprints:"/tmp/tmp.fp", instags:"/tmp/tmp.tag"});
var key = a.findKey(name,proto);
console.log(a.findKey(name,proto).export());
b.importKey(name,proto,key.export());

console.log("imported key finger print matches exported key?",
    a.fingerprint(name,proto) === b.fingerprint(name,proto));

console.log(a.fingerprint(name,proto));
console.log(b.fingerprint(name,proto));
