import {Ntru, Sodium} from 'global/base';


/**
 * The Castle encryption protocol. This version supports an OTR-like
 * feature set, with group/async/persistence coming later.
 */
export class CastleCore {
	private static handshakeTimeout: number			= 90000;
	private static messageIdEndIndex: number		= 4;

	private static flagIndex: number				=
		Sodium.crypto_onetimeauth_KEYBYTES
	;

	private static flagDataIndex: number			=
		CastleCore.flagIndex + 1
	;

	private static nonceEndIndex: number			=
		CastleCore.messageIdEndIndex +
		Sodium.crypto_secretbox_NONCEBYTES
	;

	private static ntruMacIndex: number				=
		CastleCore.nonceEndIndex +
		Ntru.encryptedDataLength
	;

	private static ntruPlaintextLength: number		=
		Sodium.crypto_secretbox_KEYBYTES +
		Sodium.crypto_onetimeauth_KEYBYTES
	;

	private static metadataMacIndex: number			=
		CastleCore.ntruMacIndex +
		Sodium.crypto_onetimeauth_BYTES
	;

	private static sodiumCyphertextIndex: number	=
		CastleCore.metadataMacIndex +
		Sodium.crypto_onetimeauth_BYTES
	;

	private static publicKeySetLength: number		=
		Sodium.crypto_box_PUBLICKEYBYTES +
		Ntru.publicKeyLength
	;

	private static errors	= {
		decryptionFailure: new Error('Data could not be decrypted.'),
		metadataAuthFailure: new Error('Invalid metadata (message ID, nonce).'),
		ntruAuthFailure: new Error('Invalid NTRU cyphertext.')
	};


	private incomingHandshakeNonce: Uint8Array	= new Uint8Array(
		Sodium.crypto_secretbox_NONCEBYTES
	);

	private outgoingHandshakeNonce: Uint8Array	= new Uint8Array(
		Sodium.crypto_secretbox_NONCEBYTES
	);

	private keySets: {
		sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
		ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
	}[]	= [];

	private friendKeySet: {
		sodium: Uint8Array;
		ntru: Uint8Array;
	};

	private isAborted: boolean;
	private isConnected: boolean;
	private shouldRatchetKeys: boolean;
	private sharedSecret: Uint8Array;

	public outgoingMessageId: Uint32Array	= new Uint32Array([1]);

	private abort () : void {
		this.isAborted	= true;

		try {
			/* Send invalid cyphertext to trigger
				friend's abortion logic */
			this.handlers.send('');
		}
		finally {
			this.handlers.abort();
		}
	}

	private decrypt (cyphertext: Uint8Array) : {
		data: Uint8Array;
		keySet: {
			sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
			ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
		};
	} {
		const metadata: Uint8Array			= new Uint8Array(
			cyphertext.buffer,
			0,
			CastleCore.nonceEndIndex
		);

		const nonce: Uint8Array				= new Uint8Array(
			cyphertext.buffer,
			CastleCore.messageIdEndIndex,
			Sodium.crypto_secretbox_NONCEBYTES
		);

		const ntruCyphertext: Uint8Array	= new Uint8Array(
			cyphertext.buffer,
			CastleCore.nonceEndIndex,
			Ntru.encryptedDataLength
		);

		const ntruMac: Uint8Array			= new Uint8Array(
			cyphertext.buffer,
			CastleCore.ntruMacIndex,
			Sodium.crypto_onetimeauth_BYTES
		);

		const metadataMac: Uint8Array		= new Uint8Array(
			cyphertext.buffer,
			CastleCore.metadataMacIndex,
			Sodium.crypto_onetimeauth_BYTES
		);

		const sodiumCyphertext: Uint8Array	= new Uint8Array(
			cyphertext.buffer,
			CastleCore.sodiumCyphertextIndex
		);


		for (const keySet of this.keySets) {
			let ntruPlaintext: Uint8Array;

			try {
				ntruPlaintext	= Ntru.decrypt(
					ntruCyphertext,
					keySet.ntru.privateKey
				);

				const symmetricKey: Uint8Array	= new Uint8Array(
					ntruPlaintext.buffer,
					0,
					Sodium.crypto_secretbox_KEYBYTES
				);

				const ntruAuthKey: Uint8Array	= new Uint8Array(
					ntruPlaintext.buffer,
					Sodium.crypto_secretbox_KEYBYTES,
					Sodium.crypto_onetimeauth_KEYBYTES
				);

				if (!Sodium.crypto_onetimeauth_verify(
					ntruMac,
					ntruCyphertext,
					ntruAuthKey
				)) {
					throw CastleCore.errors.ntruAuthFailure;
				}

				const data: Uint8Array	= Sodium.crypto_box_open_easy(
					Sodium.crypto_secretbox_open_easy(
						sodiumCyphertext,
						nonce,
						symmetricKey
					),
					nonce,
					this.friendKeySet.sodium,
					keySet.sodium.privateKey
				);

				const metadataAuthKey: Uint8Array	= new Uint8Array(
					data.buffer,
					0,
					Sodium.crypto_onetimeauth_KEYBYTES
				);

				if (!Sodium.crypto_onetimeauth_verify(
					metadataMac,
					metadata,
					metadataAuthKey
				)) {
					throw CastleCore.errors.metadataAuthFailure;
				}

				return {data, keySet};
			}
			catch (err) {
				if (
					err === CastleCore.errors.metadataAuthFailure ||
					err === CastleCore.errors.ntruAuthFailure
				) {
					throw err;
				}
			}
			finally {
				if (ntruPlaintext) {
					Sodium.memzero(ntruPlaintext);
				}
			}
		}

		throw CastleCore.errors.decryptionFailure;
	}

	private encrypt (
		data: Uint8Array,
		keySet: {
			sodium: { publicKey: Uint8Array; privateKey: Uint8Array; };
			ntru: { publicKey: Uint8Array; privateKey: Uint8Array; };
		}
	) : string {
		const symmetricKey: Uint8Array		= Sodium.randombytes_buf(
			Sodium.crypto_secretbox_KEYBYTES
		);

		const ntruAuthKey: Uint8Array		= Sodium.randombytes_buf(
			Sodium.crypto_onetimeauth_KEYBYTES
		);

		const ntruPlaintext: Uint8Array		= new Uint8Array(
			CastleCore.ntruPlaintextLength
		);

		ntruPlaintext.set(symmetricKey);
		ntruPlaintext.set(ntruAuthKey, Sodium.crypto_secretbox_KEYBYTES);

		const ntruCyphertext: Uint8Array	= Ntru.encrypt(
			ntruPlaintext,
			this.friendKeySet.ntru
		);

		const ntruMac: Uint8Array			= Sodium.crypto_onetimeauth(
			ntruCyphertext,
			ntruAuthKey
		);


		const nonce: Uint8Array				= Sodium.randombytes_buf(
			Sodium.crypto_secretbox_NONCEBYTES
		);

		const metadataAuthKey: Uint8Array	= Sodium.randombytes_buf(
			Sodium.crypto_onetimeauth_KEYBYTES
		);

		const metadata: Uint8Array			= new Uint8Array(
			CastleCore.nonceEndIndex
		);

		data.set(metadataAuthKey);
		metadata.set(new Uint8Array(this.outgoingMessageId.buffer));
		metadata.set(nonce, CastleCore.messageIdEndIndex);

		const metadataMac: Uint8Array		= Sodium.crypto_onetimeauth(
			metadata,
			metadataAuthKey
		);


		const sodiumCyphertext: Uint8Array	= Sodium.crypto_secretbox_easy(
			Sodium.crypto_box_easy(
				data,
				nonce,
				this.friendKeySet.sodium,
				keySet.sodium.privateKey
			),
			nonce,
			symmetricKey
		);

		const cyphertext: Uint8Array		= new Uint8Array(
			CastleCore.sodiumCyphertextIndex +
			sodiumCyphertext.length
		);

		cyphertext.set(metadata);
		cyphertext.set(ntruCyphertext, CastleCore.nonceEndIndex);
		cyphertext.set(ntruMac, CastleCore.ntruMacIndex);
		cyphertext.set(metadataMac, CastleCore.metadataMacIndex);
		cyphertext.set(sodiumCyphertext, CastleCore.sodiumCyphertextIndex);

		try {
			return Sodium.to_base64(cyphertext);
		}
		finally {
			Sodium.memzero(symmetricKey);
			Sodium.memzero(ntruAuthKey);
			Sodium.memzero(ntruPlaintext);
			Sodium.memzero(ntruCyphertext);
			Sodium.memzero(ntruMac);
			Sodium.memzero(nonce);
			Sodium.memzero(metadata);
			Sodium.memzero(metadataAuthKey);
			Sodium.memzero(metadataMac);
			Sodium.memzero(sodiumCyphertext);
			Sodium.memzero(cyphertext);
		}
	}

	private generateKeySet () : Uint8Array {
		this.keySets.unshift({
			sodium: Sodium.crypto_box_keypair(),
			ntru: Ntru.keyPair()
		});

		if (this.keySets.length > 2) {
			const oldKeySet	= this.keySets.pop();

			Sodium.memzero(oldKeySet.sodium.privateKey);
			Sodium.memzero(oldKeySet.ntru.privateKey);
			Sodium.memzero(oldKeySet.sodium.publicKey);
			Sodium.memzero(oldKeySet.ntru.publicKey);
		}

		const publicKeySet: Uint8Array	= new Uint8Array(
			CastleCore.publicKeySetLength
		);

		publicKeySet.set(this.keySets[0].sodium.publicKey);
		publicKeySet.set(
			this.keySets[0].ntru.publicKey,
			Sodium.crypto_box_PUBLICKEYBYTES
		);

		return publicKeySet;
	}

	private importFriendKeySet (data: Uint8Array, startIndex: number = 0) : void {
		this.friendKeySet.sodium.set(new Uint8Array(
			data.buffer,
			startIndex,
			Sodium.crypto_box_PUBLICKEYBYTES
		));

		this.friendKeySet.ntru.set(new Uint8Array(
			data.buffer,
			Sodium.crypto_box_PUBLICKEYBYTES + startIndex,
			Ntru.publicKeyLength
		));
	}

	/**
	 * Receive incoming cyphertext.
	 * @param message Data to be decrypted.
	 * @returns Whether message was successfully decrypted.
	 */
	public receive (message: Uint8Array) : boolean {
		if (this.isAborted) {
			return false;
		}

		try {
			/* Initial key exchange */
			if (!this.friendKeySet) {
				this.friendKeySet	= {
					sodium: new Uint8Array(Sodium.crypto_box_PUBLICKEYBYTES),
					ntru: new Uint8Array(Ntru.publicKeyLength)
				};

				const encryptedKeys: Uint8Array	= new Uint8Array(
					message.buffer,
					CastleCore.messageIdEndIndex
				);

				try {
					this.importFriendKeySet(
						Sodium.crypto_secretbox_open_easy(
							encryptedKeys,
							this.incomingHandshakeNonce,
							this.sharedSecret
						)
					);
				}
				finally {
					Sodium.memzero(this.sharedSecret);
					Sodium.memzero(this.incomingHandshakeNonce);
				}

				/* Trigger friend's connection acknowledgement logic
					by sending this user's first encrypted message */
				this.send(new Uint8Array(0));

				return true;
			}

			/* Standard incoming message */
			else {
				const decrypted	= this.decrypt(message);

				if (decrypted.keySet === this.keySets[0]) {
					this.shouldRatchetKeys	= true;
				}

				let paddingLengthIndex: number	= CastleCore.flagDataIndex;

				if (decrypted.data[CastleCore.flagIndex] === 1) {
					this.importFriendKeySet(decrypted.data, CastleCore.flagDataIndex);
					paddingLengthIndex += CastleCore.publicKeySetLength;
				}

				const paddingIndex: number	= paddingLengthIndex + 1;

				const messageIndex: number	=
					paddingIndex + decrypted.data[paddingLengthIndex]
				;

				if (decrypted.data.length > messageIndex) {
					this.handlers.receive(decrypted.data, messageIndex);
				}

				if (!this.isConnected) {
					this.isConnected	= true;
					this.handlers.connect();
				}

				return true;
			}
		}
		catch (_) {
			if (!this.isConnected) {
				this.abort();
			}
		}

		return false;
	}

	/**
	 * Send outgoing text.
	 * @param message Data to be encrypted.
	 */
	public send (message: Uint8Array) : void {
		const keySet	= this.keySets[0];

		let publicKeySet: Uint8Array;

		if (this.shouldRatchetKeys) {
			this.shouldRatchetKeys	= false;
			publicKeySet			= this.generateKeySet();

		}

		const paddingLengthIndex: number		=
			CastleCore.flagDataIndex +
			(publicKeySet ? CastleCore.publicKeySetLength : 0)
		;

		const paddingIndex: number		= paddingLengthIndex + 1;

		const paddingLength: Uint8Array	= Sodium.randombytes_buf(1);
		const padding: Uint8Array		= Sodium.randombytes_buf(paddingLength[0]);

		const messageIndex: number		= paddingIndex + padding.length;

		const data: Uint8Array			= new Uint8Array(
			message.length +
			messageIndex
		);

		if (publicKeySet) {
			data[CastleCore.flagIndex]	= 1;
			data.set(publicKeySet, CastleCore.flagDataIndex);
		}

		data.set(paddingLength, paddingLengthIndex);
		data.set(padding, paddingIndex);
		data.set(message, messageIndex);

		try {
			this.handlers.send(this.encrypt(data, keySet));
		}
		finally {
			++this.outgoingMessageId[0];

			Sodium.memzero(data);

			if (publicKeySet) {
				Sodium.memzero(publicKeySet);
			}
		}
	}

	public constructor (
		isCreator: boolean,
		sharedSecret: string,
		private handlers: {
			abort: Function;
			connect: Function;
			receive: (data: Uint8Array, startIndex: number) => void;
			send: (message: string) => void;
		}
	) {
		setTimeout(() => {
			if (!this.isConnected) {
				this.abort();
			}
		}, CastleCore.handshakeTimeout);

		if (isCreator) {
			this.outgoingHandshakeNonce[0]++;
		}
		else {
			this.incomingHandshakeNonce[0]++;
		}

		this.sharedSecret	= Sodium.crypto_pwhash_scryptsalsa208sha256(
			Sodium.crypto_secretbox_KEYBYTES,
			sharedSecret,
			new Uint8Array(Sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES),
			Sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE,
			Sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE
		);

		const publicKeySet: Uint8Array	= this.generateKeySet();

		const encryptedKeys: Uint8Array	= Sodium.crypto_secretbox_easy(
			publicKeySet,
			this.outgoingHandshakeNonce,
			this.sharedSecret
		);

		const cyphertext: Uint8Array	= new Uint8Array(
			CastleCore.messageIdEndIndex +
			encryptedKeys.length
		);

		cyphertext.set(encryptedKeys, CastleCore.messageIdEndIndex);

		try {
			this.handlers.send(Sodium.to_base64(cyphertext));
		}
		finally {
			Sodium.memzero(publicKeySet);
			Sodium.memzero(encryptedKeys);
			Sodium.memzero(cyphertext);
			Sodium.memzero(this.outgoingHandshakeNonce);
		}
	}
}
