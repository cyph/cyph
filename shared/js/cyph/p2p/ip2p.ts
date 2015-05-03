module Cyph {
	export module P2P {
		export interface IP2P {
			incomingStream: {audio: boolean; video: boolean; loading: boolean;};

			outgoingStream: {audio: boolean; video: boolean; loading: boolean;};

			incomingFile: IFileTransfer;

			outgoingFile: IFileTransfer;

			kill () : void;

			requestCall (callType: string) : void;

			sendFile () : void;

			setUpStream (outgoingStream?: any, offer?: string) : void;
		}
	}
}
