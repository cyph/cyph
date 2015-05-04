module Cyph {
	export module Channel {
		/**
		 * Represents a logical network connection that can send and receive data.
		 * @interface
		 */
		export interface IChannel {
			/**
			 * This kills the channel.
			 * @param callback 
			 */
			close (callback?: Function) : void;

			/**
			 * Indicates whether this channel is available for sending and receiving.
			 */
			isAlive () : boolean;

			/**
			 * Makes one attempt to receive messages from this channel.
			 * @param messageHandler Called for each message received.
			 * @param onComplete Called after all messages are handled.
			 * @param maxNumberOfMessages Maximum number of messages to be pulled from the channel.
			 * @param waitTimeSeconds Number of seconds to wait before timing out (HTTP long poll).
			 * @param onLag Called if network latency is detected during this operation.
			 */
			receive (
				messageHandler?: (message: string) => void,
				onComplete?: Function,
				maxNumberOfMessages?: number,
				waitTimeSeconds?: number,
				onLag?: Function
			) : void;

			/**
			 * Sends at least one message through this channel.
			 * @param message
			 * @param callback
			 * @param isSynchronous
			 */
			send (
				message: string|string[],
				callback?: Function|Function[],
				isSynchronous?: boolean
			) : void;
		}
	}
}
