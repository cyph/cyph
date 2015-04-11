/// <reference path="isession.ts" />
/// <reference path="../globals.ts" />


module Session {
	export interface IP2P {
		incomingStream: {audio: boolean; video: boolean; loading: boolean;};

		streamOptions: {audio: boolean; video: boolean; loading: boolean;};


		init (session: ISession) : void;
	}
}
