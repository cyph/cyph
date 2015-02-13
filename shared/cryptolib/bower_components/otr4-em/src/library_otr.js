mergeInto(LibraryManager.library, {
  $Helper__postset: 'Module["ptr_to_HexString"]=Helper.ptr_to_HexString;'+
                    'Module["ptr_to_Buffer"]=Helper.ptr_to_Buffer;'+
                    'Module["ptr_to_ArrayBuffer"]=Helper.ptr_to_ArrayBuffer;'+
                    'Module["unsigned_char"]=Helper.unsigned_char;'+
                    'Module["unsigned_int32"]=Helper.unsigned_int32;'+
                    'Module["ab2str"]=Helper.ab2str;'+
                    'Module["str2ab"]=Helper.str2ab;',
  $Helper:{
    ptr_to_HexString: function(ptr,len){
        var hexDigit = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
        function hexString(val){
            return hexDigit[(val & 0xF0) >> 4] + hexDigit[val & 0x0F];
        }
        var hex = "";
        for(var i=0; i<len; i++){
            hex = hex + hexString( Helper.unsigned_char( getValue( ptr + i,"i8")));
        }
        return hex;
    },
    ptr_to_Buffer: function(ptr,len){
        var buf = new Buffer(len);
        for(var i=0; i<len; i++){
            buf.writeInt8(getValue(ptr+i,"i8"),i);
        }
        return buf;
    },
    ptr_to_ArrayBuffer: function(ptr,len){
        var buf = new ArrayBuffer(len);
        var u8 = new Uint8Array(buf);
        for(var i=0; i<len; i++){
            u8[i]= Helper.unsigned_char( getValue( ptr + i,"i8"));
        }
        return buf;
    },
    unsigned_char: function( c ){
        c = c & 0xFF;
        return ( c < 0 ? (0xFF+1)+c : c );
    },
    unsigned_int32: function( i ){
        //i must be in the range of a signed 32-bit integer!
        i = i & 0xFFFFFFFF;//truncate so we dont return values larger than an unsigned 32-bit int.
        return ( i < 0 ? (0xFFFFFFFF+1)+i : i );
    },
    // http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
    ab2str: function(buf) {
      return String.fromCharCode.apply(null, new Uint16Array(buf));
    },
    str2ab: function(str) {
      var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
      var bufView = new Uint16Array(buf);
      for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }
  },
  msgops_callback_policy: function(opdata,context){
    return Module["ops_event"](opdata,{},"policy");
  },
    
  msgops_callback_create_privkey: function(opdata,accountname,protocol){
        Module["ops_event"](opdata,{
          "accountname":Pointer_stringify(accountname),
            "protocol":Pointer_stringify(protocol)
          },"create_privkey");
  },

  msgops_callback_is_logged_in: function(opdata,accountname,protocol,recipient){
        return Module["ops_event"](opdata,{},"is_logged_in");
  },

  msgops_callback_inject_message: function(opdata,accountname,protocol,recipient,message){
        Module["ops_event"](opdata,{
            "message":Pointer_stringify(message)
        },"inject_message");
  },     

  msgops_callback_update_context_list: function(opdata){
        Module["ops_event"](opdata,{},"update_context_list");
  },

  msgops_callback_new_fingerprint__deps:['otrl_privkey_hash_to_human','malloc','free'],
  msgops_callback_new_fingerprint: function(opdata,userstate,accountname,protocol,username,fingerprint){
        var human = _malloc(45);
        _otrl_privkey_hash_to_human(human, fingerprint);
        Module["ops_event"](opdata,{
            "fingerprint":Pointer_stringify(human)
        },"new_fingerprint");
        _free(human);
  },

  msgops_callback_write_fingerprints: function(opdata){
        Module["ops_event"](opdata,{},"write_fingerprints");
  },

  msgops_callback_gone_secure: function(opdata,context){
        Module["ops_event"](opdata,{},"gone_secure");
  },
    
  msgops_callback_gone_insecure: function(opdata,context){
        Module["ops_event"](opdata,{},"gone_insecure");
  },
    
  msgops_callback_still_secure: function(opdata,context,is_reply){
        Module["ops_event"](opdata,{},"still_secure");
  },

  msgops_callback_max_message_size:function(opdata,context){
        return Module["ops_event"](opdata,{},"max_message_size");
  },

  msgops_callback_account_name:function(opdata,account,protocol){
        return account;
  },

  msgops_callback_account_name_free:function(opdata,account,protocol){
        return;
  },
    
  msgops_callback_received_symkey__deps: ['$Helper'],
  msgops_callback_received_symkey: function(opdata,context,use,usedata,usedatalen,symkey){
        Module["ops_event"](opdata,{
            "use": use,
            "usedata":Helper.ptr_to_ArrayBuffer(usedata,usedatalen),
            "key":Helper.ptr_to_ArrayBuffer(symkey,32)
        },"received_symkey");
  },   
  msgops_callback_otr_error_message: function(opdata, context, err_code){
        var msg =["","encryption-error","msg-not-in-private","msg-unreadble","msg-malformed"][err_code];
        var ptr = _malloc(msg.length+1);
        writeStringToMemory(msg,ptr);
        return ptr;
  },
  msgops_callback_otr_error_message_free: function(opdata,err_msg){
        _free(err_msg);
  },
    
  msgops_callback_handle_smp_event__deps:['do_smp_request','do_smp_complete',
        'do_smp_failed','do_smp_error','do_smp_aborted'],
  msgops_callback_handle_smp_event: function(opdata, smp_event,context, progress, question){
     var smpevents = [
      "OTRL_SMPEVENT_NONE",
      "OTRL_SMPEVENT_ERROR",
      "OTRL_SMPEVENT_ABORT",
      "OTRL_SMPEVENT_CHEATED",
      "OTRL_SMPEVENT_ASK_FOR_ANSWER",
      "OTRL_SMPEVENT_ASK_FOR_SECRET",
      "OTRL_SMPEVENT_IN_PROGRESS",
      "OTRL_SMPEVENT_SUCCESS",
      "OTRL_SMPEVENT_FAILURE"];

      switch(smpevents[smp_event]){
        case "OTRL_SMPEVENT_ASK_FOR_SECRET":
            _do_smp_request(opdata,context,0);return;
        case "OTRL_SMPEVENT_ASK_FOR_ANSWER":
            _do_smp_request(opdata,context,question);return;
        case "OTRL_SMPEVENT_IN_PROGRESS":
            return;
        case "OTRL_SMPEVENT_SUCCESS":
            _do_smp_complete(opdata, context);return;
        case "OTRL_SMPEVENT_FAILURE":
            _do_smp_failed(opdata, context);return;
        case "OTRL_SMPEVENT_CHEATED":
        case "OTRL_SMPEVENT_ERROR":
            _do_smp_error(opdata, context);return;//must call otrl_message_abort_smp
        case "OTRL_SMPEVENT_ABORT":
            _do_smp_aborted(opdata, context);return;
      }
  },
    
  msgops_callback_handle_msg_event__deps: ['gcry_strerror'],
  msgops_callback_handle_msg_event: function(opdata,msg_event,context,message,err){
        var error = new Error();
        error.num = err;
        error.message = _gcry_strerror(err);
        Module["ops_event"](opdata,{
            "event":msg_event,
            "message":Pointer_stringify(message),
            "err": (err?error:null)
        },"msg_event");
  },

  msgops_callback_create_instag: function(opdata, accountname, protocol){
        Module["ops_event"](opdata,{
            "accountname":Pointer_stringify(accountname),
            "protocol":Pointer_stringify(protocol)
        },"create_instag");
  },

  do_smp_request: function(opdata,context,question){
        var obj = (new Module["ConnContext"](context))["obj"]();
        if(question!=0) obj["question"] = Pointer_stringify(question);
        Module["ops_event"](opdata, obj, "smp_request");
  },
    
  do_smp_failed: function(opdata,context){
        Module["ops_event"](opdata, (new Module["ConnContext"](context))["obj"](),"smp_failed");
  },
    
  do_smp_aborted: function(opdata,context){
        Module["ops_event"](opdata, (new Module["ConnContext"](context))["obj"](),"smp_aborted");
  },
    
  do_smp_complete: function(opdata,context){
        Module["ops_event"](opdata, (new Module["ConnContext"](context))["obj"](),"smp_complete");
  },
    
  do_smp_error: function(opdata,context){
        Module["ops_event"](opdata, (new Module["ConnContext"](context))["obj"](),"smp_error");    
  },

});
