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
			private sendQueue: string[]		= [];

			private castle: Crypto.Castle;

			public receive (message?: string) : void {
				if (message) {
					const o: OTRMessageOuter	= Util.deserializeObject(OTRMessageOuter, message);

					if (o.id >= this.incomingMessageId) {
						this.incomingMessages[o.id]	= o.cyphertext;
						this.incomingMessagesMax	= Math.max(this.incomingMessagesMax, o.id);

						this.session.trigger(Events.cyphertext, {
							cyphertext: o.cyphertext,
							author: Users.friend
						});
					}
				}

				if (
					this.incomingMessageId <= this.incomingMessagesMax &&
					this.incomingMessages[this.incomingMessageId]
				) {
					this.castle.receive(this.incomingMessages[this.incomingMessageId]);

					this.incomingMessages[this.incomingMessageId]	= null;
					++this.incomingMessageId;

					if (this.incomingMessageId === Config.maxInt) {
						this.incomingMessageId	= 1;
					}
				}
			}

			public send (message: string) : void {
				if (this.sendQueue) {
					this.sendQueue.push(message);
				}
				else {
					const id: string		= Util.generateGuid();
					const chunks: string[]	= Util.chunkString(message, 16384);

					for (let i = 0 ; i < chunks.length ; ++i) {
						this.castle.send(JSON.stringify(new OTRMessageInner(
							id,
							i,
							chunks.length,
							chunks[i]
						)));
					}
				}
			}

			public constructor (private session: ISession) {
				this.castle	= new Crypto.Castle(this.session.state.sharedSecret, {
					abort: () =>
						this.session.trigger(Events.otr, {event: OTREvents.abort})
					,
					connect: () => {
						const sendQueue	= this.sendQueue;
						this.sendQueue	= null;

						for (const message of sendQueue) {
							this.send(message);
						}

						this.session.trigger(Events.otr, {event: OTREvents.connect});
					},
					receive: (message: string) => {
						const o: OTRMessageInner	= Util.deserializeObject(
							OTRMessageInner,
							message
						);

						if (!this.receivedMessages[o.id]) {
							this.receivedMessages[o.id]	= {
								chunks: [],
								total: 0
							};
						}

						this.receivedMessages[o.id].chunks[o.index]	= o.toString();

						if (++this.receivedMessages[o.id].total === o.total) {
							this.session.trigger(Events.otr, {
								event: OTREvents.receive,
								data: this.receivedMessages[o.id].chunks.join('')
							});

							this.receivedMessages[o.id]	= null;
						}
					},
					send: (cyphertext: string) => {
						this.session.trigger(Events.otr, {
							event: OTREvents.send,
							data: JSON.stringify(new OTRMessageOuter(
								this.currentMessageId++,
								cyphertext
							))
						});

						if (this.currentMessageId === Config.maxInt) {
							this.currentMessageId	= 1;
						}

						this.session.trigger(Events.cyphertext, {
							cyphertext,
							author: Users.me
						});
					}
				});
			}
		}
	}
}
