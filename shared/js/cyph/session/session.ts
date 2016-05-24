/// <reference path="../../global/base.ts" />

import {Command} from 'command';
import {CastleEvents, Events, RPCEvents, State, ThreadedSessionEvents, Users} from 'enums';
import {IMessage} from 'imessage';
import {IMutex} from 'imutex';
import {ISession} from 'isession';
import {Message} from 'message';
import {Mutex} from 'mutex';
import {ThreadedSession} from 'threadedsession';
import {Analytics} from 'cyph/analytics';
import {Config} from 'cyph/config';
import {Env} from 'cyph/env';
import {Errors} from 'cyph/errors';
import {EventManager} from 'cyph/eventmanager';
import {IController} from 'cyph/icontroller';
import {Timer} from 'cyph/timer';
import {UrlState} from 'cyph/urlstate';
import {Util} from 'cyph/util';
import * as Channel from 'channel/channel';
import * as Crypto from 'crypto/crypto';


export {
	CastleEvents,
	Command,
	Events,
	IMessage,
	IMutex,
	ISession,
	Message,
	Mutex,
	RPCEvents,
	State,
	ThreadedSession,
	ThreadedSessionEvents,
	Users
};


/**
 * Standard ISession implementation with the properties
 * that one would expect.
 */
export class Session implements ISession {
	private receivedMessages: {[id: string] : boolean}	= {};
	private sendQueue: string[]							= [];
	private lastIncomingMessageTimestamp: number		= Date.now();
	private lastOutgoingMessageTimestamp: number		= Date.now();
	private pingPongTimeouts: number					= 0;
	private isLocalSession: boolean						= false;

	private channel: Channel.IChannel;
	private castle: Crypto.ICastle;

	public state	= {
		cyphId: <string> '',
		sharedSecret: <string> '',
		isAlive: <boolean> true,
		isCreator: <boolean> false,
		isStartingNewCyph: <boolean> false,
		wasInitiatedByAPI: <boolean> false
	};

	private castleHandler (e: { event: CastleEvents; data?: string; }) : void {
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
				this.lastIncomingMessageTimestamp	= Date.now();

				if (e.data) {
					const data: Message[]	= (() => {
						try {
							return JSON.parse(e.data);
						}
						catch (_) {
							return [];
						}
					})();

					for (const message of data) {
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

	/* Intermittent check to verify chat is still alive
		and send fake encrypted chatter */
	private pingPong () : void {
		let nextPing: number	= 0;

		new Timer((now: number) => {
			if (now - this.lastIncomingMessageTimestamp > 180000) {
				if (this.pingPongTimeouts++ < 2) {
					this.lastIncomingMessageTimestamp	= Date.now();

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

	private receiveHandler (message: Message) : void {
		if (!this.receivedMessages[message.id]) {
			this.receivedMessages[message.id]	= true;

			if (message.event in RPCEvents) {
				this.trigger(message.event,
					message.event === RPCEvents.text ?
						{text: message.data, author: Users.friend} :
						message.data
				);
			}
		}
	}

	private sendHandler (messages: string[]) : void {
		this.lastOutgoingMessageTimestamp	= Date.now();

		this.channel.send(messages);

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
		localChannelCallback?: (localChannel: Channel.LocalChannel) => void
	) : void {
		if (localChannelCallback) {
			this.isLocalSession	= true;
		}

		const handlers	= {
			onopen: (isCreator: boolean) : void => {
				this.updateState(State.isCreator, isCreator);

				if (this.state.isCreator) {
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
			},
			onconnect: () => {
				this.trigger(Events.connect);

				if (this.isLocalSession) {
					this.castle	= new Crypto.FakeCastle(this);
				}
				else {
					this.castle	= new Crypto.Castle(this);
				}
			},
			onmessage: message => this.receive(message)
		};

		if (localChannelCallback) {
			this.channel	= new Channel.LocalChannel(handlers);
			localChannelCallback(<Channel.LocalChannel> this.channel);
		}
		else {
			this.channel	= new Channel.RatchetedChannel(this, channelDescriptor, handlers);
		}
	}

	public close (shouldSendEvent: boolean = true) : void {
		this.updateState(State.isAlive, false);

		const closeChat: Function	= () => this.trigger(Events.closeChat);

		if (shouldSendEvent) {
			this.channel.send(RPCEvents.destroy, closeChat, true);

			if (!this.isLocalSession) {
				/* If aborting before the cyph begins,
					block friend from trying to join */
				Util.request({
					method: 'POST',
					url: Env.baseUrl + 'channels/' + this.state.cyphId
				});
			}
		}
		else {
			this.channel.close(closeChat);
		}

		if (!Env.isMainThread) {
			setTimeout(() => self.close(), 120000);
		}
	}

	public off (event: string, handler: Function) : void {
		EventManager.off(event + this.id, handler);
	}

	public on (event: string, handler: Function) : void {
		EventManager.on(event + this.id, handler);
	}

	public receive (data: string) : void {
		if (data === RPCEvents.destroy) {
			this.close(false);
		}
		else if (this.castle) {
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
		if (this.castle) {
			for (const message of messages) {
				if (message.event === RPCEvents.text) {
					this.trigger(RPCEvents.text, {
						text: message.data,
						author: Users.me
					});
				}
			}

			this.castle.send(JSON.stringify(messages));
		}
		else {
			setTimeout(() => this.sendBase(messages), 250);
		}
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
	public constructor(
		descriptor?: string,
		private controller?: IController,
		private id: string = Util.generateGuid(),
		localChannelCallback?: (localChannel: Channel.LocalChannel) => void
	) {
		/* true = yes; false = no; null = maybe */
		this.updateState(
			State.isStartingNewCyph,
			!descriptor || descriptor === 'new' ?
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
			this.setUpChannel(null, localChannelCallback);
		}
		else {
			Util.retryUntilComplete(retry => {
				const channelDescriptor: string	=
					this.state.isStartingNewCyph === false ?
						'' :
						Channel.Channel.newDescriptor()
				;

				Util.request({
					method: 'POST',
					url: Env.baseUrl + 'channels/' + this.state.cyphId,
					data: {channelDescriptor},
					success: (data: string) => {
						if (
							this.state.isStartingNewCyph === true &&
							channelDescriptor !== data
						) {
							retry();
						}
						else {
							this.setUpChannel(data);
						}
					},
					error: () => {
						if (this.state.isStartingNewCyph === false) {
							UrlState.set(UrlState.states.notFound);
						}
						else {
							retry();
						}
					}
				});
			});
		}
	}
}
