/**
 * Represents a logical network connection that can send and receive data.
 * @interface
 */
export interface IChannel {
	/**
	 * This kills the channel.
	 */
	close () : void;

	/**
	 * Indicates whether this channel is available for sending and receiving.
	 */
	isAlive () : boolean;

	/**
	 * Sends at message through this channel.
	 * @param messagek
	 */
	send (message: string) : void;
}
