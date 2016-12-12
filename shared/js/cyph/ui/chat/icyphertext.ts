import {IChatMessage} from './ichatmessage';


/**
 * Represents cyphertext chat UI component.
 */
export interface ICyphertext {
	/** Cyphertext message list. */
	readonly messages: IChatMessage[];

	/**
	 * Hides cyphertext UI.
	 */
	hide () : void;

	/**
	 * Logs new cyphertext message.
	 * @param text
	 * @param author
	 */
	log (text: string, author: string) : void;

	/**
	 * Shows cyphertext UI.
	 */
	show () : Promise<void>;
}
