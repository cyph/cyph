module Cyph {
	export module Session {
		export interface ISession {
			state: {
				cyphId: string;
				sharedSecret: string;
				isAlive: boolean;
				isCreator: boolean;
				isStartingNewCyph: boolean;
			};


			close (shouldSendEvent?: boolean) : void;

			off (event: string, f: Function) : void;

			on (event: string, f: Function) : void;

			receive (data: string) : void;

			send (...IMessages: IMessage[]) : void;

			sendBase (IMessages: IMessage[]) : void;

			sendText (text: string) : void;

			trigger (event: string, data?: any) : void;

			updateState (key: string, value: any) : void;
		}
	}
}
