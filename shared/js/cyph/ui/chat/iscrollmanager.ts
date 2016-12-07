/**
 * Manages scrolling and scroll-detection within a chat component.
 */
export interface IScrollManager {
	/** Number of messages that haven't appeared in viewport */
	readonly unreadMessages: number;

	/**
	 * Scrolls to bottom of message list
	 * @param shouldScrollCyphertext If true, scrolls cyphertext UI
	 * instead of main message list
	 */
	scrollDown (shouldScrollCyphertext?: boolean) : Promise<void>;
}
