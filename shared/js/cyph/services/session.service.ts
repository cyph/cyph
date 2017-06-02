import {Injectable} from '@angular/core';
import {eventManager} from '../event-manager';
import {ISessionService} from '../service-interfaces/isession.service';
import {CastleEvents, events, rpcEvents} from '../session/enums';
import {IMessage} from '../session/imessage';
import {Message} from '../session/message';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {ErrorService} from './error.service';


/**
 * Manages a session.
 */
@Injectable()
export abstract class SessionService implements ISessionService {
	/** @ignore */
	protected readonly eventId: string					= util.generateGuid();

	/** @ignore */
	protected lastIncomingMessageTimestamp: number		= 0;

	/** @ignore */
	protected pingPongTimeouts: number					= 0;

	/** @ignore */
	protected readonly plaintextSendInterval: number	= 1776;

	/** @ignore */
	protected readonly plaintextSendQueue: IMessage[]	= [];

	/** @ignore */
	protected readonly receivedMessages: Set<string>	= new Set<string>();

	/** @inheritDoc */
	public readonly apiFlags							= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false,
		telehealth: false
	};

	/** @inheritDoc */
	public readonly connected: Promise<void>			= this.one<void>(events.connect);

	/** @inheritDoc */
	/* tslint:disable-next-line:promise-must-complete */
	public readonly remoteUsername: Promise<string>		= new Promise<string>(resolve => {
		this.setRemoteUsername	= resolve;
	});

	/** @inheritDoc */
	public setRemoteUsername: (remoteUsername: string) => void;

	/** @inheritDoc */
	public readonly state								= {
		cyphId: '',
		isAlice: false,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: <boolean|undefined> false,
		wasInitiatedByAPI: false
	};

	/** @ignore */
	protected castleHandler (e: {
		data?: string|{author: string; plaintext: string; timestamp: number};
		event: CastleEvents;
	}) : void {
		switch (e.event) {
			case CastleEvents.abort: {
				this.errorService.logAuthFail();
				this.trigger(events.connectFailure);
				break;
			}
			case CastleEvents.connect: {
				this.trigger(events.beginChat);
				break;
			}
			case CastleEvents.receive: {
				if (!e.data || typeof e.data === 'string') {
					break;
				}

				const cyphertextTimestamp: number	= e.data.timestamp;

				const messages	= (() => {
					try {
						return util.parse<IMessage[]>(e.data.plaintext);
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
					message.data.author					= e.data.author;

					this.cyphertextReceiveHandler(message);
				}
				break;
			}
			case CastleEvents.send: {
				if (!e.data || typeof e.data !== 'string') {
					break;
				}

				this.cyphertextSendHandler(e.data);
				break;
			}
		}
	}

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
	public close () : void {
		throw new Error('Must provide an implementation of SessionService.close.');
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
