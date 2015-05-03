module Cyph {
	export module UI {
		export module Chat {
			export interface IP2PManager {
				isActive: boolean;

				isEnabled: boolean;

				p2p: P2P.IP2P;

				disabledAlert (isConnected: boolean) : void;

				enable () : void;

				isPlaying () : boolean;

				sendFileButton () : void;

				videoCallButton () : void;

				videoCallClose () : void;

				voiceCallButton () : void;
			}
		}
	}
}
