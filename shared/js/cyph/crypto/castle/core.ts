import {IAsyncList} from '../../iasync-list';
import {MaybePromise} from '../../maybe-promise-type';
import {
	CastleRatchetState,
	ICastleRatchetState,
	ICastleRatchetUpdate
} from '../../proto';
import {errorToString} from '../../util/error';
import {getOrSetDefault} from '../../util/get-or-set-default';
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
		const alt = await potassium.hash.deriveKey(
			potassium.concatMemory(false, secret, new Uint8Array([1])),
			secret.length
		);

		return isAlice ?
			{incoming: secret, outgoing: alt} :
			{incoming: alt, outgoing: secret};
	}

	/** @ignore */
	private readonly decryptCache = new Map<
		number,
		{
			encrypted: Uint8Array;
			messageID: number;
			messageIDBytes: Uint8Array;
			plaintextPromise?: Promise<Uint8Array>;
		}
	>();

	/** @ignore */
	private readonly lock = lockFunction();

	/** @ignore */
	private oldRatchetState?: ICastleRatchetState;

	/** @ignore */
	private readonly updateRatchetLock = lockFunction();

	/** @ignore */
	private async asymmetricRatchet (
		incomingPublicKey?: Uint8Array
	) : Promise<Uint8Array> {
		let outgoingPublicKey: Uint8Array | undefined;
		let secret: Uint8Array | undefined;

		/* Part 1: Alice (outgoing) */
		if (
			this.isAlice &&
			this.potassium.isEmpty(this.ratchetState.asymmetric.privateKey) &&
			incomingPublicKey === undefined
		) {
			const aliceKeyPair =
				await this.potassium.ephemeralKeyExchange.aliceKeyPair();
			outgoingPublicKey = aliceKeyPair.publicKey;

			this.ratchetState.asymmetric.privateKey = aliceKeyPair.privateKey;
		}

		/* Part 2a: Bob (incoming) */
		else if (
			!this.isAlice &&
			this.potassium.isEmpty(this.ratchetState.asymmetric.publicKey) &&
			incomingPublicKey !== undefined
		) {
			const secretData =
				await this.potassium.ephemeralKeyExchange.bobSecret(
					incomingPublicKey
				);

			secret = secretData.secret;

			this.ratchetState.asymmetric.publicKey = secretData.publicKey;
		}

		/* Part 2b: Bob (outgoing) */
		else if (
			!this.isAlice &&
			!this.potassium.isEmpty(this.ratchetState.asymmetric.publicKey) &&
			incomingPublicKey === undefined
		) {
			outgoingPublicKey = this.ratchetState.asymmetric.publicKey;

			this.ratchetState.asymmetric.publicKey = new Uint8Array(0);
		}

		/* Part 3: Alice (incoming) */
		else if (
			this.isAlice &&
			!this.potassium.isEmpty(this.ratchetState.asymmetric.privateKey) &&
			incomingPublicKey !== undefined
		) {
			secret = await this.potassium.ephemeralKeyExchange.aliceSecret(
				incomingPublicKey,
				this.ratchetState.asymmetric.privateKey
			);

			this.ratchetState.asymmetric.privateKey = new Uint8Array(0);
		}

		/* eslint-disable-next-line security/detect-possible-timing-attacks */
		if (secret !== undefined) {
			this.ratchetState.symmetric.next = await Core.newSymmetricKeys(
				this.potassium,
				this.isAlice,
				secret
			);
		}

		return outgoingPublicKey !== undefined ?
			this.potassium.concatMemory(
				true,
				new Uint8Array([1]),
				new Uint32Array([outgoingPublicKey.length]),
				outgoingPublicKey
			) :
			new Uint8Array([0]);
	}

	/**
	 * Pushes ratchet state update to queue.
	 */
	private async updateRatchetState (o: {
		cyphertext?: Uint8Array;
		plaintext?: Uint8Array;
	}) : Promise<void> {
		const ratchetState = {
			asymmetric: {...this.ratchetState.asymmetric},
			incomingMessageID: this.ratchetState.incomingMessageID,
			outgoingMessageID: this.ratchetState.outgoingMessageID,
			symmetric: {
				current: {...this.ratchetState.symmetric.current},
				next: {...this.ratchetState.symmetric.next}
			}
		};

		await this.updateRatchetLock(async () => {
			if (this.oldRatchetState !== undefined) {
				if (
					this.oldRatchetState.asymmetric.privateKey !==
					ratchetState.asymmetric.privateKey
				) {
					this.potassium.clearMemory(
						this.oldRatchetState.asymmetric.privateKey
					);
				}
				if (
					this.oldRatchetState.asymmetric.publicKey !==
					ratchetState.asymmetric.publicKey
				) {
					this.potassium.clearMemory(
						this.oldRatchetState.asymmetric.publicKey
					);
				}
				if (
					this.oldRatchetState.symmetric.current.incoming !==
					ratchetState.symmetric.current.incoming
				) {
					this.potassium.clearMemory(
						this.oldRatchetState.symmetric.current.incoming
					);
				}
				if (
					this.oldRatchetState.symmetric.current.outgoing !==
					ratchetState.symmetric.current.outgoing
				) {
					this.potassium.clearMemory(
						this.oldRatchetState.symmetric.current.outgoing
					);
				}
				if (
					this.oldRatchetState.symmetric.next.incoming !==
					ratchetState.symmetric.next.incoming
				) {
					this.potassium.clearMemory(
						this.oldRatchetState.symmetric.next.incoming
					);
				}
				if (
					this.oldRatchetState.symmetric.next.outgoing !==
					ratchetState.symmetric.next.outgoing
				) {
					this.potassium.clearMemory(
						this.oldRatchetState.symmetric.next.outgoing
					);
				}
			}

			this.oldRatchetState = ratchetState;

			await this.ratchetUpdateQueue.pushItem({...o, ratchetState});
		});
	}

	/**
	 * Decrypt incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 */
	public async decrypt (cyphertext: Uint8Array) : Promise<void> {
		const messageID = this.potassium
			.toDataView(cyphertext)
			.getUint32(0, true);

		if (this.ratchetState.incomingMessageID >= messageID) {
			return;
		}

		const setupData =
			this.decryptCache.get(messageID) || this.decryptSetup(cyphertext);
		if (setupData === undefined) {
			return;
		}

		const {encrypted, messageIDBytes} = setupData;

		return this.lock(async () => {
			if (this.ratchetState.incomingMessageID >= messageID) {
				this.decryptCache.delete(messageID);
				return;
			}

			if (messageID - this.ratchetState.incomingMessageID === 1) {
				++this.ratchetState.incomingMessageID;
				this.decryptCache.delete(messageID);
			}
			else {
				throw new Error('Out of order incoming message.');
			}

			let lastErrorMessage = '';

			for (const keys of [
				this.ratchetState.symmetric.current,
				this.ratchetState.symmetric.next
			]) {
				try {
					const incomingKey = await this.potassium.hash.deriveKey(
						keys.incoming
					);

					const decrypted = await this.potassium.secretBox.open(
						encrypted,
						incomingKey,
						messageIDBytes
					);

					const ephemeralKeyExchangePublicKeyBytes =
						decrypted[0] === 1 ?
							this.potassium
								.toDataView(decrypted)
								.getUint32(1, true) :
							undefined;

					const startIndex =
						ephemeralKeyExchangePublicKeyBytes !== undefined ?
							ephemeralKeyExchangePublicKeyBytes + 5 :
							1;

					const plaintext = this.potassium.toBytes(
						decrypted,
						startIndex
					);

					keys.incoming = incomingKey;

					if (ephemeralKeyExchangePublicKeyBytes !== undefined) {
						await this.asymmetricRatchet(
							this.potassium.toBytes(
								decrypted,
								5,
								ephemeralKeyExchangePublicKeyBytes
							)
						);
					}

					if (keys === this.ratchetState.symmetric.next) {
						this.ratchetState.symmetric.current =
							this.ratchetState.symmetric.next;
					}

					this.updateRatchetState({plaintext});
					return;
				}
				catch (err) {
					if (err) {
						lastErrorMessage = errorToString(err);
					}
				}
			}

			throw new Error(`Invalid cyphertext: ${lastErrorMessage}.`);
		});
	}

	/**
	 * Performs and caches decryption steps that don't require lock ownership.
	 * @param cyphertext Data to be decrypted.
	 */
	public decryptSetup (cyphertext: Uint8Array) :
		| undefined
		| {
				encrypted: Uint8Array;
				messageID: number;
				messageIDBytes: Uint8Array;
		  } {
		const messageID = this.potassium
			.toDataView(cyphertext)
			.getUint32(0, true);

		if (this.ratchetState.incomingMessageID >= messageID) {
			return;
		}

		return getOrSetDefault(this.decryptCache, messageID, () => {
			const messageIDBytes = this.potassium.toBytes(cyphertext, 0, 4);
			const encrypted = this.potassium.toBytes(cyphertext, 4);

			return {encrypted, messageID, messageIDBytes};
		});
	}

	/**
	 * Encrypt outgoing plaintext.
	 * @param plaintext Data to be encrypted.
	 * @param getMessageID Callback that gets message ID.
	 */
	public async encrypt (
		plaintext: Uint8Array,
		getMessageID?: (messageID: number) => MaybePromise<void>
	) : Promise<void> {
		await this.lock(async () => {
			const messageID = this.ratchetState.outgoingMessageID;
			const messageIDBytes = new Uint8Array(
				new Uint32Array([messageID]).buffer
			);

			++this.ratchetState.outgoingMessageID;

			if (getMessageID) {
				await getMessageID(messageID);
			}

			const ratchetData = await this.asymmetricRatchet();
			const fullPlaintext = this.potassium.concatMemory(
				false,
				ratchetData,
				plaintext
			);

			this.potassium.clearMemory(ratchetData);

			this.ratchetState.symmetric.current.outgoing =
				await this.potassium.hash.deriveKey(
					this.ratchetState.symmetric.current.outgoing
				);

			this.updateRatchetState({
				cyphertext: this.potassium.concatMemory(
					true,
					messageIDBytes,
					await this.potassium.secretBox.seal(
						fullPlaintext,
						this.ratchetState.symmetric.current.outgoing,
						messageIDBytes
					)
				)
			});
		});
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly isAlice: boolean,

		/** @ignore */
		private readonly ratchetUpdateQueue: IAsyncList<ICastleRatchetUpdate>,

		/** @see ICastleRatchetState */
		public readonly ratchetState: ICastleRatchetState
	) {}
}
