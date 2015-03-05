var sqsConfig	= {
	apiVersion: '2012-11-05',
	region: 'us-east-1',
	accessKeyId: 'AKIAIN2DSULSB77U4S2A',
	secretAccessKey: '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'
};

var NON_EXISTENT_QUEUE	= 'AWS.SimpleQueueService.NonExistentQueue';
var QUEUE_PREFIX		= 'channels-';
var CHANNEL_IDS			= {true: '0', false: '1'};



var sqs	= (function () {
	var sqsFrame		= document.createElement('iframe');
	var sqsFrameOrigin	= isOnion ? ONION_URL : BASE_URL.slice(0, -1);
	var sqsFrameIsReady	= false;

	sqsFrame.style.display	= 'none';
	sqsFrame.src			= sqsFrameOrigin + (isOnion ? BASE_URL : '/') + 'sqsframe';

	document.body.appendChild(sqsFrame);

	function sqsFramePostMessage (message) {
		sqsFrame.contentWindow.postMessage(message, '*');
	}

	$(function () {
		$(sqsFrame).load(function () {
			sqsFramePostMessage({method: 'init', config: sqsConfig});

			setTimeout(function () {
				sqsFrameIsReady	= true;
			}, 250);
		});
	});


	var callbacks			= {};
	var callbackCount		= 0;
	var receiveMessageQueue	= [];

	function callback (f) {
		if (!f) {
			return null;
		}

		var callbackId			= ++callbackCount;
		callbacks[callbackId]	= f;
		return {callbackId: callbackId};
	}

	window.addEventListener('message', function (e) {
		if (e.origin == sqsFrameOrigin) {
			receiveMessageQueue.push(e);
		}
	});

	onTick(function () {
		if (receiveMessageQueue.length) {
			var e	= receiveMessageQueue.shift();
			var f	= callbacks[e.data.callbackId];

			if (f) {
				f.apply(null, JSON.parse(e.data.args));
			}

			return true;
		}

		return false;
	});


	var wrapper	= {};

	/* Add methods that take an object and an optional callback */
	[
		'createQueue',
		'deleteMessage',
		'deleteQueue',
		'getQueueUrl',
		'receiveMessage',
		'sendMessage'
	].forEach(function (methodName) {
		wrapper[methodName]	= function (o, f, shouldRetryUntilSuccessful) {
			function wrapperHelper () {
				if (sqsFrameIsReady) {
					sqsFramePostMessage({
						method: methodName,
						args: JSON.stringify([
							o,
							callback(!shouldRetryUntilSuccessful ? f : function (err) {
								if (err) {
									setTimeout(wrapperHelper, 50);
								}
								else if (f) {
									f.apply(this, arguments);
								}
							})
						])
					});
				}
				else {
					setTimeout(wrapperHelper, 50);
				}
			}

			wrapperHelper();
		};
	});

	return wrapper;
}());



/* Unidirectional queue */

function Queue (queueName, handlers) {
	var self	= this;
	handlers	= handlers || {};

	sqs.createQueue({
		QueueName: QUEUE_PREFIX + queueName,
		Attributes: {
			MessageRetentionPeriod: '7200',
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
						handlers.onclose && handlers.onclose.apply(self, arguments);
					}
					else {
						setTimeout(onmessageHelper, 50);
					}
				});
			}

			onmessageHelper();
		}
		else if (handlers.onclose) {
			function oncloseHelper () {
				sqs.getQueueUrl({
					QueueName: QUEUE_PREFIX + queueName
				}, function (err, data) {
					if (err && err.code == NON_EXISTENT_QUEUE) {
						handlers.onclose.apply(self, arguments);
					}
					else {
						setTimeout(oncloseHelper, 10000);
					}
				});
			}

			oncloseHelper();
		}
	}, true);
}

Queue.prototype.close	= function (shouldCloseSynchronously) {
	/* TODO: balls */
	if (shouldCloseSynchronously) {
		$.ajax({
			async: false,
			timeout: 30000,
			type: 'GET',
			url: this.queueUrl + '?' + $.param({
				Action: 'DeleteQueue',
				Version: sqsConfig.apiVersion,
				AWSAccessKeyID: sqsConfig.accessKeyId,
				AWSSecretAccessKey: sqsConfig.secretAccessKey
			})
		});
	}
	else {
		sqs.deleteQueue({QueueUrl: this.queueUrl}, null, true);
	}
};

Queue.prototype.receive	= function (messageHandler, onComplete, maxNumberOfMessages, waitTimeSeconds) {
	var self	= this;

	sqs.receiveMessage({
		QueueUrl: self.queueUrl,
		MaxNumberOfMessages: maxNumberOfMessages || 10,
		WaitTimeSeconds: waitTimeSeconds || 20
	}, function (err, data) {
		try {
			if (messageHandler && data && data.Messages) {
				for (var i = 0 ; i < data.Messages.length ; ++i) {
					var message	= data.Messages[i];
					var messageBody	= message.Body;

					sqs.deleteMessage({
						QueueUrl: self.queueUrl,
						ReceiptHandle: message.ReceiptHandle
					});

					try {
						messageBody	= JSON.parse(messageBody).message;
					}
					catch (e) {}

					messageHandler(messageBody);
				}
			}
		}
		finally {
			onComplete && onComplete.apply(self, arguments);
		}
	});
};

Queue.prototype.send	= function (message, f) {
	sqs.sendMessage({
		QueueUrl: this.queueUrl,
		MessageBody: JSON.stringify({message: message})
	}, f, true);
};



/* Bidirectional channel, comprised of two queues */

function Channel (channelName, handlers) {
	var self	= this;
	handlers	= handlers || {};
	
	sqs.getQueueUrl({
		QueueName: QUEUE_PREFIX + channelName + CHANNEL_IDS[true]
	}, function (err, data) {
		var isCreator	= !!err;

		self.inQueue	= new Queue(channelName + CHANNEL_IDS[isCreator], {
			onmessage: handlers.onmessage,
			onclose: handlers.onclose,
			onopen: function () {
				self.outQueue	= new Queue(channelName + CHANNEL_IDS[!isCreator], {
					onopen: handlers.onopen && function () {
						handlers.onopen(isCreator);
					}
				});
			}
		});
	});
}

Channel.prototype.close	= function () {
	this.inQueue.close.apply(this.inQueue, arguments);
	this.outQueue.close.apply(this.outQueue, arguments);
};

Channel.prototype.receive	= function () {
	this.inQueue.receive.apply(this.inQueue, arguments);
};

Channel.prototype.send	= function () {
	this.outQueue.send.apply(this.outQueue, arguments);
};


