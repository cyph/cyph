module Cyph {
	export module UI {
		export module Chat {
			export interface IP2PManager {
				isEnabled: boolean;

				isVideoCall: boolean;

				p2p: P2P.IP2P;

				disabledAlert () : void;

				enable () : void;

				sendFileButton () : void;

				toggleVideoCall (isVideoCall: boolean) : void;

				videoCallButton () : void;

				videoCallClose () : void;

				voiceCallButton () : void;
			}
		}
	}
}
