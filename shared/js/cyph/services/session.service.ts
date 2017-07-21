import {Injectable} from '@angular/core';
import {ISessionMessage, ISessionMessageData, SessionMessageList} from '../../proto';
import {HandshakeSteps, IHandshakeState} from '../crypto/castle';
import {eventManager} from '../event-manager';
import {IAsyncValue} from '../iasync-value';
import {LocalAsyncValue} from '../local-async-value';
import {BinaryProto} from '../protos';
import {ISessionService} from '../service-interfaces/isession.service';
import {CastleEvents, events, rpcEvents, SessionMessage} from '../session';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {ErrorService} from './error.service';


/**
 * Manages a session.
 */
@Injectable()
export abstract class SessionService implements ISessionService {
	/** @ignore */
	private resolveSymmetricKey: (symmetricKey: Uint8Array) => void;

	/** @ignore */
	protected readonly eventID: string								= util.uuid();

	/** @ignore */
	protected lastIncomingMessageTimestamp: number					= 0;

	/** @ignore */
	protected readonly plaintextSendInterval: number				= 1776;

	/** @ignore */
	protected readonly plaintextSendQueue: ISessionMessage[]		= [];

	/** @ignore */
	protected readonly receivedMessages: Set<string>				= new Set<string>();

	/** @ignore */
	protected readonly symmetricKey: Promise<Uint8Array>			=
		new Promise<Uint8Array>(resolve => {
			this.resolveSymmetricKey	= resolve;
		})
	;

	/** @inheritDoc */
	public readonly apiFlags						= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false,
		telehealth: false
	};

	/** @inheritDoc */
	public readonly connected: Promise<void>		= this.one<void>(events.connect);

	/** @inheritDoc */
	public readonly remoteUsername: Promise<string>	= new Promise<string>(resolve => {
		this.setRemoteUsername	= resolve;
	});

	/** @inheritDoc */
	public setRemoteUsername: (remoteUsername: string) => void;

	/** @inheritDoc */
	public readonly state							= {
		cyphID: '',
		isAlice: false,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: <boolean|undefined> false,
		wasInitiatedByAPI: false
	};

	/** @see IChannelHandlers.onClose */
	protected channelOnClose () : void {
		this.state.isAlive	= false;
		this.trigger(events.closeChat);
	}

	/** @see IChannelHandlers.onConnect */
	protected async channelOnConnect () : Promise<void> {
		this.trigger(events.connect);

		while (this.state.isAlive) {
			await util.sleep(this.plaintextSendInterval);

			if (this.plaintextSendQueue.length < 1) {
				continue;
			}

			this.castleService.send(
				await util.serialize(SessionMessageList, {
					messages: this.plaintextSendQueue.splice(
						0,
						this.plaintextSendQueue.length
					)
				})
			);
		}
	}

	/** @see IChannelHandlers.onMessage */
	protected channelOnMessage (message: Uint8Array) : void {
		this.castleService.receive(message);
	}

	/** @see IChannelHandlers.onOpen */
	protected async channelOnOpen (isAlice: boolean) : Promise<void> {
		this.state.isAlice	= isAlice;
	}

	/** @ignore */
	protected cyphertextReceiveHandler (message: ISessionMessage) : void {
		if (!message.data.id || this.receivedMessages.has(message.data.id)) {
			return;
		}

		this.receivedMessages.add(message.data.id);

		if (message.event && message.event in rpcEvents) {
			this.trigger(message.event, message.data);
		}
	}

	/** @ignore */
	protected cyphertextSendHandler (message: Uint8Array) : void {
		this.channelService.send(message);

		this.analyticsService.sendEvent({
			eventAction: 'sent',
			eventCategory: 'message',
			eventValue: 1,
			hitType: 'event'
		});
	}

	/** @ignore */
	protected async plaintextSendHandler (messages: ISessionMessage[]) : Promise<void> {
		for (const message of messages) {
			this.plaintextSendQueue.push(message);
		}
	}

	/** @inheritDoc */
	public async castleHandler (
		event: CastleEvents,
		data?: Uint8Array|{author: string; plaintext: Uint8Array; timestamp: number}
	) : Promise<void> {
		switch (event) {
			case CastleEvents.abort: {
				this.errorService.logAuthFail();
				this.trigger(events.connectFailure);
				break;
			}
			case CastleEvents.connect: {
				this.trigger(events.beginChat);

				if (this.state.isAlice) {
					const potassiumService	= this.potassiumService;
					const symmetricKey		= potassiumService.randomBytes(
						await potassiumService.secretBox.keyBytes
					);
					this.resolveSymmetricKey(symmetricKey);
					this.send(new SessionMessage(rpcEvents.symmetricKey, {bytes: symmetricKey}));
				}
				else {
					this.resolveSymmetricKey(
						(await this.one<ISessionMessageData>(rpcEvents.symmetricKey)).bytes ||
						new Uint8Array(0)
					);
				}

				break;
			}
			case CastleEvents.receive: {
				if (!data || data instanceof Uint8Array) {
					break;
				}

				const cyphertextTimestamp	= data.timestamp;

				const messages	=
					(
						await (async () =>
							(
								await util.deserialize(SessionMessageList, data.plaintext)
							).messages
						)().catch(() => undefined)
					) ||
					[]
				;

				for (const message of messages) {
					/* Discard messages without valid timestamps */
					if (
						isNaN(message.data.timestamp) ||
						message.data.timestamp > cyphertextTimestamp ||
						message.data.timestamp < this.lastIncomingMessageTimestamp
					) {
						continue;
					}

					this.lastIncomingMessageTimestamp	= message.data.timestamp;
					message.data.author					= data.author;

					this.cyphertextReceiveHandler(message);
				}
				break;
			}
			case CastleEvents.send: {
				if (!data || !(data instanceof Uint8Array)) {
					break;
				}

				this.cyphertextSendHandler(data);
			}
		}
	}

	/** @inheritDoc */
	public close () : void {
		this.channelService.close();
	}

	/** @inheritDoc */
	public async handshakeState (
		currentStep: IAsyncValue<HandshakeSteps> =
			new LocalAsyncValue(HandshakeSteps.Start)
		,
		initialSecret: IAsyncValue<Uint8Array|undefined> =
			new LocalAsyncValue<Uint8Array|undefined>(undefined)
	) : Promise<IHandshakeState> {
		await this.connected;

		return {
			currentStep,
			initialSecret,
			initialSecretCyphertext: await this.channelService.getAsyncValue(
				'handshake/initialSecretCyphertext',
				BinaryProto
			),
			isAlice: this.state.isAlice,
			localPublicKey: await this.channelService.getAsyncValue(
				`handshake/${this.state.isAlice ? 'alice' : 'bob'}PublicKey`,
				BinaryProto
			),
			remotePublicKey: await this.channelService.getAsyncValue(
				`handshake/${this.state.isAlice ? 'bob' : 'alice'}PublicKey`,
				BinaryProto
			)
		};
	}

	/** @inheritDoc */
	public async init (channelID: string, userID?: string) : Promise<void> {
		await Promise.all([
			this.castleService.init(this.potassiumService, this),
			this.channelService.init(channelID, userID, {
				onClose: () => { this.channelOnClose(); },
				onConnect: () => { this.channelOnConnect(); },
				onMessage: (message: Uint8Array) => { this.channelOnMessage(message); },
				onOpen: (isAlice: boolean) => { this.channelOnOpen(isAlice); }
			})
		]);
	}

	/** @inheritDoc */
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		return this.channelService.lock(
			async r => f(!r ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumService.secretBox.open(
						this.potassiumService.fromBase64(r),
						await this.symmetricKey
					)
				)
			),
			!reason ?
				undefined :
				this.potassiumService.toBase64(
					await this.potassiumService.secretBox.seal(
						this.potassiumService.fromString(reason),
						await this.symmetricKey
					)
				)
		);
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off<T>(event + this.eventID, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on<T>(event + this.eventID, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.eventID);
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures();
	}

	/** @inheritDoc */
	public async send (...messages: ISessionMessage[]) : Promise<void> {
		for (const message of messages) {
			message.data.timestamp	= await util.timestamp();
			if (message.event === rpcEvents.text) {
				this.trigger(rpcEvents.text, message.data);
			}
		}

		this.plaintextSendHandler(messages);
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.eventID, data);
	}

	constructor (
		/** @ignore */
		protected readonly analyticsService: AnalyticsService,

		/** @ignore */
		protected readonly castleService: CastleService,

		/** @ignore */
		protected readonly channelService: ChannelService,

		/** @ignore */
		private readonly errorService: ErrorService,

		/** @ignore */
		protected readonly potassiumService: PotassiumService
	) {}
}
