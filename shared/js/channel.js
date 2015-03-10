var sqsConfig	= {
	apiVersion: '2012-11-05',
	region: 'eu-central-1',
	accessKeyId: 'AKIAIN2DSULSB77U4S2A',
	secretAccessKey: '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',
	endpoint: isLocalhost ? 'http://localhost:4568' : null
};

var NON_EXISTENT_QUEUE	= 'AWS.SimpleQueueService.NonExistentQueue';
var QUEUE_PREFIX		= 'channels-';
var CHANNEL_IDS			= {true: '0', false: '1'};
var PERIOD_VALUES		= {true: '1800', false: '1801'};



var sqs	= (function () {
	var innerSqs	= new AWS.SQS(sqsConfig);

	var wrapper	= {};

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
				innerSqs[methodName](o, !shouldRetryUntilSuccessful ? f : function (err) {
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
}());



/* Unidirectional queue */

function Queue (queueName, handlers) {
	var self	= this;
	handlers	= handlers || {};

	self.isAlive	= true;

	sqs.createQueue({
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
						self.isAlive	= false;
						handlers.onclose.apply(self, arguments);
					}
					else {
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
		sqs.deleteQueue({QueueUrl: this.queueUrl}, function () {
			self.isAlive	= false;
			callback && callback.apply(self, arguments);
		}, true);
	}
	else if (callback) {
		callback();
	}
};

Queue.prototype.receive	= function (messageHandler, onComplete, maxNumberOfMessages, waitTimeSeconds) {
	var self	= this;

	if (self.isAlive) {
		sqs.receiveMessage({
			QueueUrl: self.queueUrl,
			MaxNumberOfMessages: maxNumberOfMessages || 10,
			WaitTimeSeconds: waitTimeSeconds || 20
		}, function (err, data) {
			try {
				if (messageHandler && data && data.Messages) {
					sqs.deleteMessageBatch({
						QueueUrl: this.queueUrl,
						Entries: data.Messages
					});

					for (var i = 0 ; i < data.Messages.length ; ++i) {
						var message	= data.Messages[i];
						var messageBody	= message.Body;

						sqs.deleteMessage({
							QueueUrl: self.queueUrl,
							ReceiptHandle: message.ReceiptHandle
						}, function () {});

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
	}
};

Queue.prototype.send	= function (message, callback, isSynchronous) {
	var self	= this;

	if (self.isAlive) {
		if (typeof message == 'string' || !message.length) {
			var messageBody	= JSON.stringify({message: message});

			if (isSynchronous) {
				var date		= new Date;
				var timestamp	= date.toISOString();
				var dateString	= timestamp.split('T')[0].replace(/-/g, '');

				var requestMethod	= 'GET';
				var algorithm		= 'AWS4-HMAC-SHA256';
				var hostHeader		= 'host';
				var terminator		= 'aws4_request';
				var service			= 'sqs';
				var host			= self.queueUrl.split('/')[2];
				var uri				= self.queueUrl.split(host)[1];

				var credential		=
					dateString + '/' +
					sqsConfig.region + '/' +
					service + '/' +
					terminator
				;

				var query	= $.param({
					Action: 'SendMessage',
					MessageBody: messageBody,
					Timestamp: timestamp,
					Version: sqsConfig.apiVersion,
					'X-Amz-Algorithm': algorithm,
					'X-Amz-Credential': sqsConfig.accessKeyId + '/' + credential,
					'X-Amz-Date': timestamp,
					'X-Amz-SignedHeaders': hostHeader
				});

				var canonicalRequest	=
					requestMethod + '\n' +
					uri + '\n' +
					query + '\n' +
					hostHeader + ':' + host + '\n\n' +
					hostHeader + '\n' +
					CryptoJS.SHA256('').toString()
				;

				var stringToSign	=
					algorithm + '\n' +
					timestamp.split('.')[0].match(/[0-9A-Za-z]/g).join('') + 'Z\n' +
					credential + '\n' +
					CryptoJS.SHA256(canonicalRequest).toString()
				;


				var signature	= CryptoJS.HmacSHA256(
					stringToSign,
					CryptoJS.HmacSHA256(
						terminator,
						CryptoJS.HmacSHA256(
							service,
							CryptoJS.HmacSHA256(
								sqsConfig.region,
								CryptoJS.HmacSHA256(
									dateString,
									'AWS4' + sqsConfig.secretAccessKey
								)
							)
						)
					)
				).toString();


				$.ajax({
					async: false,
					timeout: 30000,
					type: requestMethod,
					url: this.queueUrl + '?' + query + '&X-Amz-Signature=' + signature
				});

				callback && callback();
			}
			else {
				sqs.sendMessage({
					QueueUrl: this.queueUrl,
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
			sqs.sendMessageBatch({
				QueueUrl: this.queueUrl,
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

function Channel (channelName, handlers) {
	var self	= this;
	handlers	= handlers || {};

	function onclose () {
		self.close(handlers.onclose);
	}
	
	sqs.getQueueUrl({
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

								sqs.setQueueAttributes({
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
				});
			}
		});
	});
}

Channel.prototype.close	= function (callback) {
	var self	= this;

	self.inQueue.close(function () {
		self.outQueue.close(callback);
	});
};

Channel.prototype.receive	= function () {
	this.inQueue.receive.apply(this.inQueue, arguments);
};

Channel.prototype.send	= function () {
	this.outQueue.send.apply(this.outQueue, arguments);
};
