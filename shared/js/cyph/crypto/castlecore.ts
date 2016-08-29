import {Potassium} from 'potassium';
import {Util} from 'cyph/util';


/**
 * The core Castle encryption protocol logic. The design is based on
 * Signal, with additional properties such as quantum resistance.
 */
export class CastleCore {
	private static handshakeTimeout: number	= 90000;


	private isAborted: boolean;
	private isConnected: boolean;
	private potassium: Potassium;

	private ephemeralKeys: {
		public: Uint8Array;
		private: Uint8Array;
	}	= {
		public: null,
		private: null
	};

	private keys: {
		incoming: Uint8Array;
		outgoing: Uint8Array;
	}[]	= [];

	private handshakeData: {
		publicKey: Uint8Array;
		privateKey: Uint8Array;
		sharedSecret: Uint8Array;
	}	= {
		publicKey: null,
		privateKey: null,
		sharedSecret: null
	};

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

	private async addNewKey (newKey: Uint8Array) : Promise<void> {
		const altNewKey: Uint8Array	= await this.potassium.Hash.deriveKey(
			Potassium.concatMemory(
				false,
				newKey,
				new Uint8Array([1])
			),
			newKey.length
		);

		this.keys.push(
			this.isCreator ?
				{incoming: newKey, outgoing: altNewKey} :
				{incoming: altNewKey, outgoing: newKey}
		);
	}

	private async connect () : Promise<void> {
		this.isConnected	= true;

		/* Trigger friend's connection acknowledgement logic
			by sending our first encrypted message */
		await this.send(new Uint8Array(0), false);

		await this.handlers.connect();
	}

	private async handshake (cyphertext: Uint8Array) : Promise<void> {
		if (!this.handshakeData) {
			throw 'Handshake has not been initiated.';
		}

		/* Part 1: Both */
		if (this.handshakeData.sharedSecret) {
			this.handshakeData.publicKey	= await this.potassium.SecretBox.open(
				cyphertext,
				this.handshakeData.sharedSecret
			);

			Potassium.clearMemory(this.handshakeData.sharedSecret);
			this.handshakeData.sharedSecret	= null;

			if (!this.isCreator) {
				return;
			}

			/* Part 1a: Alice */

			const secret: Uint8Array	= Potassium.randomBytes(
				this.potassium.EphemeralKeyExchange.secretBytes
			);

			await this.addNewKey(secret);

			this.sendBase(await this.potassium.Box.seal(
				secret,
				this.handshakeData.publicKey,
				this.handshakeData.privateKey
			));
		}

		/* Part 2: Bob */
		else {
			await this.addNewKey(await this.potassium.Box.open(
				cyphertext,
				this.handshakeData.publicKey,
				this.handshakeData.privateKey
			));

			await this.connect();
		}

		Potassium.clearMemory(this.handshakeData.privateKey);
		Potassium.clearMemory(this.handshakeData.publicKey);
		this.handshakeData	= null;
	}

	private newMessageId () : Uint8Array {
		return new Uint8Array(new Uint32Array([this.outgoingMessageId++]).buffer);
	}

	private async ratchet (incomingPublicKey?: Uint8Array) : Promise<Uint8Array> {
		let outgoingPublicKey: Uint8Array;

		/* Part 1: Alice (outgoing) */
		if (this.isCreator && !this.ephemeralKeys.private && !incomingPublicKey) {
			const ephemeralKeyPair		=
				await this.potassium.EphemeralKeyExchange.aliceKeyPair()
			;

			this.ephemeralKeys.private	= ephemeralKeyPair.privateKey;
			outgoingPublicKey			= ephemeralKeyPair.publicKey;
		}

		/* Part 2a: Bob (incoming) */
		else if (!this.isCreator && !this.ephemeralKeys.public && incomingPublicKey) {
			const secretData			= await this.potassium.EphemeralKeyExchange.bobSecret(
				incomingPublicKey
			);

			this.ephemeralKeys.public	= secretData.publicKey;

			await this.addNewKey(secretData.secret);
		}

		/* Part 2b: Bob (outgoing) */
		else if (!this.isCreator && this.ephemeralKeys.public && !incomingPublicKey) {
			outgoingPublicKey			= this.ephemeralKeys.public;
			this.ephemeralKeys.public	= null;
		}

		/* Part 3: Alice (incoming) */
		else if (this.isCreator && this.ephemeralKeys.private && incomingPublicKey) {
			const secret: Uint8Array	= await this.potassium.EphemeralKeyExchange.aliceSecret(
				incomingPublicKey,
				this.ephemeralKeys.private
			);

			Potassium.clearMemory(this.ephemeralKeys.private);
			this.ephemeralKeys.private	= null;

			await this.addNewKey(secret);
		}

		if (outgoingPublicKey) {
			return Potassium.concatMemory(
				true,
				new Uint8Array([1]),
				outgoingPublicKey
			);
		}
		else {
			return new Uint8Array([0]);
		}
	}

	private sendBase (
		data: Uint8Array,
		messageId: Uint8Array = this.newMessageId()
	) : void {
		const cyphertext: Uint8Array	= Potassium.concatMemory(
			true,
			messageId,
			data
		);

		const cyphertextBase64: string	= Potassium.toBase64(cyphertext);

		Potassium.clearMemory(cyphertext);

		this.handlers.send(cyphertextBase64);
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

			const messageId: Uint8Array	= new Uint8Array(cyphertext.buffer, 0, 4);
			const encrypted: Uint8Array	= new Uint8Array(cyphertext.buffer, 4);

			/* Initial handshake */
			if (this.keys.length === 0) {
				try {
					await this.handshake(encrypted);
					return true;
				}
				catch (_) {
					this.abort();
					return false;
				}
			}

			let success: boolean	= false;

			/* Standard incoming message */
			for (let i = this.keys.length - 1 ; i >= 0 ; --i) {
				try {
					const keys	= this.keys[i];

					if (success) {
						this.keys.splice(i, 1);
						Potassium.clearMemory(keys.incoming);
						Potassium.clearMemory(keys.outgoing);
						continue;
					}

					const incomingKey: Uint8Array	= await this.potassium.Hash.deriveKey(
						keys.incoming
					);

					const decrypted: Uint8Array		= await this.potassium.SecretBox.open(
						encrypted,
						incomingKey,
						messageId
					);

					Potassium.clearMemory(keys.incoming);
					keys.incoming	= incomingKey;

					let startIndex: number	= 1;
					if (decrypted[0] === 1) {
						await this.ratchet(new Uint8Array(
							decrypted.buffer,
							startIndex,
							this.potassium.EphemeralKeyExchange.publicKeyBytes
						));

						startIndex += this.potassium.EphemeralKeyExchange.publicKeyBytes;
					}

					if (decrypted.length > startIndex) {
						this.handlers.receive(new DataView(decrypted.buffer, startIndex));
					}

					success	= true;
				}
				catch (_) {}
			}

			if (!this.isConnected) {
				if (success) {
					await this.connect();
				}
				else {
					this.abort();
				}
			}

			return success;
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

			this.keys[0].outgoing			= await this.potassium.Hash.deriveKey(
				this.keys[0].outgoing,
				undefined,
				true
			);

			const fullPlaintext: Uint8Array	= Potassium.concatMemory(
				false,
				await this.ratchet(),
				plaintext
			);

			this.sendBase(
				await this.potassium.SecretBox.seal(
					fullPlaintext,
					this.keys[0].outgoing,
					messageId
				),
				messageId
			);

			Potassium.clearMemory(fullPlaintext);
		}, shouldLock);
	}

	public constructor (
		private isCreator: boolean,
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
			this.potassium		= new Potassium(this.isCreator, isNative);

			const keyPair		= await this.potassium.Box.keyPair();

			this.handshakeData.privateKey	= keyPair.privateKey;

			this.handshakeData.sharedSecret	= (await this.potassium.PasswordHash.hash(
				sharedSecret,
				new Uint8Array(this.potassium.PasswordHash.saltBytes)
			)).hash;

			this.sendBase(await this.potassium.SecretBox.seal(
				keyPair.publicKey,
				this.handshakeData.sharedSecret
			));

			Potassium.clearMemory(keyPair.publicKey);

			setTimeout(() => {
				if (!this.isConnected) {
					this.abort();
				}
			}, CastleCore.handshakeTimeout);
		});
	}
}
