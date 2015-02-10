var Module;
this["Module"] = Module = {
 'preRun': function(){
    Module["FS"]=FS;
    Module["FS_destroyNode"]=FS.destroyNode;
    Module["FS_findObject"]=FS.findObject;
    Module["FS_readDataFile"]=function(path){
        var object = FS.findObject(path);
        if(object){
            return new Buffer(object.contents);
        }
    };

    Module["libgcrypt"] = {};
    Module["libgcrypt"]["mpi_new"] = cwrap('_gcry_mpi_new','number',['number']);
    Module["libgcrypt"]["mpi_set"] = cwrap('_gcry_mpi_set','number',['number','number']);
    Module["libgcrypt"]["mpi_release"] = cwrap('_gcry_mpi_release','',['number']);
    Module["libgcrypt"]["mpi_scan"] = cwrap('_gcry_mpi_scan','number',['number','number','string','number','number']);
    Module["libgcrypt"]["mpi_print"] = cwrap('_gcry_mpi_print','number',['number','number','number','number','number']);
    Module["libgcrypt"]["strerror"] = cwrap('gcry_strerror','string',['number']);

    Module["libotrl"] = {};
    Module["libotrl"]["version"] = cwrap('otrl_version','string',[]);
    Module["libotrl"]["userstate_create"]=cwrap('otrl_userstate_create','',['number']);
    Module["libotrl"]["userstate_free"]=cwrap('otrl_userstate_free','',['number']);
    Module["libotrl"]["privkey_read"]=cwrap('otrl_privkey_read','number',['number','string']);
    Module["libotrl"]["privkey_fingerprint"]=cwrap('otrl_privkey_fingerprint','number',['number','number','string','string']);
    Module["libotrl"]["privkey_read_fingerprints"]=cwrap('otrl_privkey_read_fingerprints','number',['number','string','number','number']);
    Module["libotrl"]["privkey_write_fingerprints"]=cwrap('otrl_privkey_write_fingerprints','number',['number','string']);
    Module["libotrl"]["privkey_generate"]=cwrap('otrl_privkey_generate','number',['number','string','string','string']);
    Module["libotrl"]["privkey_forget"]=cwrap('otrl_privkey_forget','',['number']);
    Module["libotrl"]["privkey_forget_all"]=cwrap('otrl_privkey_forget_all','',['number']);
    Module["libotrl"]["privkey_find"]=cwrap('otrl_privkey_find','number',['number','string','string']);
    Module["libotrl"]["privkey_hash_to_human"]=cwrap('otrl_privkey_hash_to_human','',['number','number']);
    Module["libotrl"]["context_find"]=cwrap('otrl_context_find','number',['number','string','string','string','number','number','number','number','number']);
    Module["libotrl"]["context_forget"]=cwrap('otrl_context_forget','number',['number']);
    Module["libotrl"]["context_forget_fingerprint"]=cwrap('otrl_context_forget_fingerprint','',['number']);
    Module["libotrl"]["context_set_trust"]=cwrap('otrl_context_set_trust','',['number','string']);
    Module["libotrl"]["message_sending"]=cwrap('otrl_message_sending','number',['number','number','number','string','string','string',
                                                                                                    'number','string','number','number','number','number','number','number']);
    Module["libotrl"]["message_free"]=cwrap('otrl_message_free','',['number']);
    Module["libotrl"]["message_disconnect"]=cwrap('otrl_message_disconnect','',['number','number','number','string','string','string','number']);
    Module["libotrl"]["message_initiate_smp_q"]=cwrap('otrl_message_initiate_smp_q','',['number','number','number','number','string','string','number']);
    Module["libotrl"]["message_initiate_smp"]=cwrap('otrl_message_initiate_smp','',['number','number','number','number','string','number']);
    Module["libotrl"]["message_respond_smp"]=cwrap('otrl_message_respond_smp','',['number','number','number','number','string','number']);
    Module["libotrl"]["message_abort_smp"]=cwrap('otrl_message_abort_smp','',['number','number','number','number']);
    Module["libotrl"]["message_receiving"]=cwrap('otrl_message_receiving','number',['number','number','number','string','string','string','string','number','number','number','number','number']);
    Module["libotrl"]["message_poll_get_default_interval"]=cwrap('otrl_message_poll_get_default_interval','number',['number']);
    Module["libotrl"]["message_poll"]=cwrap('otrl_message_poll','',['number','number','number']);
    Module["libotrl"]["instag_generate"]=cwrap('otrl_instag_generate','number',['number','string','string','string']);
    Module["libotrl"]["instag_read"]=cwrap('otrl_instag_read','number',['number','string']);
    Module["libotrl"]["instag_write"]=cwrap('otrl_instag_write','number',['number','string']);
    Module["libotrl"]["instag_find"]=cwrap('otrl_instag_find','number',['number','string','string']);
    Module["libotrl"]["message_symkey"]=cwrap('otrl_message_symkey','number',['number','number','number','number','number','number','number','number']);
    Module["libotrl"]["tlv_free"]=cwrap('otrl_tlv_free','',['number']);
    Module["libotrl"]["tlv_find"]=cwrap('otrl_tlv_find','number',['number','number']);

    Module["jsapi"]={};
    Module["jsapi"]["can_start_smp"]=cwrap('jsapi_can_start_smp','number',['number']);
    Module["jsapi"]["privkey_get_next"]=cwrap("jsapi_privkey_get_next",'number',['number']);
    Module["jsapi"]["privkey_get_accountname"]=cwrap("jsapi_privkey_get_accountname",'string',['number']);
    Module["jsapi"]["privkey_get_protocol"]=cwrap("jsapi_privkey_get_protocol",'string',['number']);
    Module["jsapi"]["privkey_delete"]=cwrap('jsapi_privkey_delete','',['number','string','string','string']);
    Module["jsapi"]["privkey_get_dsa_token"]=cwrap('jsapi_privkey_get_dsa_token','number',['number','string','number','number']);
    Module["jsapi"]["privkey_write_trusted_fingerprints"]=cwrap("jsapi_privkey_write_trusted_fingerprints",'number',['number','string']);
    Module["jsapi"]["userstate_import_privkey"]=cwrap('jsapi_userstate_import_privkey','number',['number','string','string','number','number','number','number','number']);
    Module["jsapi"]["userstate_write_to_file"]=cwrap('jsapi_userstate_write_to_file','number',['number','string']);
    Module["jsapi"]["userstate_get_privkey_root"]=cwrap("jsapi_userstate_get_privkey_root","number",["number"]);
    Module["jsapi"]["conncontext_get_protocol"]=cwrap('jsapi_conncontext_get_protocol','string',['number']);
    Module["jsapi"]["conncontext_get_username"]=cwrap('jsapi_conncontext_get_username','string',['number']);
    Module["jsapi"]["conncontext_get_accountname"]=cwrap('jsapi_conncontext_get_accountname','string',['number']);
    Module["jsapi"]["conncontext_get_msgstate"]=cwrap('jsapi_conncontext_get_msgstate','number',['number']);
    Module["jsapi"]["conncontext_get_protocol_version"]=cwrap('jsapi_conncontext_get_protocol_version','number',['number']);
    Module["jsapi"]["conncontext_get_smstate"]=cwrap('jsapi_conncontext_get_smstate','number',['number']);
    Module["jsapi"]["conncontext_get_active_fingerprint"]=cwrap('jsapi_conncontext_get_active_fingerprint','',['number','number']);
    Module["jsapi"]["conncontext_get_trust"]=cwrap('jsapi_conncontext_get_trust','string',['number']);
    Module["jsapi"]["conncontext_get_their_instance"]=cwrap('jsapi_conncontext_get_their_instance','number',['number']);
    Module["jsapi"]["conncontext_get_our_instance"]=cwrap('jsapi_conncontext_get_our_instance','number',['number']);
    Module["jsapi"]["conncontext_get_master"]=cwrap('jsapi_conncontext_get_master','number',['number']);
    Module["jsapi"]["instag_get_tag"]=cwrap('jsapi_instag_get_tag','number',['number']);
    Module["jsapi"]["initialise"]=cwrap('jsapi_initialise','',[]);
    Module["jsapi"]["messageappops_new"]=cwrap('jsapi_messageappops_new','number',[]);
    Module["jsapi"]["conncontext_get_master_fingerprint"]=cwrap('jsapi_conncontext_get_master_fingerprint','number',['number']);
    Module["jsapi"]["fingerprint_get_next"]=cwrap('jsapi_fingerprint_get_next','number',['number']);
    Module["jsapi"]["fingerprint_get_fingerprint"]=cwrap('jsapi_fingerprint_get_fingerprint','',['number','number']);
    Module["jsapi"]["fingerprint_get_trust"]=cwrap('jsapi_fingerprint_get_trust','string',['number']);
    Module["jsapi"]["conncontext_get_next"]=cwrap('jsapi_conncontext_get_next','number',['number']);
    Module["jsapi"]["userstate_get_context_root"]=cwrap('jsapi_userstate_get_context_root','number',['number']);
  }
};
