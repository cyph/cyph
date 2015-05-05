/// <reference path="iotr.ts" />
/// <reference path="otrmessage.ts" />


module Cyph {
	export module Session {
		export class OTR implements IOTR {
			private static overflowRolloverId: number	= 2;


			private currentMessageId: number	= 0;
			private incomingMessageId: number	= 0;
			private incomingMessagesMax: number	= 0;
			private isConnected: boolean		= false;
			private incomingMessages: {[id: string] : string}	= {};
			private receivedMessages: {[id: string] : { chunks: string[]; total: number; }}	= {};
			private receiveQueue: string[]	= [];
			private sendQueue: string[]		= [];

			private otr: any;

			private receiveHandler (message?: string) : void {
				if (message) {
					const o: OTRMessageOuter = Util.deserializeObject(OTRMessageOuter, message);

					if (o.id >= this.incomingMessageId) {
						this.incomingMessages[o.id]	= o.cyphertext;
						this.incomingMessagesMax	= Math.max(this.incomingMessagesMax, o.id);

						this.session.trigger(Events.cyphertext, {
							cyphertext: o.cyphertext,
							author: Authors.friend
						});
					}
				}

				if (
					this.incomingMessageId <= this.incomingMessagesMax &&
					this.incomingMessages[this.incomingMessageId]
				) {
					this.otr.recv(this.incomingMessages[this.incomingMessageId]);

					this.incomingMessages[this.incomingMessageId]	= null;
					++this.incomingMessageId;

					if (this.incomingMessageId === 1) {
						this.session.trigger(Events.otr, {event: OTREvents.begin});
					}
					else if (this.incomingMessageId === Config.maxInt) {
						this.incomingMessageId	= OTR.overflowRolloverId;
					}
				}
			}

			private sendHandler (message?: string) : void {
				if (message) {
					const id: string		= Util.generateGuid();
					const chunks: string[]	= Util.chunkString(message, 5120);

					for (let i = 0 ; i < chunks.length ; ++i) {
						this.otr.send(JSON.stringify(new OTRMessageInner(
							id,
							i,
							chunks.length,
							chunks[i]
						)));
					}
				}
			}

			public receive (message: string) : void {
				this.receiveQueue.push(message);
			}

			public send (message: string) : void {
				this.sendQueue.push(message);
			}

			public constructor (private session: ISession) {
				const user: any	= (new self['OTR'].User).account('me', 'cyph');

				user.generateInstag(() =>
					user.generateKey(() => {
						this.otr	= user.contact('friend').openSession({
							policy: self['OTR'].POLICY.ALLOW_V3,
							MTU: 15872
						});


						this.otr.on('smp', (e: string) => {
							if (e === 'request') {
								this.otr.smpRespond(this.session.state.sharedSecret);
							}
							else if (e === 'complete') {
								this.session.trigger(Events.otr, {event: OTREvents.authenticated});
							}
							else if (e === 'failed' || e === 'aborted') {
								this.session.trigger(Events.otr, {event: OTREvents.abort});
							}
						});


						this.otr.on('message', (message: string, wasEncrypted: boolean) => {
							if (wasEncrypted) {
								const o: OTRMessageInner	= Util.deserializeObject(
									OTRMessageInner,
									message
								);

								if (!this.receivedMessages[o.id]) {
									this.receivedMessages[o.id]	= {
										chunks: [],
										total: 0
									}
								}

								this.receivedMessages[o.id].chunks[o.index]	= o.toString();

								if (++this.receivedMessages[o.id].total === o.total) {
									this.session.trigger(Events.otr, {
										event: OTREvents.receive,
										data: this.receivedMessages[o.id].chunks.join('')
									});

									this.receivedMessages[o.id]	= null;
								}
							}
						});


						this.otr.on('inject_message', (cyphertext: string) => {
							if (cyphertext && cyphertext.indexOf('otr.cypherpunks.ca') > -1) {
								cyphertext	= '?OTRv3?';
							}

							this.session.trigger(Events.otr, {
								event: OTREvents.send,
								data: JSON.stringify(new OTRMessageOuter(
									this.currentMessageId++,
									cyphertext
								))
							});

							if (this.currentMessageId === Config.maxInt) {
								this.currentMessageId	= OTR.overflowRolloverId;
							}

							this.session.trigger(Events.cyphertext, {
								cyphertext,
								author: Authors.me
							});
						});


						this.otr.on('gone_secure', () => {
							if (!this.isConnected) {
								this.isConnected	= true;

								if (this.session.state.isCreator) {
									this.otr.smpStart(this.session.state.sharedSecret);
								}
							}
						});


						if (!this.session.state.isCreator) {
							this.otr.start();
						}


						const timer: Timer	= new Timer(() => {
							if (!this.session.state.isAlive) {
								timer.stop();
							}
							else {
								this.receiveHandler(this.receiveQueue.shift());

								if (this.isConnected) {
									this.sendHandler(this.sendQueue.shift());
								}
							}
						});
					})
				);
			}
		}
	}
}
