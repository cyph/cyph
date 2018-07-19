import {IAsyncValue} from '../../iasync-value';
import {LockFunction} from '../../lock-function-type';
import {CastleRatchetState, ICastleRatchetState} from '../../proto';
import {lockFunction} from '../../util/lock';
import {IPotassium} from '../potassium/ipotassium';


/**
 * The core Castle protocol logic.
 */
export class Core {
	/** Convert newly established shared secret into session keys. */
	public static async newSymmetricKeys (
		potassium: IPotassium,
		isAlice: boolean,
		secret: Uint8Array
	) : Promise<CastleRatchetState.SymmetricRatchetState.ISymmetricKeyPair> {
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
	private readonly lock: LockFunction					= lockFunction();

	/** @ignore */
	private oldRatchetState?: ICastleRatchetState;

	/** @ignore */
	private readonly updateRatchetLock: LockFunction	= lockFunction();

	/** @ignore */
	private async asymmetricRatchet (incomingPublicKey?: Uint8Array) : Promise<Uint8Array> {
		let outgoingPublicKey: Uint8Array|undefined;
		let secret: Uint8Array|undefined;

		/* Part 1: Alice (outgoing) */
		if (
			this.isAlice &&
			this.potassium.isEmpty(this.ratchetState.asymmetric.privateKey) &&
			!incomingPublicKey
		) {
			const aliceKeyPair	= await this.potassium.ephemeralKeyExchange.aliceKeyPair();
			outgoingPublicKey	= aliceKeyPair.publicKey;

			this.ratchetState.asymmetric.privateKey	= aliceKeyPair.privateKey;
		}

		/* Part 2a: Bob (incoming) */
		else if (
			!this.isAlice &&
			this.potassium.isEmpty(this.ratchetState.asymmetric.publicKey) &&
			incomingPublicKey
		) {
			const secretData	= await this.potassium.ephemeralKeyExchange.bobSecret(
				incomingPublicKey
			);

			secret	= secretData.secret;

			this.ratchetState.asymmetric.publicKey	= secretData.publicKey;
		}

		/* Part 2b: Bob (outgoing) */
		else if (
			!this.isAlice &&
			!this.potassium.isEmpty(this.ratchetState.asymmetric.publicKey) &&
			!incomingPublicKey
		) {
			outgoingPublicKey	= this.ratchetState.asymmetric.publicKey;

			this.ratchetState.asymmetric.publicKey	= new Uint8Array(0);
		}

		/* Part 3: Alice (incoming) */
		else if (
			this.isAlice &&
			!this.potassium.isEmpty(this.ratchetState.asymmetric.privateKey) &&
			incomingPublicKey
		) {
			secret	= await this.potassium.ephemeralKeyExchange.aliceSecret(
				incomingPublicKey,
				this.ratchetState.asymmetric.privateKey
			);

			this.ratchetState.asymmetric.privateKey	= new Uint8Array(0);
		}

		if (secret) {
			this.ratchetState.symmetric.next	= await Core.newSymmetricKeys(
				this.potassium,
				this.isAlice,
				secret
			);
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

	/** Pushes local ratchet state to ratchetStateAsync. */
	private async updateRatchetState () : Promise<void> {
		await this.updateRatchetLock(async () => {
			if (this.oldRatchetState) {
				if (
					this.oldRatchetState.asymmetric.privateKey !==
					this.ratchetState.asymmetric.privateKey
				) {
					this.potassium.clearMemory(this.oldRatchetState.asymmetric.privateKey);
				}
				if (
					this.oldRatchetState.asymmetric.publicKey !==
					this.ratchetState.asymmetric.publicKey
				) {
					this.potassium.clearMemory(this.oldRatchetState.asymmetric.publicKey);
				}
				if (
					this.oldRatchetState.symmetric.current.incoming !==
					this.ratchetState.symmetric.current.incoming
				) {
					this.potassium.clearMemory(this.oldRatchetState.symmetric.current.incoming);
				}
				if (
					this.oldRatchetState.symmetric.current.outgoing !==
					this.ratchetState.symmetric.current.outgoing
				) {
					this.potassium.clearMemory(this.oldRatchetState.symmetric.current.outgoing);
				}
				if (
					this.oldRatchetState.symmetric.next.incoming !==
					this.ratchetState.symmetric.next.incoming
				) {
					this.potassium.clearMemory(this.oldRatchetState.symmetric.next.incoming);
				}
				if (
					this.oldRatchetState.symmetric.next.outgoing !==
					this.ratchetState.symmetric.next.outgoing
				) {
					this.potassium.clearMemory(this.oldRatchetState.symmetric.next.outgoing);
				}
			}

			this.oldRatchetState	= {
				asymmetric: {...this.ratchetState.asymmetric},
				symmetric: {
					current: {...this.ratchetState.symmetric.current},
					next: {...this.ratchetState.symmetric.next}
				}
			};

			await this.ratchetStateAsync.setValue(this.ratchetState);
		});
	}

	/**
	 * Decrypt incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 * @param plaintextHandler Handles plaintext and blocks uppdating of ratchet state.
	 */
	public async decrypt (
		cyphertext: Uint8Array,
		plaintextHandler: (plaintext: Uint8Array) => Promise<void>
	) : Promise<void> {
		const ephemeralKeyExchangePublicKeyBytes	=
			await this.potassium.ephemeralKeyExchange.publicKeyBytes
		;

		return this.lock(async () => {
			const messageID	= this.potassium.toBytes(cyphertext, 0, 4);
			const encrypted	= this.potassium.toBytes(cyphertext, 4);

			for (const keys of [
				this.ratchetState.symmetric.current,
				this.ratchetState.symmetric.next
			]) {
				try {
					const incomingKey	= await this.potassium.hash.deriveKey(keys.incoming);

					const decrypted		= await this.potassium.secretBox.open(
						encrypted,
						incomingKey,
						messageID
					);

					const startIndex	= decrypted[0] === 1 ?
						ephemeralKeyExchangePublicKeyBytes + 1 :
						1
					;

					const handled		= plaintextHandler(
						this.potassium.toBytes(decrypted, startIndex)
					);

					keys.incoming		= incomingKey;

					if (startIndex !== 1) {
						await this.asymmetricRatchet(this.potassium.toBytes(
							decrypted,
							1,
							ephemeralKeyExchangePublicKeyBytes
						));
					}

					if (keys === this.ratchetState.symmetric.next) {
						this.ratchetState.symmetric.current	= this.ratchetState.symmetric.next;
					}

					handled.then(async () => this.updateRatchetState());

					return;
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

			this.potassium.clearMemory(ratchetData);

			const key	= await this.potassium.hash.deriveKey(
				this.ratchetState.symmetric.current.outgoing
			);

			this.ratchetState.symmetric.current.outgoing	= new Uint8Array(key);

			this.updateRatchetState();

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
		private readonly ratchetState: ICastleRatchetState,

		/** @ignore */
		private readonly ratchetStateAsync: IAsyncValue<ICastleRatchetState>
	) {}
}
