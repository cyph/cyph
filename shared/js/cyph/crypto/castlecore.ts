import {Potassium} from 'potassium';
import {Util} from 'cyph/util';


/**
 * The Castle encryption protocol. This version supports an OTR-like
 * feature set, with group/async/persistence coming later.
 */
export class CastleCore {
	private static handshakeTimeout: number	= 90000;


	private isAborted: boolean;
	private isConnected: boolean;
	private shouldRatchetKeys: boolean;
	private friendKey: Uint8Array;
	private sharedSecret: Uint8Array;
	private keyPairs: {publicKey: Uint8Array; privateKey: Uint8Array}[];
	private potassium: Potassium;

	public outgoingMessageId: Uint32Array	= new Uint32Array([0]);

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

	/**
	 * Receive incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 * @param callback Used to communicate whether message was successfully decrypted.
	 */
	public receive (
		cyphertext: Uint8Array,
		callback: (succcess: boolean) => void
	) : void {
		if (this.isAborted) {
			callback(false);
			return;
		}

		const encryptedData: Uint8Array	= new Uint8Array(cyphertext.buffer, 4);

		/* Initial key exchange */
		if (!this.friendKey) {
			this.potassium.SecretBox.open(
				encryptedData,
				this.sharedSecret,
				(plaintext: Uint8Array, err: any) => {
					try {
						if (err) {
							this.abort();
							callback(false);
							return;
						}

						this.friendKey	= plaintext;

						/* Trigger friend's connection acknowledgement logic
							by sending this user's first encrypted message */
						this.send(new Uint8Array(0));

						callback(true);
					}
					finally {
						Potassium.clearMemory(this.sharedSecret);
					}
				}
			);

			return;
		}

		/* Standard incoming message */
		let i: number	= 0;
		Util.retryUntilComplete(retry => {
			if (i >= this.keyPairs.length) {
				if (!this.isConnected) {
					this.abort();
				}

				callback(false);
				return;
			}

			const next		= () => {
				++i;
				retry(-1);
			};

			const keyPair	= this.keyPairs[i];

			this.potassium.Box.open(
				encryptedData,
				this.friendKey,
				keyPair.privateKey,
				(decrypted: Uint8Array, err: any) => {
					if (err || !Potassium.compareMemory(
						new Uint8Array(cyphertext.buffer, 0, 4),
						new Uint8Array(decrypted.buffer, 0, 4)
					)) {
						next();
						return;
					}

					if (i === 0) {
						this.shouldRatchetKeys	= true;
					}

					let startIndex: number	= 5;
					if (decrypted[4] === 1) {
						this.friendKey	= new Uint8Array(new Uint8Array(
							decrypted.buffer,
							5,
							this.potassium.Box.publicKeyBytes
						));

						startIndex += this.potassium.Box.publicKeyBytes;
					}

					if (decrypted.length > startIndex) {
						this.handlers.receive(decrypted, startIndex);
					}

					if (!this.isConnected) {
						this.isConnected	= true;
						this.handlers.connect();
					}

					callback(true);
				}
			);
		});
	}

	/**
	 * Send outgoing text.
	 * @param plaintext Data to be encrypted.
	 */
	public send (plaintext: Uint8Array) : void {
		const encryptData	= (privateKey: Uint8Array, newPublicKey: Uint8Array) => {
			const fullPlaintext: Uint8Array	= new Uint8Array(
				5 + newPublicKey.length + plaintext.length
			);

			fullPlaintext.set(new Uint8Array(this.outgoingMessageId.buffer));
			fullPlaintext.set(plaintext, 5 + newPublicKey.length);

			if (newPublicKey.length > 0) {
				fullPlaintext[4]	= 1;
				fullPlaintext.set(newPublicKey, 5);
			}

			this.potassium.Box.seal(
				fullPlaintext,
				this.friendKey,
				privateKey,
				(cyphertext: Uint8Array, err: any) => {
					if (err) {
						return;
					}

					let fullCyphertext: Uint8Array;
					try {
						fullCyphertext	= new Uint8Array(4 + cyphertext.length);
						fullCyphertext.set(new Uint8Array(this.outgoingMessageId.buffer));
						fullCyphertext.set(cyphertext, 4);
						this.handlers.send(Potassium.toBase64(fullCyphertext));
					}
					finally {
						++this.outgoingMessageId[0];

						Potassium.clearMemory(fullPlaintext);
						Potassium.clearMemory(cyphertext);

						if (fullCyphertext) {
							Potassium.clearMemory(fullCyphertext);
						}
					}
				}
			);
		};

		if (this.shouldRatchetKeys) {
			this.shouldRatchetKeys	= false;
			this.potassium.Box.keyPair(keyPair => {
				this.keyPairs.unshift(keyPair);

				if (this.keyPairs.length > 2) {
					const oldKeyPair	= this.keyPairs.pop();

					Potassium.clearMemory(oldKeyPair.privateKey);
					Potassium.clearMemory(oldKeyPair.publicKey);
				}

				encryptData(this.keyPairs[1].privateKey, this.keyPairs[0].publicKey);
			});
		}
		else {
			encryptData(this.keyPairs[0].privateKey, new Uint8Array(0));
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
		},
		isNative: boolean = false
	) {
		this.potassium	= new Potassium(isNative);

		this.potassium.PasswordHash.hash(
			sharedSecret,
			new Uint8Array(this.potassium.PasswordHash.saltBytes),
			undefined,
			undefined,
			undefined,
			(_: Uint8Array, hash: Uint8Array) => {
				this.sharedSecret	= hash;

				this.potassium.Box.keyPair(keyPair => {
					this.keyPairs	= [keyPair];

					this.potassium.SecretBox.seal(
						this.keyPairs[0].publicKey,
						this.sharedSecret,
						(encryptedKey: Uint8Array) => {
							const cyphertext: Uint8Array	= new Uint8Array(
								4 + encryptedKey.length
							);

							cyphertext.set(new Uint8Array(this.outgoingMessageId.buffer));
							cyphertext.set(encryptedKey, 4);

							++this.outgoingMessageId[0];

							try {
								this.handlers.send(
									Potassium.toBase64(cyphertext)
								);
							}
							finally {
								Potassium.clearMemory(cyphertext);
								Potassium.clearMemory(encryptedKey);

								setTimeout(() => {
									if (!this.isConnected) {
										this.abort();
									}
								}, CastleCore.handshakeTimeout);
							}
						}
					);
				});
			}
		);
	}
}
