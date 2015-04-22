/// <reference path="../base.ts" />
/// <reference path="../channel/ratchetedchannel.ts" />
/// <reference path="message.ts" />
/// <reference path="otr.ts" />


module Cyph {
	export module Session {
		export class Session implements ISession {
			private receivedMessages: {[id: string] : boolean}	= {};
			private sendQueue: string[]							= [];
			private lastIncomingMessageTimestamp: number		= 0;
			private lastOutgoingMessageTimestamp: number		= 0;

			private id: string;
			private channel: Channel.IChannel;
			private controller: IController;
			private otr: IOTR;

			public state	= {
				cyphId: <string> '',
				sharedSecret: <string> '',
				hasKeyExchangeBegun: <boolean> false,
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
						this.updateState(State.hasKeyExchangeBegun, true);
						break;
					}
					case OTREvents.receive: {
						if (e.data) {
							for (let message of JSON.parse(e.data)) {
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
						this.close();
					}
					else if (now > nextPing) {
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
					this.lastIncomingMessageTimestamp	= Date.now();
					this.receivedMessages[message.id]	= true;

					this.trigger(message.event,
						message.event === Events.text ?
							{text: message.data, author: Authors.friend} :
							message.data
					);
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

				let middle: number	= Math.ceil(descriptor.length / 2);

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

						let sendTimer: Timer	= new Timer((now: number) => {
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
					onconnect: () => this.trigger(Events.beginChat),
					onmessage: message => this.receive(message)
				});
			}

			public constructor (descriptor?: string, controller?: IController, id: string = Util.generateGuid()) {
				this.controller	= controller;
				this.id			= id;


				/* true = yes; false = no; null = maybe */
				this.updateState(State.isStartingNewCyph,
					!descriptor ?
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
					let channelDescriptor: string	=
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
								Util.pushNotFound();
							}
							else {
								retry();
							}
						}
					});
				});
			}

			public close (shouldSendEvent: boolean = true) : void {
				this.updateState(State.isAlive, false);

				let closeChat: Function	= () =>
					this.channel.close(() =>
						this.trigger(Events.closeChat)
					)
				;

				if (shouldSendEvent) {
					this.channel.send(Events.destroy, closeChat, true);
				}
				else {
					closeChat();
				}
			}

			public off (event: string, handler: Function) : void {
				EventManager.off(event + this.id, handler);
			}

			public on (event: string, handler: Function) : void {
				EventManager.on(event + this.id, handler);
			}

			public receive (data: string) : void {
				if (data === Events.destroy) {
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
				for (let message of messages) {
					if (message.event === Events.text) {
						this.trigger(Events.text, {
							text: message.data,
							author: Authors.me
						});
					}
				}

				this.otr.send(JSON.stringify(messages));
			}

			public sendText (text: string) : void {
				this.send(new Message(Events.text, text));
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
		}
	}
}
