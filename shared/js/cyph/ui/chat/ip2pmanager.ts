import * as P2P from 'p2p/p2p';


/**
 * Represents P2P component of chat UI.
 * @interface
 */
export interface IP2PManager {
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
	 * Preemptively initiates call, bypassing any prerequisite dialogs and button clicks.
	 */
	preemptivelyInitiate () : void;

	/**
	 * Toggles visibility of sidebar containing chat UI.
	 */
	toggleSidebar () : void;

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
