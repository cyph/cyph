module Cyph {
	export module UI {
		export module Chat {
			/**
			 * Represents P2P component of chat UI.
			 * @interface
			 */
			export interface IP2PManager {
				/** Indicates whether a P2P session is currently active. */
				isActive: boolean;

				/** Indicates whether P2P is possible (i.e. both clients support WebRTC). */
				isEnabled: boolean;

				/** P2P instance. */
				p2p: P2P.IP2P;

				/**
				 * Closes active P2P session.
				 */
				closeButton () : void;

				/**
				 * If chat authentication is complete, this alerts that P2P is disabled.
				 */
				disabledAlert () : void;

				/**
				 * Sets this.isEnabled to true.
				 */
				enable () : void;

				/**
				 * Indicates whether the video call screen is to be displayed.
				 */
				isPlaying () : boolean;

				/**
				 * Attempts to send file, requesting new P2P session if necessary.
				 */
				sendFileButton () : void;

				/**
				 * Attempts to toggle outgoing video stream,
				 * requesting new P2P session if necessary.
				 */
				videoCallButton () : void;

				/**
				 * Attempts to toggle outgoing audio stream,
				 * requesting new P2P session if necessary.
				 */
				voiceCallButton () : void;
			}
		}
	}
}
