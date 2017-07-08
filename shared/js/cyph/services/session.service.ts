import {Injectable} from '@angular/core';
import {eventManager} from '../event-manager';
import {ISessionService} from '../service-interfaces/isession.service';
import {CastleEvents, events, rpcEvents} from '../session/enums';
import {IMessage} from '../session/imessage';
import {Message} from '../session/message';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {PotassiumService} from './crypto/potassium.service';
import {ErrorService} from './error.service';


/**
 * Manages a session.
 */
@Injectable()
export abstract class SessionService implements ISessionService {
	/** @ignore */
	private resolvePotassiumService: (potassiumService: PotassiumService) => void;

	/** @ignore */
	private resolveSymmetricKey: (symmetricKey: Uint8Array) => void;

	/** @ignore */
	protected readonly eventId: string								= util.uuid();

	/** @ignore */
	protected lastIncomingMessageTimestamp: number					= 0;

	/** @ignore */
	protected pingPongTimeouts: number								= 0;

	/** @ignore */
	protected readonly plaintextSendInterval: number				= 1776;

	/** @ignore */
	protected readonly plaintextSendQueue: IMessage[]				= [];

	/** @ignore */
	protected readonly potassiumService: Promise<PotassiumService>	=
		new Promise<PotassiumService>(resolve => {
			this.resolvePotassiumService	= resolve;
		})
	;

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
		cyphId: '',
		isAlice: false,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: <boolean|undefined> false,
		wasInitiatedByAPI: false
	};

	/** @ignore */
	protected cyphertextReceiveHandler (message: IMessage) : void {
		if (!message.data.id || this.receivedMessages.has(message.data.id)) {
			return;
		}

		this.receivedMessages.add(message.data.id);

		if (message.event && message.event in rpcEvents) {
			this.trigger(message.event, message.data);
		}
	}

	/** @ignore */
	protected cyphertextSendHandler (_MESSAGE: string) : void {
		this.analyticsService.sendEvent({
			eventAction: 'sent',
			eventCategory: 'message',
			eventValue: 1,
			hitType: 'event'
		});
	}

	/**
	 * @ignore
	 * Intermittent check to verify chat is still alive and send fake encrypted chatter.
	 */
	protected async pingPong () : Promise<void> {
		while (this.state.isAlive) {
			await util.sleep(util.random(90000, 30000));

			if (
				this.lastIncomingMessageTimestamp !== 0 &&
				(await util.timestamp()) - this.lastIncomingMessageTimestamp > 180000
			) {
				if (this.pingPongTimeouts++ < 2) {
					this.analyticsService.sendEvent({
						eventAction: 'detected',
						eventCategory: 'ping-pong-timeout',
						eventValue: 1,
						hitType: 'event'
					});
				}
			}

			this.send(new Message());
		}
	}

	/** @ignore */
	protected async plaintextSendHandler (messages: IMessage[]) : Promise<void> {
		for (const message of messages) {
			message.data.timestamp	= await util.timestamp();
			this.plaintextSendQueue.push(message);
		}
	}

	/** @inheritDoc */
	public async castleHandler (
		event: CastleEvents,
		data?: string|{author: string; plaintext: Uint8Array; timestamp: number}
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
					const potassiumService	= await this.potassiumService;
					const symmetricKey		= potassiumService.randomBytes(
						await potassiumService.secretBox.keyBytes
					);
					this.resolveSymmetricKey(symmetricKey);
					this.send(new Message(rpcEvents.symmetricKey, {symmetricKey}));
				}
				else {
					this.resolveSymmetricKey(
						(
							await this.one<{symmetricKey: Uint8Array}>(
								rpcEvents.symmetricKey
							)
						).symmetricKey
					);
				}

				break;
			}
			case CastleEvents.receive: {
				if (!data || typeof data === 'string') {
					break;
				}

				const cyphertextTimestamp: number	= data.timestamp;

				const messages	= (() => {
					try {
						return util.bytesToObject<IMessage[]>(
							data.plaintext,
							arr => Array.isArray(arr) && arr.
								map(o => typeof o === 'object' && typeof o.data === 'object').
								reduce((a, b) => a && b, true)
						);
					}
					catch (_) {
						return [];
					}
				})();

				for (const message of messages) {
					/* Discard messages without valid timestamps */
					if (
						typeof (<any> message).data !== 'object' ||
						message.data.timestamp === undefined ||
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
				if (!data || typeof data !== 'string') {
					break;
				}

				this.cyphertextSendHandler(data);
			}
		}
	}

	/** @inheritDoc */
	public close () : void {
		throw new Error('Must provide an implementation of SessionService.close.');
	}

	/** @inheritDoc */
	public async init (potassiumService: PotassiumService) : Promise<void> {
		this.resolvePotassiumService(potassiumService);
	}

	/** @inheritDoc */
	public async lock<T> (_F: (reason?: string) => Promise<T>, _REASON?: string) : Promise<T> {
		throw new Error('Must provide an implementation of SessionService.lock.');
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off<T>(event + this.eventId, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on<T>(event + this.eventId, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.eventId);
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures();
	}

	/** @inheritDoc */
	public send (..._MESSAGES: IMessage[]) : void {
		throw new Error('Must provide an implementation of SessionService.send.');
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.eventId, data);
	}

	constructor (
		/** @ignore */
		protected readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly errorService: ErrorService
	) {}
}
