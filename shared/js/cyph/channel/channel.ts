/// <reference path="queue.ts" />


module Cyph {
	export module Channel {
		/**
		 * Standard IChannel implementation with the properties
		 * that one would expect: bidirectional, comprised of
		 * two Queues.
		 */
		export class Channel implements IChannel {
			private static channelIds (b?: boolean) : string {
				return b ? '0' : '1';
			}

			/**
			 * Automatically generates a new channel descriptor
			 * containing a GUID and a randomly selected AWS region.
			 */
			public static newDescriptor () : string {
				return JSON.stringify({
					name: Util.generateGuid(Config.longSecretLength),
					region: Config.awsRegions[
						crypto.getRandomValues(new Uint8Array(1))[0] %
						Config.awsRegions.length
					]
				});
			}


			private sqs: any;

			public inQueue: Queue;
			public outQueue: Queue;

			public close (callback?: Function) : void {
				this.inQueue.close(() =>
					this.outQueue.close(callback)
				);
			}

			public isAlive () : boolean {
				return this.inQueue.isAlive() && this.outQueue.isAlive();
			}

			public receive (
				messageHandler?: (message: string) => void,
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

			public send (
				message: string|string[],
				callback?: Function|Function[],
				isSynchronous?: boolean
			) : void {
				this.outQueue.send(message, callback, isSynchronous);
			}

			/**
			 * @param channelName Name of this channel.
			 * @param handlers Event handlers for this channel.
			 * @param config SQS configuration.
			 * @param session Optionally pass in to trigger newChannel event.
			 */
			public constructor (
				channelName: string,
				handlers: ({
					onclose?: (err: any, data: any) => void;
					onconnect?: () => void;
					onlag?: (lag: number, region: string) => void;
					onmessage?: (message: string) => void;
					onopen?: (isCreator: boolean) => void;
				}) = {},
				config: any = {},
				session?: Session.ISession
			) {
				try {
					const descriptor: any	= JSON.parse(channelName);
					channelName				= descriptor.name;
					config.region			= descriptor.region;
				}
				catch (_) {}

				this.sqs	= Queue.sqsWrapper(config);

				const onclose	= () =>
					this.close(handlers.onclose)
				;

				const onconnect	= () : boolean => {
					if (handlers.onconnect) {
						const f: Function		= handlers.onconnect;
						handlers.onconnect	= null;

						f();

						return true;
					}

					return false;
				};


				this.sqs.getQueueUrl({
					QueueName: Queue.queueNamespace + channelName + Channel.channelIds(true)
				}, (err, data) => {
					const isCreator: boolean	= !!err;

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

									const timer: Timer	= new Timer((now: number) => {
										if (!this.inQueue.isAlive) {
											timer.stop();
										}
										else if (now - lastTouched > 600000) {
											lastTouched	= now;

											this.sqs.setQueueAttributes({
												QueueUrl: this.inQueue.queueUrl,
												Attributes: {
													MessageRetentionPeriod:
														Queue.retentionPeriodValues(periodToggle)
												}
											}, () =>
												periodToggle	= !periodToggle
											);
										}
									});


									if (session) {
										session.trigger(
											Session.Events.newChannel,
											this.outQueue.queueName
										);
									}


									if (handlers.onopen) {
										handlers.onopen(isCreator);
									}

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
