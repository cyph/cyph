import {LockFunction} from '../../lock-function-type';
import {lockFunction} from '../../util/lock';
import {IPotassium} from '../potassium/ipotassium';
import {IAsymmetricRatchetState} from './iasymmetric-ratchet-state';
import {ISymmetricRatchetState} from './isymmetric-ratchet-state';


/**
 * The core Castle protocol logic.
 */
export class Core {
	/** Convert newly established shared secret into session keys. */
	public static async newSymmetricKeys (
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


	/** @ignore */
	private readonly lock: LockFunction	= lockFunction();

	/** @ignore */
	private async asymmetricRatchet (incomingPublicKey?: Uint8Array) : Promise<Uint8Array> {
		let outgoingPublicKey: Uint8Array|undefined;
		let secret: Uint8Array|undefined;

		const asymmetricKeys	= await (async () => {
			const [privateKey, publicKey]	= await Promise.all([
				this.asymmetricRatchetState.privateKey.getValue(),
				this.asymmetricRatchetState.publicKey.getValue()
			]);

			return {privateKey, publicKey};
		})();

		/* Part 1: Alice (outgoing) */
		if (this.isAlice && !asymmetricKeys.privateKey && !incomingPublicKey) {
			const aliceKeyPair	= await this.potassium.ephemeralKeyExchange.aliceKeyPair();
			outgoingPublicKey	= aliceKeyPair.publicKey;
			this.asymmetricRatchetState.privateKey.setValue(aliceKeyPair.privateKey);
		}

		/* Part 2a: Bob (incoming) */
		else if (!this.isAlice && !asymmetricKeys.publicKey && incomingPublicKey) {
			const secretData	=
				await this.potassium.ephemeralKeyExchange.bobSecret(
					incomingPublicKey
				)
			;

			secret	= secretData.secret;
			this.asymmetricRatchetState.publicKey.setValue(secretData.publicKey);
		}

		/* Part 2b: Bob (outgoing) */
		else if (!this.isAlice && asymmetricKeys.publicKey && !incomingPublicKey) {
			outgoingPublicKey	= new Uint8Array(asymmetricKeys.publicKey);
			this.asymmetricRatchetState.publicKey.setValue(undefined);
		}

		/* Part 3: Alice (incoming) */
		else if (this.isAlice && asymmetricKeys.privateKey && incomingPublicKey) {
			secret	=
				await this.potassium.ephemeralKeyExchange.aliceSecret(
					incomingPublicKey,
					asymmetricKeys.privateKey
				)
			;

			this.asymmetricRatchetState.privateKey.setValue(undefined);
		}

		if (secret) {
			const newKeys	= await Core.newSymmetricKeys(this.potassium, this.isAlice, secret);
			this.symmetricRatchetState.next.incoming.setValue(newKeys.incoming);
			this.symmetricRatchetState.next.outgoing.setValue(newKeys.outgoing);
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
	public async decrypt (cyphertext: Uint8Array) : Promise<Uint8Array> {
		const ephemeralKeyExchangePublicKeyBytes	=
			await this.potassium.ephemeralKeyExchange.publicKeyBytes
		;

		return this.lock(async () => {
			const messageID	= this.potassium.toBytes(cyphertext, 0, 4);
			const encrypted	= this.potassium.toBytes(cyphertext, 4);

			for (const keys of [
				this.symmetricRatchetState.current,
				this.symmetricRatchetState.next
			]) {
				try {
					const incomingKey	= await this.potassium.hash.deriveKey(
						await keys.incoming.getValue()
					);

					const decrypted		= await this.potassium.secretBox.open(
						encrypted,
						incomingKey,
						messageID
					);

					keys.incoming.setValue(incomingKey);

					let startIndex	= 1;
					if (decrypted[0] === 1) {
						await this.asymmetricRatchet(this.potassium.toBytes(
							decrypted,
							startIndex,
							ephemeralKeyExchangePublicKeyBytes
						));

						startIndex += ephemeralKeyExchangePublicKeyBytes;
					}

					if (keys === this.symmetricRatchetState.next) {
						const [nextIncoming, nextOutgoing]	= await Promise.all([
							this.symmetricRatchetState.next.incoming.getValue(),
							this.symmetricRatchetState.next.outgoing.getValue()
						]);

						this.symmetricRatchetState.current.incoming.setValue(
							new Uint8Array(nextIncoming)
						);
						this.symmetricRatchetState.current.outgoing.setValue(
							new Uint8Array(nextOutgoing)
						);
					}

					return this.potassium.toBytes(decrypted, startIndex);
				}
				catch {}
			}

			throw new Error('Invalid cyphertext.');
		});
	}

	/**
	 * Encrypt outgoing plaintext.
	 * @param plaintext Data to be encrypted.
	 * @param messageID Used to enforce message ordering.
	 * @returns Cyphertext.
	 */
	public async encrypt (plaintext: Uint8Array, messageID: Uint8Array) : Promise<Uint8Array> {
		const o	= await this.lock(async () => {
			const ratchetData	= await this.asymmetricRatchet();
			const fullPlaintext	= this.potassium.concatMemory(false, ratchetData, plaintext);

			const key			= await this.potassium.hash.deriveKey(
				await this.symmetricRatchetState.current.outgoing.getValue()
			);

			this.symmetricRatchetState.current.outgoing.setValue(new Uint8Array(key));
			this.potassium.clearMemory(ratchetData);

			return {fullPlaintext, key};
		});

		const cyphertext	= await this.potassium.secretBox.seal(
			o.fullPlaintext,
			o.key,
			messageID
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

		/** @ignore */
		private readonly symmetricRatchetState: ISymmetricRatchetState,

		/** @ignore */
		private readonly asymmetricRatchetState: IAsymmetricRatchetState
	) {}
}
