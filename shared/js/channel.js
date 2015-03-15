var NON_EXISTENT_QUEUE	= 'AWS.SimpleQueueService.NonExistentQueue';
var QUEUE_PREFIX		= 'channels-';
var CHANNEL_IDS			= {true: '0', false: '1'};
var PERIOD_VALUES		= {true: '1800', false: '1801'};



function getChannelDescriptor () {
	return JSON.stringify({
		name: generateGuid(LONG_SECRET_LENGTH),
		region: AWS_REGIONS[
			crypto.getRandomValues(new Uint8Array(1))[0] %
			AWS_REGIONS.length
		]
	});
}

function SQS (config) {
	config	= config || {};

	if (isLocalhost) {
		config.endpoint	= 'http://localhost:4568';
	}

	var wrapper	= {
		innerSqs: new AWS.SQS(config)
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
	].forEach(function (methodName) {
		wrapper[methodName]	= function (o, f, shouldRetryUntilSuccessful) {
			function wrapperHelper () {
				wrapper.innerSqs[methodName](o, !shouldRetryUntilSuccessful ? f : function (err) {
					if (err) {
						setTimeout(wrapperHelper, 50);
					}
					else if (f) {
						f.apply(this, arguments);
					}
				});
			}

			wrapperHelper();
		};
	});

	return wrapper;
}



/* Unidirectional queue */

function Queue (queueName, handlers, config) {
	var self	= this;
	handlers	= handlers || {};
	config		= config || {};

	self.sqs	= SQS(config);

	self.isAlive	= true;

	self.sqs.createQueue({
		QueueName: QUEUE_PREFIX + queueName,
		Attributes: {
			MessageRetentionPeriod: PERIOD_VALUES[true],
			ReceiveMessageWaitTimeSeconds: '20'
		}
	}, function (err, data) {
		if (data) {
			self.queueUrl	= data.QueueUrl;
		}

		if (handlers.onopen) {
			handlers.onopen();
		}

		if (handlers.onmessage) {
			function onmessageHelper () {
				self.receive(handlers.onmessage, function (err, data) {
					if (err && err.code == NON_EXISTENT_QUEUE) {
						self.isAlive	= false;
						handlers.onclose && handlers.onclose.apply(self, arguments);
					}
					else if (self.isAlive) {
						setTimeout(onmessageHelper, 50);
					}
				});
			}

			onmessageHelper();
		}
		else if (handlers.onclose) {
			function oncloseHelper () {
				self.sqs.getQueueUrl({
					QueueName: QUEUE_PREFIX + queueName
				}, function (err, data) {
					if (err && err.code == NON_EXISTENT_QUEUE) {
						self.isAlive	= false;
						handlers.onclose.apply(self, arguments);
					}
					else if (self.isAlive) {
						setTimeout(oncloseHelper, 30000);
					}
				});
			}

			oncloseHelper();
		}
	}, true);
}

Queue.prototype.close	= function (callback) {
	var self	= this;

	if (self.isAlive) {
		self.isAlive	= false;

		self.sqs.deleteQueue({QueueUrl: self.queueUrl}, function () {
			callback && callback.apply(self, arguments);
		});
	}
	else if (callback) {
		callback();
	}
};

Queue.prototype.receive	= function (messageHandler, onComplete, maxNumberOfMessages, waitTimeSeconds) {
	var self	= this;

	if (self.isAlive) {
		self.sqs.receiveMessage({
			QueueUrl: self.queueUrl,
			MaxNumberOfMessages: maxNumberOfMessages || 10,
			WaitTimeSeconds: waitTimeSeconds || 20
		}, function (err, data) {
			try {
				if (data && data.Messages && data.Messages.length > 0) {
					self.sqs.deleteMessageBatch({
						QueueUrl: self.queueUrl,
						Entries: data.Messages
					}, function () {});

					if (messageHandler) {
						for (var i = 0 ; i < data.Messages.length ; ++i) {
							var message	= data.Messages[i];
							var messageBody	= message.Body;

							try {
								messageBody	= JSON.parse(messageBody).message;
							}
							catch (e) {}

							messageHandler(messageBody);
						}
					}
				}
			}
			finally {
				onComplete && onComplete.apply(self, arguments);
			}
		});
	}
};

Queue.prototype.send	= function (message, callback, isSynchronous) {
	var self	= this;

	if (self.isAlive) {
		if (typeof message == 'string' || !message.length) {
			var messageBody	= JSON.stringify({message: message});

			if (isSynchronous) {
				makeAwsRequest({
					action: 'SendMessage',
					url: self.queueUrl,
					service: 'sqs',
					region: self.sqs.innerSqs.config.region,
					isSynchronous: true,
					params: {
						MessageBody: messageBody
					}
				}, callback);
			}
			else {
				self.sqs.sendMessage({
					QueueUrl: self.queueUrl,
					MessageBody: messageBody
				}, callback, true);
			}
		}
		else if (isSynchronous) {
			for (var i = 0 ; i < message.length ; +i) {
				self.send(
					message[i],
					callback && callback.length ?
						callback[i] :
						(i == message.length - 1) && callback,
					true
				);
			}
		}
		else {
			self.sqs.sendMessageBatch({
				QueueUrl: self.queueUrl,
				Entries: message.map(function (s, i) {
					return {
						Id: (i + 1).toString(),
						MessageBody: JSON.stringify({message: s})
					};
				})
			}, callback && (!callback.length ? callback : function () {
				for (var i = 0 ; i < callback.length ; ++i) {
					var thisCallback	= callback[i];

					if (thisCallback) {
						try {
							thisCallback.apply(this, arguments);
						}
						catch (e) {}
					}
				}
			}), true);
		}
	}
};



/* Bidirectional channel, comprised of two queues */

function Channel (channelName, handlers, config) {
	var self	= this;
	handlers	= handlers || {};
	config		= config || {};

	try {
		var channelDescriptor	= JSON.parse(channelName);
		self.descriptor			= channelName;
		channelName				= channelDescriptor.name;
		config.region			= channelDescriptor.region;
	}
	catch (e) {}

	self.sqs	= SQS(config);

	function onclose () {
		self.close(handlers.onclose);
	}
	
	self.sqs.getQueueUrl({
		QueueName: QUEUE_PREFIX + channelName + CHANNEL_IDS[true]
	}, function (err, data) {
		var isCreator	= !!err;

		self.inQueue	= new Queue(channelName + CHANNEL_IDS[isCreator], {
			onmessage: handlers.onmessage,
			onclose: onclose,
			onopen: function () {
				self.outQueue	= new Queue(channelName + CHANNEL_IDS[!isCreator], {
					onclose: onclose,
					onopen: function () {
						handlers.onopen && handlers.onopen(isCreator);


						/* Keep this channel alive by touching it every 10 minutes */
						var lastTouched		= Date.now();
						var periodToggle	= false;

						onTick(function (now) {
							if (self.inQueue.isAlive && (now - lastTouched > 600000)) {
								lastTouched		= now;

								self.sqs.setQueueAttributes({
									QueueUrl: self.inQueue.queueUrl,
									Attributes: {
										MessageRetentionPeriod: PERIOD_VALUES[periodToggle]
									}
								}, function () {
									periodToggle	= !periodToggle;
								});
							}
						});
					}
				}, config);
			}
		}, config);
	});
}

Channel.prototype.close	= function (callback) {
	var self	= this;

	self.inQueue.close(function () {
		self.outQueue.close(callback);
	});
};

Channel.prototype.isAlive	= function () {
	return this.inQueue.isAlive && this.outQueue.isAlive;
};

Channel.prototype.receive	= function () {
	this.inQueue.receive.apply(this.inQueue, arguments);
};

Channel.prototype.send	= function () {
	this.outQueue.send.apply(this.outQueue, arguments);
};
