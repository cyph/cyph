EMCC = `./find-emcc.py`/emcc
CRYPTO_EMSCRIPTEN=$(HOME)/projects/crypto-emscripten
BUILD= build
CRYPTO_BUILD = $(CRYPTO_EMSCRIPTEN)/$(BUILD)

EXPORTED_FUNCS= -s EXPORTED_FUNCTIONS="[ \
  '_gcry_strerror',\
  '__gcry_strerror',\
  '__gcry_mpi_new',\
  '__gcry_mpi_set',\
  '__gcry_mpi_release', \
  '__gcry_mpi_scan',\
  '__gcry_mpi_print',\
  '_otrl_version',\
  '_otrl_userstate_create',\
  '_otrl_userstate_free', \
  '_otrl_privkey_read',\
  '_otrl_privkey_fingerprint',\
  '_otrl_privkey_read_fingerprints',\
  '_otrl_privkey_write_fingerprints', \
  '_otrl_privkey_generate',\
  '_otrl_privkey_forget',\
  '_otrl_privkey_forget_all',\
  '_otrl_privkey_find',\
  '_otrl_privkey_hash_to_human', \
  '_otrl_context_find',\
  '_otrl_context_forget',\
  '_otrl_context_forget_fingerprint', \
  '_otrl_context_set_trust', \
  '_otrl_message_sending',\
  '_otrl_message_free',\
  '_otrl_message_fragment_and_send', \
  '_otrl_message_disconnect',\
  '_otrl_message_initiate_smp_q',\
  '_otrl_message_initiate_smp',\
  '_otrl_message_respond_smp', \
  '_otrl_message_abort_smp', \
  '_otrl_message_receiving',\
  '_otrl_message_symkey',\
  '_otrl_message_poll',\
  '_otrl_message_poll_get_default_interval', \
  '_otrl_instag_generate',\
  '_otrl_instag_read', \
  '_otrl_instag_write',\
  '_otrl_instag_find',\
  '_otrl_tlv_find',\
  '_otrl_tlv_free', \
  '_jsapi_initialise',\
  '_jsapi_message_receiving',\
  '_jsapi_can_start_smp',\
  '_jsapi_privkey_get_next',\
  '_jsapi_privkey_get_accountname', \
  '_jsapi_privkey_get_protocol',\
  '_jsapi_privkey_delete',\
  '_jsapi_privkey_get_dsa_token', \
  '_jsapi_privkey_write_trusted_fingerprints', \
  '_jsapi_userstate_get_privkey_root',\
  '_jsapi_userstate_import_privkey',\
  '_jsapi_userstate_write_to_file',\
  '_jsapi_conncontext_get_protocol', \
  '_jsapi_conncontext_get_username',\
  '_jsapi_conncontext_get_accountname',\
  '_jsapi_conncontext_get_msgstate', \
  '_jsapi_conncontext_get_protocol_version',\
  '_jsapi_conncontext_get_smstate', \
  '_jsapi_conncontext_get_active_fingerprint', \
  '_jsapi_conncontext_get_trust',\
  '_jsapi_conncontext_get_their_instance',\
  '_jsapi_conncontext_get_our_instance', \
  '_jsapi_conncontext_get_master',\
  '_jsapi_messageappops_new',\
  '_jsapi_instag_get_tag', \
  '_jsapi_conncontext_get_master_fingerprint', \
  '_jsapi_fingerprint_get_next', \
  '_jsapi_fingerprint_get_fingerprint', \
  '_jsapi_fingerprint_get_trust', \
  '_jsapi_userstate_get_context_root', \
  '_jsapi_conncontext_get_next' \
]"

OPTIMISATION= -O2 --closure 1 --llvm-opts 1 -s LINKABLE=1 $(EXPORTED_FUNCS) -s ASM_JS=1 --memory-init-file 0

libotr4.js: src/*.js lib/*.js
	mkdir -p build/
	$(EMCC) src/jsapi.c -I$(CRYPTO_BUILD)/include -lotr -L$(CRYPTO_BUILD)/lib \
		-o build/_libotr4.js \
		--pre-js src/otr_pre.js \
		-s TOTAL_MEMORY=1048576  -s TOTAL_STACK=409600 \
		$(OPTIMISATION) --js-library src/library_gcrypt.js --js-library src/library_otr.js
	cat src/header.js build/_libotr4.js src/footer.js > build/libotr4.js
	rm build/_libotr4.js

otr-web: build/libotr4.js
	browserify --im index.js -s OTR | sed -e "s/var process = module.exports = {};/var process=module.exports={};process.platform='browser';process.stdout={write:function(x){console.log(x)}};process.stderr={write:function(x){console.error(x)}};process.exit=noop;/" > build/otr-web.js

docs:
	rm -fr doc/html/
	jsdoc -d doc/html index.js lib/User.js lib/Account.js lib/Contact.js lib/Session.js lib/POLICY.js lib/MSGEVENT.js
