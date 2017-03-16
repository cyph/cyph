import {util} from '../../util';
import {IKeyPairMaybe} from '../ikey-pair-maybe';
import {Potassium} from '../potassium';


/**
 * The core Castle protocol logic.
 */
export class Core {
	/**
	 * Convert newly established shared secret into session keys.
	 * @param potassium
	 * @param isAlice
	 * @param secret
	 */
	public static async newKeys (
		potassium: Potassium,
		isAlice: boolean,
		secret: Uint8Array
	) : Promise<{
		incoming: Uint8Array;
		outgoing: Uint8Array;
	}> {
		const alt: Uint8Array	= await potassium.hash.deriveKey(
			potassium.concatMemory(
				false,
				secret,
				new Uint8Array([1])
			),
			secret.length
		);

		return isAlice ?
			{incoming: secret, outgoing: alt} :
			{incoming: alt, outgoing: secret}
		;
	}


	/** @ignore */
	private readonly ephemeralKeys: IKeyPairMaybe	= {
		privateKey: undefined,
		publicKey: undefined
	};

	/** @ignore */
	private readonly lock: {}	= {};

	/** @ignore */
	private async ratchet (incomingPublicKey?: Uint8Array) : Promise<Uint8Array> {
		let outgoingPublicKey: Uint8Array|undefined;

		/* Part 1: Alice (outgoing) */
		if (this.isAlice && !this.ephemeralKeys.privateKey && !incomingPublicKey) {
			const ephemeralKeyPair			=
				await this.potassium.ephemeralKeyExchange.aliceKeyPair()
			;

			this.ephemeralKeys.privateKey	= ephemeralKeyPair.privateKey;
			outgoingPublicKey				= ephemeralKeyPair.publicKey;
		}

		/* Part 2a: Bob (incoming) */
		else if (!this.isAlice && !this.ephemeralKeys.publicKey && incomingPublicKey) {
			const secretData				=
				await this.potassium.ephemeralKeyExchange.bobSecret(
					incomingPublicKey
				)
			;

			this.ephemeralKeys.publicKey	= secretData.publicKey;

			this.keys.push(await Core.newKeys(
				this.potassium,
				this.isAlice,
				secretData.secret
			));
		}

		/* Part 2b: Bob (outgoing) */
		else if (!this.isAlice && this.ephemeralKeys.publicKey && !incomingPublicKey) {
			outgoingPublicKey				= this.ephemeralKeys.publicKey;
			this.ephemeralKeys.publicKey	= undefined;
		}

		/* Part 3: Alice (incoming) */
		else if (this.isAlice && this.ephemeralKeys.privateKey && incomingPublicKey) {
			const secret: Uint8Array		=
				await this.potassium.ephemeralKeyExchange.aliceSecret(
					incomingPublicKey,
					this.ephemeralKeys.privateKey
				)
			;

			this.potassium.clearMemory(this.ephemeralKeys.privateKey);
			this.ephemeralKeys.privateKey	= undefined;

			this.keys.push(await Core.newKeys(
				this.potassium,
				this.isAlice,
				secret
			));
		}

		if (outgoingPublicKey) {
			return this.potassium.concatMemory(
				true,
				new Uint8Array([1]),
				outgoingPublicKey
			);
		}
		else {
			return new Uint8Array([0]);
		}
	}

	/**
	 * Decrypt incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 * @returns Plaintext.
	 */
	public async decrypt (cyphertext: Uint8Array) : Promise<DataView> {
		const ephemeralKeyExchangePublicKeyBytes	=
			await this.potassium.ephemeralKeyExchange.publicKeyBytes
		;

		return util.lock(this.lock, async () => {
			const messageId: Uint8Array	= new Uint8Array(cyphertext.buffer, 0, 8);
			const encrypted: Uint8Array	= new Uint8Array(cyphertext.buffer, 8);

			let plaintext: DataView|undefined;

			for (let i = this.keys.length - 1 ; i >= 0 ; --i) {
				try {
					const keys	= this.keys[i];

					if (plaintext) {
						this.keys.splice(i, 1);
						this.potassium.clearMemory(keys.incoming);
						this.potassium.clearMemory(keys.outgoing);
						continue;
					}

					const incomingKey: Uint8Array	= await this.potassium.hash.deriveKey(
						keys.incoming
					);

					const decrypted: Uint8Array		= await this.potassium.secretBox.open(
						encrypted,
						incomingKey,
						messageId
					);

					this.potassium.clearMemory(keys.incoming);
					keys.incoming	= incomingKey;

					let startIndex	= 1;
					if (decrypted[0] === 1) {
						await this.ratchet(new Uint8Array(
							decrypted.buffer,
							startIndex,
							ephemeralKeyExchangePublicKeyBytes
						));

						startIndex += ephemeralKeyExchangePublicKeyBytes;
					}

					plaintext	= new DataView(decrypted.buffer, startIndex);
				}
				catch (_) {}
			}

			if (!plaintext) {
				throw new Error('Invalid cyphertext.');
			}

			return plaintext;
		});
	}

	/**
	 * Encrypt outgoing plaintext.
	 * @param plaintext Data to be encrypted.
	 * @param messageId Used to enforce message ordering.
	 * @returns Cyphertext.
	 */
	public async encrypt (
		plaintext: Uint8Array,
		messageId: Uint8Array
	) : Promise<Uint8Array> {
		return util.lock(this.lock, async () => {
			this.keys[0].outgoing	= await this.potassium.hash.deriveKey(
				this.keys[0].outgoing,
				undefined,
				true
			);

			const fullPlaintext: Uint8Array	= this.potassium.concatMemory(
				false,
				await this.ratchet(),
				plaintext
			);

			const cyphertext: Uint8Array	= await this.potassium.secretBox.seal(
				fullPlaintext,
				this.keys[0].outgoing,
				messageId
			);

			this.potassium.clearMemory(fullPlaintext);

			return cyphertext;
		});
	}

	/**
	 * @param potassium
	 * @param isAlice
	 * @param keys Initial state of key ratchet.
	 */
	constructor (
		/** @ignore */
		private readonly potassium: Potassium,

		/** @ignore */
		private readonly isAlice: boolean,

		/** @ignore */
		private readonly keys: {incoming: Uint8Array; outgoing: Uint8Array}[]
	) {}
}
