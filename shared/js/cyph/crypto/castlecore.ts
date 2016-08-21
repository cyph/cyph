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

	private lock: {}					= {};
	private outgoingMessageId: number	= 0;

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

	private newMessageId () : Uint8Array {
		return new Uint8Array(new Uint32Array([this.outgoingMessageId++]).buffer);
	}

	/**
	 * Receive incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 * @param shouldLock
	 * @returns Whether or not message was successfully decrypted.
	 */
	public async receive (cyphertext: Uint8Array, shouldLock: boolean = true) : Promise<boolean> {
		return Util.lock(this.lock, async () => {
			if (this.isAborted) {
				return false;
			}

			const encryptedData: Uint8Array	= new Uint8Array(cyphertext.buffer, 4);

			/* Initial key exchange */
			if (!this.friendKey) {
				try {
					this.friendKey	= await this.potassium.SecretBox.open(
						encryptedData,
						this.sharedSecret
					);

					Potassium.clearMemory(this.sharedSecret);

					/* Trigger friend's connection acknowledgement logic
						by sending this user's first encrypted message */
					await this.send(new Uint8Array(0), false);

					return true;
				}
				catch (_) {
					this.abort();
					return false;
				}
			}

			/* Standard incoming message */
			for (let i = 0 ; i < this.keyPairs.length ; ++i) {
				try {
					const keyPair	= this.keyPairs[i];

					const decrypted: Uint8Array	= await this.potassium.Box.open(
						encryptedData,
						this.friendKey,
						keyPair.privateKey
					);

					if (!Potassium.compareMemory(
						new Uint8Array(cyphertext.buffer, 0, 4),
						new Uint8Array(decrypted.buffer, 0, 4)
					)) {
						return false;
					}

					if (i === 0) {
						this.shouldRatchetKeys	= true;
					}

					let startIndex: number	= 5;
					if (decrypted[4] === 1) {
						Potassium.clearMemory(this.friendKey);

						this.friendKey	= new Uint8Array(new Uint8Array(
							decrypted.buffer,
							5,
							this.potassium.Box.publicKeyBytes
						));

						startIndex += this.potassium.Box.publicKeyBytes;
					}

					if (decrypted.length > startIndex) {
						this.handlers.receive(new DataView(decrypted.buffer, startIndex));
					}

					if (!this.isConnected) {
						this.isConnected	= true;
						await this.handlers.connect();
					}

					return true;
				}
				catch (_) {}
			}

			if (!this.isConnected) {
				this.abort();
			}

			return false;
		}, shouldLock);
	}

	/**
	 * Send outgoing text.
	 * @param plaintext Data to be encrypted.
	 * @param shouldLock
	 */
	public async send (plaintext: Uint8Array, shouldLock: boolean = true) : Promise<void> {
		return Util.lock(this.lock, async () => {
			if (this.isAborted) {
				return;
			}

			const messageId: Uint8Array		= this.newMessageId();

			const privateKey: Uint8Array	= this.keyPairs[0].privateKey;
			let newPublicKey: Uint8Array	= new Uint8Array(0);

			if (this.shouldRatchetKeys) {
				this.shouldRatchetKeys	= false;

				this.keyPairs.unshift(await this.potassium.Box.keyPair());

				if (this.keyPairs.length > 2) {
					const oldKeyPair	= this.keyPairs.pop();

					Potassium.clearMemory(oldKeyPair.privateKey);
					Potassium.clearMemory(oldKeyPair.publicKey);
				}

				newPublicKey	= this.keyPairs[0].publicKey;
			}

			const fullPlaintext: Uint8Array	= new Uint8Array(
				5 + newPublicKey.length + plaintext.length
			);

			fullPlaintext.set(messageId);
			fullPlaintext.set(plaintext, 5 + newPublicKey.length);

			if (newPublicKey.length > 0) {
				fullPlaintext[4]	= 1;
				fullPlaintext.set(newPublicKey, 5);
			}

			const cyphertext: Uint8Array	= await this.potassium.Box.seal(
				fullPlaintext,
				this.friendKey,
				privateKey
			);

			const fullCyphertext: Uint8Array	= new Uint8Array(4 + cyphertext.length);
			fullCyphertext.set(messageId);
			fullCyphertext.set(cyphertext, 4);

			const fullCyphertextBase64: string	= Potassium.toBase64(fullCyphertext);

			Potassium.clearMemory(fullPlaintext);
			Potassium.clearMemory(fullCyphertext);
			Potassium.clearMemory(cyphertext);
			Potassium.clearMemory(messageId);

			this.handlers.send(fullCyphertextBase64);
		}, shouldLock);
	}

	public constructor (
		isCreator: boolean,
		sharedSecret: string,
		private handlers: {
			abort: () => Promise<void>;
			connect: () => Promise<void>;
			receive: (data: DataView) => Promise<void>;
			send: (message: string) => Promise<void>;
		},
		isNative: boolean = false
	) {
		Util.lock(this.lock, async () => {
			this.potassium		= new Potassium(isCreator, isNative);

			this.sharedSecret	= (await this.potassium.PasswordHash.hash(
				sharedSecret,
				new Uint8Array(this.potassium.PasswordHash.saltBytes)
			)).hash;

			this.keyPairs		= [await this.potassium.Box.keyPair()];

			const encryptedKey: Uint8Array	= await this.potassium.SecretBox.seal(
				this.keyPairs[0].publicKey,
				this.sharedSecret
			);

			const cyphertext: Uint8Array	= new Uint8Array(
				4 + encryptedKey.length
			);

			cyphertext.set(this.newMessageId());
			cyphertext.set(encryptedKey, 4);

			const cyphertextBase64: string	= Potassium.toBase64(cyphertext);

			Potassium.clearMemory(cyphertext);
			Potassium.clearMemory(encryptedKey);

			setTimeout(() => {
				if (!this.isConnected) {
					this.abort();
				}
			}, CastleCore.handshakeTimeout);

			this.handlers.send(cyphertextBase64);
		});
	}
}
