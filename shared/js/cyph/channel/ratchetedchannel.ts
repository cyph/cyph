/// <reference path="channel.ts" />
/// <reference path="ichannel.ts" />
/// <reference path="../analytics.ts" />
/// <reference path="../util.ts" />
/// <reference path="../session/enums.ts" />
/// <reference path="../session/isession.ts" />
/// <reference path="../../global/base.ts" />


/*
	Channel with built-in ratcheting of ID and region

	Ratcheting steps:
		Alice: create new channel, send descriptor over current channel
		Bob: join new channel, ack descriptor over current channel, deprecate current channel
		Alice: deprecate current channel
		Both: wait a bit, then destroy old channel
*/

module Cyph {
	export module Channel {
		export class RatchetedChannel implements IChannel {
			private lastChannelRatchet: number	= 0;

			private isCreator: boolean;
			private channel: Channel;
			private newChannel: Channel;
			private session: Session.ISession;

			private destroyCurrentChannel () : void {
				if (this.newChannel) {
					let oldChannel: Channel	= this.channel;
					this.channel			= this.newChannel;
					this.newChannel			= null;

					if (oldChannel) {
						setTimeout(() => oldChannel.close, 150000);
					}
				}
			}

			private ratchetChannels (channelDescriptor?: string) : void {
				let init: boolean	= !channelDescriptor;

				/* Block ratchet from being initiated more than once within a five-minute period */
				if (init) {
					let last: number		= this.lastChannelRatchet;
					this.lastChannelRatchet	= Date.now();

					if (this.lastChannelRatchet - last < 300000) {
						return;
					}
				}


				if (this.newChannel) {
					this.destroyCurrentChannel();
				}
				else {
					channelDescriptor	= channelDescriptor || Channel.newDescriptor();
					this.newChannel		= new Channel(channelDescriptor, {
						onopen: () => {
							this.session.send(
								new Session.Message(
									Session.Events.channelRatchet,
									channelDescriptor
								)
							);

							if (!init) {
								setTimeout(this.destroyCurrentChannel, 10000);
							}
						},
						onmessage: this.session.receive,
						onlag: (lag: number, region: string) => {
							if (!this.isCreator) {
								this.ratchetChannels();
							}

							anal.send({
								hitType: 'event',
								eventCategory: 'sqslag',
								eventAction: 'detected',
								eventLabel: region,
								eventValue: lag
							});
						}
					});
				}
			}

			public constructor (session: Session.ISession, channelName: string, handlers: any = {}, config: any = {}) {
				this.session	= session;

				this.session.on(Session.Events.channelRatchet, this.ratchetChannels);


				let onopen: Function	= handlers.onopen;

				handlers.onopen		= (isCreator: boolean) : void => {
					this.isCreator	= isCreator;

					/* Ratchet channels immediately after creation,
						then every 10 - 20 minutes thereafter */
					if (!this.isCreator) {
						Util.retryUntilComplete(retry => {
							if (this.isAlive()) {
								this.ratchetChannels();

								setTimeout(
									retry,
									600000 + crypto.getRandomValues(new Uint8Array(1))[0] * 2350
								);
							}
						});
					};

					onopen && onopen(this.isCreator);
				};

				this.channel	= new Channel(channelName, handlers, config);
			}

			public close (callback?: Function) : void {
				[this.channel, this.newChannel].forEach(channel => {
					try {
						channel.close(callback);
					}
					catch (_) {}
				});

				this.channel	= null;
				this.newChannel	= null;
			}

			public isAlive () : boolean {
				return [this.channel, this.newChannel].
					map(channel => {
						try {
							return channel.isAlive();
						}
						catch (_) {
							return false;
						}
					}).
					reduce((a, b) => a || b, false)
				;
			}

			public receive (
				messageHandler?: Function,
				onComplete?: Function,
				maxNumberOfMessages?: number,
				waitTimeSeconds?: number,
				onLag?: Function
			) : void {
				Util.retryUntilComplete(retry => {
					try {
						this.channel.receive(
							messageHandler,
							onComplete,
							maxNumberOfMessages,
							waitTimeSeconds,
							onLag
						);
					}
					catch (_) {
						if (this.isAlive()) {
							retry();
						}
					}
				});
			}

			public send (message: string|string[], callback?: Function|Function[], isSynchronous?: boolean) : void {
				Util.retryUntilComplete(retry => {
					try {
						this.channel.send(message, callback, isSynchronous);
					}
					catch (_) {
						if (this.isAlive()) {
							retry();
						}
					}
				});
			}
		}
	}
}
