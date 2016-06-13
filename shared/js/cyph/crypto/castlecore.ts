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
	 * @returns Whether or not message was successfully decrypted.
	 */
	public async receive (cyphertext: Uint8Array) : Promise<boolean> {
		if (this.isAborted) {
			return false;
		}

		while (!this.keyPairs) {
			await Util.sleep();
		}

		const encryptedData: Uint8Array	= new Uint8Array(cyphertext.buffer, 4);

		/* Initial key exchange */
		if (!this.friendKey) {
			try {
				const plaintext: Uint8Array	= await this.potassium.SecretBox.open(
					encryptedData,
					this.sharedSecret
				);

				Potassium.clearMemory(this.sharedSecret);

				this.friendKey	= plaintext;

				/* Trigger friend's connection acknowledgement logic
					by sending this user's first encrypted message */
				this.send(new Uint8Array(0));

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
					continue;
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

				return true;
			}
			catch (_) {}
		}

		if (!this.isConnected) {
			this.abort();
		}

		return false;
	}

	/**
	 * Send outgoing text.
	 * @param plaintext Data to be encrypted.
	 */
	public async send (plaintext: Uint8Array) : Promise<void> {
		while (!this.keyPairs) {
			await Util.sleep();
		}

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

		fullPlaintext.set(new Uint8Array(this.outgoingMessageId.buffer));
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
		(async () => {
			this.potassium		= new Potassium(isNative);

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

			cyphertext.set(new Uint8Array(this.outgoingMessageId.buffer));
			cyphertext.set(encryptedKey, 4);

			++this.outgoingMessageId[0];

			try {
				this.handlers.send(Potassium.toBase64(cyphertext));
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
		})();
	}
}
