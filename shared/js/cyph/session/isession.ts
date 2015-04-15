/// <reference path="message.ts" />
/// <reference path="../../global/base.ts" />


module Cyph {
	export module Session {
		export interface ISession {
			state: {
				cyphId: string;
				sharedSecret: string;
				hasKeyExchangeBegun: boolean;
				isAlive: boolean;
				isCreator: boolean;
				isStartingNewCyph: boolean;
			};


			close (shouldSendEvent?: boolean) : void;

			off (event: string, f: Function) : void;

			on (event: string, f: Function) : void;

			receive (data: string) : void;

			send (...messages: Message[]) : void;

			sendBase (messages: Message[]) : void;

			trigger (event: string, data?: any) : void;

			updateState (key: string, value: any) : void;
		}
	}
}
