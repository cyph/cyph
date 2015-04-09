/// <reference path="globals.ts" />
/// <reference path="config.ts" />
/// <reference path="env.ts" />
/// <reference path="util.ts" />
/// <reference path="aws.ts" />
/// <reference path="iconnection.ts" />
/// <reference path="../lib/typings/aws-sdk/aws-sdk.d.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


/* Unidirectional queue */

class Queue implements IConnection {
	public static nonExistentQueue: string	= 'AWS.SimpleQueueService.NonExistentQueue';
	public static queuePrefix: string		= 'channels-';

	public static periodValues (b?: boolean) : string {
		return b ? '1800' : '1801';
	}

	public static sqsWrapper (config: any = {}) : any {
		if (Env.isLocalhost) {
			config.endpoint	= 'http://localhost:4568';
		}

		var wrapper	= {
			innerSqs: new Aws.base.SQS(config)
		};

		/* Add methods that take an object and an optional callback */
		[
			'createQueue',
			'deleteMessage',
			'deleteMessageBatch',
			'deleteQueue',
			'getQueueUrl',
			'receiveMessage',
			'sendMessage',
			'sendMessageBatch',
			'setQueueAttributes'
		].forEach(method =>
			wrapper[method]	= (o: any, f: Function, shouldretryUntilComplete?: boolean) => {
				Util.retryUntilComplete(retry =>
					wrapper.innerSqs[method](o, (...args: any[]) => {
						var err: any	= args[0];

						if (shouldretryUntilComplete && err) {
							retry();
						}
						else if (f) {
							f.apply(this, args);
						}
					})
				);
			}
		);

		return wrapper;
	}


	private isQueueAlive: boolean;

	public queueUrl: string;
	public sqs: any;

	public constructor (queueName: string, handlers: any = {}, config: any = {}) {
		this.sqs			= Queue.sqsWrapper(config);
		this.isQueueAlive	= true;

		this.sqs.createQueue({
			QueueName: Queue.queuePrefix + queueName,
			Attributes: {
				MessageRetentionPeriod: Queue.periodValues(true),
				ReceiveMessageWaitTimeSeconds: '20'
			}
		}, (err, data) => {
			if (data) {
				this.queueUrl	= data.QueueUrl;
			}

			if (handlers.onopen) {
				handlers.onopen();
			}

			if (handlers.onmessage) {
				var onlag: Function;
				var lastReceiveTime: number	= 0;

				setTimeout(() => onlag = handlers.onlag, 60000);

				Util.retryUntilComplete(retry =>
					this.receive(handlers.onmessage, (...args: any[]) => {
						var err: any	= args[0];
						var data: any	= args[1];

						if (err && err.code == Queue.nonExistentQueue) {
							this.isQueueAlive	= false;
							handlers.onclose && handlers.onclose.apply(this, args);
						}
						else if (this.isQueueAlive) {
							var delay: number		= 50;
							var now: number			= Date.now();
							var isEmpty: boolean	= !(data && data.Messages && data.Messages.length > 0);

							if (isEmpty && (now - lastReceiveTime) < 10000) {
								delay	= 2500;
							}

							lastReceiveTime	= now;
							retry(delay);
						}
					}, null, null, onlag && (lag => {
						if (onlag) {
							var f	= onlag;
							onlag	= null;
							setTimeout(() => f(lag, this.sqs.innerSqs.config.region), 0);
						}
					}))
				);
			}
			else if (handlers.onclose) {
				Util.retryUntilComplete(retry =>
					this.sqs.getQueueUrl({
						QueueName: Queue.queuePrefix + queueName
					}, (...args: any[]) => {
						var err: any	= args[0];
						var data: any	= args[1];

						if (err && err.code == Queue.nonExistentQueue) {
							this.isQueueAlive	= false;
							handlers.onclose.apply(this, args);
						}
						else if (this.isQueueAlive) {
							retry(30000);
						}
					})
				);
			}
		}, true);
	}

	public close (callback?: Function) : void {
		if (this.isQueueAlive) {
			this.isQueueAlive	= false;

			this.sqs.deleteQueue(
				{QueueUrl: this.queueUrl},
				(...args: any[]) => callback && callback.apply(this, args)
			);
		}
		else if (callback) {
			callback();
		}
	}

	public isAlive () : boolean {
		return this.isQueueAlive;
	}

	public receive (
		messageHandler?: Function,
		onComplete?: Function,
		maxNumberOfMessages: number = 10,
		waitTimeSeconds: number = 20,
		onLag?: Function
	) : void {
		if (this.isQueueAlive) {
			this.sqs.receiveMessage({
				QueueUrl: this.queueUrl,
				AttributeNames: ['ApproximateFirstReceiveTimestamp', 'SentTimestamp'],
				MaxNumberOfMessages: maxNumberOfMessages,
				WaitTimeSeconds: waitTimeSeconds
			}, (...args: any[]) => {
				var err: any	= args[0];
				var data: any	= args[1];

				try {
					if (data && data.Messages && data.Messages.length > 0) {
						if (onLag) {
							var lag: number	=
								parseInt(data.Messages[0].Attributes.ApproximateFirstReceiveTimestamp, 10) -
								parseInt(data.Messages[0].Attributes.SentTimestamp, 10)
							;

							if (lag > 5000) {
								onLag(lag);
							}
						}

						this.sqs.deleteMessageBatch({
							QueueUrl: this.queueUrl,
							Entries: data.Messages
						}, () => {});

						if (messageHandler) {
							for (var i = 0 ; i < data.Messages.length ; ++i) {
								var message: any		= data.Messages[i];
								var messageBody: string	= message.Body;

								try {
									messageBody	= JSON.parse(messageBody).message;
								}
								catch (_) {}

								messageHandler(messageBody);
							}
						}
					}
				}
				finally {
					onComplete && onComplete.apply(this, args);
				}
			});
		}
	}

	public send (message: string|string[], callback?: Function|Function[], isSynchronous?: boolean) : void {
		if (this.isQueueAlive) {
			if (typeof message === 'string' || !message.length) {
				var messageBody	= JSON.stringify({message: message});

				if (isSynchronous) {
					Aws.request({
						action: 'SendMessage',
						url: this.queueUrl,
						service: 'sqs',
						region: this.sqs.innerSqs.config.region,
						isSynchronous: true,
						params: {
							MessageBody: messageBody
						}
					}, callback);
				}
				else {
					this.sqs.sendMessage({
						QueueUrl: this.queueUrl,
						MessageBody: messageBody
					}, callback, true);
				}
			}
			else if (isSynchronous) {
				for (var i = 0 ; i < message.length ; +i) {
					this.send(
						message[i],
						callback && callback.length ?
							callback[i] :
							(i == message.length - 1) && callback,
						true
					);
				}
			}
			else {
				this.sqs.sendMessageBatch({
					QueueUrl: this.queueUrl,
					Entries: message.map((s, i) => ({
						Id: (i + 1).toString(),
						MessageBody: JSON.stringify({message: s})
					}))
				}, callback && (!callback.length ? callback : (...args: any[]) => {
					for (var i = 0 ; i < callback.length ; ++i) {
						var thisCallback	= callback[i];

						if (thisCallback) {
							try {
								thisCallback.apply(this, args);
							}
							catch (_) {}
						}
					}
				}), true);
			}
		}
	}
}
