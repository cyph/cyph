import {Injectable} from '@angular/core';
import {analytics} from '../analytics';
import {errors} from '../errors';
import {eventManager} from '../event-manager';
import {ISessionService} from '../service-interfaces/isession.service';
import {CastleEvents, events, rpcEvents} from '../session/enums';
import {IMessage} from '../session/imessage';
import {Message} from '../session/message';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';


/**
 * Manages a session.
 */
@Injectable()
export abstract class SessionService implements ISessionService {
	/** @ignore */
	protected readonly eventId: string					= util.generateGuid();

	/** @ignore */
	protected lastIncomingMessageTimestamp: number		= util.timestamp();

	/** @ignore */
	protected pingPongTimeouts: number					= 0;

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
	protected castleHandler (e: {data?: any; event: CastleEvents}) : void {
		switch (e.event) {
			case CastleEvents.abort: {
				errors.logAuthFail();
				this.trigger(events.connectFailure);
				break;
			}
			case CastleEvents.connect: {
				this.trigger(events.beginChat);
				break;
			}
			case CastleEvents.receive: {
				this.lastIncomingMessageTimestamp	= util.timestamp();

				if (e.data) {
					const messages: IMessage[]	= (() => {
						try {
							return JSON.parse(e.data.plaintext, (_, v) => {
								if (v && v.isUint8Array) {
									const bytes	= new Uint8Array(Object.keys(v).length - 1);

									for (let i = 0 ; i < bytes.length ; ++i) {
										bytes[i]	= v[i];
									}

									return bytes;
								}

								return v;
							});
						}
						catch (_) {
							return [];
						}
					})();

					for (let i = 0 ; i < messages.length ; ++i) {
						const message	= messages[i];

						if (typeof (<any> message).data !== 'object') {
							message.data	= {
								author: '',
								timestamp: 0
							};
						}

						message.data.author		= e.data.author;
						message.data.timestamp	= (<number> e.data.timestamp) + i * 0.001;

						this.receiveHandler(message);
					}
				}
				break;
			}
			case CastleEvents.send: {
				if (e.data) {
					this.sendHandler(e.data);
				}
				break;
			}
		}
	}

	/**
	 * @ignore
	 * Intermittent check to verify chat is still alive and send fake encrypted chatter.
	 */
	protected async pingPong () : Promise<void> {
		let nextPing	= 0;

		while (this.state.isAlive) {
			await util.sleep(1000);

			const now	= util.timestamp();

			if (now - this.lastIncomingMessageTimestamp > 180000) {
				if (this.pingPongTimeouts++ < 2) {
					this.lastIncomingMessageTimestamp	= util.timestamp();

					analytics.sendEvent({
						eventAction: 'detected',
						eventCategory: 'ping-pong-timeout',
						eventValue: 1,
						hitType: 'event'
					});
				}
			}

			if (now > nextPing) {
				this.send(new Message());

				nextPing	= now + util.random(90000, 30000);
			}
		}
	}

	/** @ignore */
	protected receiveHandler (message: IMessage) : void {
		if (!message.id || this.receivedMessages.has(message.id)) {
			return;
		}
		this.receivedMessages.add(message.id);

		if (message.event && message.event in rpcEvents) {
			this.trigger(message.event, message.data);
		}
	}

	/** @ignore */
	protected sendHandler (_MESSAGE: string) : void {
		analytics.sendEvent({
			eventAction: 'sent',
			eventCategory: 'message',
			eventValue: 1,
			hitType: 'event'
		});
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

	constructor () {}
}
