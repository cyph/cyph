var mutex	= {
	owner: null,
	comment: null,
	requester: null,

	commands: {
		release: function () {
			if (mutex.owner != authors.me) {
				mutex.shiftRequester();
			}
		},

		request: function (comment) {
			if (mutex.owner != authors.me) {
				mutex.owner		= authors.friend;
				mutex.comment	= comment;
				mutex.sendCommand({release: true});
			}
			else {
				mutex.requester	= {author: authors.friend, comment: comment};
			}
		},
	},

	lock: function (f, opt_comment) {
		if (mutex.owner != authors.me) {
			if (!mutex.owner && isCreator) {
				mutex.owner		= authors.me;
				mutex.comment	= opt_comment;
			}
			else {
				mutex.requester	= {author: authors.me, comment: opt_comment};
			}

			mutex.sendCommand({request: (opt_comment || '')});
		}

		if (f) {
			var tickId, friendHadLockFirst, friendLockComment;

			var runIfOwner	= function () {
				var isOwner	= mutex.owner == authors.me;

				if (isOwner) {
					tickOff(tickId);

					f(
						!friendHadLockFirst,
						!friendLockComment || friendLockComment != opt_comment,
						friendLockComment
					);
				}
				else if (mutex.owner == authors.friend) {
					friendHadLockFirst	= true;
					friendLockComment	= mutex.comment;
				}

				return isOwner;
			};

			if (!runIfOwner()) {
				tickId	= onTick(runIfOwner);
			}
		}
	},

	sendCommand: function (o) {
		sendChannelData({Misc: MUTEX_PREFIX + (o ? JSON.stringify(o) : '')});
	},

	shiftRequester: function () {
		delete mutex.owner;
		delete mutex.comment;

		if (mutex.requester) {
			mutex.owner		= mutex.requester.author;
			mutex.comment	= mutex.requester.comment;

			delete mutex.requester;
		}
	},

	unlock: function () {
		if (mutex.owner == authors.me) {
			mutex.shiftRequester();
			mutex.sendCommand({release: true});
		}
	}
};
