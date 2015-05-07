module Cyph {
	export module UI {
		export module Chat {
			/**
			 * This is the entire end-to-end representation of a cyph.
			 * @interface
			 */
			export interface IChat {
				/** Indicates whether authentication has completed
					(still true even after disconnect). */
				isConnected: boolean;

				/** Indicates whether chat has been disconnected. */
				isDisconnected: boolean;

				/** Indicates whether the other party is typing. */
				isFriendTyping: boolean;

				/** Indicates whether the mobile chat UI is to be displayed. */
				isMobile: boolean;

				/** The current message being composed. */
				currentMessage: string;

				/** Chat UI state/view. */
				state: States;

				/** Message list. */
				messages: {
					author: Session.Users;
					text: string;
					timestamp: string;
				}[];

				/** Cyphertext instance. */
				cyphertext: ICyphertext;

				/** Photo manager instance. */
				photoManager: IPhotoManager;

				/** P2P manager instance. */
				p2pManager: IP2PManager;

				/** Scroll manager instance. */
				scrollManager: IScrollManager;

				/** Session instance. */
				session: Session.ISession;

				/**
				 * Aborts the process of chat initialisation and authentication.
				 */
				abortSetup () : void;

				/**
				 * Adds a message to the chat.
				 * @param text
				 * @param author
				 * @param shouldNotify If true, a notification will be sent.
				 */
				addMessage (
					text: string,
					author: Session.Users,
					shouldNotify?: boolean
				) : void;

				/**
				 * Begins chat.
				 * @param callback
				 */
				begin (callback?: Function) : void;

				/**
				 * Changes chat UI state.
				 * @param state
				 */
				changeState (state: States) : void;

				/**
				 * This kills the chat.
				 */
				close () : void;

				/**
				 * After confirmation dialog, this kills the chat.
				 */
				disconnectButton () : void;

				/**
				 * Displays Markdown formatting guide in modal.
				 */
				formattingHelpButton () : void;

				/**
				 * Checks for change to current message, and sends appropriate
				 * typing indicator signals through session.
				 */
				messageChange () : void;

				/**
				 * Sends a message.
				 * @param message
				 */
				send (message?: string) : void;

				/**
				 * Sets this.isConnected to true.
				 */
				setConnected () : void;

				/**
				 * Sets this.isFriendTyping to isFriendTyping.
				 * @param isFriendTyping
				 */
				setFriendTyping (isFriendTyping: boolean) : void;
			}
		}
	}
}
