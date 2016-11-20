import {Analytics} from '../analytics';
import {Channel} from '../channel/channel';
import {IChannel} from '../channel/ichannel';
import {LocalChannel} from '../channel/localchannel';
import {Config} from '../config';
import {AnonymousCastle} from '../crypto/anonymouscastle';
import {FakeCastle} from '../crypto/fakecastle';
import {ICastle} from '../crypto/icastle';
import {Env} from '../env';
import {Errors} from '../errors';
import {EventManager} from '../eventmanager';
import {UrlState} from '../urlstate';
import {Util} from '../util';
import {CastleEvents, Events, RPCEvents, State, ThreadedSessionEvents, Users} from './enums';
import {IMessage} from './imessage';
import {ISession} from './isession';
import {Message} from './message';


/**
 * Standard ISession implementation.
 */
export class Session implements ISession {
	/** @ignore */
	private receivedMessages: {[id: string] : boolean}	= {};

	/** @ignore */
	private sendQueue: string[]							= [];

	/** @ignore */
	private lastIncomingMessageTimestamp: number		= Util.timestamp();

	/** @ignore */
	private lastOutgoingMessageTimestamp: number		= Util.timestamp();

	/** @ignore */
	private pingPongTimeouts: number					= 0;

	/** @ignore */
	private isLocalSession: boolean						= false;

	/** @ignore */
	private castle: ICastle;

	/** @ignore */
	private channel: IChannel;

	/** @inheritDoc */
	public state	= {
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
				Errors.logAuthFail();
				this.trigger(Events.connectFailure);
				break;
			}
			case CastleEvents.connect: {
				this.trigger(Events.beginChat);
				break;
			}
			case CastleEvents.receive: {
				this.lastIncomingMessageTimestamp	= Util.timestamp();

				if (e.data) {
					const messages: Message[]	= (() => {
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
						this.receiveHandler(
							messages[i],
							e.data.timestamp + i * 0.001,
							e.data.author
						);
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
	private pingPong () : void {
		let nextPing: number	= 0;

		const interval	= setInterval(() => {
			if (!this.state.isAlive) {
				clearInterval(interval);
				return;
			}

			const now	= Util.timestamp();

			if (now - this.lastIncomingMessageTimestamp > 180000) {
				if (this.pingPongTimeouts++ < 2) {
					this.lastIncomingMessageTimestamp	= Util.timestamp();

					Analytics.send({
						eventAction: 'detected',
						eventCategory: 'ping-pong-timeout',
						eventValue: 1,
						hitType: 'event'
					});
				}
			}

			if (now > nextPing) {
				this.send(new Message());

				nextPing	= now + Util.random(90000, 30000);
			}
		}, 1000);
	}

	/** @ignore */
	private receiveHandler (message: Message, timestamp: number, author: string) : void {
		if (!this.receivedMessages[message.id]) {
			this.receivedMessages[message.id]	= true;

			if (message.event in RPCEvents) {
				this.trigger(message.event,
					message.event === RPCEvents.text ?
						{
							author,
							timestamp,
							selfDestructTimeout:
								Util.getValue(message.data, 'selfDestructTimeout')
							,
							text: Util.getValue(message.data, 'text')
						} :
						message.data
				);
			}
		}
	}

	/** @ignore */
	private sendHandler (messages: string[]) : void {
		this.lastOutgoingMessageTimestamp	= Util.timestamp();

		for (let message of messages) {
			this.channel.send(message);
		}

		Analytics.send({
			eventAction: 'sent',
			eventCategory: 'message',
			eventValue: messages.length,
			hitType: 'event'
		});
	}

	/** @ignore */
	private setDescriptor (descriptor?: string) : void {
		if (
			/* Empty/null string */
			!descriptor ||

			/* Too short */
			descriptor.length < Config.secretLength ||

			/* Contains invalid character(s) */
			!descriptor.split('').reduce(
				(isValid: boolean, c: string) : boolean =>
					isValid && Config.guidAddressSpace.indexOf(c) > -1
				,
				true
			)
		) {
			descriptor	= Util.generateGuid(Config.secretLength);
		}

		this.updateState(State.cyphId,
			descriptor.substr(0, Config.cyphIdLength)
		);

		this.updateState(State.sharedSecret,
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
			onclose: () => {
				this.updateState(State.isAlive, false);

				if (!this.isLocalSession) {
					/* If aborting before the cyph begins,
						block friend from trying to join */
					Util.request({
						discardErrors: true,
						method: 'POST',
						url: Env.baseUrl + 'channels/' + this.state.cyphId
					});
				}

				this.trigger(Events.closeChat);
			},
			onconnect: () => {
				this.trigger(Events.connect);

				if (this.isLocalSession) {
					this.castle	= new FakeCastle(this);
				}
				else {
					this.castle	= new AnonymousCastle(this, nativeCrypto);
				}
			},
			onmessage: message => this.receive(message),
			onopen: (isAlice: boolean) : void => {
				this.updateState(State.isAlice, isAlice);

				if (this.state.isAlice) {
					this.trigger(Events.beginWaiting);
				}
				else if (!this.isLocalSession) {
					this.pingPong();

					Analytics.send({
						eventAction: 'started',
						eventCategory: 'cyph',
						eventValue: 1,
						hitType: 'event'
					});

					if (this.state.wasInitiatedByAPI) {
						Analytics.send({
							eventAction: 'started',
							eventCategory: 'api-initiated-cyph',
							eventValue: 1,
							hitType: 'event'
						});
					}
				}

				this.on(Events.castle, e => this.castleHandler(e));

				if (!this.isLocalSession) {
					const interval	= setInterval(() => {
						if (!this.state.isAlive) {
							clearInterval(interval);
						}
						else if (
							this.sendQueue.length &&
							(
								this.sendQueue.length >= 4 ||
								(Util.timestamp() - this.lastOutgoingMessageTimestamp) > 500
							)
						) {
							this.sendHandler(this.sendQueue.splice(0, 4));
						}
					}, 250);
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
	public off (event: string, handler: Function) : void {
		EventManager.off(event + this.id, handler);
	}

	/** @inheritDoc */
	public on (event: string, handler: Function) : void {
		EventManager.on(event + this.id, handler);
	}

	/** @inheritDoc */
	public receive (data: string) : void {
		if (this.castle) {
			this.castle.receive(data);
		}
		else {
			setTimeout(() => this.receive(data), 1000);
		}
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		this.sendBase(messages);
	}

	/** @inheritDoc */
	public sendBase (messages: IMessage[]) : void {
		if (!this.castle) {
			setTimeout(() => this.sendBase(messages), 250);
			return;
		}


		for (let message of messages) {
			if (message.event === RPCEvents.text) {
				this.trigger(RPCEvents.text, {
					author: Users.me,
					selfDestructTimeout:
						Util.getValue(message.data, 'selfDestructTimeout')
					,
					text: Util.getValue(message.data, 'text'),
					timestamp: Util.timestamp()
				});
			}
		}

		this.castle.send(
			JSON.stringify(messages, (_, v) => {
				if (v instanceof Uint8Array) {
					(<any> v).isUint8Array	= true;
				}

				return v;
			}),
			Util.timestamp()
		);
	}

	/** @inheritDoc */
	public sendText (text: string, selfDestructTimeout?: number) : void {
		this.send(new Message(RPCEvents.text, {text, selfDestructTimeout}));
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		EventManager.trigger(event + this.id, data);
	}

	/** @inheritDoc */
	public updateState (key: string, value: any) : void {
		this.state[key]	= value;

		if (!Env.isMainThread) {
			this.trigger(ThreadedSessionEvents.updateStateThread, {key, value});
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
		private id: string = Util.generateGuid(),

		localChannelCallback?: (localChannel: LocalChannel) => void
	) {
		/* true = yes; false = no; null = maybe */
		this.updateState(
			State.isStartingNewCyph,
			!descriptor ?
				true :
				descriptor.length > Config.secretLength ?
					null :
					false
		);

		this.updateState(
			State.wasInitiatedByAPI,
			this.state.isStartingNewCyph === null
		);

		this.setDescriptor(descriptor);


		if (this.state.isStartingNewCyph !== false) {
			this.trigger(Events.newCyph);
		}

		if (localChannelCallback) {
			this.setUpChannel(null, nativeCrypto, localChannelCallback);
		}
		else {
			const channelDescriptor: string	=
				this.state.isStartingNewCyph === false ?
					'' :
					Util.generateGuid(Config.longSecretLength)
			;

			(async () => {
				try {
					this.setUpChannel(await Util.request({
						data: {channelDescriptor},
						method: 'POST',
						retries: 5,
						url: Env.baseUrl + 'channels/' + this.state.cyphId
					}), nativeCrypto);
				}
				catch (_) {
					UrlState.set(UrlState.states.notFound);
				}
			})();
		}
	}
}
