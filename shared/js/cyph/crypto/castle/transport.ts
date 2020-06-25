import {Observable} from 'rxjs';
import {ISessionService} from '../../service-interfaces/isession.service';
import {CastleEvents} from '../../session/enums';
import {filterUndefined} from '../../util/filter';
import {debugLog} from '../../util/log';
import {potassiumUtil} from '../potassium/potassium-util';

/**
 * Handles transport layer logic.
 * Note that each PairwiseSession must have a unique Transport instance.
 */
export class Transport {
	/** @ignore */
	private static readonly cyphertextLimit: number = 200000;

	/** Triggers abortion event. */
	public async abort () : Promise<void> {
		await this.sessionService.castleHandler(CastleEvents.abort);
	}

	/** @see ISessionService.closed */
	public get closed () : Promise<void> {
		return this.sessionService.closed;
	}

	/** Triggers connection event. */
	public async connect () : Promise<void> {
		await this.sessionService.castleHandler(CastleEvents.connect);
	}

	/** Indicates whether or not this transport is still usable. */
	public get isAlive () : boolean {
		return this.sessionService.state.isAlive.value;
	}

	/** Trigger event for logging cyphertext. */
	public logCyphertext (
		author: Observable<string>,
		cyphertext: Uint8Array
	) : void {
		if (cyphertext.length >= Transport.cyphertextLimit) {
			return;
		}

		this.sessionService.cyphertext.next({author, cyphertext});
	}

	/** Send and/or receive incoming and outgoing messages. */
	public async process (
		author: Observable<string>,
		initial: boolean,
		...messages: {
			cyphertext?: Uint8Array;
			plaintext?: Uint8Array;
		}[]
	) : Promise<void> {
		debugLog(() => ({
			pairwiseSessionProcessingMessages: {author, messages}
		}));

		await Promise.all([
			this.receive(
				author,
				initial,
				...filterUndefined(
					messages.map(o =>
						o.plaintext && !potassiumUtil.isEmpty(o.plaintext) ?
							o.plaintext :
							undefined
					)
				)
			),
			this.send(
				...filterUndefined(
					messages.map(o =>
						o.cyphertext && !potassiumUtil.isEmpty(o.cyphertext) ?
							o.cyphertext :
							undefined
					)
				)
			)
		]);
	}

	/** Handle decrypted incoming message. */
	public async receive (
		author: Observable<string>,
		initial: boolean,
		...plaintexts: Uint8Array[]
	) : Promise<void> {
		await Promise.all(
			plaintexts.map(async plaintext => {
				debugLog(() => ({pairwiseSessionDecrypted: {plaintext}}));

				const timestamp = potassiumUtil
					.toDataView(plaintext)
					.getFloat64(0, true);
				const instanceID = potassiumUtil.toBytes(plaintext, 8, 16);
				const data = potassiumUtil.toBytes(plaintext, 24);

				if (data.length < 1) {
					return;
				}

				await this.sessionService.castleHandler(CastleEvents.receive, {
					author,
					initial,
					instanceID: potassiumUtil.toHex(instanceID),
					plaintext: data,
					timestamp
				});
			})
		);
	}

	/** Send outgoing encrypted message. */
	public async send (...cyphertexts: Uint8Array[]) : Promise<void> {
		await Promise.all(
			cyphertexts.map(async cyphertext => {
				const messageID = potassiumUtil
					.toDataView(cyphertext)
					.getUint32(0, true);

				debugLog(() => ({
					pairwiseSessionOutgoingMessageSend: {cyphertext, messageID}
				}));
				await this.sessionService.castleHandler(
					CastleEvents.send,
					cyphertext
				);
				this.logCyphertext(
					this.sessionService.localUsername,
					cyphertext
				);
			})
		);
	}

	/** Sets session symmetric key. */
	public setSymmetricKey (symmetricKey: Uint8Array) : void {
		this.sessionService.symmetricKey.next(symmetricKey);
	}

	constructor (
		/** @ignore */
		private readonly sessionService: ISessionService
	) {}
}
