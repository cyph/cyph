/// <reference path="command.ts" />
/// <reference path="enums.ts" />
/// <reference path="message.ts" />
/// <reference path="otr.ts" />
/// <reference path="p2p.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../timer.ts" />
/// <reference path="../util.ts" />
/// <reference path="../connection/iconnection.ts" />
/// <reference path="../connection/ratchetedchannel.ts" />
/// <reference path="../cyph.im/strings.ts" />
/// <reference path="../cyph.im/ui.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


module Session {
	export class Session {
		private eventListeners: {[event: string] : Function[]}	= {};
		private receivedMessages: {[id: string] : boolean}		= {};
		private sendQueue: string[]								= [];

		private otr: OTR;
		private channel: Connection.IConnection;
		private lastIncomingMessageTimestamp: number;
		private lastOutgoingMessageTimestamp: number;

		public state	= {
			cyphId: <string> '',
			sharedSecret: <string> '',
			hasKeyExchangeBegun: <boolean> false,
			isAlive: <boolean> true,
			isCreator: <boolean> false,
			isStartingNewCyph: <boolean> false
		};

		public p2p: P2P;

		private close (shouldSendEvent: boolean = true) : void {
			this.updateState('isAlive', false);

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

		private otrHandler (e: { event: OTREvents; data?: string; }) {
			switch (e.event) {
				case OTREvents.abort:
					Errors.logSmp();
					abortSetup();
					break;

				case OTREvents.authenticated:
					markAllAsSent();
					this.pingPong();
					break;

				case OTREvents.begin:
					this.updateState('hasKeyExchangeBegun', true);
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
				this.trigger(message.event, message.data);
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

			this.updateState('cyphId', descriptor.substr(0, middle));
			this.updateState('sharedSecret',
				this.state.sharedSecret ||
				descriptor.substr(middle)
			);
		}

		private setUpChannel (channelDescriptor: string) : void {
			this.channel	= new Connection.RatchetedChannel(this, channelDescriptor, {
				onopen: (isCreator: boolean) : void => {
					this.updateState('isCreator', isCreator);

					if (this.state.isCreator) {
						beginWaiting();
					}
					else {
						anal.send({
							hitType: 'event',
							eventCategory: 'cyph',
							eventAction: 'started',
							eventValue: 1
						});
					}

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
				onmessage: this.receive
			});
		}

		public constructor (descriptor?: string, shouldSetUpP2P: boolean = true) {
			/* true = yes; false = no; null = maybe */
			this.updateState('isStartingNewCyph',
				!descriptor ?
					true :
					descriptor.length > Config.secretLength ?
						null :
						false
			);

			this.setDescriptor(descriptor);


			if (this.state.isStartingNewCyph !== false) {
				changeState(states.spinningUp);
			}

			Util.retryUntilComplete(retry => {
				let channelDescriptor: string	=
					this.state.isStartingNewCyph === false ?
						'' :
						Connection.Channel.newDescriptor()
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


			if (shouldSetUpP2P) {
				this.p2p	= new P2P(this);
			}


			/* Receive event listeners -- temporarily placing here */

			this.on(Events.otr, this.otrHandler);
			this.on(Events.cyphertext, (o: { cyphertext: string; author: Authors; }) =>
				logCyphertext(o.cyphertext, o.author)
			);
			this.on(Events.text, (text: string) => addMessageToChat(text, Authors.friend));
			this.on(Events.typing, friendIsTyping);
			this.on(Events.beginChat, () =>
				beginChatUi(() => {
					$(window).unload(() => this.close());
					$(window).on('beforeunload', () => Cyph.im.Strings.disconnectWarning)
				})
			);
			this.on(Events.closeChat, closeChat);
		}

		public off (event: string, f: Function) : void {
			var events: Function[]	= this.eventListeners[event];

			for (let i = 0 ; events && i < events.length ; ++i) {
				if (events[i] == f) {
					delete events[i];
				}
			}
		}

		public on (event: string, f: Function) : void {
			this.eventListeners[event]	= this.eventListeners[event] || [];
			this.eventListeners[event].push(f);
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
			this.otr.send(JSON.stringify(messages));
		}

		public trigger (event: string, data?: any) : void {
			let eventListeners	= this.eventListeners[event];
			for (let i = 0 ; eventListeners && i < eventListeners.length ; ++i) {
				eventListeners[i](data);
			}
		}

		public updateState (key: string, value: any) {
			this.state[key]	= value;
		}
	}
}
