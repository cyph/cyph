OTR4-em - Off-the-Record Messaging [emscripten]
=====================

## Getting started

Require the otr4-em module (underlying gcrypt and otr libraries will be
initialised.

    var otr = require("otr4-em");

## otr.version()
Returns version information of the underlying libotr:

     console.log("Using version:", otr.version() );

## otr.User( config )
The User object is used to manage a user's accounts (public keys) and known fingerprints.

    var otr = require("otr4-em");

    var user = new otr.User({
        keys:'/alice.keys',      //path to OTR keys file (required)
        fingerprints:'/alice.fp', //path to fingerprints file (required)
        instags:'/alice.instags' //path to instance tags file (required)
    });

All data is loaded in memory (UserState) and stored on the virtual file system VFS().

If specified files exist the keys, fingerprints and instance tags will be loaded automatically.
A warning will be logged to the console otherwise.

### user.accounts()

We can check what accounts have been load..

    user.accounts().forEach(function(account){
        console.log(account.fingerprint);
    });

	[ { accountname: 'alice@jabber.org',
	    protocol: 'xmpp',
	    fingerprint: '65D366AF CF9B065F 41708CB0 1DC26F61 D3DF5935',
	    privkey: [Object] } ]

### user.generateKey(accountname,protocol,function (err,privkey) )

To generate an OTR key for a given accountname and protocol:
(If a key already exists it will be overwritten)

    user.generateKey("alice@jabber.org", "xmpp", function(err, privkey){
        if(err){
        	console.log("something went wrong!",err.message);
        }else{
        	console.log("Generated Key Successfully:",privkey.exportPublic() );
        }
    });

### user.generateInstag(accountname,protocol, function(err,instag) )
Creating an instance tag for account/protocol:

   alice.generateInstag("alice@jabber.org","xmpp",function(err,instag){
        if(err){
            console.log("failed to generate instance tag.",err);
        }else{
            console.log("new instance tag:",instag);
        }
   });

### user.fingerprint(accountname,protocol)

To retrieve the fingerprint of a key:

	user.fingerprint("alice@jabber.org","xmpp");

returns

	'65D366AF CF9B065F 41708CB0 1DC26F61 D3DF5935'

### user.findKey(accountname,protocol)
Returns an OtrlPrivKey() instance if it exists. (null otherwise)

	var privkey = user.findKey("alice@jabber.org","xmpp");

### user.deleteKey(accountname,protocol)
Deleted a key from memory and file if it exists.

### user.ConnContext(accountname, protocol, buddy_name)
Create a ConnContext(). accountname and protocol will select the key to use in this context, and buddy_name
is our chosen name for the remote party which is stored in the fingerprints file.

### user.writeFingerprints()
Writes fingerprints out to file.

### user.writeKeys()
Writes keys out to file.

### user.prototype.exportKeyHex(accountname,protocol)
Exports the DSA key for the account/protocol. (Can be imported to another User using user.importKey())

### user.prototype.exportKeyBigInt(accountname,protocol)
Exports the DSA key for the account/protocol. (Can be imported to another User using user.importKey())

### user.prototype.importKey(accountname,protocol,dsa)
Will import a DSA key (exported using user.exportKeyHex or user.exportBigInt) and assign it to accountname/protocol.

## OtrlPrivKey()
This is the 'privkey' object returned user.findKey() and inthe callback of user.accounts() and user.generateKey().

**privkey.accountname()** - Accountname the key is associated with.

**privkey.protocol()** - Protocol the key is associated with.

**privkey.export(format)** - Exports the private DSA key. format can be "HEX" or "BIGINT"

**privkey.exportPublic(format)** - Exports only the public components of the DSA key. format can be "HEX" or "BINGINT"


## otr.ConnContext()
A ConnContext with buddy 'BOB' is created from a User() object. The last argument is
our selected name for buddy Bob.

    var context = user.ConnContext("alice@jabber.org","xmpp","BOB");

To get the state of a ConnContext:

**context.protocol()**

returns string: protocol name

**context.username()**

return string: name we have given to buddy "BOB"

**context.accountname()**

return string: account name of the otr key, eg. "alice@jabber.org"

**context.fingerprint()**

return string: fingerprint of buddy in an active Session()

**context.protocol_version()**

return number: otr protocol version in use, eg. 3

**context.msgstate()**

returns number: 0 = plaintext, 1 = encrypted

**context.smstate()**

returns number: current state of the SMP (Socialist Millionaire's Protocol)

**context.trust()**

returns string: 'smp' if buddy's fingerprint has been verified by SMP.

**context.their_instance()**

returns number: instance tag of buddy

**context.our_instance()**

returns number: our instance tag


## otr.Session()

To setup an OTR conversation with a buddy, create a Session(). As arguments
it takes a User, ConnContext, and a set of parameters for the session. Session instances
are event emitters.

###Setting up a Session()###

    var session = new otr.Session(user, context, {
        policy: otr.POLICY("ALWAYS"), //optional policy - default = otr.POLICY("DEFAULT")
        MTU: 5000,          //optional - max fragment size in bytes - default=0,no-fragmentation
        secret: "SECRET",   //secret for SMP authentication.
        secrets: {'question-1':'secret-1',
                  'question-2':'secret-2'} //question and answer pairs for SMP Authentication.
    });

### Starting and Ending an OTR conversation

**session.connect()**

Initiates the otr protocol. This can be used if we wish to initiate the protocol without sending an actual message.

**session.close()**

End the session.

###Exchanging Messages

**session.send(message,[instag])**

Fragment and send message.toString(). Optional instag can be specified.

**session.recv(message)**

Should be called when receiving a message from buddy.

###Authenticating with SMP (Socialist Millionaire's Protocol)

**session.start_smp([secret])**

Starts SMP authentication. If otional [secret] is not passed it is taken from the parameters.

**session.start_smp_question(question,[secret])**

Starts SMP authentication with a question and optional [secret]. If secret is not passed
it is taken from the parameters.

**session.respond_smp([secret])**

Responds to SMP authentication request with optional [secret]. If secret is not passed
it is taken from the parameters.

### State of a Session

**session.isEncrypted()**

True only if current session is encrypted.

**session.isAuthenticated()**

True only if the fingerprint of the buddy has been authenticated/verified by SMP.

### Handling Session events

* message(msg, encrypted) - received message **msg**. If message was encrypted **encrypted** will be true.

* inject_message(msg_fragment) - encrypted msg_fragment to be sent to buddy

* gone_secure() - message exchange is now encrypted.
* still_secure() - encryption re-negotiated. message exchange is encrypted.

* create_privkey(accountname,protocol) - a private key for account/protocol specified was not found and needs to be created.
* create_instag(accountname,protocol) - an instance tag for account/protocol specified was not found and needs to be created.
* new_fingerprint(fingerprint) - first time we are seeing remote buddy's fingerprint. This is a que to begin authentication.

* smp_request(question) - buddy has started a SMP authentication. (possibly with a question)
* smp_complete() - SMP authentication completed successfully.
* smp_failed() - SMP failed (usually buddy doesn't know the secret)
* smp_aborted() - SMP (something went wrong at the protocol level)

* remote_disconnected() - channel closed() [remotely]
* update_context_list() - fired when underlying ConnContext changes (inteded mostly for UI updates)
* shutdown() - channel was closed [locally]

* msg_event(event_no, message, err) - event_no, message if appropriate and a GcryptError() err
* received_symkey(use_num, usedata_buff, key_buff) - buddy wants to use the current extra symmetric key.
buddy has sent additional use information and use-specific data in **use_num** (number) and **usedata_buff** (ArrayBuffer).
**key_buff** is the 32-byte ArrayBuffer holding the synchronised symmetric key.

## otr.MSGEVENT(event_number)
Returns on of the corresponding event names below of event_number

    NONE
    ENCRYPTION_REQUIRED
    ENCRYPTION_ERROR
    CONNECTION_ENDED
    SETUP_ERROR
    MSG_REFLECTED
    MSG_RESENT
    RCVDMSG_NOT_IN_PRIVATE
    RCVDMSG_UNREADABLE
    RCVDMSG_MALFORMED
    LOG_HEARTBEAT_RCVD
    LOG_HEARTBEAT_SENT
    RCVDMSG_GENERAL_ERR
    RCVDMSG_UNENCRYPTED  //'message' event will also be fired with encrypted parameter = false
    RCVDMSG_UNRECOGNIZED
    RCVDMSG_FOR_OTHER_INSTANCE

## otr.POLICY(name)

The policy is used as a parameter when setting up a Session().

    var otr = require("otr4-em");
    var policy = otr.POLICY("DEFAULT");

    //available policies
    NEVER
    ALLOW_V1
    ALLOW_V2
    ALLOW_V3
    REQUIRE_ENCRYPTION
    SEND_WHITESPACE_TAG
    WHITESPACE_START_AKE
    ERROR_START_AKE
    VERSION_MASK
    OPPORTUNISTIC
    MANUAL
    ALWAYS
    DEFAULT

## otr.VFS() - The Virtual File System

The Virtual File System (vfs) is a volatile in memory file system which stores keys and fingerprints.

     var VFS = otr.VFS();


### VFS.exportFile(source,destination, [function transform(buffer){}])
Copies a file from the vfs to the real file system.
An Optional 'transform' function will be passed the entire contents of the virtual file as a Buffer before it is written to disk. This operation is synchronous and overwrites an existing file.
The transform function must return a Buffer to be written to disk. (You could use this to encrypt the file for example)


### VFS.importFile(source,destination, [function transform(buffer){}])
Copies a file from the real file system to the vfs.
An Optional 'transform' function will be passed the contents of the file as a Buffer before it is imported to the vfs. This operation is synchronous and overwrites an existing file.
The transform function must return a Buffer to be written to the vfs file. (You could use this to decrypt the file)
