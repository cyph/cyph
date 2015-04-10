/// <reference path="session.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../util.ts" />


module Session {
	export class OTR {
		private static libotr: any	= window['OTR'];


		private currentMessageId: number	= 0;
		private incomingMessageId: number	= 0;
		private incomingMessagesMax: number	= 0;
		private incomingMessages: {[id: string] : string}	= {};
		private receivedMessages: {[id: string] : { chunks: string[]; total: number; }}	= {};
		private receiveQueue: string[]	= [];
		private sendQueue: string[]		= [];

		private otr: any;
		private session: Session

		public constructor (session: Session) {
			this.session	= session;
			let user		= (new OTR.libotr.User).account('me', 'cyph');

			user.generateInstag(() =>
				user.generateKey(() => {
					this.otr	= user.contact('friend').openSession({
						policy: OTR.libotr.POLICY.ALLOW_V3,
						MTU: 15872
					});


					this.otr.on('smp', (e: string) => {
						switch (e) {
							case 'request':
								this.otr.smpRespond(this.session.sharedSecret);
								break;

							case 'complete':
								this.session.trigger(Events.otr, {event: OTREvents.authenticated});
								break;

							case 'failed':
							case 'aborted':
								this.session.trigger(Events.otr, {event: OTREvents.abort});
								break;
						}
					});


					this.otr.on('message', (message: string, wasEncrypted: boolean) => {
						if (wasEncrypted) {
							let o: OTRMessageInner	= JSON.parse(message);

							if (!this.receivedMessages[o.id]) {
								this.receivedMessages[o.id]	= {
									chunks: [],
									total: 0
								}
							}

							this.receivedMessages[o.id].chunks[o.index]	= o.toString();

							if (++this.receivedMessages[o.id].total == o.total) {
								this.session.trigger(Events.otr, {
									event: OTREvents.receive,
									data: this.receivedMessages[o.id].chunks.join('')
								});

								delete this.receivedMessages[o.id];
							}
						}
					});


					this.otr.on('inject_message', (cyphertext: string) => {
						if (cyphertext && cyphertext.indexOf('this.otr.cypherpunks.ca') > -1) {
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


					let isConnected: boolean	= false;

					this.otr.on('gone_secure', () => {
						if (!isConnected) {
							isConnected	= true;

							while (this.sendQueue.length) {
								this.otr.send(this.sendQueue.shift());
							}

							if (this.session.isCreator) {
								this.otr.smpStart(this.session.sharedSecret);
							}
						}
					});


					if (!this.session.isCreator) {
						this.otr.start();
					}

					setTimeout(() => {
						while (this.receiveQueue.length) {
							this.otr.receive(this.receiveQueue.shift());
						}
					}, 500);
				})
			);
		}

		public receive (message: string) : void {
			if (this.otr) {
				let o: OTRMessageOuter	= JSON.parse(message);

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

					delete this.incomingMessages[this.incomingMessageId];
					++this.incomingMessageId;

					if (this.incomingMessageId == 1) {
						this.session.trigger(Events.otr, {event: OTREvents.begin});
					}
				}
			}
			else {
				this.receiveQueue.push(message);
			}
		}

		public send (message: string) : void {
			if (this.otr) {
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
			else {
				this.sendQueue.push(message);
			}
		}
	}
}