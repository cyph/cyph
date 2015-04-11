/// <reference path="command.ts" />
/// <reference path="enums.ts" />
/// <reference path="message.ts" />
/// <reference path="otr.ts" />
/// <reference path="p2p.ts" />
/// <reference path="../analytics.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../errors.ts" />
/// <reference path="../timer.ts" />
/// <reference path="../util.ts" />
/// <reference path="../connection/iconnection.ts" />
/// <reference path="../connection/ratchetedchannel.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


module Session {
	export interface ISession {
		state: {
			cyphId: string;
			sharedSecret: string;
			hasKeyExchangeBegun: boolean;
			isAlive: boolean;
			isCreator: boolean;
			isStartingNewCyph: boolean;
		};

		p2p: P2P;

		close (shouldSendEvent?: boolean) : void;
		off (event: string, f: Function) : void;
		on (event: string, f: Function) : void;
		receive (data: string) : void;
		send (...messages: Message[]) : void;
		trigger (event: string, data?: any) : void;
		updateState (key: string, value: any);
	}
}
