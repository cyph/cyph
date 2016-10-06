/// <reference path="../../preload/global.ts" />

import {CastleEvents, Events, RPCEvents, State, ThreadedSessionEvents, Users} from './enums';
import {IMessage} from './imessage';
import {ISession} from './isession';
import {Message} from './message';
import {Analytics} from '../analytics';
import {Config} from '../config';
import {Env} from '../env';
import {Errors} from '../errors';
import {EventManager} from '../eventmanager';
import {IController} from '../icontroller';
import {Timer} from '../timer';
import {UrlState} from '../urlstate';
import {Util} from '../util';
import {Channel} from '../channel/channel';
import {IChannel} from '../channel/ichannel';
import {LocalChannel} from '../channel/localchannel';
import {AnonymousCastle} from '../crypto/anonymouscastle';
import {FakeCastle} from '../crypto/fakecastle';
import {ICastle} from '../crypto/icastle';


/**
 * Standard ISession implementation with the properties
 * that one would expect.
 */
export class Session implements ISession {
	private receivedMessages: {[id: string] : boolean}	= {};
	private sendQueue: string[]							= [];
	private lastIncomingMessageTimestamp: number		= Util.timestamp();
	private lastOutgoingMessageTimestamp: number		= Util.timestamp();
	private pingPongTimeouts: number					= 0;
	private isLocalSession: boolean						= false;

	private castle: ICastle;
	private channel: IChannel;

	public state	= {
		cyphId: <string> '',
		sharedSecret: <string> '',
		isAlice: <boolean> false,
		isAlive: <boolean> true,
		isStartingNewCyph: <boolean> false,
		wasInitiatedByAPI: <boolean> false
	};

	private castleHandler (e: { event: CastleEvents; data?: any; }) : void {
		switch (e.event) {
			case CastleEvents.abort: {
				Errors.logAuthFail();
				this.trigger(Events.connectFailure);
				break;
			}
			case CastleEvents.connect: {
				this.trigger(Events.beginChat);

				if (!this.isLocalSession) {
					this.pingPong();
				}
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

	/* Intermittent check to verify chat is still alive
		and send fake encrypted chatter */
	private pingPong () : void {
		let nextPing: number	= 0;

		new Timer((now: number) => {
			if (now - this.lastIncomingMessageTimestamp > 180000) {
				if (this.pingPongTimeouts++ < 2) {
					this.lastIncomingMessageTimestamp	= Util.timestamp();

					this.trigger(Events.pingPongTimeout);

					Analytics.send({
						hitType: 'event',
						eventCategory: 'ping-pong-timeout',
						eventAction: 'detected',
						eventValue: 1
					});
				}
			}

			if (now > nextPing) {
				this.send(new Message());

				nextPing	= now + Util.random(90000, 30000);
			}
		});
	}

	private receiveHandler (message: Message, timestamp: number, author: string) : void {
		if (!this.receivedMessages[message.id]) {
			this.receivedMessages[message.id]	= true;

			if (message.event in RPCEvents) {
				this.trigger(message.event,
					message.event === RPCEvents.text ?
						{
							text: message.data,
							author,
							timestamp
						} :
						message.data
				);
			}
		}
	}

	private sendHandler (messages: string[]) : void {
		this.lastOutgoingMessageTimestamp	= Util.timestamp();

		for (let message of messages) {
			this.channel.send(message);
		}

		Analytics.send({
			hitType: 'event',
			eventCategory: 'message',
			eventAction: 'sent',
			eventValue: messages.length
		});
	}

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
						method: 'POST',
						url: Env.baseUrl + 'channels/' + this.state.cyphId,
						discardErrors: true
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
					Analytics.send({
						hitType: 'event',
						eventCategory: 'cyph',
						eventAction: 'started',
						eventValue: 1
					});

					if (this.state.wasInitiatedByAPI) {
						Analytics.send({
							hitType: 'event',
							eventCategory: 'api-initiated-cyph',
							eventAction: 'started',
							eventValue: 1
						});
					}
				}

				this.on(Events.castle, e => this.castleHandler(e));

				if (!this.isLocalSession) {
					const sendTimer: Timer	= new Timer((now: number) => {
						if (!this.state.isAlive) {
							sendTimer.stop();
						}
						else if (
							this.sendQueue.length &&
							(
								this.sendQueue.length >= 4 ||
								(now - this.lastOutgoingMessageTimestamp) > 500
							)
						) {
							this.sendHandler(this.sendQueue.splice(0, 4));
						}
					});
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

	public close () : void {
		this.channel.close();
	}

	public off (event: string, handler: Function) : void {
		EventManager.off(event + this.id, handler);
	}

	public on (event: string, handler: Function) : void {
		EventManager.on(event + this.id, handler);
	}

	public receive (data: string) : void {
		if (this.castle) {
			this.castle.receive(data);
		}
		else {
			setTimeout(() => this.receive(data), 1000);
		}
	}

	public send (...messages: IMessage[]) : void {
		this.sendBase(messages);
	}

	public sendBase (messages: IMessage[]) : void {
		if (!this.castle) {
			setTimeout(() => this.sendBase(messages), 250);
			return;
		}


		for (let message of messages) {
			if (message.event === RPCEvents.text) {
				this.trigger(RPCEvents.text, {
					author: Users.me,
					text: message.data,
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

	public sendText (text: string) : void {
		this.send(new Message(RPCEvents.text, text));
	}

	public trigger (event: string, data?: any) : void {
		EventManager.trigger(event + this.id, data);
	}

	public updateState (key: string, value: any) : void {
		this.state[key]	= value;

		if (this.controller) {
			this.controller.update();
		}
		else {
			this.trigger(ThreadedSessionEvents.updateStateThread, {key, value});
		}
	}

	/**
	 * @param descriptor Descriptor used for brokering the session.
	 * @param controller
	 * @param id
	 * @param localChannelCallback If set, will assume that this is a local
	 * session and initiate a LocalChannel instance, passing it in to this
	 * callback to be connected to a second local session's instance.
	 */
	public constructor (
		descriptor?: string,
		nativeCrypto: boolean = false,
		private controller?: IController,
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
						method: 'POST',
						url: Env.baseUrl + 'channels/' + this.state.cyphId,
						data: {channelDescriptor},
						retries: 5
					}), nativeCrypto);
				}
				catch (_) {
					UrlState.set(UrlState.states.notFound);
				}
			})();
		}
	}
}
