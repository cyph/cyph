var MSGEVENT_ARRAY = ["NONE", "ENCRYPTION_REQUIRED", "ENCRYPTION_ERROR", "CONNECTION_ENDED", "SETUP_ERROR",
	"MSG_REFLECTED", "MSG_RESENT", "RCVDMSG_NOT_IN_PRIVATE", "RCVDMSG_UNREADABLE", "RCVDMSG_MALFORMED",
	"LOG_HEARTBEAT_RCVD", "LOG_HEARTBEAT_SENT", "RCVDMSG_GENERAL_ERR", "RCVDMSG_UNENCRYPTED",
	"RCVDMSG_UNRECOGNIZED", "RCVDMSG_FOR_OTHER_INSTANCE"
];

/** The 'value' property of "msg_event" events emitted by a Session()
 *
 *  @alias module:otr.MSGEVENT
 *  @readonly
 *  @enum {number}
 */
var MSGEVENT = module.exports = {
	/** 0 */
	"NONE": 0,
	/** 1 - Our policy requires encryption but we are trying to send
	 *      an unencrypted message out. */
	"ENCRYPTION_REQUIRED": 1,
	/** 2 - An error occured while encrypting a message and the message
	 *      was not sent. */
	"ENCRYPTION_ERROR": 2,
	/** 3 - Message has not been sent because our contact has ended the
	 *      private conversation. We should either end the connection,
	 *      or refresh it. */
	"CONNECTION_ENDED": 3,
	/** 4 - A private conversation could not be set up. A gcry_error_t
	 *      will be passed. */
	"SETUP_ERROR": 4,
	/** 5 - Received our own OTR messages. */
	"MSG_REFLECTED": 5,
	/** 6 - The previous message was resent. */
	"MSG_RESENT": 6,
	/** 7 - Received an encrypted message but cannot read
	 *      it because no private connection is established yet. */
	"RCVDMSG_NOT_IN_PRIVATE": 7,
	/** 8 - Cannot read the received message. */
	"RCVDMSG_UNREADABLE": 8,
	/** 9 - The message received contains malformed data. */
	"RCVDMSG_MALFORMED": 9,
	/** 10 - Received a heartbeat. */
	"LOG_HEARTBEAT_RCVD": 10,
	/** 11 - Sent a heartbeat. */
	"LOG_HEARTBEAT_SENT": 11,
	/** 12 - Received a general OTR error. The argument 'message' will
	 *       also be passed and it will contain the OTR error message. */
	"RCVDMSG_GENERAL_ERR": 12,
	/** 13 - Received an unencrypted message. The argument 'message' will
	 *       also be passed and it will contain the plaintext message. */
	"RCVDMSG_UNENCRYPTED": 13,
	/** 14 - Cannot recognize the type of OTR message received. */
	"RCVDMSG_UNRECOGNIZED": 14,
	/** 15 - Received and discarded a message intended for another instance. */
	"RCVDMSG_FOR_OTHER_INSTANCE": 15,

	/** method to convert MSGEVENT number to string
	 * @type {function}
	 */
	name: function (n) {
		return MSGEVENT_ARRAY[n];
	},

	/** used internally by otr.Session for creating "msg_event" event argument
	 * @type {function}
	 */
	make: function (val, message, error) {
		return ({
			value: val,
			name: MSGEVENT.name(val),
			message: message,
			error: error
		});
	}
};
