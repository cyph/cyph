import {analytics} from '../analytics';
import {Channel} from '../channel/channel';
import {IChannel} from '../channel/ichannel';
import {LocalChannel} from '../channel/localchannel';
import {config} from '../config';
import {AnonymousCastle} from '../crypto/anonymouscastle';
import {FakeCastle} from '../crypto/fakecastle';
import {ICastle} from '../crypto/icastle';
import {env} from '../env';
import {errors} from '../errors';
import {eventManager} from '../eventmanager';
import {urlState} from '../urlstate';
import {util} from '../util';
import {CastleEvents, events, rpcEvents, state, threadedSessionEvents} from './enums';
import {IMessage} from './imessage';
import {ISession} from './isession';
import {Message} from './message';


/**
 * Standard ISession implementation.
 */
export class Session implements ISession {
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

	/** @ignore */
	private isLocalSession: boolean					= false;

	/** @ignore */
	private castle: ICastle;

	/** @ignore */
	private channel: IChannel;

	/** @inheritDoc */
	public readonly state	= {
		cyphId: <string> '',
		isAlice: <boolean> false,
		isAlive: <boolean> true,
		isStartingNewCyph: <boolean> false,
		sharedSecret: <string> '',
		wasInitiatedByAPI: <boolean> false
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
					if (this.isLocalSession) {
						this.sendHandler([e.data]);
					}
					else {
						this.sendQueue.push(e.data);
					}
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
	private setDescriptor (descriptor?: string) : void {
		if (
			/* Empty/undefined string */
			!descriptor ||

			/* Too short */
			descriptor.length < config.secretLength ||

			/* Contains invalid character(s) */
			!descriptor.split('').reduce(
				(isValid: boolean, c: string) : boolean =>
					isValid && config.guidAddressSpace.indexOf(c) > -1
				,
				true
			)
		) {
			descriptor	= util.generateGuid(config.secretLength);
		}

		this.updateState(
			state.cyphId,
			descriptor.substr(0, config.cyphIdLength)
		);

		this.updateState(
			state.sharedSecret,
			this.state.sharedSecret || descriptor
		);
	}

	/** @ignore */
	private setUpChannel (
		channelDescriptor: string,
		nativeCrypto: boolean,
		localChannelCallback?: (localChannel: LocalChannel) => void
	) : void {
		if (localChannelCallback) {
			this.isLocalSession	= true;
		}

		const handlers	= {
			onClose: () => {
				this.updateState(state.isAlive, false);

				if (!this.isLocalSession) {
					/* If aborting before the cyph begins,
						block friend from trying to join */
					util.request({
						method: 'POST',
						url: env.baseUrl + 'channels/' + this.state.cyphId
					}).catch(
						() => {}
					);
				}

				this.trigger(events.closeChat);
			},
			onConnect: () => {
				this.trigger(events.connect);

				if (this.isLocalSession) {
					this.castle	= new FakeCastle(this);
				}
				else {
					this.castle	= new AnonymousCastle(this, nativeCrypto);
				}
			},
			onMessage: (message: string) => { this.receive(message); },
			onOpen: async (isAlice: boolean) : Promise<void> => {
				this.updateState(state.isAlice, isAlice);

				if (this.state.isAlice) {
					this.trigger(events.beginWaiting);
				}
				else if (!this.isLocalSession) {
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

				this.on(events.castle, (e: any) => { this.castleHandler(e); });

				if (!this.isLocalSession) {
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
			}
		};

		if (localChannelCallback) {
			this.channel	= new LocalChannel(handlers);
			localChannelCallback(<LocalChannel> this.channel);
		}
		else {
			this.channel	= new Channel(channelDescriptor, handlers);
		}
	}

	/** @inheritDoc */
	public close () : void {
		this.channel.close();
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off(event + this.id, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on(event + this.id, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.id);
	}

	/** @inheritDoc */
	public async receive (data: string) : Promise<void> {
		while (!this.castle) {
			await util.sleep();
		}

		this.castle.receive(data);
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		this.sendBase(messages);
	}

	/** @inheritDoc */
	public async sendBase (messages: IMessage[]) : Promise<void> {
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
	public sendText (text: string, selfDestructTimeout?: number) : void {
		this.send(new Message(rpcEvents.text, {text, selfDestructTimeout}));
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.id, data);
	}

	/** @inheritDoc */
	public updateState (key: string, value: any) : void {
		(<any> this.state)[key]	= value;

		if (!env.isMainThread) {
			this.trigger(threadedSessionEvents.updateStateThread, {key, value});
		}
	}

	/**
	 * @param descriptor Descriptor used for brokering the session.
	 * @param nativeCrypto
	 * @param id
	 * @param localChannelCallback If set, will assume that this is a local
	 * session and initiate a LocalChannel instance, passing it in to this
	 * callback to be connected to a second local session's instance.
	 */
	constructor (
		descriptor?: string,

		nativeCrypto: boolean = false,

		/** @ignore */
		private readonly id: string = util.generateGuid(),

		localChannelCallback?: (localChannel: LocalChannel) => void
	) { (async () => {
		/* true = yes; false = no; undefined = maybe */
		this.updateState(
			state.isStartingNewCyph,
			!descriptor ?
				true :
				descriptor.length > config.secretLength ?
					undefined :
					false
		);

		this.updateState(
			state.wasInitiatedByAPI,
			this.state.isStartingNewCyph === undefined
		);

		this.setDescriptor(descriptor);


		if (this.state.isStartingNewCyph !== false) {
			this.trigger(events.newCyph);
		}

		if (localChannelCallback) {
			this.setUpChannel('', nativeCrypto, localChannelCallback);
		}
		else {
			const channelDescriptor: string	=
				this.state.isStartingNewCyph === false ?
					'' :
					util.generateGuid(config.longSecretLength)
			;

			try {
				this.setUpChannel(
					await util.request({
						data: {channelDescriptor},
						method: 'POST',
						retries: 5,
						url: env.baseUrl + 'channels/' + this.state.cyphId
					}),
					nativeCrypto
				);
			}
			catch (_) {
				urlState.setUrl(urlState.states.notFound);
			}
		}
	})(); }
}
