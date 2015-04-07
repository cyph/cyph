/// <reference path="globals.ts" />
/// <reference path="timer.ts" />
/// <reference path="queue.ts" />
/// <reference path="../lib/typings/aws-sdk/aws-sdk.d.ts" />


/* Bidirectional channel, comprised of two queues */

class Channel {
	public static channelIds (b?: boolean) : string {
		return b ? '0' : '1';
	}

	public static getChannelDescriptor () : string {
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

	public descriptor: string;
	public sqs: any;

	public constructor (channelName: string, handlers?: any, config?: any) {
		handlers	= handlers || {};
		config		= config || {};

		try {
			var channelDescriptor: any	= JSON.parse(channelName);
			this.descriptor				= channelName;
			channelName					= channelDescriptor.name;
			config.region				= channelDescriptor.region;
		}
		catch (e) {}

		this.sqs	= Queue.sqsWrapper(config);

		var onclose	= () =>
			this.close(handlers.onclose)
		;
		
		this.sqs.getQueueUrl({
			QueueName: Queue.queuePrefix + channelName + Channel.channelIds(true)
		}, (err, data) => {
			var isCreator: boolean	= !!err;

			this.inQueue	= new Queue(channelName + Channel.channelIds(isCreator), {
				onmessage: handlers.onmessage,
				onlag: handlers.onlag,
				onclose: onclose,
				onopen: () => {
					this.outQueue	= new Queue(channelName + Channel.channelIds(!isCreator), {
						onclose: onclose,
						onopen: () => {
							/* Keep this channel alive by touching it every 10 minutes */

							var lastTouched: number		= Date.now();
							var periodToggle: boolean	= false;

							var timer: Timer	= new Timer((now) => {
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
						}
					}, config);
				}
			}, config);
		});
	}

	public close (callback: Function) : void {
		this.inQueue.close(() =>
			this.outQueue.close(callback)
		);
	}

	public isAlive () : boolean {
		return this.inQueue.isAlive && this.outQueue.isAlive;
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

	public send (message: any, callback?: Function, isSynchronous?: boolean) : void {
		this.outQueue.send(message, callback, isSynchronous);
	}
}
