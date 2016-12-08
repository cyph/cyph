/**
 * Crypto lib dependencies with type definitions.
 */
export class Lib {
	/** https://github.com/cyph/mceliece.js */
	public readonly mcEliece: {
		decryptedDataLength: number;
		encryptedDataLength: number;
		privateKeyLength: number;
		publicKeyLength: number;

		decrypt: (encrypted: Uint8Array|string, privateKey: Uint8Array) => Uint8Array;
		encrypt: (message: Uint8Array|string, publicKey: Uint8Array) => Uint8Array;
		keyPair: () => {privateKey: Uint8Array; publicKey: Uint8Array};
	}	= (<any> self).mceliece || (<any> {});

	/** https://github.com/cyph/ntru.js */
	public readonly ntru: {
		decryptedDataLength: number;
		encryptedDataLength: number;
		privateKeyLength: number;
		publicKeyLength: number;

		decrypt: (encrypted: Uint8Array|string, privateKey: Uint8Array) => Uint8Array;
		encrypt: (message: Uint8Array|string, publicKey: Uint8Array) => Uint8Array;
		keyPair: () => {privateKey: Uint8Array; publicKey: Uint8Array};
	}	= (<any> self).ntru || (<any> {});

	/** https://github.com/cyph/rlwe.js */
	public readonly rlwe: {
		privateKeyLength: number;
		publicKeyLength: number;
		secretLength: number;

		aliceKeyPair: () => {privateKey: Uint8Array; publicKey: Uint8Array};
		aliceSecret: (publicKey: Uint8Array, privateKey: Uint8Array) => Uint8Array;
		bobSecret: (alicePublicKey: Uint8Array) => {publicKey: Uint8Array; secret: Uint8Array};
	}	= (<any> self).rlwe || (<any> {});

	/** https://github.com/jedisct1/libsodium.js */
	public readonly sodium: {
		crypto_aead_chacha20poly1305_ABYTES: number;
		crypto_aead_chacha20poly1305_KEYBYTES: number;
		crypto_aead_chacha20poly1305_NPUBBYTES: number;
		crypto_box_NONCEBYTES: number;
		crypto_box_PUBLICKEYBYTES: number;
		crypto_box_SECRETKEYBYTES: number;
		crypto_onetimeauth_BYTES: number;
		crypto_onetimeauth_KEYBYTES: number;
		crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE: number;
		crypto_pwhash_scryptsalsa208sha256_SALTBYTES: number;
		crypto_scalarmult_BYTES: number;
		crypto_scalarmult_SCALARBYTES: number;

		crypto_aead_chacha20poly1305_decrypt: (
			secretNonce: Uint8Array,
			cyphertext: Uint8Array,
			additionalData: Uint8Array,
			publicNonce: Uint8Array,
			key: Uint8Array
		) => Uint8Array;
		crypto_aead_chacha20poly1305_encrypt: (
			plaintext: Uint8Array,
			additionalData: Uint8Array,
			secretNonce: Uint8Array,
			publicNonce: Uint8Array,
			key: Uint8Array
		) => Uint8Array;
		crypto_box_keypair: () => {keyType: string; privateKey: Uint8Array; publicKey: Uint8Array};
		crypto_box_seal: (plaintext: Uint8Array, publicKey: Uint8Array) => Uint8Array;
		crypto_box_seal_open: (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) => Uint8Array;
		crypto_generichash: (
			outputBytes: number,
			plaintext: Uint8Array,
			key?: Uint8Array
		) => Uint8Array;
		crypto_onetimeauth: (
			message: Uint8Array,
			key: Uint8Array
		) => Uint8Array;
		crypto_onetimeauth_verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) => boolean;
		crypto_pwhash_scryptsalsa208sha256: (
			keyBytes: number,
			password: Uint8Array,
			salt: Uint8Array,
			opsLimit: number,
			memLimit: number
		) => Uint8Array;
		crypto_scalarmult: (privateKey: Uint8Array, publicKey: Uint8Array) => Uint8Array;
		crypto_scalarmult_base: (privateKey: Uint8Array) => Uint8Array;
		from_base64: (s: string) => Uint8Array;
		from_hex: (s: string) => Uint8Array;
		from_string: (s: string) => Uint8Array;
		memcmp: (a: Uint8Array, b: Uint8Array) => boolean;
		memzero: (a: Uint8Array) => void;
		to_base64: (a: Uint8Array) => string;
		to_hex: (a: Uint8Array) => string;
		to_string: (a: Uint8Array) => string;
	}	= (<any> self).sodium || {};

	/** https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto */
	public readonly subtleCrypto: any	= crypto.subtle;

	/** https://github.com/cyph/supersphincs */
	public readonly superSphincs: {
		bytes: number;
		hashBytes: number;
		privateKeyBytes: number;
		publicKeyBytes: number;

		hash: (message: Uint8Array|string, onlyBinary: boolean) => Uint8Array;
		keyPair: () => Promise<{keyType: string; privateKey: Uint8Array; publicKey: Uint8Array}>;
		open: (signed: Uint8Array|string, publicKey: Uint8Array) => Promise<string>;
		sign: (message: Uint8Array|string, privateKey: Uint8Array) => Promise<string>;
		signDetached: (message: Uint8Array|string, privateKey: Uint8Array) => Promise<string>;
		verifyDetached: (
			signature: Uint8Array|string,
			message: Uint8Array|string,
			publicKey: Uint8Array
		) => Promise<boolean>;
	}	= (<any> self).superSphincs || (<any> {});

	constructor () {}
}

/** @see Lib */
export const lib	= new Lib();
