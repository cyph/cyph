import {IAsyncValue} from '../../iasync-value';
import {util} from '../../util';
import {AsyncBytes} from '../async-bytes';
import {IPotassium} from '../potassium/ipotassium';


/**
 * The core Castle protocol logic.
 */
export class Core {
	/** @ignore */
	private static async newKeys (
		potassium: IPotassium,
		isAlice: boolean,
		secret: Uint8Array
	) : Promise<{
		incoming: Uint8Array;
		outgoing: Uint8Array;
	}> {
		const alt	= await potassium.hash.deriveKey(
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

	/** Convert newly established shared secret into session keys. */
	public static async initLocalKeys (
		potassium: IPotassium,
		isAlice: boolean,
		secret: Uint8Array
	) : Promise<{
		current: {
			incoming: IAsyncValue<Uint8Array>;
			outgoing: IAsyncValue<Uint8Array>;
		};
		previous: {
			incoming: IAsyncValue<Uint8Array|undefined>;
			outgoing: IAsyncValue<Uint8Array|undefined>;
		};
	}> {
		const keys	= await Core.newKeys(potassium, isAlice, secret);

		return {
			current: {
				incoming: new AsyncBytes(keys.incoming),
				outgoing: new AsyncBytes(keys.outgoing)
			},
			previous: {
				incoming: new AsyncBytes<Uint8Array|undefined>(undefined),
				outgoing: new AsyncBytes<Uint8Array|undefined>(undefined)
			}
		};
	}


	/** @ignore */
	private async ratchet (incomingPublicKey?: Uint8Array) : Promise<Uint8Array> {
		let outgoingPublicKey: Uint8Array|undefined;

		const asymmetricKeys	= await (async () => {
			const [privateKey, publicKey]	= await Promise.all([
				this.asymmetricKeys.privateKey.getValue(),
				this.asymmetricKeys.publicKey.getValue()
			]);

			return {privateKey, publicKey};
		})();

		/* Part 1: Alice (outgoing) */
		if (this.isAlice && !asymmetricKeys.privateKey && !incomingPublicKey) {
			const aliceKeyPair	= await this.potassium.ephemeralKeyExchange.aliceKeyPair();
			outgoingPublicKey	= aliceKeyPair.publicKey;
			this.asymmetricKeys.privateKey.setValue(aliceKeyPair.privateKey);
		}

		/* Part 2a: Bob (incoming) */
		else if (!this.isAlice && !asymmetricKeys.publicKey && incomingPublicKey) {
			const secretData	=
				await this.potassium.ephemeralKeyExchange.bobSecret(
					incomingPublicKey
				)
			;

			this.asymmetricKeys.publicKey.setValue(secretData.publicKey);
			await this.setNewKeys(secretData.secret);
		}

		/* Part 2b: Bob (outgoing) */
		else if (!this.isAlice && asymmetricKeys.publicKey && !incomingPublicKey) {
			outgoingPublicKey	= new Uint8Array(asymmetricKeys.publicKey);
			this.asymmetricKeys.publicKey.setValue(undefined);
		}

		/* Part 3: Alice (incoming) */
		else if (this.isAlice && asymmetricKeys.privateKey && incomingPublicKey) {
			const secret	=
				await this.potassium.ephemeralKeyExchange.aliceSecret(
					incomingPublicKey,
					asymmetricKeys.privateKey
				)
			;

			this.asymmetricKeys.privateKey.setValue(undefined);
			await this.setNewKeys(secret);
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
	 * Replaces keys.previous with the values of keys.current and keys.current
	 * with a new set of keys derived from the secret using Core.newKeys.
	 */
	private async setNewKeys (secret: Uint8Array) : Promise<void> {
		const newKeys	= await Core.newKeys(this.potassium, this.isAlice, secret);

		const [oldIncoming, oldOutgoing]	= await Promise.all([
			this.symmetricKeys.current.incoming.getValue(),
			this.symmetricKeys.current.outgoing.getValue()
		]);

		this.symmetricKeys.previous.incoming.setValue(new Uint8Array(oldIncoming));
		this.symmetricKeys.previous.outgoing.setValue(new Uint8Array(oldOutgoing));
		this.symmetricKeys.current.incoming.setValue(newKeys.incoming);
		this.symmetricKeys.current.outgoing.setValue(newKeys.outgoing);
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

		return this.lock(async () => {
			const messageId	= new Uint8Array(cyphertext.buffer, cyphertext.byteOffset, 8);
			const encrypted	= new Uint8Array(cyphertext.buffer, cyphertext.byteOffset + 8);

			for (const keys of [this.symmetricKeys.current, this.symmetricKeys.previous]) {
				try {
					const key			= await keys.incoming.getValue();

					if (!key) {
						continue;
					}

					const incomingKey	= await this.potassium.hash.deriveKey(key);

					const decrypted		= await this.potassium.secretBox.open(
						encrypted,
						incomingKey,
						messageId
					);

					keys.incoming.setValue(incomingKey);

					let startIndex	= 1;
					if (decrypted[0] === 1) {
						await this.ratchet(new Uint8Array(
							decrypted.buffer,
							startIndex,
							ephemeralKeyExchangePublicKeyBytes
						));

						startIndex += ephemeralKeyExchangePublicKeyBytes;
					}
					else if (keys === this.symmetricKeys.current) {
						this.symmetricKeys.previous.incoming.setValue(undefined);
						this.symmetricKeys.previous.outgoing.setValue(undefined);
					}

					return new DataView(decrypted.buffer, startIndex);
				}
				catch (_) {}
			}

			throw new Error('Invalid cyphertext.');
		});
	}

	/**
	 * Encrypt outgoing plaintext.
	 * @param plaintext Data to be encrypted.
	 * @param messageId Used to enforce message ordering.
	 * @returns Cyphertext.
	 */
	public async encrypt (plaintext: Uint8Array, messageId: Uint8Array) : Promise<Uint8Array> {
		const o	= await this.lock(async () => {
			for (const keys of [this.symmetricKeys.previous, this.symmetricKeys.current]) {
				const oldKey	= await keys.outgoing.getValue();
				if (oldKey) {
					keys.outgoing.setValue(await this.potassium.hash.deriveKey(oldKey));
					break;
				}
			}

			const fullPlaintext		= this.potassium.concatMemory(
				false,
				await this.ratchet(),
				plaintext
			);

			const key	= new Uint8Array(
				await this.symmetricKeys.previous.outgoing.getValue().then(value =>
					value || this.symmetricKeys.current.outgoing.getValue()
				)
			);

			return {fullPlaintext, key};
		});

		const cyphertext	= await this.potassium.secretBox.seal(
			o.fullPlaintext,
			o.key,
			messageId
		);

		this.potassium.clearMemory(o.key);
		this.potassium.clearMemory(o.fullPlaintext);

		return cyphertext;
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly isAlice: boolean,

		/** State of the symmetric (forward-secret) ratchet. */
		private readonly symmetricKeys: {
			current: {
				incoming: IAsyncValue<Uint8Array>;
				outgoing: IAsyncValue<Uint8Array>;
			};
			previous: {
				incoming: IAsyncValue<Uint8Array|undefined>;
				outgoing: IAsyncValue<Uint8Array|undefined>;
			};
		},

		/** State of the asymmetric (future-secret) ratchet. */
		private readonly asymmetricKeys: {
			privateKey: IAsyncValue<Uint8Array|undefined>;
			publicKey: IAsyncValue<Uint8Array|undefined>;
		} = {
			privateKey: new AsyncBytes<Uint8Array|undefined>(undefined),
			publicKey: new AsyncBytes<Uint8Array|undefined>(undefined)
		},

		/** Lock function. */
		private readonly lock: <T>(f: () => Promise<T>) => Promise<T> = (() => {
			const localLock	= {};
			return async <T> (f: () => Promise<T>) => util.lock(localLock, f);
		})()
	) {}
}
