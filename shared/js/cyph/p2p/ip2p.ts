module Cyph {
	export module P2P {
		/**
		 * Manages P2P sessions.
		 * @interface
		 */
		export interface IP2P {
			/** Description of incoming data. */
			incomingStream: { audio: boolean; video: boolean; loading: boolean; };

			/** Description of outgoing data (passed directly into navigator.getUserMedia). */
			outgoingStream: { audio: boolean; video: boolean; loading: boolean; };

			/** Incoming file transfer. */
			incomingFile: IFileTransfer;

			/** Outgoing file transfer. */
			outgoingFile: IFileTransfer;

			/**
			 * This kills the P2P session.
			 */
			close () : void;

			/**
			 * Sends a new P2P session request to the other party.
			 * @param callType Requested session type ("video", "audio", or "file").
			 */
			requestCall (callType: string) : void;

			/**
			 * Initiates a transfer of the currently selected file over the session.
			 */
			sendFile () : void;

			/**
			 * Sets up a new P2P session.
			 * @param outgoingStream Optional "patch" for this.outgoingStream (any set
			 * properties override this.outgoingStream; undefined ones are ignored).
			 * @param offer Incoming session offer description (including shared secret).
			 */
			setUpStream (outgoingStream?: any, offer?: string) : void;
		}
	}
}
