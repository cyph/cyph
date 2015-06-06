/// <reference path="icastle.ts" />
/// <reference path="castlemessageinner.ts" />
/// <reference path="castlemessageouter.ts" />
/// <reference path="castlecore.ts" />


module Cyph {
	export module Crypto {
		export class Castle implements ICastle {
			private currentMessageId: number	= 0;
			private incomingMessageId: number	= 0;
			private incomingMessagesMax: number	= 0;
			private incomingMessages: {[id: string] : string}	= {};
			private receivedMessages: {[id: string] : { chunks: string[]; total: number; }}	= {};
			private sendQueue: string[]		= [];

			private core: CastleCore;

			public receive (message?: string) : void {
				if (message) {
					const o: CastleMessageOuter	= Util.deserializeObject(CastleMessageOuter, message);

					if (o.id >= this.incomingMessageId) {
						this.incomingMessages[o.id]	= o.cyphertext;
						this.incomingMessagesMax	= Math.max(this.incomingMessagesMax, o.id);

						this.session.trigger(Session.Events.cyphertext, {
							cyphertext: o.cyphertext,
							author: Session.Users.friend
						});
					}
				}

				while (
					this.incomingMessageId <= this.incomingMessagesMax &&
					this.incomingMessages[this.incomingMessageId]
				) {
					this.core.receive(this.incomingMessages[this.incomingMessageId]);

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
					const chunks: string[]	= Util.chunkString(message, 40000);

					for (let i = 0 ; i < chunks.length ; ++i) {
						this.core.send(JSON.stringify(new CastleMessageInner(
							id,
							i,
							chunks.length,
							chunks[i]
						)));
					}
				}
			}

			public constructor (private session: Session.ISession) {
				this.core	= new CastleCore(this.session.state.sharedSecret, {
					abort: () =>
						this.session.trigger(Session.Events.castle, {event: Session.CastleEvents.abort})
					,
					connect: () => {
						const sendQueue	= this.sendQueue;
						this.sendQueue	= null;

						for (const message of sendQueue) {
							this.send(message);
						}

						this.session.trigger(Session.Events.castle, {event: Session.CastleEvents.connect});
					},
					receive: (message: string) => {
						const o: CastleMessageInner	= Util.deserializeObject(
							CastleMessageInner,
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
							this.session.trigger(Session.Events.castle, {
								event: Session.CastleEvents.receive,
								data: this.receivedMessages[o.id].chunks.join('')
							});

							this.receivedMessages[o.id]	= null;
						}
					},
					send: (cyphertext: string) => {
						this.session.trigger(Session.Events.castle, {
							event: Session.CastleEvents.send,
							data: JSON.stringify(new CastleMessageOuter(
								this.currentMessageId++,
								cyphertext
							))
						});

						if (this.currentMessageId === Config.maxInt) {
							this.currentMessageId	= 1;
						}

						this.session.trigger(Session.Events.cyphertext, {
							cyphertext,
							author: Session.Users.me
						});
					}
				});

				/* Wipe shared secret when finished with it */
				this.session.updateState(Session.State.sharedSecret, '');
			}
		}
	}
}
