/// <reference path="globals.ts" />
/// <reference path="timer.ts" />
/// <reference path="iconnection.ts" />
/// <reference path="ratchetedchannel.ts" />
/// <reference path="util.ts" />
/// <reference path="mutex.ts" />
/// <reference path="otr.ts" />
/// <reference path="p2p.ts" />
/// <reference path="cyph.im.ui.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


module Session {
	export enum authors { me, friend, app }

	export class Command {
		public method: string;
		public argument: any;

		public constructor (method: string = '', argument?: any) {
			this.method		= method;
			this.argument	= argument;
		}
	}

	export class Message {
		public static destroy: string	= 'destroy';

		public static events	= {
			channelRatchet: 'channelRatchet',
			mutex: 'mutex',
			text: 'text',
			typing: 'typing',
			p2p: 'p2p'
		};


		public id: string;
		public event: string;
		public data: any;

		public constructor (event: string = '', data?: any) {
			this.id		= Date.now() + '-' + crypto.getRandomValues(new Uint32Array(1))[0];
			this.event	= event;
			this.data	= data;
		}
	}

	export class Session {
		private preConnectMessageReceiveQueue: string[]			= [];
		private preConnectMessageSendQueue: string[]			= [];
		private eventListeners: {[event: string] : Function[]}	= {};
		private sendQueue: string[]								= [];
		private receiveQueue: Message[]							= [];
		private receivedMessages: {[id: string] : boolean}		= {};

		private lastIncomingMessageTimestamp: number;
		private lastOutgoingMessageTimestamp: number;
		private messageTimer: Timer;

		public cyphertext: string[]	= [];
		public messages: string[]	= [];

		public channel: IConnection;
		public isAlive: boolean;
		public isConnected: boolean;
		public isCreator: boolean;
		public isOtrReady: boolean;
		public hasKeyExchangeBegun: boolean;
		public isStartingNewCyph: boolean;
		public shouldSendQueryMessage: boolean;
		public cyphId: string;
		public sharedSecret: string;

		private beginChat () : void {
			beginChatUi(() =>
				$(window).on('beforeunload', () => Strings.disconnectWarning)
			);
		}

		private close (hasReceivedDestroySignal?: boolean) : void {
			webRTC.helpers.kill();

			if (hasReceivedDestroySignal) {
				try {
					this.channel.close(closeChat);
				}
				catch (_) {}
				try {
					otrWorker.terminate();
				}
				catch (_) {}
				try {
					Timer.stopAll();
				}
				catch (_) {}

				this.channel	= null;
				otrWorker		= null;
				mutex.owner		= authors.me;
			}
			else if (this.isAlive) {
				this.channel.send(Message.destroy, closeChat, true);
				setTimeout(() => this.close(true), 30000);
			}
			else {
				closeChat();
			}
		}

		/* Intermittent check to verify chat is still alive
			and send fake encrypted chatter */
		private pingPong () : void {
			var nextPing: number	= 0;

			new Timer((now: number) => {
				if (now - this.lastIncomingMessageTimestamp > 180000) {
					this.close();
				}
				else if (now > nextPing) {
					nextPing	= now + (30000 + crypto.getRandomValues(new Uint8Array(1))[0] * 250);
					this.send(new Message());
				}
			});
		}

		private receiveHandler (message: Message) : void {
			if (!this.receivedMessages[message.id]) {
				this.lastIncomingMessageTimestamp	= Date.now();
				this.receivedMessages[message.id]	= true;

				var eventListeners	= this.eventListeners[message.event];
				for (var i = 0 ; eventListeners && i < eventListeners.length ; ++i) {
					eventListeners[i](message.data);
				}
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

			var middle: number	= Math.ceil(descriptor.length / 2);

			this.cyphId			= descriptor.substr(0, middle);
			this.sharedSecret	= this.sharedSecret || descriptor.substr(middle);
		}

		private setUpChannel (channelDescriptor: string) : void {
			this.channel	= new RatchetedChannel(this, channelDescriptor, {
				onopen: (isCreator: boolean) : void => {
					this.isCreator	= isCreator;

					if (this.isCreator) {
						beginWaiting();
					}
					else {
						otr.sendQueryMsg();

						anal.send({
							hitType: 'event',
							eventCategory: 'cyph',
							eventAction: 'started',
							eventValue: 1
						});
					}

					$(window).unload(() => this.close());
				},
				onconnect: this.beginChat,
				onmessage: this.receive
			});
		}

		public constructor (descriptor?: string) {
			/* true = yes; false = no; null = maybe */
			this.isStartingNewCyph	=
				!descriptor ?
					true :
					descriptor.length > Config.secretLength ?
						null :
						false
			;

			this.setDescriptor(descriptor);

			otrWorker.postMessage({method: 0, message: {
				randomSeed: crypto.getRandomValues(new Uint8Array(50000)),
				sharedSecret: this.sharedSecret
			}});


			if (this.isStartingNewCyph !== false) {
				changeState(states.spinningUp);
			}

			Util.retryUntilComplete(retry => {
				var channelDescriptor: string	= this.isStartingNewCyph === false ? '' : Channel.getChannelDescriptor();

				$.ajax({
					type: 'POST',
					url: Env.baseUrl + 'channels/' + this.cyphId,
					data: {channelDescriptor},
					success: (data: string) => {
						if (this.isStartingNewCyph === true && channelDescriptor != data) {
							retry();
						}
						else {
							this.setUpChannel(data);
						}
					},
					error: () => {
						if (this.isStartingNewCyph === false) {
							Util.pushNotFound();
						}
						else {
							retry();
						}
					}
				});
			});


			this.messageTimer	= new Timer((now: number) => {
				/*** send ***/
				if (
					this.isAlive &&
					this.sendQueue.length &&
					(
						this.sendQueue.length >= 4 ||
						!this.lastOutgoingMessageTimestamp ||
						(now - this.lastOutgoingMessageTimestamp) > 500
					)
				) {
					this.sendHandler(this.sendQueue.splice(0, 4));
				}

				/*** receive ***/
				else if (this.receiveQueue.length) {
					this.receiveHandler(this.receiveQueue.shift());
				}

				/*** otrWorker onmessage ***/
				else if (otrWorkerOnMessageQueue.length) {
					var e	= otrWorkerOnMessageQueue.shift();

					switch (e.data.eventName) {
						case 'ui':
							if (e.data.message) {
								JSON.parse(e.data.message).forEach((message: Message) =>
									this.receiveQueue.push(message)
								);
							}
							break;

						case 'io':
							this.sendQueue.push(e.data.message);
							logCyphertext(e.data.message, authors.me);
							break;

						case 'ready':
							this.isOtrReady	= true;

							if (this.shouldSendQueryMessage) {
								otr.sendQueryMsg();
							}

							while (this.preConnectMessageReceiveQueue.length) {
								otr.receiveMsg(this.preConnectMessageReceiveQueue.shift());
							}

							break;

						case 'firstmessage':
							this.hasKeyExchangeBegun	= true;
							break;

						case 'abort':
							Errors.logSmp();
							abortSetup();
							break;

						case 'connected':
							this.isConnected	= true;

							while (this.preConnectMessageSendQueue.length) {
								otr.sendMsg(this.preConnectMessageSendQueue.shift());
							}

							if (webRTC.isSupported) {
								this.send(new Message(Message.events.p2p, new Command()));
							}
							break;

						case 'authenticated':
							markAllAsSent();
							this.pingPong();
							break;
					}
				}
			});



			/* Receive event listeners -- temporarily placing here */

			this.on(Message.events.text, (text: string) => addMessageToChat(text, authors.friend));
			this.on(Message.events.mutex, (command: Command) => mutex.commands[command.method](command.argument));
			this.on(Message.events.typing, friendIsTyping);
			this.on(Message.events.p2p, (command: Command) => {
				if (command.method) {
					webRTC.commands[command.method](command.argument);
				}
				else if (webRTC.isSupported) {
					enableWebRTC();
				}
			});
		}

		public on (event: string, f: Function) : void {
			this.eventListeners[event]	= this.eventListeners[event] || [];
			this.eventListeners[event].push(f);
		}

		public receive (data: string) : void {
			if (data == Message.destroy) {
				this.close(true);
			}
			else {
				otr.receiveMsg(data);
			}

			logCyphertext(data, authors.friend);
		}

		public send (...messages: Message[]) : void {
			otr.sendMsg(JSON.stringify(messages));
		}
	}
}
