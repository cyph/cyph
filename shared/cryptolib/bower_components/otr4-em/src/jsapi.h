#include <errno.h>
#include <gcrypt.h>
#include <libotr/proto.h>
#include <libotr/userstate.h>
#include <libotr/privkey.h>
#include <libotr/tlv.h>
#include <libotr/message.h>
#include <libotr/serial.h>
#include <emscripten/emscripten.h>
#include <sys/stat.h>

void jsapi_initialise();
OtrlPrivKey* jsapi_userstate_get_privkey_root(OtrlUserState us);
OtrlPrivKey* jsapi_privkey_get_next(OtrlPrivKey* p);
ConnContext* jsapi_userstate_get_context_root(OtrlUserState us);
char* jsapi_privkey_get_accountname(OtrlPrivKey* p);
char* jsapi_privkey_get_protocol(OtrlPrivKey* p);
gcry_error_t jsapi_privkey_write_trusted_fingerprints(OtrlUserState us,const char *filename);
gcry_error_t jsapi_privkey_write_trusted_fingerprints_FILEp(OtrlUserState us, FILE *storef);
gcry_error_t jsapi_privkey_delete(OtrlUserState us, const char *filename, const char *accountname, const char *protocol);
gcry_error_t jsapi_privkey_get_dsa_token(OtrlPrivKey *keyToExport, const char* token, unsigned char *buffer, size_t buflen, size_t *nbytes);
gcry_error_t jsapi_userstate_import_privkey(OtrlUserState us, char *accountname, char * protocol, gcry_mpi_t p, gcry_mpi_t q, gcry_mpi_t g, gcry_mpi_t y, gcry_mpi_t x);
gcry_error_t jsapi_userstate_write_to_file(OtrlUserState us, const char *filename);
char* jsapi_conncontext_get_protocol(ConnContext* ctx);
char* jsapi_conncontext_get_username(ConnContext* ctx);
char* jsapi_conncontext_get_accountname(ConnContext* ctx);
int jsapi_conncontext_get_msgstate(ConnContext* ctx);
int jsapi_conncontext_get_protocol_version(ConnContext* ctx);
int jsapi_conncontext_get_smstate(ConnContext* ctx);
void jsapi_conncontext_get_active_fingerprint(ConnContext* ctx, char* human);
char* jsapi_conncontext_get_trust(ConnContext* ctx);
otrl_instag_t jsapi_conncontext_get_their_instance(ConnContext* ctx);
otrl_instag_t jsapi_conncontext_get_our_instance(ConnContext* ctx);
ConnContext* jsapi_conncontext_get_master(ConnContext* ctx);
otrl_instag_t jsapi_instag_get_tag(OtrlInsTag *instag);
int jsapi_can_start_smp(ConnContext* ctx);
Fingerprint* jsapi_conncontext_get_master_fingerprint(ConnContext* context);
ConnContext* jsapi_conncontext_get_next(ConnContext *ctx);
Fingerprint* jsapi_fingerprint_get_next(Fingerprint *fingerprint);
void jsapi_fingerprint_fingerprint(Fingerprint *fingerprint, char* human);
char* jsapi_fingerprint_trust(Fingerprint *fingerprint);

OtrlMessageAppOps* jsapi_messageappops_new();

//msgops_callback_* functions implemented in library_otr.js
OtrlPolicy msgops_callback_policy(void *opdata,ConnContext *context);

void msgops_callback_create_privkey(void *opdata, const char *accountname,
        const char *protocol);

int msgops_callback_is_logged_in(void *opdata, const char *accountname,
        const char *protocol, const char *recipient);

void msgops_callback_inject_message(void *opdata, const char *accountname,
        const char *protocol, const char *recipient, const char *message);

void msgops_callback_update_context_list(void *opdata);

void msgops_callback_new_fingerprint(void *opdata, OtrlUserState us,
        const char *accountname, const char *protocol,
        const char *username, unsigned char fingerprint[20]);

void msgops_callback_write_fingerprints(void *opdata);
void msgops_callback_gone_secure(void *opdata, ConnContext *context);
void msgops_callback_gone_insecure(void *opdata, ConnContext *context);
void msgops_callback_still_secure(void *opdata, ConnContext *context, int is_reply);
int msgops_callback_max_message_size(void *opdata, ConnContext *context);
const char * msgops_callback_account_name(void *opdata, const char *account, const char *protocol);
void msgops_callback_account_name_free(void *opdata, const char *account_name);
void msgops_callback_received_symkey(void *opdata, ConnContext *context,
        unsigned int use, const unsigned char *usedata,
        size_t usedatalen, const unsigned char *symkey);
const char * msgops_callback_otr_error_message(void *opdata, ConnContext *context, OtrlErrorCode err_code);
void msgops_callback_otr_error_message_free(void *opdata, const char *err_msg);
const char * msgops_callback_resent_msg_prefix(void *opdata, ConnContext *context);
void msgops_callback_resent_msg_prefix_free(void *opdata, const char *prefix);
void msgops_callback_handle_smp_event(void *opdata, OtrlSMPEvent smp_event,
        ConnContext *context, unsigned short progress_percent,
        char *question);
void msgops_callback_handle_msg_event(void *opdata, OtrlMessageEvent msg_event,
        ConnContext *context, const char *message,
        gcry_error_t err);
void msgops_callback_create_instag(void *opdata, const char *accountname,
        const char *protocol);
void msgops_callback_convert_msg(void *opdata, ConnContext *context,
        OtrlConvertType convert_type, char ** dest, const char *src);
void msgops_callback_convert_free(void *opdata, ConnContext *context, char *dest);
void msgops_callback_timer_control(void *opdata, unsigned int interval);
