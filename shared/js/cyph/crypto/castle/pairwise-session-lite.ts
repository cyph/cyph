/* eslint-disable max-lines */

import {IAsyncList} from '../../iasync-list';
import {IAsyncValue} from '../../iasync-value';
import {LocalAsyncList} from '../../local-async-list';
import {LocalAsyncValue} from '../../local-async-value';
import {LockFunction} from '../../lock-function-type';
import {
	BinaryProto,
	ICastleRatchetState,
	ICastleRatchetUpdate
} from '../../proto';
import {DataManagerService} from '../../service-interfaces/data-manager.service';
import {debugLog, debugLogError} from '../../util/log';
import {lockFunction} from '../../util/lock';
import {resolvable, retryUntilSuccessful} from '../../util/wait';
import {IPotassium} from '../potassium/ipotassium';
import {HandshakeSteps} from './enums';
import {ICastleIncomingMessages} from './icastle-incoming-messages';
import {IHandshakeState} from './ihandshake-state';
import {ILocalUser} from './ilocal-user';
import {IPairwiseSession} from './ipairwise-session';
import {IRemoteUser} from './iremote-user';
import {Transport} from './transport';

/**
 * Represents a pairwise (one-to-one) Castle session with no ratcheting.
 */
export class PairwiseSessionLite implements IPairwiseSession {
	/** @ignore */
	private readonly instanceID = this.potassium.randomBytes(16);

	/** @ignore */
	private readonly key =
		this.secretCache !== undefined && this.secretCacheKey !== undefined ?
			this.secretCache.getOrSetDefault(
				`PairwiseSessionLite-secretCache:${this.secretCacheKey}`,
				BinaryProto,
				async () => retryUntilSuccessful(async () => this.getKey())
			) :
			this.getKey();

	/** @inheritDoc */
	public readonly ready = resolvable();

	/** @ignore */
	private async getKey () : Promise<Uint8Array> {
		let secret = await this.handshakeState.initialSecret.getValue();
		const handshakeStep = await this.handshakeState.currentStep.getValue();

		if (secret === undefined && handshakeStep === HandshakeSteps.Complete) {
			throw new Error('Failed to get secret from completed handshake.');
		}

		if (this.handshakeState.isAlice) {
			if (secret === undefined) {
				secret = await this.potassium.secretBox.generateKey();

				await this.handshakeState.initialSecret.setValue(secret);
			}

			if (handshakeStep !== HandshakeSteps.Complete) {
				const [signingKeyPair, publicEncryptionKey] = await Promise.all(
					[
						this.localUser.getSigningKeyPair(),
						this.remoteUser.getPublicEncryptionKey()
					]
				);

				await this.handshakeState.initialSecretCyphertext.setValue(
					await this.potassium.box.seal(
						signingKeyPair !== undefined ?
							await this.potassium.sign.sign(
								secret,
								signingKeyPair.privateKey
							) :
							secret,
						publicEncryptionKey
					)
				);
			}
		}
		else if (secret === undefined) {
			const [encryptionKeyPair, publicSigningKey, cyphertext] =
				await Promise.all([
					this.localUser.getEncryptionKeyPair(),
					this.remoteUser.getPublicSigningKey(),
					this.handshakeState.initialSecretCyphertext.getValue()
				]);

			const maybeSignedSecret = await this.potassium.box.open(
				cyphertext,
				encryptionKeyPair
			);

			secret =
				publicSigningKey !== undefined ?
					await this.potassium.sign.open(
						maybeSignedSecret,
						publicSigningKey
					) :
					maybeSignedSecret;

			await this.handshakeState.initialSecret.setValue(secret);
		}

		if (handshakeStep !== HandshakeSteps.Complete) {
			await this.handshakeState.currentStep.setValue(
				HandshakeSteps.Complete
			);
		}

		return secret;
	}

	/** @inheritDoc */
	public async receive (
		cyphertext: Uint8Array,
		initial: boolean
	) : Promise<void> {
		try {
			await this.transport.process(this.remoteUser.username, initial, {
				plaintext: await this.potassium.secretBox.open(
					cyphertext,
					await this.key
				)
			});
		}
		catch (err) {
			debugLogError(async () => ({
				pairwiseSessionLiteReceiveFailure: {
					cyphertext: this.potassium.toHex(cyphertext),
					key: this.potassium.toHex(await this.key)
				}
			}));

			throw err;
		}
	}

	/** @inheritDoc */
	public async send (
		plaintext: string | ArrayBufferView,
		timestamp: number
	) : Promise<void> {
		const plaintextBytes = this.potassium.fromString(plaintext);
		const timestampBytes = new Float64Array([timestamp]);

		const outgoingMessage = this.potassium.concatMemory(
			false,
			timestampBytes,
			this.instanceID,
			plaintextBytes
		);

		this.potassium.clearMemory(plaintextBytes);
		this.potassium.clearMemory(timestampBytes);

		const cyphertext = await this.potassium.secretBox.seal(
			outgoingMessage,
			await this.key
		);

		debugLog(async () => ({
			pairwiseSessionLiteSend: {
				cyphertext: this.potassium.toHex(cyphertext)
			}
		}));

		await this.transport.process(this.remoteUser.username, false, {
			cyphertext
		});
	}

	constructor (
		/** @ignore */
		private readonly secretCacheKey: string | undefined,

		/** @ignore */
		private readonly secretCache: DataManagerService | undefined,

		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly transport: Transport,

		/** @ignore */
		private readonly localUser: ILocalUser,

		/** @ignore */
		private readonly remoteUser: IRemoteUser,

		/** @ignore */
		private readonly handshakeState: IHandshakeState,

		/** @ignore */
		protected readonly _INCOMING_MESSAGES: IAsyncValue<ICastleIncomingMessages> = new LocalAsyncValue<ICastleIncomingMessages>(
			{max: 0, queue: {}}
		),
		/** @ignore */
		protected readonly _OUTGOING_MESSAGE_QUEUE: IAsyncList<Uint8Array> = new LocalAsyncList(
			[]
		),

		/** @ignore */
		protected readonly _LOCK: LockFunction = lockFunction(),

		/** @ignore */
		protected readonly _RATCHET_STATE: IAsyncValue<ICastleRatchetState> = new LocalAsyncValue<ICastleRatchetState>(
			{
				asymmetric: {
					privateKey: new Uint8Array(0),
					publicKey: new Uint8Array(0)
				},
				incomingMessageID: 0,
				outgoingMessageID: 1,
				symmetric: {
					current: {
						incoming: new Uint8Array(0),
						outgoing: new Uint8Array(0)
					},
					next: {
						incoming: new Uint8Array(0),
						outgoing: new Uint8Array(0)
					}
				}
			}
		),
		/** @ignore */
		protected readonly _RATCHET_UPDATE_QUEUE: IAsyncList<ICastleRatchetUpdate> = new LocalAsyncList(
			[]
		)
	) {
		this.key
			.then(async key => {
				this.transport.setSymmetricKey(key);
				await this.transport.connect();
				this.ready.resolve();
			})
			.catch(async () => this.transport.abort());

		debugLog(async () => ({
			pairwiseSessionLiteInit: {
				key: this.potassium.toHex(await this.key),
				remoteUser: remoteUser.username,
				secretCacheKey
			}
		}));
	}
}
