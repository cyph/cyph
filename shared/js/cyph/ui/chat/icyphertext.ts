module Cyph {
	export module UI {
		export module Chat {
			/**
			 * Represents cyphertext chat UI component.
			 * @interface
			 */
			export interface ICyphertext {
				/** Cyphertext message list. */
				messages: {author: Session.Authors; text: string;}[];

				/**
				 * Hides cyphertext UI.
				 */
				hide () : void;

				/**
				 * Logs new cyphertext message.
				 * @param text
				 * @param author
				 */
				log (text: string, author: Session.Authors) : void;

				/**
				 * Shows cyphertext UI.
				 */
				show () : void;
			}
		}
	}
}
