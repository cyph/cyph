import * as P2P from 'p2p/p2p';


/**
 * Represents P2P component of chat UI.
 * @interface
 */
export interface IP2PManager {
	/** Indicates whether a P2P session currently exists. */
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
	 * Indicates whether a P2P session currently exists and is in active use
	 * for any form of data transfer (file, audio, or video).
	 */
	isInUse () : boolean;

	/**
	 * Indicates whether the video call screen is to be displayed.
	 */
	isPlaying () : boolean;

	/**
	 * Preemptively initiates call, bypassing any prerequisite dialogs and button clicks.
	 */
	preemptivelyInitiate () : void;

	/**
	 * Attempts to send file, requesting new P2P session if necessary.
	 */
	sendFileButton () : void;

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
