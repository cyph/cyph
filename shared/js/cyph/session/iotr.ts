module Cyph {
	export module Session {
		export interface IOTR {
			receive (message: string) : void;

			send (message: string) : void;
		}
	}
}
