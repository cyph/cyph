(function () {

  var root = this;
/*
 *  Off-the-Record Messaging bindings for node/javascript
 *  Copyright (C) 2012  Mokhtar Naamani,
 *                      <mokhtar.naamani@gmail.com>
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of version 2 of the GNU General Public License as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

var debug = function(){};

var otr, otrBindings, util, events;

if (typeof exports !== 'undefined') {
    otrBindings = require("./libotr-js-bindings.js");
    util = require('util');
    events = require('events');

    otr = new otrBindings();

    if(otr.version()!="4.1.0-emscripten"){
        console.error("Error. excpecting libotr4.1.0-emscripten! exiting..");
        process.exit();
    }

    module.exports = {
        debugOn: function(){
            debug = function(){console.log([].join.call(arguments," "));};
        },
        debugOff: function(){
            debug = function(){};
        },
        version: otr.version,
        User: User,
        ConnContext: otr.ConnContext,
        Session : Session,
        POLICY : OTRL_POLICY,
        MSGEVENT : OTRL_MSGEVENT,
        VFS: otr.VFS,
        OTRChannel: Session
    };


}else{
    otrBindings = root.otrBindings;
    events = undefined;
    otr = new otrBindings();

    if(otr.version()!="4.1.0-emscripten"){
        alert("Warning. Excpecting libotr4.1.0-emscripten! OTR library not loaded.");
    }else{
        root.OTR = {
            debugOn: function(){
                debug = function(){console.log([].join.call(arguments," "));};
            },
            debugOff: function(){
                debug = function(){};
            },
            version: otr.version,
            User: User,
            ConnContext: otr.ConnContext,
            Session : Session,
            POLICY: OTRL_POLICY,
            MSGEVENT: OTRL_MSGEVENT,
            VFS: otr.VFS,
            OTRChannel: Session
        };
   }
}

if(util && events) util.inherits(Session, events.EventEmitter);

function User( config ){
  if(config && config.keys && config.fingerprints && config.instags){
    this.state = new otr.UserState();
    this.keys = config.keys;
    this.instags = config.instags;
    this.fingerprints = config.fingerprints;
    try{    
        this.state.readKeysSync(this.keys);
    }catch(e){ console.error("Warning Reading Keys:",e);}
    try{
        this.state.readFingerprintsSync(this.fingerprints);
    }catch(e){ console.error("Warning Reading Fingerprints:",e);}
    try{
        this.state.readInstagsSync(this.instags);
    }catch(e){ console.error("Warning Reading Instant Tags:",e);}
  }else{
    return null;
  }
}

User.prototype.generateKey = function(accountname,protocol,callback){
    var user = this;
    this.state.generateKey(this.keys,accountname,protocol,function(){
        callback.apply(user,arguments);
    });
};

User.prototype.accounts = function (){
    return this.state.accounts();
};
User.prototype.fingerprint = function(accountname,protocol){
    return this.state.fingerprint(accountname,protocol);
};
User.prototype.generateInstag = function(accountname,protocol,callback){
    try{
        this.state.generateInstag(this.instags,accountname,protocol);
        if(callback) callback(null, this.state.findInstag(accountname,protocol));
    }catch(e){
        if(callback) callback(e,null);
    }
};
User.prototype.findInstag = function(accountname,protocol){
    return this.state.findInstag(accountname,protocol);
};
User.prototype.ConnContext = function(accountname, protocol, recipient){    
    return new otr.ConnContext(this.state,accountname,protocol,recipient);
};

User.prototype.writeFingerprints = function(){
    this.state.writeFingerprintsSync(this.fingerprints);
};
User.prototype.writeTrustedFingerprints = function(){
    this.state.writeTrustedFingerprintsSync(this.fingerprints);
};
User.prototype.findKey = function(accountname,protocol){
    return this.state.findKey(accountname,protocol);
};
User.prototype.deleteKey = function(accountname,protocol){
    this.state.deleteKeyOnFile(this.keys,accountname,protocol);
};
User.prototype.ConnContext = function(accountname, protocol, recipient){    
    return new otr.ConnContext(this.state,accountname,protocol,recipient);
};
User.prototype.writeKeys = function(){
    this.state.writeKeysSync(this.keys);
};

User.prototype.exportKeyBigInt = function(accountname,protocol){
    var k = this.findKey(accountname,protocol);
    if(k){
        return k.export("BIGINT");
    }
};
User.prototype.exportKeyHex = function(accountname,protocol){
    var k = this.findKey(accountname,protocol);
    if(k){
        return k.export("HEX");
    }
};

User.prototype.importKey = function(accountname,protocol,dsa,base){
    this.state.importKey(accountname,protocol,dsa,base);
    this.state.writeKeysSync(this.keys);
};
User.prototype.getMessagePollDefaultInterval = function(){
    return this.state.getMessagePollDefaultInterval();
};
User.prototype.messagePoll = function(ops,opdata){
    this.state.messagePoll(ops,opdata);
};
function Session(user, context, parameters){
    var _session = this;
    if(events) {
        events.EventEmitter.call(this);
    }else{
        this._events = {};
    }
    
    this.user = user;
    this.context = context;
    this.parameters = parameters;
    this.ops = new otr.MessageAppOps( OtrEventHandler(this) );
    this.message_poll_interval = setInterval(function(){
        _session.user.messagePoll(_session.ops,0);
    }, user.getMessagePollDefaultInterval()*1000 || 70*1000);
}

if(!events){
  //simple events API for use in the browser
  Session.prototype.on = function(e,cb){
    //used to register callbacks
    //store event name e in this._events 
    this._events[e] ? this._events[e].push(cb) : this._events[e]=[cb];

  };
  Session.prototype.emit = function(e){
    //used internally to fire events
    //'apply' event handler function  to 'this' channel pass eventname 'e' and arguemnts.slice(1)
    var self = this;
    var args = Array.prototype.slice.call(arguments);

    if(this._events && this._events[e]){
        this._events[e].forEach(function(cb){
            cb.apply(self,args.length>1?args.slice(1):[undefined]);
        });
    }
  };
}

Session.prototype.connect = function(){
    return this.send("?OTR?");
};
Session.prototype.send = function(message,instag){
    instag = instag || 1;//default instag = BEST 
    //message can be any object that can be serialsed to a string using it's .toString() method.   
    var msgout = this.ops.messageSending(this.user.state, this.context.accountname(), this.context.protocol(), this.context.username(), message.toString(), instag, this);
    if(msgout){
        //frag policy something other than SEND_ALL.. results in a fragment to be sent manually
        this.emit("inject_message",msgout);
    }
};
Session.prototype.recv = function(message){
    //message can be any object that can be serialsed to a string using it's .toString() method.
    var msg = this.ops.messageReceiving(this.user.state, this.context.accountname(), this.context.protocol(), this.context.username(), message.toString(), this);
    if(msg) this.emit("message",msg,this.isEncrypted());
};
Session.prototype.close = function(){
    if(this.message_poll_interval) clearInterval(this.message_poll_interval);
    this.ops.disconnect(this.user.state,this.context.accountname(),this.context.protocol(),this.context.username(),this.context.their_instance());
    this.emit("shutdown");
};
Session.prototype.start_smp = function(secret){
    var sec = secret;
    sec = sec || (this.parameters? this.parameters.secret:undefined);
    if(sec){
        this.ops.initSMP(this.user.state, this.context, sec);
    }else{
        throw( new Error("No Secret Provided"));
    }
};

Session.prototype.start_smp_question = function(question,secret){
    if(!question){
        throw(new Error("No Question Provided"));        
    }
    var sec = secret;
    if(!sec){
        sec = this.parameters ? this.parameters.secrets : undefined;
        if(!sec) throw(new Error("No Secrets Provided"));
        sec = sec[question];        
    }    
    
    if(!sec) throw(new Error("No Secret Matched for Question"));
   
    this.ops.initSMP(this.user.state, this.context, sec,question);
};

Session.prototype.respond_smp = function(secret){
    var sec = secret ? secret : undefined;
    if(!sec){
        sec = this.parameters ? this.parameters.secret : undefined;
    }
    if(!sec) throw( new Error("No Secret Provided"));    
    this.ops.respondSMP(this.user.state, this.context, sec);
};
Session.prototype.abort_smp = function(){
   this.ops.abortSMP(this.user.state,this.context);
};

Session.prototype.isEncrypted = function(){
    return (this.context.msgstate()===1);
};
Session.prototype.isAuthenticated = function(){
    return (this.context.trust()==="smp");
};
Session.prototype.extraSymKey = function(use,usedata){
    return this.ops.extraSymKey(this.user.state,this.context,use,usedata);
};

function OtrEventHandler( otrSession ){
 function emit(){
    otrSession.emit.apply(otrSession,arguments);
 }
 return (function(o){
    debug(otrSession.user.name+":"+o.EVENT);
    switch(o.EVENT){
        case "smp_error":
            otrSession.abort_smp();
            emit("smp_failed");
            return;
        case "smp_request":
            if(o.question) debug("SMP Question:"+o.question);
            emit(o.EVENT,o.question);
            return;
        case "smp_complete":
            emit(o.EVENT);
            return;
        case "smp_failed":
            emit(o.EVENT);
            return;
        case "smp_aborted":
            emit(o.EVENT);
            return;
        case "is_logged_in":
            //TODO:function callback. for now remote party is always assumed to be online
            return 1;
        case "gone_secure":
            emit(o.EVENT);
            return;
        case "gone_insecure":
            //never get's called by libotr4.0.0?
            emit(o.EVENT);
            return;
        case "policy":
            if(!otrSession.parameters) return OTRL_POLICY("DEFAULT");
            if(typeof otrSession.parameters.policy == 'number' ) return otrSession.parameters.policy;//todo: validate policy
            return OTRL_POLICY("DEFAULT");
        case "update_context_list":
            emit(o.EVENT);
            return;
        case "max_message_size":
            if(!otrSession.parameters) return 0;
            return otrSession.parameters.MTU || 0;
        case "inject_message":
            emit(o.EVENT,o.message);
            return;
        case "create_privkey":
            emit(o.EVENT,o.accountname,o.protocol);
            return;
        case "new_fingerprint":
            debug("NEW FINGERPRINT: "+o.fingerprint);
            emit(o.EVENT,o.fingerprint);
            return;
        case "write_fingerprints":
            //otrSession.user.writeFingerprints();//application must decide if it will save new fingerprints..
            emit(o.EVENT);
            return;
        case "still_secure":
            emit(o.EVENT);
            return;
        case "msg_event":
            debug(o.EVENT+"[ "+OTRL_MSGEVENT(o.event)+" ] - "+o.message);
            if(OTRL_MSGEVENT(o.event) == "RCVDMSG_UNENCRYPTED"){
                emit("message",o.message,false);
            }
            emit(o.EVENT,o.event,o.message,o.err);
            return;
        case "create_instag":
            emit(o.EVENT,o.accountname,o.protocol);
            return;
        case "received_symkey":
            emit(o.EVENT,o.use,o.usedata,o.key);
            return;
        case "remote_disconnected":
            return emit(o.EVENT);            
        default:
            console.error("== UNHANDLED EVENT == :",o.EVENT);
            return;
    }
 });
}

/* --- libotr-4.0.0/src/proto.h   */
var _policy = {
    'NEVER':0x00,
    'ALLOW_V1': 0x01,
    'ALLOW_V2': 0x02,
    'ALLOW_V3': 0x04,
    'REQUIRE_ENCRYPTION': 0x08,
    'SEND_WHITESPACE_TAG': 0x10,
    'WHITESPACE_START_AKE': 0x20,
    'ERROR_START_AKE': 0x40
};

_policy['VERSION_MASK'] = _policy['ALLOW_V1']|_policy['ALLOW_V2']|_policy['ALLOW_V3'];
_policy['OPPORTUNISTIC'] =  _policy['ALLOW_V1']|_policy['ALLOW_V2']|_policy['ALLOW_V3']|_policy['SEND_WHITESPACE_TAG']|_policy['WHITESPACE_START_AKE']|_policy['ERROR_START_AKE'];
_policy['MANUAL'] = _policy['ALLOW_V1']|_policy['ALLOW_V2']|_policy['ALLOW_V3'];
_policy['ALWAYS'] = _policy['ALLOW_V1']|_policy['ALLOW_V2']|_policy['ALLOW_V3']|_policy['REQUIRE_ENCRYPTION']|_policy['WHITESPACE_START_AKE']|_policy['ERROR_START_AKE'];
_policy['DEFAULT'] = _policy['OPPORTUNISTIC']

function OTRL_POLICY(p){  
    return _policy[p];
};

var _otrl_msgevent=[
    "NONE",
    "ENCRYPTION_REQUIRED",
    "ENCRYPTION_ERROR",
    "CONNECTION_ENDED",
    "SETUP_ERROR",
    "MSG_REFLECTED",
    "MSG_RESENT",
    "RCVDMSG_NOT_IN_PRIVATE",
    "RCVDMSG_UNREADABLE",
    "RCVDMSG_MALFORMED",
    "LOG_HEARTBEAT_RCVD",
    "LOG_HEARTBEAT_SENT",
    "RCVDMSG_GENERAL_ERR",
    "RCVDMSG_UNENCRYPTED",
    "RCVDMSG_UNRECOGNIZED",
    "RCVDMSG_FOR_OTHER_INSTANCE"
];
function OTRL_MSGEVENT(e){
    return _otrl_msgevent[e];
}


}).call();
