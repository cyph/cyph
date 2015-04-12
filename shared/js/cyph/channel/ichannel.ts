/// <reference path="../../global/base.ts" />


module Cyph {
	export module Channel {
		export interface IChannel {
			close (callback?: Function) : void;

			isAlive () : boolean;

			receive (
				messageHandler?: Function,
				onComplete?: Function,
				maxNumberOfMessages?: number,
				waitTimeSeconds?: number,
				onLag?: Function
			) : void;

			send (message: string|string[], callback?: Function|Function[], isSynchronous?: boolean) : void;
		}
	}
}
