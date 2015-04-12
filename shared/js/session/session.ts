/// <reference path="command.ts" />
/// <reference path="enums.ts" />
/// <reference path="iotr.ts" />
/// <reference path="ip2p.ts" />
/// <reference path="isession.ts" />
/// <reference path="message.ts" />
/// <reference path="otr.ts" />
/// <reference path="threadedsession.ts" />
/// <reference path="../analytics.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../errors.ts" />
/// <reference path="../eventmanager.ts" />
/// <reference path="../timer.ts" />
/// <reference path="../util.ts" />
/// <reference path="../channel/ichannel.ts" />
/// <reference path="../channel/ratchetedchannel.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


module Session {
	export class Session implements ISession {
		public static state	= {
			cyphId: 'cyphId',
			sharedSecret: 'sharedSecret',
			hasKeyExchangeBegun: 'hasKeyExchangeBegun',
			isAlive: 'isAlive',
			isCreator: 'isCreator',
			isStartingNewCyph: 'isStartingNewCyph'
		};


		private receivedMessages: {[id: string] : boolean}		= {};
		private sendQueue: string[]								= [];
		private lastIncomingMessageTimestamp: number			= 0;
		private lastOutgoingMessageTimestamp: number			= 0;

		private id: string;
		private channel: Channel.IChannel;
		private otr: IOTR;

		public state	= {
			cyphId: <string> '',
			sharedSecret: <string> '',
			hasKeyExchangeBegun: <boolean> false,
			isAlive: <boolean> true,
			isCreator: <boolean> false,
			isStartingNewCyph: <boolean> false
		};

		public p2p: IP2P;

		private otrHandler (e: { event: OTREvents; data?: string; }) : void {
			switch (e.event) {
				case OTREvents.abort:
					Errors.logSmp();
					this.trigger(Events.smp, false);
					break;

				case OTREvents.authenticated:
					this.trigger(Events.smp, true);
					this.pingPong();
					break;

				case OTREvents.begin:
					this.updateState(Session.state.hasKeyExchangeBegun, true);
					break;

				case OTREvents.receive:
					if (e.data) {
						JSON.parse(e.data).forEach((message: Message) =>
							this.receiveHandler(message)
						);
					}
					break;

				case OTREvents.send:
					if (e.data) {
						this.sendQueue.push(e.data);
					}
					break;
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
					message.event == Events.text ?
						{text: message.data, author: Authors.friend} :
						message.data
				);
			}
		}

		private sendHandler (messages: string[]) : void {
			this.lastOutgoingMessageTimestamp	= Date.now();

			this.channel.send(messages);

			anal.send({
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

			this.updateState(Session.state.cyphId, descriptor.substr(0, middle));
			this.updateState(Session.state.sharedSecret,
				this.state.sharedSecret ||
				descriptor.substr(middle)
			);
		}

		private setUpChannel (channelDescriptor: string) : void {
			this.channel	= new Channel.RatchetedChannel(this, channelDescriptor, {
				onopen: (isCreator: boolean) : void => {
					this.updateState(Session.state.isCreator, isCreator);

					if (this.state.isCreator) {
						this.trigger(Events.beginWaiting);
					}
					else {
						anal.send({
							hitType: 'event',
							eventCategory: 'cyph',
							eventAction: 'started',
							eventValue: 1
						});
					}

					this.otr	= new OTR(this, this.otrHandler);

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
				onmessage: this.receive
			});
		}

		public constructor (descriptor?: string, p2p?: IP2P, id: string = Util.generateGuid()) {
			this.id	= id;

			/* true = yes; false = no; null = maybe */
			this.updateState(Session.state.isStartingNewCyph,
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

				$.ajax({
					type: 'POST',
					url: Env.baseUrl + 'channels/' + this.state.cyphId,
					data: {channelDescriptor},
					success: (data: string) => {
						if (
							this.state.isStartingNewCyph === true &&
							channelDescriptor != data
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


			if (p2p) {
				this.p2p	= p2p;
				this.p2p.init(this);
			}
		}

		public close (shouldSendEvent: boolean = true) : void {
			this.updateState(Session.state.isAlive, false);

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
			if (data == Events.destroy) {
				this.close(false);
			}
			else {
				this.otr.receive(data);
			}
		}

		public send (...messages: Message[]) : void {
			this.sendBase(messages);
		}

		public sendBase (messages: Message[]) : void {
			messages.filter(o => o.event == Events.text).forEach(o =>
				this.trigger(Events.text, {
					text: o.data,
					author: Authors.me
				})
			);

			this.otr.send(JSON.stringify(messages));
		}

		public trigger (event: string, data?: any) : void {
			EventManager.trigger(event + this.id, data);
		}

		public updateState (key: string, value: any) : void {
			this.state[key]	= value;

			if (Env.isMainThread) {
				Controller.update();
			}
			else {
				this.trigger(ThreadedSession.methods.updateStateThread, {key, value});
			}
		}
	}
}
