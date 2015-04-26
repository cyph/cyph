module Cyph {
	export module Session {
		export interface IMessage {
			id: string;
			event: string;
			data: any;
		}
	}
}
