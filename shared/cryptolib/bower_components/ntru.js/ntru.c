#include "ntru_crypto.h"
#include "ntru_crypto_ntru_encrypt_param_sets.h"

DRBG_HANDLE drbg;
uint8_t* drbgseed;
int drbgseedlength;
uint16_t public_key_len;
uint16_t private_key_len;
uint16_t ciphertext_len;
uint16_t plaintext_len;


/* Adapted from NTRUEncrypt/sample/sample_NTRUEncrypt.c */

static uint8_t const pers_str[]	= {'C', 'y', 'p', 'h', 'M', 'e', 'B', 'r', 'o'};

uint8_t get_entropy (ENTROPY_CMD cmd, uint8_t *out) {
	size_t index;

	if (cmd == INIT) {
		index = 0;
		return 1;
	}

	if (out == NULL) {
		return 0;
	}

	if (cmd == GET_NUM_BYTES_PER_BYTE_OF_ENTROPY) {
		*out = 1;
		return 1;
	}

	if (cmd == GET_BYTE_OF_ENTROPY) {
		if (index == drbgseedlength) {
			return 0;
		}

		*out = drbgseed[index++];
		return 1;
	}

	return 0;
}


int init (uint8_t* seed, int seedlength) {
	drbgseed		= malloc(seedlength);
	drbgseedlength	= seedlength;
	memcpy(drbgseed, seed, seedlength);

	NTRU_ENCRYPT_PARAM_SET* params_data	= ntru_encrypt_get_params_with_id(params);

	int rc	= ntru_crypto_drbg_instantiate(
		params_data->sec_strength_len * 8,
		pers_str,
		sizeof(pers_str),
		(ENTROPY_FN) &get_entropy,
		&drbg
	);

	ntru_crypto_ntru_encrypt_keygen(
		drbg,
		params,
		&public_key_len,
		NULL,
		&private_key_len,
		NULL
	);

	ciphertext_len	= public_key_len - 5;
	plaintext_len	= params_data->m_len_max;

	return rc;
}

int publen () {
	return public_key_len;
}

int privlen () {
	return private_key_len;
}

int enclen () {
	return ciphertext_len;
}

int declen () {
	return plaintext_len;
}

int keypair (uint8_t* pub, uint8_t* priv) {
	return ntru_crypto_ntru_encrypt_keygen(
		drbg,
		params,
		&public_key_len,
		pub,
		&private_key_len,
		priv
	);
}

int encrypt (uint8_t* msg, int msg_len, uint8_t* pub, int pub_len, uint8_t* enc) {
	return ntru_crypto_ntru_encrypt(
		drbg,
		pub_len,
		pub,
		msg_len,
		msg,
		&ciphertext_len,
		enc
	);
}

int decrypt (uint8_t* enc, int enc_len, uint8_t* priv, int priv_len, uint8_t* dec) {
	uint16_t dec_len;

	int rc	= ntru_crypto_ntru_decrypt(
		priv_len,
		priv,
		enc_len,
		enc,
		&dec_len,
		dec
	);

	if (rc == NTRU_OK) {
		return dec_len;
	}
	else {
		return -rc;
	}
}
