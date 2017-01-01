import {IMessage} from './imessage';


/**
 * Encapsulates an end-to-end encrypted communication session.
 * This is the entire non-UI representation of a cyph.
 */
export interface ISession {
	/** State of the cyph (referenced by UI). */
	readonly state: {
		cyphId: string;
		isAlice: boolean;
		isAlive: boolean;
		isStartingNewCyph: boolean;
		sharedSecret: string;
		wasInitiatedByAPI: boolean;
	};

	/**
	 * This kills the cyph.
	 */
	close () : void;

	/**
	 * Remove event listener.
	 * @param event
	 * @param handler
	 */
	off<T> (event: string, handler: (data: T) => void) : void;

	/**
	 * Add event listener.
	 * @param event
	 * @param handler
	 */
	on<T> (event: string, handler: (data: T) => void) : void;

	/**
	 * Returns first occurrence of event.
	 * @param event
	 */
	one<T> (event: string) : Promise<T>;

	/**
	 * Receive incoming cyphertext.
	 * @param data Data to be decrypted.
	 */
	receive (data: string) : Promise<void>;

	/**
	 * Send at least one message through the session.
	 * @param messages
	 */
	send (...messages: IMessage[]) : Promise<void>;

	/**
	 * Shorthand for sending a user-facing chat message.
	 * @param text
	 * @param selfDestructTimeout
	 */
	sendText (text: string, selfDestructTimeout?: number) : void;

	/**
	 * Trigger event, passing in optional data.
	 * @param event
	 * @param data
	 */
	trigger (event: string, data?: any) : void;

	/**
	 * Sets a value of this.state.
	 * @param key
	 * @param value
	 */
	updateState (key: string, value: any) : void;
}
