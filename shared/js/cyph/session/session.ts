import {analytics} from '../analytics';
import {config} from '../config';
import {AnonymousCastle} from '../crypto/anonymous-castle';
import {ICastle} from '../crypto/icastle';
import {env} from '../env';
import {errors} from '../errors';
import {eventManager} from '../event-manager';
import {util} from '../util';
import {Channel} from './channel';
import {CastleEvents, events, rpcEvents} from './enums';
import {IMessage} from './imessage';
import {ISession} from './isession';
import {Message} from './message';
import {ProFeatures} from './profeatures';


/**
 * Standard ISession implementation.
 */
export class Session implements ISession {
	/** @ignore */
	private castle: ICastle;

	/** @ignore */
	private channel: Channel;

	/** @ignore */
	private readonly receivedMessages: Set<string>	= new Set<string>();

	/** @ignore */
	private readonly sendQueue: string[]			= [];

	/** @ignore */
	private lastIncomingMessageTimestamp: number	= util.timestamp();

	/** @ignore */
	private lastOutgoingMessageTimestamp: number	= util.timestamp();

	/** @ignore */
	private pingPongTimeouts: number				= 0;

	/** @inheritDoc */
	public readonly state	= {
		cyphId: '',
		isAlice: false,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: false,
		wasInitiatedByAPI: false
	};

	/** @ignore */
	private castleHandler (e: {event: CastleEvents; data?: any}) : void {
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

						if (typeof message.data !== 'object') {
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
					this.sendQueue.push(e.data);
				}
				break;
			}
		}
	}

	/**
	 * @ignore
	 * Intermittent check to verify chat is still alive and send fake encrypted chatter.
	 */
	private async pingPong () : Promise<void> {
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
	private receiveHandler (message: IMessage) : void {
		if (!message.id || this.receivedMessages.has(message.id)) {
			return;
		}
		this.receivedMessages.add(message.id);

		if (message.event && message.event in rpcEvents) {
			this.trigger(message.event, message.data);
		}
	}

	/** @ignore */
	private sendHandler (messages: string[]) : void {
		this.lastOutgoingMessageTimestamp	= util.timestamp();

		for (const message of messages) {
			this.channel.send(message);
		}

		analytics.sendEvent({
			eventAction: 'sent',
			eventCategory: 'message',
			eventValue: messages.length,
			hitType: 'event'
		});
	}

	/** @ignore */
	private setId (id: string) : void {
		if (
			/* Too short */
			id.length < config.secretLength ||

			/* Contains invalid character(s) */
			!id.split('').reduce(
				(isValid: boolean, c: string) : boolean =>
					isValid && config.guidAddressSpace.indexOf(c) > -1
				,
				true
			)
		) {
			id	= util.generateGuid(config.secretLength);
		}

		this.updateState(
			'cyphId',
			id.substring(0, config.cyphIdLength)
		);

		this.updateState(
			'sharedSecret',
			this.state.sharedSecret || id
		);
	}

	/** @ignore */
	private setUpChannel (
		channelDescriptor: string,
		nativeCrypto: boolean,
		remoteUsername: string
	) : void {
		const handlers	= {
			onClose: () => {
				this.updateState('isAlive', false);

				/* If aborting before the cyph begins,
					block friend from trying to join */
				util.request({
					method: 'POST',
					url: env.baseUrl + 'channels/' + this.state.cyphId
				}).catch(
					() => {}
				);

				this.trigger(events.closeChat);
			},
			onConnect: () => {
				this.trigger(events.connect);

				this.castle	= new AnonymousCastle(this, nativeCrypto, remoteUsername);
				this.updateState('sharedSecret', '');
			},
			onMessage: async (message: string) => {
				(await util.waitForValue(() => this.castle)).receive(message);
			},
			onOpen: async (isAlice: boolean) : Promise<void> => {
				this.updateState('isAlice', isAlice);

				if (this.state.isAlice) {
					this.trigger(events.beginWaiting);
				}
				else {
					this.pingPong();

					analytics.sendEvent({
						eventAction: 'started',
						eventCategory: 'cyph',
						eventValue: 1,
						hitType: 'event'
					});

					if (this.state.wasInitiatedByAPI) {
						analytics.sendEvent({
							eventAction: 'started',
							eventCategory: 'api-initiated-cyph',
							eventValue: 1,
							hitType: 'event'
						});
					}
				}

				this.on(events.castle, (e: {event: CastleEvents; data?: any}) =>
					this.castleHandler(e)
				);

				while (this.state.isAlive) {
					await util.sleep();

					if (
						this.sendQueue.length &&
						(
							this.sendQueue.length >= 4 ||
							(util.timestamp() - this.lastOutgoingMessageTimestamp) > 500
						)
					) {
						this.sendHandler(this.sendQueue.splice(0, 4));
					}
				}
			}
		};

		this.channel	= new Channel(channelDescriptor, handlers);
	}

	/** Sets a value of this.state. */
	private updateState (
		key: 'cyphId'|'isAlice'|'isAlive'|'sharedSecret'|'startingNewCyph'|'wasInitiatedByAPI',
		value: boolean|string|undefined
	) : void {
		if (
			(key === 'cyphId' && typeof value === 'string') ||
			(key === 'isAlice' && typeof value === 'boolean') ||
			(key === 'isAlive' && typeof value === 'boolean') ||
			(key === 'sharedSecret' && typeof value === 'string') ||
			(
				key === 'startingNewCyph' &&
				(typeof value === 'boolean' || typeof value === 'undefined')
			) ||
			(key === 'wasInitiatedByAPI' && typeof value === 'boolean')
		) {
			/* Casting to any as a temporary workaround pending TypeScript fix */
			(<any> this).state[key]	= value;
		}
		else {
			throw new Error('Invalid value.');
		}

		if (!env.isMainThread) {
			this.trigger(events.threadUpdate, {key, value});
		}
	}

	/** @inheritDoc */
	public close () : void {
		this.channel.close();
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off(event + this.eventId, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on(event + this.eventId, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.eventId);
	}

	/** @inheritDoc */
	public async send (...messages: IMessage[]) : Promise<void> {
		while (!this.castle) {
			await util.sleep();
		}

		for (const message of messages) {
			if (message.event === rpcEvents.text) {
				this.trigger(rpcEvents.text, message.data);
			}
		}

		this.castle.send(
			JSON.stringify(messages, (_, v) => {
				if (v instanceof Uint8Array) {
					(<any> v).isUint8Array	= true;
				}

				return v;
			}),
			util.timestamp()
		);
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.eventId, data);
	}

	/**
	 * @param id Descriptor used for brokering the session.
	 * @param proFeatures
	 * @param remoteUsername
	 * @param eventId
	 */
	constructor (
		id: string,

		proFeatures: ProFeatures,

		remoteUsername: string,

		/** @ignore */
		private readonly eventId: string
	) { (async () => {
		/* true = yes; false = no; undefined = maybe */
		this.updateState(
			'startingNewCyph',
			proFeatures.api ?
				undefined :
				id.length < 1 ?
					true :
					false
		);

		this.updateState('wasInitiatedByAPI', proFeatures.api);

		this.setId(id);


		if (this.state.startingNewCyph !== false) {
			this.trigger(events.newCyph);
		}

		const channelDescriptor: string	=
			this.state.startingNewCyph === false ?
				'' :
				util.generateGuid(config.longSecretLength)
		;

		try {
			this.setUpChannel(
				await util.request({
					data: {channelDescriptor, proFeatures},
					method: 'POST',
					retries: 5,
					url: env.baseUrl + 'channels/' + this.state.cyphId
				}),
				proFeatures.nativeCrypto,
				remoteUsername
			);
		}
		catch (_) {
			this.trigger(events.cyphNotFound);
		}
	})(); }
}
