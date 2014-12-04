if(typeof exports !== 'undefined'){
    var async = require("../lib/async");
    var OTR = require("../lib/otr-module");
}

var otr = OTR;

console.log("== loaded libotr version:",otr.version());

var debug = function(){};

var verbose =true;
var FORCE_SMP = false;
var SEND_BAD_SECRET = false;
var INIT_KEYS = true;
var INIT_TAGS = true;
var SAVE_FINGERPRINTS = false;

var SMP_TEST_DONE = false;
var SMP_TEST_IN_PROGRESS = false;
var SMP_TEST_PASSED = false;
var SMP_TEST_PERFORMED = false;

var SYMKEY_TEST_DONE = false;
var SYMKEY_TEST_IN_PROGRESS = false;
var SYMKEY_TEST_PASSED = false;
var SYMKEY_TEST_VALUES = {};

if(typeof process !== "undefined" ){
 process.argv.forEach(function(arg){
    if(arg=="--verbose") verbose = true;
    if(arg=="--force-smp") FORCE_SMP=true;
    if(arg=="--bad-secret") SEND_BAD_SECRET = true;
    if(arg=="--no-init-key") INIT_KEYS = false;
    if(arg=="--no-init-tag") INIT_TAGS = false;
    if(arg=="--save-fingerprints") SAVE_FINGERPRINTS = true;

 });
}

if(verbose){
    otr.debugOn();
    debug = function(){console.log([].join.call(arguments," "));};
}

var keys_dir = ".";

var alice_settings ={
    keys:keys_dir+'/alice.keys',
    fingerprints:keys_dir+'/alice.fp',
    instags:keys_dir+'/alice.instags',
    accountname:"alice@telechat.org",
    protocol:"telechat"
};
var bob_settings = {
    keys:keys_dir+'/bob.keys',
    fingerprints:keys_dir+'/bob.fp',
    instags:keys_dir+'/bob.instags',
    accountname:"bob@telechat.org",
    protocol:"telechat"
};

///setting up Alice's side of the connection
var alice = new otr.User(alice_settings);
alice.name = "Alice";
if(INIT_KEYS) make_key_for_user(alice,alice_settings.accountname,alice_settings.protocol);
if(INIT_TAGS) make_instag_for_user(alice,alice_settings.accountname,alice_settings.protocol);

var BOB = alice.ConnContext(alice_settings.accountname,alice_settings.protocol,"BOB");
var session_a = new otr.Session(alice, BOB,{
    policy:otr.POLICY("ALWAYS"),
    secret:'s3cr37',
    MTU:3000,
    buddy:"BOB", 
    accountname:alice_settings.accountname,
    protocol:alice_settings.protocol
});

///setting up Bob's side of the connection
var bob = new otr.User(bob_settings);
bob.name = "Bob";
if(INIT_KEYS) make_key_for_user(bob,bob_settings.accountname,bob_settings.protocol);
if(INIT_TAGS) make_instag_for_user(bob,bob_settings.accountname,bob_settings.protocol);

var ALICE = bob.ConnContext(bob_settings.accountname,bob_settings.protocol,"ALICE");
var session_b = new otr.Session(bob,ALICE,{
    policy:otr.POLICY("ALWAYS"),
    secret:'s3cr37',
    MTU:3000,
});

function make_key_for_user(user,accountname,protocol){
    if( user.findKey(accountname,protocol) ) return;

    console.log("creating a new key for:",user.name,accountname,protocol);
    user.generateKey(accountname,protocol,function(err,key){
        if(err){
            console.log(err);
            process.exit();
        }else debug("Key Generated Successfully");
    });

}
function make_instag_for_user(user,accountname,protocol){
    user.generateInstag(accountname,protocol,function(err,instag){
        debug("new instance tag for",user.name,":",instag);
    });
}

debug(session_a);
debug(session_b);

var NET_QUEUE_A = async.queue(handle_messages,1);
var NET_QUEUE_B = async.queue(handle_messages,1);

function handle_messages(O,callback){
    O.session.recv(O.msg);
    callback();
}

//simulate a network connection between two parties
session_a.on("inject_message",function(msg){    
    debug("ALICE:",msg);
    NET_QUEUE_A.push({session:session_b,msg:msg});
});
session_b.on("inject_message",function(msg){
    debug("BOB:",msg);
    NET_QUEUE_B.push({session:session_a,msg:msg});
});

session_a.on("create_privkey",function(a,p){
    console.log("Alice doesn't have a key.. creating a new key for:",a,p);
    alice.generateKey(a,p,function(err,key){
        if(!err){
            debug("Alice's Key Generated Successfully");
        }
    });
});
session_b.on("create_privkey",function(a,p){
    console.log("Bob doesn't have a key.. creating a new key for:",a,p);
    bob.generateKey(a,p,function(err,key){
        if(!err){
            debug("Bob's Key Generated Successfully");
        }
    });
});
session_a.on("create_instag",function(a,p){
    make_instag_for_user(this.user,a,p);
});
session_b.on("create_instag",function(a,p){
    make_instag_for_user(this.user,a,p);
});

session_a.on("gone_secure",function(){
    console.log("[Alice] Encrypted Connection Established - Gone Secure.");
});
session_a.on("gone_secure",function(){
    console.log("[Bob] Encrypted Connection Established - Gone Secure.");
});

//output incoming messages to console
function print_message(name,msg,encrypted){
    if(encrypted) {
        console.log(name+'[ENCRYPTED]:',msg);
    }else{
        console.log(name+'[PLAINTEXT]:',msg);
    }    
}
//alice received message from bob
session_a.on("message",function(msg,encrypted){
    print_message('<<',msg,encrypted);
    session_b.close();
});
//bob received message from alice
session_b.on("message",function(msg,encrypted){
    print_message('>>',msg,encrypted);
    this.send("got your message '"+msg+"'");
});

session_a.on("remote_disconnected",function(){
    console.log("Session was closed remotely");
    exit_test("",true);

});

session_b.on("received_symkey",function(use,usedata,key){
    SYMKEY_TEST_IN_PROGRESS = false;
    SYMKEY_TEST_DONE = true;
    console.log("Received Symmetric Key");
    debug("    use:", use);
    debug("usedata:", ab2str(usedata));
    debug("    key:", ab2str(key));
    SYMKEY_TEST_PASSED= (
        (SYMKEY_TEST_VALUES.use === use) &&
        (SYMKEY_TEST_VALUES.usedata === ab2str(usedata)) &&
        (SYMKEY_TEST_VALUES.key === ab2str(key))
    );
});

function end_smp_test(){
    console.log("SMP TEST DONE");
    SMP_TEST_PASSED = session_a.isAuthenticated();
    SMP_TEST_DONE = true;
    SMP_TEST_IN_PROGRESS = false;
    if(SAVE_FINGERPRINTS){
        session_a.user.writeTrustedFingerprints();
        session_b.user.writeTrustedFingerprints();
    }
}
session_b.on("smp_request",function(){
        console.log("Received SMP Request.");
        if(!SEND_BAD_SECRET){
            debug("responding with correct secret");
            this.respond_smp('s3cr37');
        }else{
            debug("responding with wrong secret");
            this.respond_smp("!!wrong_secret!!");
        }
});
session_a.on("smp_complete",end_smp_test);
session_a.on("smp_failed",end_smp_test);
session_a.on("smp_aborted",end_smp_test);
session_a.on("smp_error",end_smp_test);


//in libotr4 if policy is ALWAYS - initial message doesn't seem to get resent after going secure
//if buddy has an ALWAYS policy set OTR will be setup.
//session_a.send("IF POLICY IS 'ALWAYS' THIS IS NEVER SENT");

//to initially establish OTR
session_a.connect();
//session_b.connect();

var loop = setInterval(function(){
    console.log("_");

    //wait for secure session to be established
    if(!session_a.isEncrypted() && !session_b.isEncrypted()) return;

    //dont do anything if tests are in progress
    if(SMP_TEST_IN_PROGRESS || SYMKEY_TEST_IN_PROGRESS) {
        debug("entered loop, tests in progress...");
        return;
    }

    //smp test
    if(session_a.isEncrypted() && !SMP_TEST_DONE){
        if(!session_a.isAuthenticated() || FORCE_SMP){
            SMP_TEST_IN_PROGRESS = true;
            SMP_TEST_PERFORMED = true;
            console.log("Starting SMP Test");
            session_a.start_smp();
        }else{
            console.log("Skipping SMP Test buddies previously authenticated");
            SMP_TEST_DONE = true;
        }
        return;
    }

    //start symkey test (after smp test is done)
    if(!SYMKEY_TEST_DONE && SMP_TEST_DONE){
        SYMKEY_TEST_IN_PROGRESS=true;
        console.log("Starting Extra Symmertic Key Test");
        SYMKEY_TEST_VALUES = {'use':1000, 'usedata':'ftp://website.net/files.tgz'}
        SYMKEY_TEST_VALUES.key  = ab2str(session_a.extraSymKey(SYMKEY_TEST_VALUES.use, SYMKEY_TEST_VALUES.usedata));
        return;
    }

    //send an encrypted message 
    if(session_a.isEncrypted() && SYMKEY_TEST_DONE && SMP_TEST_DONE ){
        debug("sending message");
        session_a.send("test encrypted message");
        return;
    }

    exit_test("Tests did not complete...",false);
    
},500);

function exit_test(msg,TEST_PASSED){
    console.log(msg);
    if(loop) clearInterval(loop);

    dumpConnContext(session_a,"Alice's ConnContext:");
    dumpConnContext(session_b,"Bob's ConnContext:");

    if(SMP_TEST_PERFORMED){
       console.log("SMP TEST PERFORMED");
       console.log("Trusted connection after SMP? ",SMP_TEST_PASSED);
    }
    if(SYMKEY_TEST_DONE) console.log("SYMKEY TEST", SYMKEY_TEST_PASSED?"PASSED":"FAILED");

    if(TEST_PASSED){ console.log("== TEST PASSED ==\n"); } else { console.log("== TEST FAILED ==\n"); }
    process.exit();
}

function dumpConnContext(session,msg){
    console.log(msg,"\n",session.context.fields());
}

function ab2str(buf) {  
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
