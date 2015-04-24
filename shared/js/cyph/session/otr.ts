/// <reference path="iotr.ts" />
/// <reference path="otrmessage.ts" />


module Cyph {
	export module Session {
		export class OTR implements IOTR {
			private currentMessageId: number	= 0;
			private incomingMessageId: number	= 0;
			private incomingMessagesMax: number	= 0;
			private incomingMessages: {[id: string] : string}	= {};
			private receivedMessages: {[id: string] : { chunks: string[]; total: number; }}	= {};
			private receiveQueue: string[]	= [];
			private sendQueue: string[]		= [];

			private otr: any;

			public constructor (private session: ISession) {
				let user: any	= (new self['OTR'].User).account('me', 'cyph');

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
								let o: OTRMessageInner	= Util.deserializeObject(
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

							this.session.trigger(Events.cyphertext, {
								cyphertext,
								author: Authors.me
							});
						});


						this.otr.on('gone_secure', () => {
							if (this.sendQueue) {
								let sendQueue: string[]	= this.sendQueue;
								this.sendQueue			= null;

								for (let message of sendQueue) {
									this.send(message);
								}

								if (this.session.state.isCreator) {
									this.otr.smpStart(this.session.state.sharedSecret);
								}
							}
						});


						if (!this.session.state.isCreator) {
							this.otr.start();
						}

						setTimeout(() => {
							let receiveQueue: string[]	= this.receiveQueue;
							this.receiveQueue			= null;

							for (let message of receiveQueue) {
								this.receive(message);
							}
						}, 500);
					})
				);
			}

			public receive (message: string) : void {
				if (!message) {
					return;
				}

				if (this.receiveQueue) {
					this.receiveQueue.push(message);
				}
				else {
					let o: OTRMessageOuter = Util.deserializeObject(OTRMessageOuter, message);

					if (o.id >= this.incomingMessageId) {
						this.incomingMessages[o.id]	= o.cyphertext;
						this.incomingMessagesMax	= Math.max(this.incomingMessagesMax, o.id);

						this.session.trigger(Events.cyphertext, {
							cyphertext: o.cyphertext,
							author: Authors.friend
						});
					}

					while (
						this.incomingMessageId <= this.incomingMessagesMax &&
						this.incomingMessages[this.incomingMessageId]
					) {
						this.otr.recv(this.incomingMessages[this.incomingMessageId]);

						this.incomingMessages[this.incomingMessageId]	= null;
						++this.incomingMessageId;

						if (this.incomingMessageId === 1) {
							this.session.trigger(Events.otr, {event: OTREvents.begin});
						}
					}
				}
			}

			public send (message: string) : void {
				if (this.sendQueue) {
					this.sendQueue.push(message);
				}
				else {
					let id		= Util.generateGuid();
					let chunks	= Util.chunkString(message, 5120);

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
		}
	}
}
