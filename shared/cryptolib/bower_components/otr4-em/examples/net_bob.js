var net = require("net");
var otr = require("../src/otr.js");

var user = new otr.User({
        keys: "./bob.keys"
    }),
    account = user.account("bob@telechat.org", "telechat"),
    contact = account.contact("alice");

if (!account.fingerprint()) {
    console.log("no key found");
    process.exit();
}
account.generateInstag();
console.log("connecting...");

var conn = new net.Socket();
var session = contact.openSession();

session.online = function () {
    console.log("checking if contact is online..");
    if (conn && conn.remotePort) {
        return true;
    }
    return false;
};

session.on("inject_message", function (fragment) {
    try {
        conn.write(fragment);
    } catch (e) {}
});

session.on("gone_secure", function () {
    console.log("gone secure");
    session.send("Hello, World!");
});

session.on("plaintext", function () {
    console.log("back to plaintext");
    conn.end();
});

session.on("message", function (message, private) {
    console.log("We got a message:", message);
    console.log("Message was encrypted?:", private);
    session.end();
});

conn.on("data", function (data) {
    session.recv(data);
});

conn.on("end", function () {
    process.exit();
});

conn.on("error", function () {
    process.exit();
});

conn.connect(8123, function () {
    console.log("starting otr");
    session.start();
});
