module Cyph {
	export module P2P {
		export interface IP2P {
			incomingStream: {audio: boolean; video: boolean; loading: boolean;};

			streamOptions: {audio: boolean; video: boolean; loading: boolean;};

			incomingFile: IFileTransfer;

			outgoingFile: IFileTransfer;

			kill () : void;

			requestCall (callType: string) : void;

			sendFile () : void;

			setUpStream (streamOptions?: any, offer?: string) : void;
		}
	}
}
