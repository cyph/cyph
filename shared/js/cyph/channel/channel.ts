/// <reference path="queue.ts" />


/* Bidirectional channel, comprised of two queues */

module Cyph {
	export module Channel {
		export class Channel implements IChannel {
			private static channelIds (b?: boolean) : string {
				return b ? '0' : '1';
			}

			public static newDescriptor () : string {
				return JSON.stringify({
					name: Util.generateGuid(Config.longSecretLength),
					region: Config.awsRegions[
						crypto.getRandomValues(new Uint8Array(1))[0] %
						Config.awsRegions.length
					]
				});
			}


			private inQueue: Queue;
			private outQueue: Queue;
			private sqs: any;

			public close (callback?: Function) : void {
				this.inQueue.close(() =>
					this.outQueue.close(callback)
				);
			}

			public isAlive () : boolean {
				return this.inQueue.isAlive() && this.outQueue.isAlive();
			}

			public receive (
				messageHandler?: Function,
				onComplete?: Function,
				maxNumberOfMessages?: number,
				waitTimeSeconds?: number,
				onLag?: Function
			) : void {
				this.inQueue.receive(
					messageHandler,
					onComplete,
					maxNumberOfMessages,
					waitTimeSeconds,
					onLag
				);
			}

			public send (message: string|string[], callback?: Function|Function[], isSynchronous?: boolean) : void {
				this.outQueue.send(message, callback, isSynchronous);
			}

			public constructor (channelName: string, handlers: any = {}, config: any = {}) {
				try {
					let descriptor: any	= JSON.parse(channelName);
					channelName			= descriptor.name;
					config.region		= descriptor.region;
				}
				catch (_) {}

				this.sqs	= Queue.sqsWrapper(config);

				let onclose	= () =>
					this.close(handlers.onclose)
				;

				let onconnect	= () : boolean => {
					if (handlers.onconnect) {
						let f: Function		= handlers.onconnect;
						handlers.onconnect	= null;

						f();

						return true;
					}

					return false;
				};


				this.sqs.getQueueUrl({
					QueueName: Queue.queuePrefix + channelName + Channel.channelIds(true)
				}, (err, data) => {
					let isCreator: boolean	= !!err;

					this.inQueue	= new Queue(channelName + Channel.channelIds(isCreator), {
						onmessage: (message: string) => {
							if (!onconnect() && handlers.onmessage) {
								handlers.onmessage(message);
							}
						},
						onlag: handlers.onlag,
						onclose: onclose,
						onopen: () => {
							this.outQueue	= new Queue(channelName + Channel.channelIds(!isCreator), {
								onclose: onclose,
								onopen: () => {
									/* Keep this channel alive by touching it every 10 minutes */

									let lastTouched: number		= Date.now();
									let periodToggle: boolean	= false;

									let timer: Timer	= new Timer((now: number) => {
										if (!this.inQueue.isAlive) {
											timer.stop();
										}
										else if (now - lastTouched > 600000) {
											lastTouched	= now;

											this.sqs.setQueueAttributes({
												QueueUrl: this.inQueue.queueUrl,
												Attributes: {
													MessageRetentionPeriod: Queue.periodValues(periodToggle)
												}
											}, () =>
												periodToggle	= !periodToggle
											);
										}
									});


									handlers.onopen && handlers.onopen(isCreator);

									if (!isCreator) {
										this.send('');
										onconnect();
									}
								}
							}, config);
						}
					}, config);
				});
			}
		}
	}
}
