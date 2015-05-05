/// <reference path="../base.ts" />
/// <reference path="../channel/ratchetedchannel.ts" />
/// <reference path="command.ts" />
/// <reference path="message.ts" />
/// <reference path="otr.ts" />


module Cyph {
	export module Session {
		export class Session implements ISession {
			private receivedMessages: {[id: string] : boolean}	= {};
			private sendQueue: string[]							= [];
			private lastIncomingMessageTimestamp: number		= Date.now();
			private lastOutgoingMessageTimestamp: number		= Date.now();
			private pingPongTimeouts: number					= 0

			private channel: Channel.IChannel;
			private otr: IOTR;

			public state	= {
				cyphId: <string> '',
				sharedSecret: <string> '',
				isAlive: <boolean> true,
				isCreator: <boolean> false,
				isStartingNewCyph: <boolean> false
			};

			private otrHandler (e: { event: OTREvents; data?: string; }) : void {
				switch (e.event) {
					case OTREvents.abort: {
						Errors.logSmp();
						this.trigger(Events.smp, false);
						break;
					}
					case OTREvents.authenticated: {
						this.trigger(Events.smp, true);
						this.pingPong();
						break;
					}
					case OTREvents.begin: {
						this.trigger(Events.beginChat);
						break;
					}
					case OTREvents.receive: {
						this.lastIncomingMessageTimestamp	= Date.now();

						if (e.data) {
							for (const message of JSON.parse(e.data)) {
								this.receiveHandler(message);
							}
						}
						break;
					}
					case OTREvents.send: {
						if (e.data) {
							this.sendQueue.push(e.data);
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

							Analytics.main.send({
								hitType: 'event',
								eventCategory: 'pingPongTimeout',
								eventAction: 'detected',
								eventValue: 1
							});
						}
					}
					else {
						this.pingPongTimeouts	= 0;
					}

					if (now > nextPing) {
						this.send(new Message);

						nextPing	=
							now +
							30000 +
							crypto.getRandomValues(new Uint8Array(1))[0] * 250
						;
					}
				});
			}

			private receiveHandler (message: Message) : void {
				if (!this.receivedMessages[message.id]) {
					this.receivedMessages[message.id]	= true;

					if (message.event in RPCEvents) {
						this.trigger(message.event,
							message.event === RPCEvents.text ?
								{text: message.data, author: Authors.friend} :
								message.data
						);
					}
				}
			}

			private sendHandler (messages: string[]) : void {
				this.lastOutgoingMessageTimestamp	= Date.now();

				this.channel.send(messages);

				Analytics.main.send({
					hitType: 'event',
					eventCategory: 'message',
					eventAction: 'sent',
					eventValue: messages.length
				});
			}

			private setDescriptor (descriptor?: string) : void {
				if (!descriptor || descriptor.length < Config.secretLength) {
					descriptor	= Util.generateGuid(Config.secretLength);
				}

				const middle: number	= Math.ceil(descriptor.length / 2);

				this.updateState(State.cyphId, descriptor.substr(0, middle));
				this.updateState(State.sharedSecret,
					this.state.sharedSecret ||
					descriptor.substr(middle)
				);
			}

			private setUpChannel (channelDescriptor: string) : void {
				this.channel	= new Channel.RatchetedChannel(this, channelDescriptor, {
					onopen: (isCreator: boolean) : void => {
						this.updateState(State.isCreator, isCreator);

						if (this.state.isCreator) {
							this.trigger(Events.beginWaiting);
						}
						else {
							Analytics.main.send({
								hitType: 'event',
								eventCategory: 'cyph',
								eventAction: 'started',
								eventValue: 1
							});
						}

						this.on(Events.otr, e => this.otrHandler(e));
						this.otr	= new OTR(this);

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
					},
					onconnect: () => this.trigger(Events.connect),
					onmessage: message => this.receive(message)
				});
			}

			public close (shouldSendEvent: boolean = true) : void {
				this.updateState(State.isAlive, false);

				const closeChat: Function	= () => this.trigger(Events.closeChat);

				if (shouldSendEvent) {
					this.channel.send(RPCEvents.destroy, closeChat, true);
				}
				else {
					this.channel.close(closeChat);
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
				else {
					this.otr.receive(data);
				}
			}

			public send (...messages: IMessage[]) : void {
				this.sendBase(messages);
			}

			public sendBase (messages: IMessage[]) : void {
				if (this.otr) {
					for (const message of messages) {
						if (message.event === RPCEvents.text) {
							this.trigger(RPCEvents.text, {
								text: message.data,
								author: Authors.me
							});
						}
					}

					this.otr.send(JSON.stringify(messages));
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

			public constructor (
				descriptor?: string,
				private controller?: IController,
				private id: string = Util.generateGuid()
			) {
				/* true = yes; false = no; null = maybe */
				this.updateState(State.isStartingNewCyph,
					!descriptor || descriptor === 'new' ?
						true :
						descriptor.length > Config.secretLength ?
							null :
							false
				);

				this.setDescriptor(descriptor);


				if (this.state.isStartingNewCyph !== false) {
					this.trigger(Events.newCyph);
				}

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
}
