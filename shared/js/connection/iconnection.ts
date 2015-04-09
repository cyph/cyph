/// <reference path="../globals.ts" />


module Connection {
	export interface IConnection {
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
